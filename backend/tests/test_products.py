"""
Comprehensive tests for the Products API endpoints.
Tests cover CRUD operations, price history, edge cases, and error handling.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Supplier
from app.models.product import Product
from app.models.price_history import PriceHistory


class TestListProducts:
    """Tests for GET /products endpoint."""

    def test_list_products_empty(self, client: TestClient):
        """Test listing products when none exist."""
        response = client.get("/products")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_products_single(self, client: TestClient, sample_product: Product):
        """Test listing with one product."""
        response = client.get("/products")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Tomatoes"

    def test_list_products_multiple(self, client: TestClient, sample_products: list[Product]):
        """Test listing multiple products."""
        response = client.get("/products")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 8

    def test_list_products_filter_by_category(self, client: TestClient, sample_products: list[Product]):
        """Test filtering products by category."""
        response = client.get("/products?category=Produce")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["category"] == "Produce"

    def test_list_products_filter_by_supplier(self, client: TestClient, sample_products: list[Product], sample_suppliers: list[Supplier]):
        """Test filtering products by supplier."""
        supplier_id = sample_suppliers[0].id
        response = client.get(f"/products?supplier_id={supplier_id}")
        assert response.status_code == 200
        data = response.json()
        # Should return products from Fresh Farms
        for product in data:
            assert product["supplier_id"] == supplier_id

    def test_list_products_filter_combined(self, client: TestClient, sample_products: list[Product], sample_suppliers: list[Supplier]):
        """Test filtering by both category and supplier."""
        supplier_id = sample_suppliers[0].id
        response = client.get(f"/products?category=Produce&supplier_id={supplier_id}")
        assert response.status_code == 200
        data = response.json()
        for product in data:
            assert product["category"] == "Produce"
            assert product["supplier_id"] == supplier_id


class TestGetProduct:
    """Tests for GET /products/{id} endpoint."""

    def test_get_product_success(self, client: TestClient, sample_product: Product):
        """Test getting a specific product."""
        response = client.get(f"/products/{sample_product.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_product.id
        assert data["name"] == "Tomatoes"
        assert data["unit"] == "kg"
        assert data["unit_price"] == 3.50

    def test_get_product_not_found(self, client: TestClient):
        """Test getting a non-existent product."""
        response = client.get("/products/99999")
        assert response.status_code == 404
        assert response.json()["detail"] == "Product not found"

    def test_get_product_with_supplier(self, client: TestClient, sample_product: Product):
        """Test product response includes supplier_id."""
        response = client.get(f"/products/{sample_product.id}")
        assert response.status_code == 200
        data = response.json()
        assert "supplier_id" in data
        assert data["supplier_id"] is not None


class TestCreateProduct:
    """Tests for POST /products endpoint."""

    def test_create_product_success(self, client: TestClient, sample_supplier: Supplier):
        """Test creating a new product."""
        product_data = {
            "name": "New Product",
            "category": "Produce",
            "unit": "kg",
            "unit_price": 5.00,
            "supplier_id": sample_supplier.id,
            "min_stock": 15,
        }
        response = client.post("/products", json=product_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Product"
        assert data["unit_price"] == 5.00

    def test_create_product_minimal(self, client: TestClient):
        """Test creating product with minimal data."""
        product_data = {"name": "Minimal Product", "unit_price": 1.00}
        response = client.post("/products", json=product_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Minimal Product"
        assert data["min_stock"] == 0  # Default

    def test_create_product_with_sku(self, client: TestClient, sample_supplier: Supplier):
        """Test creating product with SKU."""
        product_data = {
            "name": "SKU Product",
            "unit_price": 10.00,
            "sku": "SKU-12345",
            "supplier_id": sample_supplier.id,
        }
        response = client.post("/products", json=product_data)
        assert response.status_code == 200
        assert response.json()["sku"] == "SKU-12345"

    def test_create_product_missing_name(self, client: TestClient):
        """Test creating product without name."""
        response = client.post("/products", json={"unit_price": 5.00})
        assert response.status_code == 422

    def test_create_product_creates_price_history(self, client: TestClient, sample_supplier: Supplier, db: Session):
        """Test that creating a product records price history."""
        product_data = {
            "name": "Price History Test",
            "unit_price": 7.50,
            "supplier_id": sample_supplier.id,
        }
        response = client.post("/products", json=product_data)
        assert response.status_code == 200
        product_id = response.json()["id"]

        # Check price history was created
        history = db.query(PriceHistory).filter(PriceHistory.product_id == product_id).all()
        assert len(history) == 1
        assert history[0].price == 7.50


class TestUpdateProduct:
    """Tests for PATCH /products/{id} endpoint."""

    def test_update_product_success(self, client: TestClient, sample_product: Product):
        """Test updating a product."""
        update_data = {"name": "Updated Tomatoes", "unit_price": 4.00}
        response = client.patch(f"/products/{sample_product.id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Tomatoes"
        assert data["unit_price"] == 4.00

    def test_update_product_partial(self, client: TestClient, sample_product: Product):
        """Test partial update."""
        response = client.patch(f"/products/{sample_product.id}", json={"min_stock": 25})
        assert response.status_code == 200
        data = response.json()
        assert data["min_stock"] == 25
        assert data["name"] == "Tomatoes"  # Unchanged

    def test_update_product_price_creates_history(self, client: TestClient, sample_product: Product, db: Session):
        """Test that updating price records history."""
        initial_count = db.query(PriceHistory).filter(PriceHistory.product_id == sample_product.id).count()

        response = client.patch(f"/products/{sample_product.id}", json={"unit_price": 5.00})
        assert response.status_code == 200

        # Check new price history entry
        new_count = db.query(PriceHistory).filter(PriceHistory.product_id == sample_product.id).count()
        assert new_count == initial_count + 1

    def test_update_product_not_found(self, client: TestClient):
        """Test updating non-existent product."""
        response = client.patch("/products/99999", json={"name": "Ghost"})
        assert response.status_code == 404

    def test_update_product_change_supplier(self, client: TestClient, sample_product: Product, sample_suppliers: list[Supplier]):
        """Test changing product's supplier."""
        new_supplier_id = sample_suppliers[1].id
        response = client.patch(f"/products/{sample_product.id}", json={"supplier_id": new_supplier_id})
        assert response.status_code == 200
        assert response.json()["supplier_id"] == new_supplier_id


class TestDeleteProduct:
    """Tests for DELETE /products/{id} endpoint."""

    def test_delete_product_success(self, client: TestClient, sample_product: Product):
        """Test deleting a product."""
        response = client.delete(f"/products/{sample_product.id}")
        assert response.status_code == 200
        assert response.json()["ok"] is True

        # Verify it's deleted
        response = client.get(f"/products/{sample_product.id}")
        assert response.status_code == 404

    def test_delete_product_not_found(self, client: TestClient):
        """Test deleting non-existent product."""
        response = client.delete("/products/99999")
        assert response.status_code == 404


class TestProductEdgeCases:
    """Edge case tests for products."""

    def test_product_zero_price(self, client: TestClient):
        """Test product with zero price."""
        response = client.post("/products", json={"name": "Free Sample", "unit_price": 0})
        assert response.status_code == 200
        assert response.json()["unit_price"] == 0

    def test_product_high_price(self, client: TestClient):
        """Test product with very high price."""
        response = client.post("/products", json={"name": "Luxury Item", "unit_price": 99999.99})
        assert response.status_code == 200
        assert response.json()["unit_price"] == 99999.99

    def test_product_decimal_precision(self, client: TestClient):
        """Test price decimal precision."""
        response = client.post("/products", json={"name": "Precise Price", "unit_price": 3.456})
        assert response.status_code == 200
        # Should handle decimal precision

    def test_product_null_supplier(self, client: TestClient):
        """Test product without supplier."""
        response = client.post("/products", json={"name": "No Supplier", "unit_price": 5.00})
        assert response.status_code == 200
        assert response.json()["supplier_id"] is None

    def test_product_special_characters_name(self, client: TestClient):
        """Test product with special characters in name."""
        response = client.post("/products", json={"name": "Parmesan (D.O.P.) - 24 months", "unit_price": 28.00})
        assert response.status_code == 200
        assert response.json()["name"] == "Parmesan (D.O.P.) - 24 months"

    def test_product_unicode_name(self, client: TestClient):
        """Test product with unicode characters."""
        response = client.post("/products", json={"name": "Mozzarella di Búfala", "unit_price": 15.00})
        assert response.status_code == 200


class TestProductInventoryIntegration:
    """Tests for product inventory integration."""

    def test_product_has_min_stock(self, client: TestClient, sample_product: Product):
        """Test product min_stock field."""
        response = client.get(f"/products/{sample_product.id}")
        assert response.status_code == 200
        data = response.json()
        assert "min_stock" in data
        assert data["min_stock"] == 10

    def test_update_min_stock(self, client: TestClient, sample_product: Product):
        """Test updating product min_stock."""
        response = client.patch(f"/products/{sample_product.id}", json={"min_stock": 50})
        assert response.status_code == 200
        assert response.json()["min_stock"] == 50
