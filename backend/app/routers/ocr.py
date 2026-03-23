from fastapi import APIRouter, UploadFile, File, HTTPException
import google.generativeai as genai
import base64
import json
import re
from ..config import get_settings
from ..schemas import OCRResult

router = APIRouter(prefix="/ocr", tags=["ocr"])


@router.post("/invoice", response_model=OCRResult)
async def process_invoice(file: UploadFile = File(...)):
    """Process invoice image with Gemini OCR"""
    settings = get_settings()

    if not settings.gemini_api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    # Read and encode file
    content = await file.read()
    base64_image = base64.b64encode(content).decode("utf-8")

    # Determine mime type
    mime_type = file.content_type or "image/jpeg"
    if file.filename:
        if file.filename.endswith(".png"):
            mime_type = "image/png"
        elif file.filename.endswith(".pdf"):
            mime_type = "application/pdf"

    # Configure Gemini
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = """Analyze this Italian delivery note (bolla) or invoice and extract:
1. Supplier name
2. Invoice/document number
3. Date (format: YYYY-MM-DD)
4. Line items with: description, quantity, unit (kg/pcs/l), unit price, total
5. Subtotal, VAT, Total

Return JSON only:
{
  "supplier_name": "...",
  "invoice_number": "...",
  "date": "YYYY-MM-DD",
  "lines": [
    {"description": "...", "quantity": 0, "unit": "kg", "unit_price": 0.00, "total": 0.00}
  ],
  "subtotal": 0.00,
  "vat": 0.00,
  "total": 0.00
}

Use EUR values. If a field is unclear, use null."""

    try:
        response = model.generate_content([
            prompt,
            {"mime_type": mime_type, "data": base64_image}
        ])

        # Extract JSON from response
        text = response.text
        json_match = re.search(r"\{[\s\S]*\}", text)
        if not json_match:
            raise HTTPException(status_code=422, detail="Could not parse OCR response")

        data = json.loads(json_match.group())
        return OCRResult(**data)

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"Invalid JSON from OCR: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {e}")
