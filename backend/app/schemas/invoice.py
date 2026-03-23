from datetime import date as DateType, datetime
from pydantic import BaseModel


class InvoiceLineCreate(BaseModel):
    product_id: int | None = None
    description: str | None = None
    quantity: float
    unit: str | None = None
    unit_price: float = 0.0
    total: float = 0.0


class InvoiceLineResponse(InvoiceLineCreate):
    id: int

    class Config:
        from_attributes = True


class InvoiceBase(BaseModel):
    supplier_id: int | None = None
    invoice_number: str | None = None
    date: DateType
    total: float = 0.0
    vat: float = 0.0
    status: str = "pending"
    notes: str | None = None


class InvoiceCreate(InvoiceBase):
    lines: list[InvoiceLineCreate] = []
    file_url: str | None = None


class InvoiceResponse(InvoiceBase):
    id: int
    file_url: str | None
    created_at: datetime
    lines: list[InvoiceLineResponse] = []

    class Config:
        from_attributes = True


class OCRLineResult(BaseModel):
    description: str
    quantity: float
    unit: str | None = None
    unit_price: float
    total: float


class OCRResult(BaseModel):
    supplier_name: str | None = None
    invoice_number: str | None = None
    date: str | None = None
    lines: list[OCRLineResult] = []
    subtotal: float = 0.0
    vat: float = 0.0
    total: float = 0.0
