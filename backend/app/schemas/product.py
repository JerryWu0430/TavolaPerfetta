from pydantic import BaseModel
from datetime import datetime


class ProductBase(BaseModel):
    name: str
    category: str | None = None
    unit: str | None = None
    unit_price: float = 0.0
    sku: str | None = None
    min_stock: float = 0.0


class ProductCreate(ProductBase):
    supplier_id: int | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    unit: str | None = None
    unit_price: float | None = None
    supplier_id: int | None = None
    sku: str | None = None
    min_stock: float | None = None


class ProductResponse(ProductBase):
    id: int
    supplier_id: int | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
