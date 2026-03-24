"""
Comprehensive tests for the HACCP API endpoints.
Tests cover templates, checklists, items, and compliance checks.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.models.haccp import HACCPTemplate, HACCPChecklist, HACCPItem
from app.models.location import Location


class TestHACCPTemplates:
    """Tests for HACCP templates endpoints."""

    def test_list_templates_empty(self, client: TestClient):
        """Test listing templates when empty."""
        response = client.get("/haccp/templates")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_templates(self, client: TestClient, sample_haccp_templates: list[HACCPTemplate]):
        """Test listing templates."""
        response = client.get("/haccp/templates")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5

    def test_list_templates_active_only(self, client: TestClient, sample_haccp_templates: list[HACCPTemplate], db: Session):
        """Test listing only active templates."""
        # Deactivate one template
        sample_haccp_templates[0].is_active = False
        db.commit()

        response = client.get("/haccp/templates?active_only=true")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4
        for template in data:
            assert template["is_active"] is True

    def test_list_templates_include_inactive(self, client: TestClient, sample_haccp_templates: list[HACCPTemplate], db: Session):
        """Test listing all templates including inactive."""
        sample_haccp_templates[0].is_active = False
        db.commit()

        response = client.get("/haccp/templates?active_only=false")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5

    def test_create_template_boolean(self, client: TestClient):
        """Test creating boolean template."""
        template_data = {
            "name": "Pest Control Check",
            "category": "Hygiene",
            "input_type": "boolean",
            "frequency": "weekly",
            "is_active": True,
        }
        response = client.post("/haccp/templates", json=template_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Pest Control Check"
        assert data["input_type"] == "boolean"

    def test_create_template_number_with_range(self, client: TestClient):
        """Test creating number template with range."""
        template_data = {
            "name": "Hot Holding Temperature",
            "category": "Temperature",
            "input_type": "number",
            "min_value": 63,
            "max_value": 100,
            "unit": "°C",
            "frequency": "hourly",
            "is_active": True,
        }
        response = client.post("/haccp/templates", json=template_data)
        assert response.status_code == 200
        data = response.json()
        assert data["min_value"] == 63
        assert data["max_value"] == 100
        assert data["unit"] == "°C"

    def test_create_template_text(self, client: TestClient):
        """Test creating text template."""
        template_data = {
            "name": "Cleaning Notes",
            "category": "Hygiene",
            "input_type": "text",
            "frequency": "daily",
            "is_active": True,
        }
        response = client.post("/haccp/templates", json=template_data)
        assert response.status_code == 200
        assert response.json()["input_type"] == "text"

    def test_update_template(self, client: TestClient, sample_haccp_templates: list[HACCPTemplate]):
        """Test updating template."""
        template_id = sample_haccp_templates[0].id
        response = client.patch(f"/haccp/templates/{template_id}", json={"name": "Updated Template"})
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Template"

    def test_deactivate_template(self, client: TestClient, sample_haccp_templates: list[HACCPTemplate]):
        """Test deactivating template via delete (soft delete)."""
        template_id = sample_haccp_templates[0].id
        # Deletion is actually soft delete (sets is_active=False)
        response = client.delete(f"/haccp/templates/{template_id}")
        assert response.status_code == 200

        # Verify it's deactivated (not in active list)
        response = client.get("/haccp/templates?active_only=true")
        ids = [t["id"] for t in response.json()]
        assert template_id not in ids

    def test_delete_template(self, client: TestClient, sample_haccp_templates: list[HACCPTemplate]):
        """Test deleting template."""
        template_id = sample_haccp_templates[0].id
        response = client.delete(f"/haccp/templates/{template_id}")
        assert response.status_code == 200


class TestHACCPChecklists:
    """Tests for HACCP checklists endpoints."""

    def test_list_checklists_empty(self, client: TestClient):
        """Test listing checklists when empty."""
        response = client.get("/haccp/checklists")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_checklists(self, client: TestClient, sample_haccp_checklist: HACCPChecklist):
        """Test listing checklists."""
        response = client.get("/haccp/checklists")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

    def test_list_checklists_filter_by_location(self, client: TestClient, sample_haccp_checklist: HACCPChecklist, sample_location: Location):
        """Test filtering checklists by location."""
        response = client.get(f"/haccp/checklists?location_id={sample_location.id}")
        assert response.status_code == 200
        data = response.json()
        for checklist in data:
            assert checklist["location_id"] == sample_location.id

    def test_list_checklists_filter_by_date_range(self, client: TestClient, sample_haccp_checklist: HACCPChecklist):
        """Test filtering checklists by date range."""
        start_date = (date.today() - timedelta(days=7)).isoformat()
        end_date = date.today().isoformat()
        response = client.get(f"/haccp/checklists?start_date={start_date}&end_date={end_date}")
        assert response.status_code == 200

    def test_get_checklist(self, client: TestClient, sample_haccp_checklist: HACCPChecklist):
        """Test getting specific checklist."""
        response = client.get(f"/haccp/checklists/{sample_haccp_checklist.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["operator"] == "Chef Mario"
        assert "items" in data

    def test_get_checklist_not_found(self, client: TestClient):
        """Test getting non-existent checklist."""
        response = client.get("/haccp/checklists/99999")
        assert response.status_code == 404

    def test_create_checklist(self, client: TestClient, sample_haccp_templates: list[HACCPTemplate], sample_location: Location):
        """Test creating a new checklist."""
        checklist_data = {
            "date": str(date.today()),
            "operator": "Chef Luigi",
            "shift": "evening",
            "location_id": sample_location.id,
            "items": [
                {"template_id": sample_haccp_templates[0].id, "name": "Fridge Temp", "category": "Temperature", "value": "4", "passed": True},
                {"template_id": sample_haccp_templates[2].id, "name": "Prep Area", "category": "Hygiene", "value": "yes", "passed": True},
            ],
        }
        response = client.post("/haccp/checklists", json=checklist_data)
        assert response.status_code == 200
        data = response.json()
        assert data["operator"] == "Chef Luigi"
        assert len(data["items"]) == 2

    def test_create_checklist_with_failures(self, client: TestClient, sample_haccp_templates: list[HACCPTemplate]):
        """Test creating checklist with failed items."""
        checklist_data = {
            "date": str(date.today()),
            "operator": "Chef Test",
            "items": [
                {"template_id": sample_haccp_templates[0].id, "name": "Fridge Temp", "value": "8", "passed": False},
                {"template_id": sample_haccp_templates[1].id, "name": "Freezer Temp", "value": "-15", "passed": False},
            ],
        }
        response = client.post("/haccp/checklists", json=checklist_data)
        assert response.status_code == 200
        data = response.json()
        # Status should be failed due to failed items
        assert data["status"] == "failed"


class TestHACCPToday:
    """Tests for GET /haccp/today endpoint."""

    def test_today_no_checklist(self, client: TestClient):
        """Test today endpoint when no checklist exists."""
        response = client.get("/haccp/today")
        assert response.status_code == 200
        assert response.json() is None

    def test_today_with_checklist(self, client: TestClient, sample_haccp_checklist: HACCPChecklist):
        """Test today endpoint with existing checklist."""
        response = client.get("/haccp/today")
        assert response.status_code == 200
        data = response.json()
        assert data is not None
        assert data["date"] == str(date.today())

    def test_today_with_location(self, client: TestClient, sample_haccp_checklist: HACCPChecklist, sample_location: Location):
        """Test today endpoint with location filter."""
        response = client.get(f"/haccp/today?location_id={sample_location.id}")
        assert response.status_code == 200


class TestHACCPComplianceLogic:
    """Tests for HACCP compliance checking logic."""

    def test_temperature_in_range_passes(self, client: TestClient, sample_haccp_templates: list[HACCPTemplate]):
        """Test temperature check passes when in range."""
        # Fridge temp should be 0-5°C
        checklist_data = {
            "date": str(date.today()),
            "operator": "Test",
            "items": [{"template_id": sample_haccp_templates[0].id, "name": "Fridge Temp", "value": "3", "passed": True}],
        }
        response = client.post("/haccp/checklists", json=checklist_data)
        assert response.status_code == 200
        assert response.json()["status"] in ["passed", "incomplete"]

    def test_temperature_out_of_range_fails(self, client: TestClient, sample_haccp_templates: list[HACCPTemplate]):
        """Test temperature check fails when out of range."""
        checklist_data = {
            "date": str(date.today()),
            "operator": "Test",
            "items": [{"template_id": sample_haccp_templates[0].id, "name": "Fridge Temp", "value": "10", "passed": False}],
        }
        response = client.post("/haccp/checklists", json=checklist_data)
        assert response.status_code == 200
        assert response.json()["status"] == "failed"

    def test_boolean_yes_passes(self, client: TestClient, sample_haccp_templates: list[HACCPTemplate]):
        """Test boolean check passes with yes."""
        checklist_data = {
            "date": str(date.today()),
            "operator": "Test",
            "items": [{"template_id": sample_haccp_templates[2].id, "name": "Prep Area Clean", "value": "yes", "passed": True}],
        }
        response = client.post("/haccp/checklists", json=checklist_data)
        assert response.status_code == 200


class TestHACCPEdgeCases:
    """Edge case tests for HACCP."""

    def test_checklist_empty_items(self, client: TestClient):
        """Test creating checklist with no items."""
        checklist_data = {
            "date": str(date.today()),
            "operator": "Test",
            "items": [],
        }
        response = client.post("/haccp/checklists", json=checklist_data)
        assert response.status_code == 200
        # No failed items = "passed" by default logic
        assert response.json()["status"] == "passed"

    def test_checklist_null_values(self, client: TestClient, sample_haccp_templates: list[HACCPTemplate]):
        """Test items with null values."""
        checklist_data = {
            "date": str(date.today()),
            "operator": "Test",
            "items": [{"name": "Test Item", "category": "Test", "value": None, "passed": None}],
        }
        response = client.post("/haccp/checklists", json=checklist_data)
        assert response.status_code == 200

    def test_template_ordering(self, client: TestClient, sample_haccp_templates: list[HACCPTemplate]):
        """Test templates are returned in sort order."""
        response = client.get("/haccp/templates")
        assert response.status_code == 200
        data = response.json()
        # Should be sorted by sort_order
        sort_orders = [t["sort_order"] for t in data]
        assert sort_orders == sorted(sort_orders)

    def test_checklist_multiple_shifts(self, client: TestClient, sample_haccp_templates: list[HACCPTemplate], db: Session):
        """Test multiple checklists for different shifts on same day."""
        # Create morning checklist
        morning_data = {
            "date": str(date.today()),
            "operator": "Chef A",
            "shift": "morning",
            "items": [{"name": "Test", "category": "Test", "value": "ok", "passed": True}],
        }
        response = client.post("/haccp/checklists", json=morning_data)
        assert response.status_code == 200

        # Create evening checklist
        evening_data = {
            "date": str(date.today()),
            "operator": "Chef B",
            "shift": "evening",
            "items": [{"name": "Test", "category": "Test", "value": "ok", "passed": True}],
        }
        response = client.post("/haccp/checklists", json=evening_data)
        assert response.status_code == 200

        # Both should exist
        response = client.get("/haccp/checklists")
        assert len(response.json()) == 2
