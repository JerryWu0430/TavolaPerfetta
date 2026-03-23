from pydantic import BaseModel
from datetime import date, datetime


class DeliveryItemCreate(BaseModel):
    product_id: int | None = None
    product_name: str | None = None
    quantity: float
    unit: str | None = None
    unit_price: float = 0.0


class DeliveryItemResponse(DeliveryItemCreate):
    id: int

    class Config:
        from_attributes = True


class DeliveryBase(BaseModel):
    supplier_id: int
    date: date
    status: str = "pending"
    notes: str | None = None


class DeliveryCreate(DeliveryBase):
    items: list[DeliveryItemCreate] = []


class DeliveryUpdate(BaseModel):
    date: date | None = None
    status: str | None = None
    notes: str | None = None


class DeliveryResponse(DeliveryBase):
    id: int
    created_at: datetime
    items: list[DeliveryItemResponse] = []

    class Config:
        from_attributes = True
