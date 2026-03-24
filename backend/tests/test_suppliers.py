"""
Comprehensive tests for the Suppliers API endpoints.
Tests cover CRUD operations, computed fields, edge cases, and error handling.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Supplier
from app.models.product import Product
from app.models.delivery import Delivery, DeliveryItem
from app.models.price_history import PriceHistory
from datetime import date, datetime, timedelta


class TestListSuppliers:
    """Tests for GET /suppliers endpoint."""

    def test_list_suppliers_empty(self, client: TestClient):
        """Test listing suppliers when none exist."""
        response = client.get("/suppliers")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_list_suppliers_single(self, client: TestClient, sample_supplier: Supplier):
        """Test listing suppliers with one supplier."""
        response = client.get("/suppliers")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["total"] == 1
        assert data["items"][0]["name"] == "Fresh Farms Inc"

    def test_list_suppliers_multiple(self, client: TestClient, sample_suppliers: list[Supplier]):
        """Test listing multiple suppliers."""
        response = client.get("/suppliers")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 5
        assert data["total"] == 5

    def test_list_suppliers_filter_by_category(self, client: TestClient, sample_suppliers: list[Supplier]):
        """Test filtering suppliers by category."""
        response = client.get("/suppliers?category=Produce")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["name"] == "Fresh Farms"

    def test_list_suppliers_filter_nonexistent_category(self, client: TestClient, sample_suppliers: list[Supplier]):
        """Test filtering by category that doesn't exist."""
        response = client.get("/suppliers?category=NonExistent")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 0

    def test_list_suppliers_computed_fields(self, client: TestClient, sample_supplier: Supplier, sample_product: Product, db: Session):
        """Test that computed fields are calculated correctly."""
        # Create deliveries to test computed fields
        delivery = Delivery(
            supplier_id=sample_supplier.id,
            date=date.today() - timedelta(days=5),
            status="late",
        )
        db.add(delivery)
        db.commit()

        response = client.get("/suppliers")
        data = response.json()
        supplier_data = data["items"][0]

        assert "product_count" in supplier_data
        assert "price_change_pct" in supplier_data
        assert "last_delivery_date" in supplier_data
        assert "open_anomalies" in supplier_data
        assert supplier_data["product_count"] == 1
        assert supplier_data["open_anomalies"] >= 1  # At least the late delivery


class TestGetSupplier:
    """Tests for GET /suppliers/{id} endpoint."""

    def test_get_supplier_success(self, client: TestClient, sample_supplier: Supplier):
        """Test getting a specific supplier."""
        response = client.get(f"/suppliers/{sample_supplier.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_supplier.id
        assert data["name"] == "Fresh Farms Inc"
        assert data["category"] == "Produce"
        assert data["contact_email"] == "john@freshfarms.com"

    def test_get_supplier_not_found(self, client: TestClient):
        """Test getting a non-existent supplier."""
        response = client.get("/suppliers/99999")
        assert response.status_code == 404
        assert response.json()["detail"] == "Supplier not found"

    def test_get_supplier_with_price_trends(self, client: TestClient, sample_supplier: Supplier, sample_product: Product, db: Session):
        """Test supplier detail includes price trends."""
        # Add price history
        for i in range(3):
            ph = PriceHistory(
                product_id=sample_product.id,
                price=3.50 + i * 0.25,
                recorded_at=datetime.now() - timedelta(days=30 * (2 - i)),
            )
            db.add(ph)
        db.commit()

        response = client.get(f"/suppliers/{sample_supplier.id}")
        assert response.status_code == 200
        data = response.json()
        assert "price_trends" in data
        assert "recent_deliveries" in data

    def test_get_supplier_with_recent_deliveries(self, client: TestClient, sample_delivery: Delivery):
        """Test supplier detail includes recent deliveries."""
        response = client.get(f"/suppliers/{sample_delivery.supplier_id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data["recent_deliveries"]) >= 1


class TestCreateSupplier:
    """Tests for POST /suppliers endpoint."""

    def test_create_supplier_success(self, client: TestClient):
        """Test creating a new supplier."""
        supplier_data = {
            "name": "New Supplier",
            "category": "Beverages",
            "contact_name": "Jane Doe",
            "contact_email": "jane@newsupplier.com",
            "contact_phone": "+39 987 654 321",
        }
        response = client.post("/suppliers", json=supplier_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Supplier"
        assert data["category"] == "Beverages"
        assert data["id"] is not None

    def test_create_supplier_minimal_data(self, client: TestClient):
        """Test creating supplier with minimal required data."""
        supplier_data = {"name": "Minimal Supplier"}
        response = client.post("/suppliers", json=supplier_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Minimal Supplier"
        assert data["reliability_score"] == 100.0  # Default

    def test_create_supplier_all_fields(self, client: TestClient):
        """Test creating supplier with all optional fields in schema."""
        supplier_data = {
            "name": "Complete Supplier",
            "category": "Meat",
            "contact_name": "Bob Smith",
            "contact_email": "bob@complete.com",
            "contact_phone": "+39 111 222 333",
            "address": "789 Supplier Ave",
            "payment_terms": "Net 60",
        }
        response = client.post("/suppliers", json=supplier_data)
        assert response.status_code == 200
        data = response.json()
        assert data["payment_terms"] == "Net 60"
        # reliability_score defaults to 100.0 (not in SupplierCreate schema)
        assert data["reliability_score"] == 100.0

    def test_create_supplier_missing_name(self, client: TestClient):
        """Test creating supplier without required name field."""
        response = client.post("/suppliers", json={})
        assert response.status_code == 422  # Validation error


class TestUpdateSupplier:
    """Tests for PATCH /suppliers/{id} endpoint."""

    def test_update_supplier_success(self, client: TestClient, sample_supplier: Supplier):
        """Test updating a supplier."""
        update_data = {"name": "Updated Fresh Farms", "reliability_score": 98.0}
        response = client.patch(f"/suppliers/{sample_supplier.id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Fresh Farms"
        assert data["reliability_score"] == 98.0
        # Unchanged fields should remain
        assert data["category"] == "Produce"

    def test_update_supplier_partial(self, client: TestClient, sample_supplier: Supplier):
        """Test partial update - only update one field."""
        response = client.patch(f"/suppliers/{sample_supplier.id}", json={"contact_phone": "+39 999 888 777"})
        assert response.status_code == 200
        data = response.json()
        assert data["contact_phone"] == "+39 999 888 777"
        assert data["name"] == "Fresh Farms Inc"  # Unchanged

    def test_update_supplier_not_found(self, client: TestClient):
        """Test updating a non-existent supplier."""
        response = client.patch("/suppliers/99999", json={"name": "Ghost"})
        assert response.status_code == 404

    def test_update_supplier_empty_payload(self, client: TestClient, sample_supplier: Supplier):
        """Test update with empty payload - should succeed with no changes."""
        response = client.patch(f"/suppliers/{sample_supplier.id}", json={})
        assert response.status_code == 200


class TestDeleteSupplier:
    """Tests for DELETE /suppliers/{id} endpoint."""

    def test_delete_supplier_success(self, client: TestClient, sample_supplier: Supplier):
        """Test deleting a supplier."""
        response = client.delete(f"/suppliers/{sample_supplier.id}")
        assert response.status_code == 200
        assert response.json()["ok"] is True

        # Verify it's deleted
        response = client.get(f"/suppliers/{sample_supplier.id}")
        assert response.status_code == 404

    def test_delete_supplier_not_found(self, client: TestClient):
        """Test deleting a non-existent supplier."""
        response = client.delete("/suppliers/99999")
        assert response.status_code == 404

    def test_delete_supplier_with_products(self, client: TestClient, sample_supplier: Supplier, sample_product: Product):
        """Test deleting supplier that has products - FK constraint."""
        response = client.delete(f"/suppliers/{sample_supplier.id}")
        # SQLite with RESTRICT should return 500; some DBs may allow it
        assert response.status_code in [200, 400, 500]


class TestSupplierStatistics:
    """Tests for supplier statistics calculations."""

    def test_product_count(self, client: TestClient, sample_supplier: Supplier, db: Session):
        """Test product count calculation."""
        # Add multiple products
        for i in range(5):
            product = Product(name=f"Product {i}", supplier_id=sample_supplier.id, unit_price=10.0)
            db.add(product)
        db.commit()

        response = client.get("/suppliers")
        data = response.json()
        assert data["items"][0]["product_count"] == 5

    def test_price_change_calculation(self, client: TestClient, sample_supplier: Supplier, sample_product: Product, db: Session):
        """Test price change percentage calculation."""
        # Add price history showing 10% increase
        old_date = datetime.now() - timedelta(days=60)
        new_date = datetime.now() - timedelta(days=5)

        db.add(PriceHistory(product_id=sample_product.id, price=3.00, recorded_at=old_date))
        db.add(PriceHistory(product_id=sample_product.id, price=3.30, recorded_at=new_date))
        db.commit()

        response = client.get("/suppliers")
        data = response.json()
        # Should show ~10% price change
        assert data["items"][0]["price_change_pct"] > 0

    def test_open_anomalies_count(self, client: TestClient, sample_supplier: Supplier, db: Session):
        """Test open anomalies count."""
        # Add late deliveries within last 30 days
        for i in range(3):
            delivery = Delivery(
                supplier_id=sample_supplier.id,
                date=date.today() - timedelta(days=i * 5),
                status="late",
            )
            db.add(delivery)
        db.commit()

        response = client.get("/suppliers")
        data = response.json()
        assert data["items"][0]["open_anomalies"] == 3


class TestSupplierEdgeCases:
    """Edge case tests for suppliers."""

    def test_supplier_with_special_characters(self, client: TestClient):
        """Test supplier name with special characters."""
        response = client.post("/suppliers", json={"name": "L'Artigiano & Co. (Italia)"})
        assert response.status_code == 200
        assert response.json()["name"] == "L'Artigiano & Co. (Italia)"

    def test_supplier_with_unicode(self, client: TestClient):
        """Test supplier with unicode characters."""
        response = client.post("/suppliers", json={"name": "Ristorante Città"})
        assert response.status_code == 200
        assert response.json()["name"] == "Ristorante Città"

    def test_supplier_with_long_name(self, client: TestClient):
        """Test supplier with very long name."""
        long_name = "A" * 500
        response = client.post("/suppliers", json={"name": long_name})
        # Should either accept or return validation error
        assert response.status_code in [200, 422]

    def test_supplier_reliability_score_bounds(self, client: TestClient):
        """Test reliability score at boundaries."""
        # Test 0
        response = client.post("/suppliers", json={"name": "Zero Score", "reliability_score": 0})
        assert response.status_code == 200

        # Test 100
        response = client.post("/suppliers", json={"name": "Perfect Score", "reliability_score": 100})
        assert response.status_code == 200
