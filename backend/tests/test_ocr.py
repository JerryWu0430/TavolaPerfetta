"""
Comprehensive tests for the OCR API endpoint.
Tests cover file validation, mocked AI responses, and error handling.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import io


class TestOCRInvoice:
    """Tests for POST /ocr/invoice endpoint."""

    def test_ocr_missing_api_key(self, client: TestClient):
        """Test OCR fails without proper API key configured."""
        # Create a simple test image (1x1 pixel PNG)
        png_header = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde'
        png_data = png_header + b'\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'

        files = {"file": ("test.png", io.BytesIO(png_data), "image/png")}
        response = client.post("/ocr/invoice", files=files)
        # Should fail with 500 - either "API key" or other Gemini error
        assert response.status_code == 500

    def test_ocr_invalid_file_type(self, client: TestClient):
        """Test OCR rejects invalid file types."""
        files = {"file": ("test.txt", io.BytesIO(b"hello world"), "text/plain")}
        response = client.post("/ocr/invoice", files=files)
        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]

    def test_ocr_empty_file(self, client: TestClient):
        """Test OCR rejects empty files."""
        files = {"file": ("test.png", io.BytesIO(b""), "image/png")}
        response = client.post("/ocr/invoice", files=files)
        assert response.status_code == 400
        assert "Empty file" in response.json()["detail"]

    def test_ocr_file_too_large(self, client: TestClient):
        """Test OCR rejects files over size limit."""
        # Create 11MB file (over 10MB limit)
        large_content = b"x" * (11 * 1024 * 1024)
        files = {"file": ("large.png", io.BytesIO(large_content), "image/png")}
        response = client.post("/ocr/invoice", files=files)
        assert response.status_code == 400
        assert "too large" in response.json()["detail"]

    @patch("app.routers.ocr.get_settings")
    @patch("app.routers.ocr.genai")
    def test_ocr_success(self, mock_genai, mock_settings, client: TestClient):
        """Test successful OCR processing with mocked AI."""
        # Mock settings with API key
        mock_settings.return_value.gemini_api_key = "test-key"

        # Mock Gemini response
        mock_response = MagicMock()
        mock_response.text = '''
        {
            "supplier_name": "Fornitore Test",
            "invoice_number": "INV-2024-001",
            "date": "2024-03-15",
            "lines": [
                {"description": "Pomodori", "quantity": 10, "unit": "kg", "unit_price": 2.50, "total": 25.00}
            ],
            "subtotal": 25.00,
            "vat": 5.50,
            "total": 30.50
        }
        '''
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        # Create test image
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde'
        png_data += b'\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'

        files = {"file": ("invoice.png", io.BytesIO(png_data), "image/png")}
        response = client.post("/ocr/invoice", files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["supplier_name"] == "Fornitore Test"
        assert data["invoice_number"] == "INV-2024-001"
        assert len(data["lines"]) == 1
        assert data["total"] == 30.50

    @patch("app.routers.ocr.get_settings")
    @patch("app.routers.ocr.genai")
    def test_ocr_jpeg_file(self, mock_genai, mock_settings, client: TestClient):
        """Test OCR with JPEG file."""
        mock_settings.return_value.gemini_api_key = "test-key"

        mock_response = MagicMock()
        mock_response.text = '{"supplier_name": "Test", "lines": [], "total": 0}'
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        # Minimal JPEG header
        jpeg_data = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        jpeg_data += b'\xff\xd9'

        files = {"file": ("invoice.jpg", io.BytesIO(jpeg_data), "image/jpeg")}
        response = client.post("/ocr/invoice", files=files)
        assert response.status_code == 200

    @patch("app.routers.ocr.get_settings")
    @patch("app.routers.ocr.genai")
    def test_ocr_pdf_file(self, mock_genai, mock_settings, client: TestClient):
        """Test OCR with PDF file."""
        mock_settings.return_value.gemini_api_key = "test-key"

        mock_response = MagicMock()
        mock_response.text = '{"supplier_name": "PDF Supplier", "lines": [], "total": 100}'
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        # Minimal PDF header
        pdf_data = b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'
        pdf_data += b'1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF'

        files = {"file": ("invoice.pdf", io.BytesIO(pdf_data), "application/pdf")}
        response = client.post("/ocr/invoice", files=files)
        assert response.status_code == 200

    @patch("app.routers.ocr.get_settings")
    @patch("app.routers.ocr.genai")
    def test_ocr_webp_file(self, mock_genai, mock_settings, client: TestClient):
        """Test OCR with WebP file."""
        mock_settings.return_value.gemini_api_key = "test-key"

        mock_response = MagicMock()
        mock_response.text = '{"supplier_name": "WebP Test", "lines": [], "total": 50}'
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        # Minimal WebP header
        webp_data = b'RIFF\x00\x00\x00\x00WEBP'

        files = {"file": ("invoice.webp", io.BytesIO(webp_data), "image/webp")}
        response = client.post("/ocr/invoice", files=files)
        assert response.status_code == 200

    @patch("app.routers.ocr.get_settings")
    @patch("app.routers.ocr.genai")
    def test_ocr_invalid_json_response(self, mock_genai, mock_settings, client: TestClient):
        """Test OCR handles invalid JSON from AI."""
        mock_settings.return_value.gemini_api_key = "test-key"

        mock_response = MagicMock()
        mock_response.text = "This is not valid JSON at all"
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        png_data = b'\x89PNG\r\n\x1a\n' + b'\x00' * 50

        files = {"file": ("invoice.png", io.BytesIO(png_data), "image/png")}
        response = client.post("/ocr/invoice", files=files)
        # 422 for parse error or 500 for general error
        assert response.status_code in [422, 500]

    @patch("app.routers.ocr.get_settings")
    @patch("app.routers.ocr.genai")
    def test_ocr_ai_exception(self, mock_genai, mock_settings, client: TestClient):
        """Test OCR handles AI service exceptions."""
        mock_settings.return_value.gemini_api_key = "test-key"

        mock_model = MagicMock()
        mock_model.generate_content.side_effect = Exception("AI service unavailable")
        mock_genai.GenerativeModel.return_value = mock_model

        png_data = b'\x89PNG\r\n\x1a\n' + b'\x00' * 50

        files = {"file": ("invoice.png", io.BytesIO(png_data), "image/png")}
        response = client.post("/ocr/invoice", files=files)
        assert response.status_code == 500
        assert "failed" in response.json()["detail"].lower()

    @patch("app.routers.ocr.get_settings")
    @patch("app.routers.ocr.genai")
    def test_ocr_multiple_line_items(self, mock_genai, mock_settings, client: TestClient):
        """Test OCR with multiple line items."""
        mock_settings.return_value.gemini_api_key = "test-key"

        mock_response = MagicMock()
        mock_response.text = '''
        {
            "supplier_name": "Multi-Line Supplier",
            "invoice_number": "INV-2024-002",
            "date": "2024-03-20",
            "lines": [
                {"description": "Pomodori San Marzano", "quantity": 10, "unit": "kg", "unit_price": 3.00, "total": 30.00},
                {"description": "Mozzarella di Bufala", "quantity": 5, "unit": "kg", "unit_price": 12.00, "total": 60.00},
                {"description": "Basilico Fresco", "quantity": 2, "unit": "pcs", "unit_price": 1.50, "total": 3.00}
            ],
            "subtotal": 93.00,
            "vat": 20.46,
            "total": 113.46
        }
        '''
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        png_data = b'\x89PNG\r\n\x1a\n' + b'\x00' * 50

        files = {"file": ("invoice.png", io.BytesIO(png_data), "image/png")}
        response = client.post("/ocr/invoice", files=files)
        assert response.status_code == 200
        data = response.json()
        assert len(data["lines"]) == 3
        assert data["total"] == 113.46

    @patch("app.routers.ocr.get_settings")
    @patch("app.routers.ocr.genai")
    def test_ocr_null_fields(self, mock_genai, mock_settings, client: TestClient):
        """Test OCR handles null fields gracefully."""
        mock_settings.return_value.gemini_api_key = "test-key"

        # Provide valid required fields per OCRResult schema
        mock_response = MagicMock()
        mock_response.text = '''
        {
            "supplier_name": null,
            "invoice_number": null,
            "date": null,
            "lines": [],
            "subtotal": 0,
            "vat": 0,
            "total": 0
        }
        '''
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        png_data = b'\x89PNG\r\n\x1a\n' + b'\x00' * 50

        files = {"file": ("invoice.png", io.BytesIO(png_data), "image/png")}
        response = client.post("/ocr/invoice", files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["supplier_name"] is None
        assert data["lines"] == []


class TestOCRAllowedTypes:
    """Tests for file type validation."""

    def test_ocr_accepts_png(self, client: TestClient):
        """Test PNG is in allowed types."""
        # Will fail on API key, but type validation should pass
        png_data = b'\x89PNG\r\n\x1a\n' + b'\x00' * 50
        files = {"file": ("test.png", io.BytesIO(png_data), "image/png")}
        response = client.post("/ocr/invoice", files=files)
        # Should fail on API key, not file type
        assert response.status_code != 400 or "Invalid file type" not in response.json().get("detail", "")

    def test_ocr_accepts_jpeg(self, client: TestClient):
        """Test JPEG is in allowed types."""
        jpeg_data = b'\xff\xd8\xff' + b'\x00' * 50
        files = {"file": ("test.jpg", io.BytesIO(jpeg_data), "image/jpeg")}
        response = client.post("/ocr/invoice", files=files)
        assert response.status_code != 400 or "Invalid file type" not in response.json().get("detail", "")

    def test_ocr_rejects_gif(self, client: TestClient):
        """Test GIF is rejected."""
        gif_data = b'GIF89a' + b'\x00' * 50
        files = {"file": ("test.gif", io.BytesIO(gif_data), "image/gif")}
        response = client.post("/ocr/invoice", files=files)
        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]

    def test_ocr_rejects_svg(self, client: TestClient):
        """Test SVG is rejected."""
        svg_data = b'<svg></svg>'
        files = {"file": ("test.svg", io.BytesIO(svg_data), "image/svg+xml")}
        response = client.post("/ocr/invoice", files=files)
        assert response.status_code == 400

    def test_ocr_rejects_html(self, client: TestClient):
        """Test HTML is rejected."""
        html_data = b'<html><body>Test</body></html>'
        files = {"file": ("test.html", io.BytesIO(html_data), "text/html")}
        response = client.post("/ocr/invoice", files=files)
        assert response.status_code == 400
