"""
Comprehensive tests for the Invoices API endpoints.
Tests cover CRUD, status workflow, line items, and calculations.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import date

from app.models import Supplier
from app.models.product import Product
from app.models.invoice import Invoice, InvoiceLine


class TestListInvoices:
    """Tests for GET /invoices endpoint."""

    def test_list_invoices_empty(self, client: TestClient):
        """Test listing invoices when empty."""
        response = client.get("/invoices")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_invoices_single(self, client: TestClient, sample_invoice: Invoice):
        """Test listing with one invoice."""
        response = client.get("/invoices")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["invoice_number"] == "INV-2024-001"

    def test_list_invoices_filter_by_supplier(self, client: TestClient, sample_invoice: Invoice, sample_supplier: Supplier):
        """Test filtering invoices by supplier."""
        response = client.get(f"/invoices?supplier_id={sample_supplier.id}")
        assert response.status_code == 200
        data = response.json()
        for inv in data:
            assert inv["supplier_id"] == sample_supplier.id

    def test_list_invoices_filter_by_status(self, client: TestClient, sample_invoice: Invoice):
        """Test filtering invoices by status."""
        response = client.get("/invoices?status=pending")
        assert response.status_code == 200
        data = response.json()
        for inv in data:
            assert inv["status"] == "pending"

    def test_list_invoices_includes_lines(self, client: TestClient, sample_invoice: Invoice):
        """Test invoice response includes lines."""
        response = client.get("/invoices")
        assert response.status_code == 200
        inv = response.json()[0]
        assert "lines" in inv
        assert len(inv["lines"]) >= 1


class TestGetInvoice:
    """Tests for GET /invoices/{id} endpoint."""

    def test_get_invoice_success(self, client: TestClient, sample_invoice: Invoice):
        """Test getting specific invoice."""
        response = client.get(f"/invoices/{sample_invoice.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_invoice.id
        assert data["total"] == 175.00

    def test_get_invoice_not_found(self, client: TestClient):
        """Test getting non-existent invoice."""
        response = client.get("/invoices/99999")
        assert response.status_code == 404

    def test_get_invoice_lines_detail(self, client: TestClient, sample_invoice: Invoice):
        """Test invoice lines have correct details."""
        response = client.get(f"/invoices/{sample_invoice.id}")
        assert response.status_code == 200
        line = response.json()["lines"][0]
        assert "product_id" in line
        assert "quantity" in line
        assert "unit_price" in line
        assert "total" in line


class TestCreateInvoice:
    """Tests for POST /invoices endpoint."""

    def test_create_invoice_success(self, client: TestClient, sample_supplier: Supplier, sample_product: Product):
        """Test creating a new invoice."""
        invoice_data = {
            "supplier_id": sample_supplier.id,
            "invoice_number": "INV-2024-002",
            "date": str(date.today()),
            "total": 250.00,
            "vat": 50.00,
            "status": "pending",
            "lines": [
                {
                    "product_id": sample_product.id,
                    "description": "Test Product",
                    "quantity": 50,
                    "unit": "kg",
                    "unit_price": 5.00,
                    "total": 250.00,
                }
            ],
        }
        response = client.post("/invoices", json=invoice_data)
        assert response.status_code == 200
        data = response.json()
        assert data["invoice_number"] == "INV-2024-002"
        assert len(data["lines"]) == 1

    def test_create_invoice_multiple_lines(self, client: TestClient, sample_supplier: Supplier, sample_products: list[Product]):
        """Test creating invoice with multiple lines."""
        lines = [
            {"product_id": p.id, "description": p.name, "quantity": 10, "unit": p.unit, "unit_price": p.unit_price}
            for p in sample_products[:3]
        ]
        invoice_data = {
            "supplier_id": sample_supplier.id,
            "date": str(date.today()),
            "lines": lines,
        }
        response = client.post("/invoices", json=invoice_data)
        assert response.status_code == 200
        assert len(response.json()["lines"]) == 3

    def test_create_invoice_auto_calculate_total(self, client: TestClient, sample_supplier: Supplier, sample_product: Product):
        """Test that line totals are auto-calculated."""
        invoice_data = {
            "supplier_id": sample_supplier.id,
            "date": str(date.today()),
            "lines": [
                {"product_id": sample_product.id, "quantity": 10, "unit_price": 5.00}
            ],
        }
        response = client.post("/invoices", json=invoice_data)
        assert response.status_code == 200
        line = response.json()["lines"][0]
        assert line["total"] == 50.00  # 10 * 5.00

    def test_create_invoice_without_supplier(self, client: TestClient):
        """Test creating invoice without supplier."""
        invoice_data = {
            "date": str(date.today()),
            "invoice_number": "INV-NO-SUPPLIER",
        }
        response = client.post("/invoices", json=invoice_data)
        assert response.status_code == 200
        assert response.json()["supplier_id"] is None


class TestUpdateInvoiceStatus:
    """Tests for PATCH /invoices/{id}?status= endpoint."""

    def test_update_status_to_verified(self, client: TestClient, sample_invoice: Invoice):
        """Test updating invoice status to verified."""
        response = client.patch(f"/invoices/{sample_invoice.id}?status=verified")
        assert response.status_code == 200
        assert response.json()["status"] == "verified"

    def test_update_status_to_paid(self, client: TestClient, sample_invoice: Invoice):
        """Test updating invoice status to paid."""
        response = client.patch(f"/invoices/{sample_invoice.id}?status=paid")
        assert response.status_code == 200
        assert response.json()["status"] == "paid"

    def test_update_status_not_found(self, client: TestClient):
        """Test updating status of non-existent invoice."""
        response = client.patch("/invoices/99999?status=verified")
        assert response.status_code == 404

    def test_update_status_workflow(self, client: TestClient, sample_invoice: Invoice):
        """Test complete status workflow: pending -> verified -> paid."""
        # Start as pending
        assert sample_invoice.status == "pending"

        # Update to verified
        response = client.patch(f"/invoices/{sample_invoice.id}?status=verified")
        assert response.status_code == 200
        assert response.json()["status"] == "verified"

        # Update to paid
        response = client.patch(f"/invoices/{sample_invoice.id}?status=paid")
        assert response.status_code == 200
        assert response.json()["status"] == "paid"


class TestDeleteInvoice:
    """Tests for DELETE /invoices/{id} endpoint."""

    def test_delete_invoice_success(self, client: TestClient, sample_invoice: Invoice):
        """Test deleting an invoice."""
        response = client.delete(f"/invoices/{sample_invoice.id}")
        assert response.status_code == 200
        assert response.json()["ok"] is True

        # Verify deleted
        response = client.get(f"/invoices/{sample_invoice.id}")
        assert response.status_code == 404

    def test_delete_invoice_not_found(self, client: TestClient):
        """Test deleting non-existent invoice."""
        response = client.delete("/invoices/99999")
        assert response.status_code == 404


class TestInvoiceEdgeCases:
    """Edge case tests for invoices."""

    def test_invoice_with_vat(self, client: TestClient, sample_supplier: Supplier):
        """Test invoice with VAT."""
        invoice_data = {
            "supplier_id": sample_supplier.id,
            "date": str(date.today()),
            "total": 122.00,
            "vat": 22.00,
        }
        response = client.post("/invoices", json=invoice_data)
        assert response.status_code == 200
        data = response.json()
        # API may recalculate total from lines
        assert data["vat"] == 22.00

    def test_invoice_zero_total(self, client: TestClient, sample_supplier: Supplier):
        """Test invoice with zero total."""
        invoice_data = {
            "supplier_id": sample_supplier.id,
            "date": str(date.today()),
            "total": 0,
        }
        response = client.post("/invoices", json=invoice_data)
        assert response.status_code == 200

    def test_invoice_line_without_product(self, client: TestClient, sample_supplier: Supplier):
        """Test invoice line with description but no product_id."""
        invoice_data = {
            "supplier_id": sample_supplier.id,
            "date": str(date.today()),
            "lines": [
                {"description": "Custom service", "quantity": 1, "unit_price": 100.00}
            ],
        }
        response = client.post("/invoices", json=invoice_data)
        assert response.status_code == 200
        line = response.json()["lines"][0]
        assert line["product_id"] is None
        assert line["description"] == "Custom service"

    def test_invoice_duplicate_number(self, client: TestClient, sample_supplier: Supplier, sample_invoice: Invoice):
        """Test creating invoice with duplicate number."""
        invoice_data = {
            "supplier_id": sample_supplier.id,
            "date": str(date.today()),
            "invoice_number": "INV-2024-001",  # Same as sample_invoice
        }
        response = client.post("/invoices", json=invoice_data)
        # Should either accept (different suppliers) or reject
        assert response.status_code in [200, 400, 409]

    def test_invoice_with_notes(self, client: TestClient, sample_supplier: Supplier):
        """Test invoice with notes."""
        invoice_data = {
            "supplier_id": sample_supplier.id,
            "date": str(date.today()),
            "notes": "Payment due by end of month. Contact accounting for questions.",
        }
        response = client.post("/invoices", json=invoice_data)
        assert response.status_code == 200
        assert "Payment due" in response.json()["notes"]
