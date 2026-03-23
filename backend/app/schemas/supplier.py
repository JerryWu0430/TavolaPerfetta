from pydantic import BaseModel
from datetime import datetime


class SupplierBase(BaseModel):
    name: str
    category: str | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    address: str | None = None
    payment_terms: str | None = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    address: str | None = None
    payment_terms: str | None = None
    reliability_score: float | None = None
    avg_delivery_days: float | None = None


class SupplierResponse(SupplierBase):
    id: int
    reliability_score: float
    avg_delivery_days: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SupplierList(BaseModel):
    items: list[SupplierResponse]
    total: int
