"""
Comprehensive tests for the Orders API endpoints.
Tests cover CRUD, inventory deduction, date filters, and edge cases.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.models.order import Order, OrderItem
from app.models.recipe import Recipe, RecipeIngredient
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.location import Location


class TestListOrders:
    """Tests for GET /orders endpoint."""

    def test_list_orders_empty(self, client: TestClient):
        """Test listing orders when empty."""
        response = client.get("/orders")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_orders_single(self, client: TestClient, sample_order: Order):
        """Test listing with one order."""
        response = client.get("/orders")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == sample_order.id

    def test_list_orders_filter_by_location(self, client: TestClient, sample_order: Order, sample_location: Location):
        """Test filtering orders by location."""
        response = client.get(f"/orders?location_id={sample_location.id}")
        assert response.status_code == 200
        data = response.json()
        for order in data:
            assert order["location_id"] == sample_location.id

    def test_list_orders_filter_by_date_range(self, client: TestClient, sample_order: Order):
        """Test filtering orders by date range."""
        start_date = (date.today() - timedelta(days=7)).isoformat()
        end_date = date.today().isoformat()
        response = client.get(f"/orders?start_date={start_date}&end_date={end_date}")
        assert response.status_code == 200

    def test_list_orders_includes_items(self, client: TestClient, sample_order: Order):
        """Test order response includes items."""
        response = client.get("/orders")
        assert response.status_code == 200
        order = response.json()[0]
        assert "items" in order
        assert len(order["items"]) >= 1

    def test_list_orders_pagination(self, client: TestClient, sample_order: Order, db: Session, sample_recipe: Recipe):
        """Test orders pagination."""
        # Create additional orders
        for i in range(5):
            order = Order(date=date.today(), total=100.00 * (i + 1))
            db.add(order)
        db.commit()

        response = client.get("/orders?skip=0&limit=3")
        assert response.status_code == 200
        assert len(response.json()) == 3


class TestGetOrder:
    """Tests for GET /orders/{id} endpoint."""

    def test_get_order_success(self, client: TestClient, sample_order: Order):
        """Test getting specific order."""
        response = client.get(f"/orders/{sample_order.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_order.id

    def test_get_order_not_found(self, client: TestClient):
        """Test getting non-existent order."""
        response = client.get("/orders/99999")
        assert response.status_code == 404

    def test_get_order_includes_item_details(self, client: TestClient, sample_order: Order):
        """Test order items have correct details."""
        response = client.get(f"/orders/{sample_order.id}")
        assert response.status_code == 200
        item = response.json()["items"][0]
        assert "recipe_id" in item
        assert "quantity" in item
        assert "unit_price" in item
        assert "recipe_name" in item


class TestCreateOrder:
    """Tests for POST /orders endpoint."""

    def test_create_order_success(self, client: TestClient, sample_recipe: Recipe, sample_location: Location):
        """Test creating a new order."""
        order_data = {
            "location_id": sample_location.id,
            "date": str(date.today()),
            "items": [
                {"recipe_id": sample_recipe.id, "quantity": 2, "unit_price": sample_recipe.price}
            ],
        }
        response = client.post("/orders", json=order_data)
        assert response.status_code == 200
        data = response.json()
        assert data["location_id"] == sample_location.id
        assert len(data["items"]) == 1

    def test_create_order_multiple_items(self, client: TestClient, sample_recipes: list[Recipe]):
        """Test creating order with multiple items."""
        items = [
            {"recipe_id": r.id, "quantity": 1, "unit_price": r.price}
            for r in sample_recipes[:3]
        ]
        order_data = {
            "date": str(date.today()),
            "items": items,
        }
        response = client.post("/orders", json=order_data)
        assert response.status_code == 200
        assert len(response.json()["items"]) == 3

    def test_create_order_calculates_total(self, client: TestClient, sample_recipe: Recipe):
        """Test order total is auto-calculated from items."""
        order_data = {
            "date": str(date.today()),
            "items": [
                {"recipe_id": sample_recipe.id, "quantity": 3, "unit_price": 10.00}
            ],
        }
        response = client.post("/orders", json=order_data)
        assert response.status_code == 200
        assert response.json()["total"] == 30.00

    def test_create_order_deducts_inventory(
        self, client: TestClient, sample_recipe: Recipe, sample_inventory: list[Inventory], db: Session
    ):
        """Test creating order deducts inventory based on recipe ingredients."""
        # Get initial inventory for first ingredient
        recipe = db.query(Recipe).filter(Recipe.id == sample_recipe.id).first()
        if recipe.ingredients:
            product_id = recipe.ingredients[0].product_id
            initial_inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
            initial_qty = initial_inv.quantity if initial_inv else 0

            order_data = {
                "date": str(date.today()),
                "items": [
                    {"recipe_id": sample_recipe.id, "quantity": 2, "unit_price": recipe.price}
                ],
            }
            response = client.post("/orders", json=order_data)
            assert response.status_code == 200

            # Verify inventory was deducted
            db.expire_all()
            updated_inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
            if updated_inv:
                assert updated_inv.quantity < initial_qty

    def test_create_order_without_location(self, client: TestClient, sample_recipe: Recipe):
        """Test creating order without location."""
        order_data = {
            "date": str(date.today()),
            "items": [
                {"recipe_id": sample_recipe.id, "quantity": 1, "unit_price": 10.00}
            ],
        }
        response = client.post("/orders", json=order_data)
        assert response.status_code == 200
        assert response.json()["location_id"] is None


class TestDeleteOrder:
    """Tests for DELETE /orders/{id} endpoint."""

    def test_delete_order_success(self, client: TestClient, sample_order: Order):
        """Test deleting an order."""
        response = client.delete(f"/orders/{sample_order.id}")
        assert response.status_code == 200
        assert response.json()["ok"] is True

        # Verify deleted
        response = client.get(f"/orders/{sample_order.id}")
        assert response.status_code == 404

    def test_delete_order_not_found(self, client: TestClient):
        """Test deleting non-existent order."""
        response = client.delete("/orders/99999")
        assert response.status_code == 404


class TestOrderInventoryIntegration:
    """Tests for order-inventory integration."""

    def test_order_deducts_with_waste_factor(
        self, client: TestClient, db: Session, sample_products: list[Product], sample_location: Location
    ):
        """Test inventory deduction includes waste percentage."""
        # Create a recipe with known waste %
        recipe = Recipe(name="Test Recipe", price=10.00, is_active=True)
        db.add(recipe)
        db.flush()

        # Add ingredient with 10% waste
        ing = RecipeIngredient(
            recipe_id=recipe.id,
            product_id=sample_products[0].id,
            quantity=1.0,
            waste_pct=10,
        )
        db.add(ing)

        # Create inventory with known quantity
        inv = Inventory(
            product_id=sample_products[0].id,
            quantity=100.0,
            location_id=sample_location.id,
        )
        db.add(inv)
        db.commit()

        # Create order for 2 units
        order_data = {
            "date": str(date.today()),
            "items": [{"recipe_id": recipe.id, "quantity": 2, "unit_price": 10.00}],
        }
        response = client.post("/orders", json=order_data)
        assert response.status_code == 200

        # Expected deduction: 1.0 * 2 * 1.10 = 2.2
        db.expire_all()
        updated_inv = db.query(Inventory).filter(Inventory.product_id == sample_products[0].id).first()
        assert updated_inv.quantity == pytest.approx(97.8, rel=0.01)


class TestOrderEdgeCases:
    """Edge case tests for orders."""

    def test_order_zero_quantity(self, client: TestClient, sample_recipe: Recipe):
        """Test order item with zero quantity."""
        order_data = {
            "date": str(date.today()),
            "items": [
                {"recipe_id": sample_recipe.id, "quantity": 0, "unit_price": 10.00}
            ],
        }
        response = client.post("/orders", json=order_data)
        # Should accept - total would be 0
        assert response.status_code == 200
        assert response.json()["total"] == 0

    def test_order_future_date(self, client: TestClient, sample_recipe: Recipe):
        """Test order with future date."""
        future_date = date.today() + timedelta(days=7)
        order_data = {
            "date": str(future_date),
            "items": [
                {"recipe_id": sample_recipe.id, "quantity": 1, "unit_price": 10.00}
            ],
        }
        response = client.post("/orders", json=order_data)
        assert response.status_code == 200

    def test_order_past_date(self, client: TestClient, sample_recipe: Recipe):
        """Test order with past date."""
        past_date = date.today() - timedelta(days=30)
        order_data = {
            "date": str(past_date),
            "items": [
                {"recipe_id": sample_recipe.id, "quantity": 1, "unit_price": 10.00}
            ],
        }
        response = client.post("/orders", json=order_data)
        assert response.status_code == 200

    def test_order_large_quantity(self, client: TestClient, sample_recipe: Recipe):
        """Test order with large quantity."""
        order_data = {
            "date": str(date.today()),
            "items": [
                {"recipe_id": sample_recipe.id, "quantity": 9999, "unit_price": 10.00}
            ],
        }
        response = client.post("/orders", json=order_data)
        assert response.status_code == 200
        assert response.json()["total"] == 99990.00

    def test_order_decimal_quantity(self, client: TestClient, sample_recipe: Recipe):
        """Test order with decimal quantity - rejected as schema uses int."""
        order_data = {
            "date": str(date.today()),
            "items": [
                {"recipe_id": sample_recipe.id, "quantity": 2.5, "unit_price": 10.00}
            ],
        }
        response = client.post("/orders", json=order_data)
        # Schema requires integer quantity
        assert response.status_code == 422

    def test_order_empty_items(self, client: TestClient):
        """Test order with no items."""
        order_data = {
            "date": str(date.today()),
            "items": [],
        }
        response = client.post("/orders", json=order_data)
        assert response.status_code == 200
        assert response.json()["total"] == 0
        assert response.json()["items"] == []

    def test_order_invalid_recipe(self, client: TestClient):
        """Test order with non-existent recipe - FK constraint violation."""
        from sqlalchemy.exc import IntegrityError

        order_data = {
            "date": str(date.today()),
            "items": [
                {"recipe_id": 99999, "quantity": 1, "unit_price": 10.00}
            ],
        }
        # FK constraint violation raises IntegrityError
        with pytest.raises(IntegrityError):
            client.post("/orders", json=order_data)
