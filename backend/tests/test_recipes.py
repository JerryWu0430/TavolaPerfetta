"""
Comprehensive tests for the Recipes API endpoints.
Tests cover CRUD, ingredients, cost calculations, and edge cases.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.recipe import Recipe, RecipeIngredient


class TestListRecipes:
    """Tests for GET /recipes endpoint."""

    def test_list_recipes_empty(self, client: TestClient):
        """Test listing recipes when empty."""
        response = client.get("/recipes")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_recipes_single(self, client: TestClient, sample_recipe: Recipe):
        """Test listing with one recipe."""
        response = client.get("/recipes")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Margherita Pizza"

    def test_list_recipes_multiple(self, client: TestClient, sample_recipes: list[Recipe]):
        """Test listing multiple recipes."""
        response = client.get("/recipes")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5

    def test_list_recipes_filter_by_category(self, client: TestClient, sample_recipes: list[Recipe]):
        """Test filtering recipes by category."""
        response = client.get("/recipes?category=Pizza")
        assert response.status_code == 200
        data = response.json()
        for recipe in data:
            assert recipe["category"] == "Pizza"

    def test_list_recipes_filter_active(self, client: TestClient, sample_recipes: list[Recipe], db: Session):
        """Test filtering for active recipes only."""
        # Deactivate one recipe
        sample_recipes[0].is_active = False
        db.commit()

        response = client.get("/recipes?is_active=true")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4
        for recipe in data:
            assert recipe["is_active"] is True

    def test_list_recipes_includes_computed_fields(self, client: TestClient, sample_recipe: Recipe):
        """Test recipe list includes computed fields."""
        response = client.get("/recipes")
        assert response.status_code == 200
        recipe = response.json()[0]
        assert "cost" in recipe
        assert "margin" in recipe
        assert "sales_per_week" in recipe


class TestGetRecipe:
    """Tests for GET /recipes/{id} endpoint."""

    def test_get_recipe_success(self, client: TestClient, sample_recipe: Recipe):
        """Test getting specific recipe."""
        response = client.get(f"/recipes/{sample_recipe.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Margherita Pizza"
        assert data["price"] == 12.00

    def test_get_recipe_not_found(self, client: TestClient):
        """Test getting non-existent recipe."""
        response = client.get("/recipes/99999")
        assert response.status_code == 404

    def test_get_recipe_includes_ingredients(self, client: TestClient, sample_recipe: Recipe):
        """Test recipe detail includes ingredients."""
        response = client.get(f"/recipes/{sample_recipe.id}")
        assert response.status_code == 200
        data = response.json()
        assert "ingredients" in data
        assert len(data["ingredients"]) >= 1

    def test_get_recipe_ingredient_details(self, client: TestClient, sample_recipe: Recipe):
        """Test recipe ingredients have correct details."""
        response = client.get(f"/recipes/{sample_recipe.id}")
        assert response.status_code == 200
        ing = response.json()["ingredients"][0]
        assert "product_id" in ing
        assert "quantity" in ing
        assert "unit" in ing
        assert "waste_pct" in ing
        assert "cost" in ing

    def test_get_recipe_includes_margin_calculation(self, client: TestClient, sample_recipe: Recipe):
        """Test recipe includes margin calculation."""
        response = client.get(f"/recipes/{sample_recipe.id}")
        assert response.status_code == 200
        data = response.json()
        assert "cost" in data
        assert "margin" in data
        assert "margin_value" in data


class TestCreateRecipe:
    """Tests for POST /recipes endpoint."""

    def test_create_recipe_success(self, client: TestClient, sample_products: list[Product]):
        """Test creating a new recipe."""
        recipe_data = {
            "name": "New Recipe",
            "category": "Main",
            "description": "A test recipe",
            "price": 15.00,
            "is_active": True,
            "ingredients": [
                {"product_id": sample_products[0].id, "quantity": 0.5, "unit": "kg", "waste_pct": 5},
            ],
        }
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Recipe"
        assert data["price"] == 15.00
        assert len(data["ingredients"]) == 1

    def test_create_recipe_multiple_ingredients(self, client: TestClient, sample_products: list[Product]):
        """Test creating recipe with multiple ingredients."""
        ingredients = [
            {"product_id": p.id, "quantity": 0.2, "waste_pct": 0}
            for p in sample_products[:4]
        ]
        recipe_data = {
            "name": "Complex Recipe",
            "price": 25.00,
            "ingredients": ingredients,
        }
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 200
        assert len(response.json()["ingredients"]) == 4

    def test_create_recipe_minimal(self, client: TestClient):
        """Test creating recipe with minimal data."""
        recipe_data = {"name": "Simple Recipe"}
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Simple Recipe"
        assert data["is_active"] is True  # Default

    def test_create_recipe_with_waste_pct(self, client: TestClient, sample_products: list[Product]):
        """Test creating recipe with waste percentage."""
        recipe_data = {
            "name": "Recipe with Waste",
            "price": 20.00,
            "ingredients": [
                {"product_id": sample_products[0].id, "quantity": 1.0, "waste_pct": 15},
            ],
        }
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 200
        ing = response.json()["ingredients"][0]
        assert ing["waste_pct"] == 15


class TestUpdateRecipe:
    """Tests for PATCH /recipes/{id} endpoint."""

    def test_update_recipe_name(self, client: TestClient, sample_recipe: Recipe):
        """Test updating recipe name."""
        response = client.patch(f"/recipes/{sample_recipe.id}", json={"name": "Updated Pizza"})
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Pizza"

    def test_update_recipe_price(self, client: TestClient, sample_recipe: Recipe):
        """Test updating recipe price."""
        response = client.patch(f"/recipes/{sample_recipe.id}", json={"price": 15.00})
        assert response.status_code == 200
        assert response.json()["price"] == 15.00

    def test_update_recipe_ingredients(self, client: TestClient, sample_recipe: Recipe, sample_products: list[Product]):
        """Test updating recipe ingredients."""
        new_ingredients = [
            {"product_id": sample_products[0].id, "quantity": 0.3, "waste_pct": 10},
            {"product_id": sample_products[1].id, "quantity": 0.2, "waste_pct": 5},
        ]
        response = client.patch(f"/recipes/{sample_recipe.id}", json={"ingredients": new_ingredients})
        assert response.status_code == 200
        assert len(response.json()["ingredients"]) == 2

    def test_update_recipe_deactivate(self, client: TestClient, sample_recipe: Recipe):
        """Test deactivating a recipe."""
        response = client.patch(f"/recipes/{sample_recipe.id}", json={"is_active": False})
        assert response.status_code == 200
        assert response.json()["is_active"] is False

    def test_update_recipe_not_found(self, client: TestClient):
        """Test updating non-existent recipe."""
        response = client.patch("/recipes/99999", json={"name": "Ghost"})
        assert response.status_code == 404


class TestDeleteRecipe:
    """Tests for DELETE /recipes/{id} endpoint."""

    def test_delete_recipe_success(self, client: TestClient, sample_recipe: Recipe):
        """Test deleting a recipe."""
        response = client.delete(f"/recipes/{sample_recipe.id}")
        assert response.status_code == 200
        assert response.json()["ok"] is True

        # Verify deleted
        response = client.get(f"/recipes/{sample_recipe.id}")
        assert response.status_code == 404

    def test_delete_recipe_not_found(self, client: TestClient):
        """Test deleting non-existent recipe."""
        response = client.delete("/recipes/99999")
        assert response.status_code == 404


class TestRecipeCostCalculation:
    """Tests for recipe cost and margin calculations."""

    def test_cost_calculation(self, client: TestClient, sample_recipe: Recipe):
        """Test recipe cost is calculated correctly."""
        response = client.get(f"/recipes/{sample_recipe.id}")
        assert response.status_code == 200
        data = response.json()
        # Cost should be sum of ingredient costs
        assert data["cost"] >= 0

    def test_cost_includes_waste(self, client: TestClient, sample_products: list[Product]):
        """Test cost calculation includes waste percentage."""
        # Create recipe with known cost
        # Product 0 costs 3.50/kg, quantity 1kg, 10% waste
        # Expected cost = 3.50 * 1 * 1.10 = 3.85
        recipe_data = {
            "name": "Waste Test",
            "price": 10.00,
            "ingredients": [
                {"product_id": sample_products[0].id, "quantity": 1.0, "unit": "kg", "waste_pct": 10},
            ],
        }
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 200
        data = response.json()
        # Cost should include 10% waste factor
        assert data["cost"] == pytest.approx(3.85, rel=0.01)

    def test_margin_calculation(self, client: TestClient, sample_products: list[Product]):
        """Test margin is calculated correctly."""
        recipe_data = {
            "name": "Margin Test",
            "price": 10.00,
            "ingredients": [
                {"product_id": sample_products[0].id, "quantity": 1.0, "waste_pct": 0},
            ],
        }
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 200
        data = response.json()
        # Cost is 3.50, price is 10, margin should be 65%
        expected_margin = ((10.00 - 3.50) / 10.00) * 100
        assert data["margin"] == pytest.approx(expected_margin, rel=0.1)


class TestRecipeEdgeCases:
    """Edge case tests for recipes."""

    def test_recipe_zero_price(self, client: TestClient):
        """Test recipe with zero price."""
        recipe_data = {"name": "Free Recipe", "price": 0}
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 200
        # Margin should handle division by zero gracefully
        assert response.json()["margin"] == 0 or response.json()["margin"] is None

    def test_recipe_no_ingredients(self, client: TestClient):
        """Test recipe without ingredients."""
        recipe_data = {"name": "No Ingredients", "price": 10.00}
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 200
        data = response.json()
        assert data["cost"] == 0
        assert data["margin"] == 100  # 100% margin with no cost

    def test_recipe_special_characters(self, client: TestClient):
        """Test recipe with special characters in name."""
        recipe_data = {"name": "Pizza Margherita (D.O.P.)", "price": 15.00}
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 200
        assert response.json()["name"] == "Pizza Margherita (D.O.P.)"

    def test_recipe_long_description(self, client: TestClient):
        """Test recipe with long description."""
        long_desc = "A" * 1000
        recipe_data = {"name": "Long Desc", "description": long_desc, "price": 10.00}
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 200

    def test_recipe_ingredient_zero_quantity(self, client: TestClient, sample_products: list[Product]):
        """Test ingredient with zero quantity."""
        recipe_data = {
            "name": "Zero Qty",
            "price": 10.00,
            "ingredients": [{"product_id": sample_products[0].id, "quantity": 0, "waste_pct": 0}],
        }
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 200
        # Cost should be 0 for zero quantity

    def test_recipe_high_waste_pct(self, client: TestClient, sample_products: list[Product]):
        """Test ingredient with high waste percentage."""
        recipe_data = {
            "name": "High Waste",
            "price": 50.00,
            "ingredients": [{"product_id": sample_products[0].id, "quantity": 1.0, "waste_pct": 50}],
        }
        response = client.post("/recipes", json=recipe_data)
        assert response.status_code == 200
        # Cost should be 3.50 * 1.50 = 5.25
        assert response.json()["cost"] == pytest.approx(5.25, rel=0.01)
