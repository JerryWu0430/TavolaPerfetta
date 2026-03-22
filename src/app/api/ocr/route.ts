import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextRequest, NextResponse } from "next/server"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

const EXTRACTION_PROMPT = `You are an expert at extracting structured data from Italian restaurant invoices (bolle/fatture).

Analyze this invoice image and extract the following information in JSON format:

{
  "supplierName": "Name of the supplier",
  "supplierVAT": "VAT number if visible (Partita IVA)",
  "invoiceNumber": "Invoice or delivery note number",
  "invoiceDate": "Date in YYYY-MM-DD format",
  "dueDate": "Due date if present in YYYY-MM-DD format",
  "lines": [
    {
      "description": "Product description",
      "quantity": 0.0,
      "unit": "kg/lt/pz/etc",
      "unitPrice": 0.00,
      "total": 0.00
    }
  ],
  "subtotal": 0.00,
  "vat": 0.00,
  "total": 0.00
}

Important:
- Extract ALL line items visible
- Use numeric values for prices/quantities (no currency symbols)
- For Italian decimals, convert comma to period (e.g., "12,50" -> 12.50)
- If unit is not specified, use "pz" (pieces)
- Include VAT percentage in the vat field if it's a percentage, otherwise the amount

Return ONLY valid JSON, no markdown or explanation.`

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString("base64")

    // Determine MIME type
    const mimeType = file.type || "image/jpeg"

    // Use Gemini Vision
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const result = await model.generateContent([
      EXTRACTION_PROMPT,
      {
        inlineData: {
          data: base64,
          mimeType,
        },
      },
    ])

    const response = result.response
    const text = response.text()

    // Parse the JSON response
    let extractedData
    try {
      // Remove any markdown code blocks if present
      const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      extractedData = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json(
        { error: "Failed to parse OCR response", rawText: text },
        { status: 500 }
      )
    }

    // Generate IDs for lines
    const linesWithIds = (extractedData.lines || []).map((line: Record<string, unknown>, idx: number) => ({
      id: `line-${idx + 1}`,
      ...line,
    }))

    return NextResponse.json({
      success: true,
      data: {
        ...extractedData,
        lines: linesWithIds,
      },
      rawOCRData: text,
    })
  } catch (error) {
    console.error("OCR Error:", error)
    return NextResponse.json(
      { error: "OCR processing failed", details: String(error) },
      { status: 500 }
    )
  }
}
