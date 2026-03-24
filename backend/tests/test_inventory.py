"""
Comprehensive tests for the Inventory API endpoints.
Tests cover CRUD, stock counts, variance calculations, and edge cases.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import date

from app.models.product import Product
from app.models.inventory import Inventory
from app.models.location import Location


class TestListInventory:
    """Tests for GET /inventory endpoint."""

    def test_list_inventory_empty(self, client: TestClient):
        """Test listing inventory when empty."""
        response = client.get("/inventory")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_inventory_with_items(self, client: TestClient, sample_inventory: list[Inventory]):
        """Test listing inventory with items."""
        response = client.get("/inventory")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 8

    def test_list_inventory_filter_by_location(self, client: TestClient, sample_inventory: list[Inventory], sample_location: Location):
        """Test filtering inventory by location."""
        response = client.get(f"/inventory?location_id={sample_location.id}")
        assert response.status_code == 200
        data = response.json()
        for item in data:
            assert item["location_id"] == sample_location.id

    def test_list_inventory_filter_low_stock(self, client: TestClient, sample_inventory: list[Inventory], db: Session):
        """Test filtering for low stock items."""
        # Set one item to low stock
        item = sample_inventory[0]
        item.quantity = 5  # Below min_stock of 10
        db.commit()

        response = client.get("/inventory?low_stock=true")
        assert response.status_code == 200
        data = response.json()
        # Should only return items where quantity <= min_stock
        for item in data:
            assert item["quantity"] <= item["min_stock"]

    def test_list_inventory_includes_product_details(self, client: TestClient, sample_inventory: list[Inventory]):
        """Test inventory response includes product details."""
        response = client.get("/inventory")
        assert response.status_code == 200
        item = response.json()[0]
        assert "product_name" in item
        assert "product_unit" in item
        assert "product_category" in item
        assert "product_unit_price" in item

    def test_list_inventory_includes_supplier(self, client: TestClient, sample_inventory: list[Inventory]):
        """Test inventory response includes supplier info."""
        response = client.get("/inventory")
        assert response.status_code == 200
        item = response.json()[0]
        assert "supplier_name" in item

    def test_list_inventory_includes_variance(self, client: TestClient, sample_inventory: list[Inventory]):
        """Test inventory response includes variance calculation."""
        response = client.get("/inventory")
        assert response.status_code == 200
        item = response.json()[0]
        assert "variance_pct" in item


class TestGetInventory:
    """Tests for GET /inventory/{id} endpoint."""

    def test_get_inventory_success(self, client: TestClient, sample_inventory: list[Inventory]):
        """Test getting specific inventory item."""
        inv_id = sample_inventory[0].id
        response = client.get(f"/inventory/{inv_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == inv_id

    def test_get_inventory_not_found(self, client: TestClient):
        """Test getting non-existent inventory."""
        response = client.get("/inventory/99999")
        assert response.status_code == 404


class TestUpdateInventory:
    """Tests for PATCH /inventory/{id} endpoint."""

    def test_update_inventory_quantity(self, client: TestClient, sample_inventory: list[Inventory]):
        """Test updating inventory quantity."""
        inv_id = sample_inventory[0].id
        response = client.patch(f"/inventory/{inv_id}", json={"quantity": 100})
        assert response.status_code == 200
        assert response.json()["quantity"] == 100

    def test_update_inventory_theoretical(self, client: TestClient, sample_inventory: list[Inventory]):
        """Test updating theoretical quantity."""
        inv_id = sample_inventory[0].id
        response = client.patch(f"/inventory/{inv_id}", json={"theoretical_quantity": 50})
        assert response.status_code == 200
        assert response.json()["theoretical_quantity"] == 50

    def test_update_inventory_both(self, client: TestClient, sample_inventory: list[Inventory]):
        """Test updating both quantities."""
        inv_id = sample_inventory[0].id
        response = client.patch(f"/inventory/{inv_id}", json={"quantity": 80, "theoretical_quantity": 85})
        assert response.status_code == 200
        data = response.json()
        assert data["quantity"] == 80
        assert data["theoretical_quantity"] == 85

    def test_update_inventory_not_found(self, client: TestClient):
        """Test updating non-existent inventory."""
        response = client.patch("/inventory/99999", json={"quantity": 100})
        assert response.status_code == 404


class TestRecordCount:
    """Tests for POST /inventory/count/{product_id} endpoint."""

    def test_record_count_existing_inventory(self, client: TestClient, sample_inventory: list[Inventory], sample_products: list[Product]):
        """Test recording count for existing inventory."""
        product_id = sample_products[0].id
        response = client.post(f"/inventory/count/{product_id}?quantity=50")
        assert response.status_code == 200
        data = response.json()
        assert data["quantity"] == 50
        # last_count_date may include time component
        assert str(date.today()) in data["last_count_date"]

    def test_record_count_creates_inventory(self, client: TestClient, sample_product: Product, sample_location: Location):
        """Test recording count creates inventory if not exists."""
        response = client.post(f"/inventory/count/{sample_product.id}?quantity=25&location_id={sample_location.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["quantity"] == 25
        assert data["product_id"] == sample_product.id

    def test_record_count_with_location(self, client: TestClient, sample_inventory: list[Inventory], sample_products: list[Product], sample_location: Location):
        """Test recording count with specific location."""
        product_id = sample_products[0].id
        response = client.post(f"/inventory/count/{product_id}?quantity=75&location_id={sample_location.id}")
        assert response.status_code == 200
        assert response.json()["location_id"] == sample_location.id

    def test_record_count_invalid_product(self, client: TestClient):
        """Test recording count for non-existent product - FK constraint violation."""
        from sqlalchemy.exc import IntegrityError

        # FK constraint violation raises IntegrityError
        with pytest.raises(IntegrityError):
            client.post("/inventory/count/99999?quantity=50")


class TestInventoryVariance:
    """Tests for inventory variance calculations."""

    def test_variance_calculation(self, client: TestClient, sample_inventory: list[Inventory], db: Session):
        """Test variance percentage calculation via list endpoint."""
        # Set up specific quantities for variance
        item = sample_inventory[0]
        item.quantity = 80
        item.theoretical_quantity = 100
        db.commit()

        # variance_pct is only in list response (InventoryWithProduct)
        response = client.get("/inventory")
        assert response.status_code == 200
        data = [i for i in response.json() if i["id"] == item.id][0]
        # Variance should be -20%
        assert data["variance_pct"] == pytest.approx(-20.0, rel=0.1)

    def test_variance_zero_when_equal(self, client: TestClient, sample_inventory: list[Inventory], db: Session):
        """Test variance is zero when quantities match."""
        item = sample_inventory[0]
        item.quantity = 50
        item.theoretical_quantity = 50
        db.commit()

        response = client.get("/inventory")
        assert response.status_code == 200
        data = [i for i in response.json() if i["id"] == item.id][0]
        # Variance should be 0
        assert data["variance_pct"] == 0

    def test_variance_positive_surplus(self, client: TestClient, sample_inventory: list[Inventory], db: Session):
        """Test positive variance when actual > theoretical."""
        item = sample_inventory[0]
        item.quantity = 120
        item.theoretical_quantity = 100
        db.commit()

        response = client.get("/inventory")
        assert response.status_code == 200
        data = [i for i in response.json() if i["id"] == item.id][0]
        assert data["variance_pct"] == pytest.approx(20.0, rel=0.1)


class TestInventoryEdgeCases:
    """Edge case tests for inventory."""

    def test_inventory_zero_quantity(self, client: TestClient, sample_inventory: list[Inventory]):
        """Test inventory with zero quantity."""
        inv_id = sample_inventory[0].id
        response = client.patch(f"/inventory/{inv_id}", json={"quantity": 0})
        assert response.status_code == 200
        assert response.json()["quantity"] == 0

    def test_inventory_negative_quantity(self, client: TestClient, sample_inventory: list[Inventory]):
        """Test inventory with negative quantity - should be rejected or handled."""
        inv_id = sample_inventory[0].id
        response = client.patch(f"/inventory/{inv_id}", json={"quantity": -10})
        # Should either reject or accept depending on business logic
        assert response.status_code in [200, 400, 422]

    def test_inventory_decimal_quantity(self, client: TestClient, sample_inventory: list[Inventory]):
        """Test inventory with decimal quantity."""
        inv_id = sample_inventory[0].id
        response = client.patch(f"/inventory/{inv_id}", json={"quantity": 25.5})
        assert response.status_code == 200

    def test_inventory_large_quantity(self, client: TestClient, sample_inventory: list[Inventory]):
        """Test inventory with very large quantity."""
        inv_id = sample_inventory[0].id
        response = client.patch(f"/inventory/{inv_id}", json={"quantity": 999999})
        assert response.status_code == 200


class TestInventoryLowStockDetection:
    """Tests for low stock detection."""

    def test_detect_critical_stock(self, client: TestClient, sample_inventory: list[Inventory], db: Session):
        """Test detection of critical stock level."""
        # Set item to 50% of min_stock
        item = sample_inventory[0]
        product_min = 10  # From fixture
        item.quantity = 5  # 50% of min
        db.commit()

        response = client.get("/inventory?low_stock=true")
        assert response.status_code == 200
        data = response.json()
        # Should include this item
        ids = [i["id"] for i in data]
        assert item.id in ids

    def test_detect_normal_stock(self, client: TestClient, sample_inventory: list[Inventory], db: Session):
        """Test that normal stock levels are not flagged."""
        # Set item to well above min_stock
        item = sample_inventory[0]
        item.quantity = 100  # Well above min of 10
        db.commit()

        response = client.get("/inventory?low_stock=true")
        assert response.status_code == 200
        data = response.json()
        # Should not include this item
        ids = [i["id"] for i in data]
        assert item.id not in ids
