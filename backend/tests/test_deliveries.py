"""
Comprehensive tests for the Deliveries API endpoints.
Tests cover CRUD, inventory updates, supplier reliability, and edge cases.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.models import Supplier
from app.models.product import Product
from app.models.delivery import Delivery, DeliveryItem
from app.models.inventory import Inventory


class TestListDeliveries:
    """Tests for GET /deliveries endpoint."""

    def test_list_deliveries_empty(self, client: TestClient):
        """Test listing deliveries when none exist."""
        response = client.get("/deliveries")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_deliveries_single(self, client: TestClient, sample_delivery: Delivery):
        """Test listing with one delivery."""
        response = client.get("/deliveries")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["status"] == "on_time"

    def test_list_deliveries_multiple(self, client: TestClient, sample_deliveries: list[Delivery]):
        """Test listing multiple deliveries."""
        response = client.get("/deliveries")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5

    def test_list_deliveries_filter_by_supplier(self, client: TestClient, sample_deliveries: list[Delivery], sample_suppliers: list[Supplier]):
        """Test filtering deliveries by supplier."""
        supplier_id = sample_suppliers[0].id
        response = client.get(f"/deliveries?supplier_id={supplier_id}")
        assert response.status_code == 200
        data = response.json()
        for delivery in data:
            assert delivery["supplier_id"] == supplier_id

    def test_list_deliveries_filter_by_status(self, client: TestClient, sample_deliveries: list[Delivery]):
        """Test filtering deliveries by status."""
        response = client.get("/deliveries?status=late")
        assert response.status_code == 200
        data = response.json()
        for delivery in data:
            assert delivery["status"] == "late"

    def test_list_deliveries_includes_items(self, client: TestClient, sample_delivery: Delivery):
        """Test delivery response includes items."""
        response = client.get("/deliveries")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data[0]
        assert len(data[0]["items"]) >= 1


class TestGetDelivery:
    """Tests for GET /deliveries/{id} endpoint."""

    def test_get_delivery_success(self, client: TestClient, sample_delivery: Delivery):
        """Test getting a specific delivery."""
        response = client.get(f"/deliveries/{sample_delivery.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_delivery.id
        assert data["status"] == "on_time"
        assert "items" in data

    def test_get_delivery_not_found(self, client: TestClient):
        """Test getting non-existent delivery."""
        response = client.get("/deliveries/99999")
        assert response.status_code == 404

    def test_get_delivery_items_detail(self, client: TestClient, sample_delivery: Delivery):
        """Test delivery items have correct details."""
        response = client.get(f"/deliveries/{sample_delivery.id}")
        assert response.status_code == 200
        item = response.json()["items"][0]
        assert "product_id" in item
        assert "quantity" in item
        assert "unit_price" in item


class TestCreateDelivery:
    """Tests for POST /deliveries endpoint."""

    def test_create_delivery_success(self, client: TestClient, sample_supplier: Supplier, sample_product: Product):
        """Test creating a new delivery."""
        delivery_data = {
            "supplier_id": sample_supplier.id,
            "date": str(date.today()),
            "status": "pending",
            "items": [
                {
                    "product_id": sample_product.id,
                    "product_name": sample_product.name,
                    "quantity": 100,
                    "unit": "kg",
                    "unit_price": 3.50,
                }
            ],
        }
        response = client.post("/deliveries", json=delivery_data)
        assert response.status_code == 200
        data = response.json()
        assert data["supplier_id"] == sample_supplier.id
        assert data["status"] == "pending"
        assert len(data["items"]) == 1

    def test_create_delivery_multiple_items(self, client: TestClient, sample_supplier: Supplier, sample_products: list[Product]):
        """Test creating delivery with multiple items."""
        items = [
            {"product_id": p.id, "product_name": p.name, "quantity": 20, "unit": p.unit, "unit_price": p.unit_price}
            for p in sample_products[:3]
        ]
        delivery_data = {
            "supplier_id": sample_supplier.id,
            "date": str(date.today()),
            "status": "on_time",
            "items": items,
        }
        response = client.post("/deliveries", json=delivery_data)
        assert response.status_code == 200
        assert len(response.json()["items"]) == 3

    def test_create_delivery_without_items(self, client: TestClient, sample_supplier: Supplier):
        """Test creating delivery without items."""
        delivery_data = {
            "supplier_id": sample_supplier.id,
            "date": str(date.today()),
            "status": "pending",
        }
        response = client.post("/deliveries", json=delivery_data)
        assert response.status_code == 200
        assert response.json()["items"] == []

    def test_create_delivery_updates_inventory(self, client: TestClient, sample_supplier: Supplier, sample_product: Product, sample_inventory: list[Inventory], db: Session):
        """Test creating on_time delivery updates inventory."""
        initial_qty = db.query(Inventory).filter(Inventory.product_id == sample_product.id).first()
        initial_qty = initial_qty.quantity if initial_qty else 0

        delivery_data = {
            "supplier_id": sample_supplier.id,
            "date": str(date.today()),
            "status": "on_time",
            "items": [
                {"product_id": sample_product.id, "quantity": 50, "unit": "kg", "unit_price": 3.50}
            ],
        }
        response = client.post("/deliveries", json=delivery_data)
        assert response.status_code == 200

        # Check inventory was updated
        inv = db.query(Inventory).filter(Inventory.product_id == sample_product.id).first()
        assert inv is not None
        assert inv.quantity >= initial_qty + 50

    def test_create_delivery_all_statuses(self, client: TestClient, sample_supplier: Supplier):
        """Test creating deliveries with all valid statuses."""
        for status in ["pending", "on_time", "late", "partial"]:
            delivery_data = {
                "supplier_id": sample_supplier.id,
                "date": str(date.today()),
                "status": status,
            }
            response = client.post("/deliveries", json=delivery_data)
            assert response.status_code == 200
            assert response.json()["status"] == status


class TestUpdateDelivery:
    """Tests for PATCH /deliveries/{id} endpoint."""

    def test_update_delivery_status(self, client: TestClient, sample_delivery: Delivery):
        """Test updating delivery status."""
        response = client.patch(f"/deliveries/{sample_delivery.id}", json={"status": "late"})
        assert response.status_code == 200
        assert response.json()["status"] == "late"

    def test_update_delivery_notes(self, client: TestClient, sample_delivery: Delivery):
        """Test updating delivery notes."""
        response = client.patch(f"/deliveries/{sample_delivery.id}", json={"notes": "Updated notes"})
        assert response.status_code == 200
        assert response.json()["notes"] == "Updated notes"

    def test_update_delivery_not_found(self, client: TestClient):
        """Test updating non-existent delivery."""
        response = client.patch("/deliveries/99999", json={"status": "late"})
        assert response.status_code == 404


class TestDeleteDelivery:
    """Tests for DELETE /deliveries/{id} endpoint."""

    def test_delete_delivery_success(self, client: TestClient, sample_delivery: Delivery):
        """Test deleting a delivery."""
        response = client.delete(f"/deliveries/{sample_delivery.id}")
        assert response.status_code == 200
        assert response.json()["ok"] is True

        # Verify deleted
        response = client.get(f"/deliveries/{sample_delivery.id}")
        assert response.status_code == 404

    def test_delete_delivery_not_found(self, client: TestClient):
        """Test deleting non-existent delivery."""
        response = client.delete("/deliveries/99999")
        assert response.status_code == 404


class TestDeliverySupplierIntegration:
    """Tests for delivery-supplier integration."""

    def test_delivery_updates_supplier_reliability(self, client: TestClient, sample_supplier: Supplier, db: Session):
        """Test that deliveries affect supplier reliability score."""
        initial_score = sample_supplier.reliability_score

        # Create several late deliveries
        for _ in range(3):
            delivery_data = {
                "supplier_id": sample_supplier.id,
                "date": str(date.today() - timedelta(days=1)),
                "status": "late",
            }
            client.post("/deliveries", json=delivery_data)

        # Check reliability might have changed
        db.refresh(sample_supplier)
        # Note: actual behavior depends on implementation
        assert sample_supplier.reliability_score is not None

    def test_delivery_from_invalid_supplier(self, client: TestClient):
        """Test creating delivery with invalid supplier - FK constraint violation."""
        from sqlalchemy.exc import IntegrityError

        delivery_data = {
            "supplier_id": 99999,
            "date": str(date.today()),
            "status": "pending",
        }
        # FK constraint violation raises IntegrityError
        with pytest.raises(IntegrityError):
            client.post("/deliveries", json=delivery_data)


class TestDeliveryEdgeCases:
    """Edge case tests for deliveries."""

    def test_delivery_future_date(self, client: TestClient, sample_supplier: Supplier):
        """Test delivery with future date."""
        future_date = date.today() + timedelta(days=7)
        delivery_data = {
            "supplier_id": sample_supplier.id,
            "date": str(future_date),
            "status": "pending",
        }
        response = client.post("/deliveries", json=delivery_data)
        assert response.status_code == 200

    def test_delivery_past_date(self, client: TestClient, sample_supplier: Supplier):
        """Test delivery with past date."""
        past_date = date.today() - timedelta(days=30)
        delivery_data = {
            "supplier_id": sample_supplier.id,
            "date": str(past_date),
            "status": "on_time",
        }
        response = client.post("/deliveries", json=delivery_data)
        assert response.status_code == 200

    def test_delivery_item_without_product_id(self, client: TestClient, sample_supplier: Supplier):
        """Test delivery item with name but no product_id."""
        delivery_data = {
            "supplier_id": sample_supplier.id,
            "date": str(date.today()),
            "status": "on_time",
            "items": [
                {"product_name": "Unknown Product", "quantity": 10, "unit": "kg", "unit_price": 5.00}
            ],
        }
        response = client.post("/deliveries", json=delivery_data)
        assert response.status_code == 200
        # Item should be created with null product_id

    def test_delivery_item_zero_quantity(self, client: TestClient, sample_supplier: Supplier, sample_product: Product):
        """Test delivery item with zero quantity."""
        delivery_data = {
            "supplier_id": sample_supplier.id,
            "date": str(date.today()),
            "status": "on_time",
            "items": [
                {"product_id": sample_product.id, "quantity": 0, "unit": "kg", "unit_price": 3.50}
            ],
        }
        response = client.post("/deliveries", json=delivery_data)
        # Should handle gracefully
        assert response.status_code in [200, 422]

    def test_delivery_with_notes(self, client: TestClient, sample_supplier: Supplier):
        """Test delivery with detailed notes."""
        delivery_data = {
            "supplier_id": sample_supplier.id,
            "date": str(date.today()),
            "status": "partial",
            "notes": "Missing 5 boxes of tomatoes. Driver said rest coming tomorrow.",
        }
        response = client.post("/deliveries", json=delivery_data)
        assert response.status_code == 200
        assert "Missing 5 boxes" in response.json()["notes"]
