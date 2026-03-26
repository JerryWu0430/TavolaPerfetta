from fastapi import APIRouter, UploadFile, File, HTTPException
import google.generativeai as genai
import base64
import json
import re
from ..config import get_settings
from ..schemas import OCRResult

router = APIRouter(prefix="/ocr", tags=["ocr"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/invoice", response_model=OCRResult)
async def process_invoice(file: UploadFile = File(...)):
    """Process invoice image with Gemini OCR"""
    settings = get_settings()

    if not settings.gemini_api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    # Validate file type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {content_type}. Allowed: {', '.join(ALLOWED_TYPES)}"
        )

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    base64_image = base64.b64encode(content).decode("utf-8")

    # Determine mime type from extension as fallback
    mime_type = content_type
    if file.filename:
        if file.filename.lower().endswith(".png"):
            mime_type = "image/png"
        elif file.filename.lower().endswith(".pdf"):
            mime_type = "application/pdf"
        elif file.filename.lower().endswith(".webp"):
            mime_type = "image/webp"

    # Configure Gemini
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-2.5-flash-lite")

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
