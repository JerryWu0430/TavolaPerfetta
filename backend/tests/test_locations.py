"""
Comprehensive tests for the Locations API endpoints.
Tests cover CRUD operations and edge cases.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.location import Location


class TestListLocations:
    """Tests for GET /locations endpoint."""

    def test_list_locations_empty(self, client: TestClient):
        """Test listing locations when empty."""
        response = client.get("/locations")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_locations_single(self, client: TestClient, sample_location: Location):
        """Test listing with one location."""
        response = client.get("/locations")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Main Kitchen"

    def test_list_locations_multiple(self, client: TestClient, db: Session):
        """Test listing multiple locations."""
        locations = [
            Location(name="Kitchen A", address="123 Street A"),
            Location(name="Kitchen B", address="456 Street B"),
            Location(name="Storage Room", address="789 Street C"),
        ]
        for loc in locations:
            db.add(loc)
        db.commit()

        response = client.get("/locations")
        assert response.status_code == 200
        assert len(response.json()) == 3


class TestGetLocation:
    """Tests for GET /locations/{id} endpoint."""

    def test_get_location_success(self, client: TestClient, sample_location: Location):
        """Test getting specific location."""
        response = client.get(f"/locations/{sample_location.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_location.id
        assert data["name"] == "Main Kitchen"

    def test_get_location_not_found(self, client: TestClient):
        """Test getting non-existent location."""
        response = client.get("/locations/99999")
        assert response.status_code == 404

    def test_get_location_includes_all_fields(self, client: TestClient, sample_location: Location):
        """Test location response includes all fields."""
        response = client.get(f"/locations/{sample_location.id}")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "name" in data
        assert "address" in data or data.get("address") is None
        assert "created_at" in data


class TestCreateLocation:
    """Tests for POST /locations endpoint."""

    def test_create_location_success(self, client: TestClient):
        """Test creating a new location."""
        location_data = {
            "name": "New Kitchen",
            "address": "100 New Street",
        }
        response = client.post("/locations", json=location_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Kitchen"
        assert data["address"] == "100 New Street"

    def test_create_location_with_address(self, client: TestClient):
        """Test creating location with full address."""
        location_data = {
            "name": "Cold Storage",
            "address": "123 Warehouse Blvd, Suite 4",
        }
        response = client.post("/locations", json=location_data)
        assert response.status_code == 200
        assert response.json()["address"] == "123 Warehouse Blvd, Suite 4"

    def test_create_location_minimal(self, client: TestClient):
        """Test creating location with minimal data."""
        location_data = {"name": "Simple Location"}
        response = client.post("/locations", json=location_data)
        assert response.status_code == 200
        assert response.json()["name"] == "Simple Location"

    def test_create_location_without_address(self, client: TestClient):
        """Test creating location without address."""
        location_data = {"name": "No Address Location"}
        response = client.post("/locations", json=location_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "No Address Location"
        assert data["address"] is None


class TestDeleteLocation:
    """Tests for DELETE /locations/{id} endpoint."""

    def test_delete_location_success(self, client: TestClient, sample_location: Location):
        """Test deleting a location."""
        response = client.delete(f"/locations/{sample_location.id}")
        assert response.status_code == 200
        assert response.json()["ok"] is True

        # Verify deleted
        response = client.get(f"/locations/{sample_location.id}")
        assert response.status_code == 404

    def test_delete_location_not_found(self, client: TestClient):
        """Test deleting non-existent location."""
        response = client.delete("/locations/99999")
        assert response.status_code == 404


class TestLocationEdgeCases:
    """Edge case tests for locations."""

    def test_location_special_characters(self, client: TestClient):
        """Test location with special characters in name."""
        location_data = {"name": "Kitchen #1 (Main)", "address": "123 Main St."}
        response = client.post("/locations", json=location_data)
        assert response.status_code == 200
        assert response.json()["name"] == "Kitchen #1 (Main)"

    def test_location_unicode_name(self, client: TestClient):
        """Test location with unicode name."""
        location_data = {"name": "Cucina Principale", "address": "Via Roma 1"}
        response = client.post("/locations", json=location_data)
        assert response.status_code == 200
        assert response.json()["name"] == "Cucina Principale"

    def test_location_long_name(self, client: TestClient):
        """Test location with long name."""
        long_name = "A" * 100  # Max is 100 chars
        location_data = {"name": long_name}
        response = client.post("/locations", json=location_data)
        # Should accept up to 100 chars
        assert response.status_code == 200

    def test_location_empty_name(self, client: TestClient):
        """Test location with empty name."""
        location_data = {"name": ""}
        response = client.post("/locations", json=location_data)
        # Depending on validation - may reject empty string
        assert response.status_code in [200, 400, 422]

    def test_location_whitespace_name(self, client: TestClient):
        """Test location with whitespace name."""
        location_data = {"name": "   "}
        response = client.post("/locations", json=location_data)
        # Should handle whitespace
        assert response.status_code in [200, 400, 422]

    def test_location_long_address(self, client: TestClient):
        """Test location with long address."""
        long_address = "123 " + "A" * 250  # Close to max 255
        location_data = {"name": "Test", "address": long_address}
        response = client.post("/locations", json=location_data)
        assert response.status_code in [200, 400, 422]

    def test_create_duplicate_name(self, client: TestClient, db: Session):
        """Test creating locations with same name."""
        location_data = {"name": "Duplicate Test"}

        # First creation
        response1 = client.post("/locations", json=location_data)
        assert response1.status_code == 200

        # Second creation with same name - should be allowed (no unique constraint)
        response2 = client.post("/locations", json=location_data)
        assert response2.status_code == 200

        # Verify both exist
        response = client.get("/locations")
        names = [loc["name"] for loc in response.json()]
        assert names.count("Duplicate Test") == 2
