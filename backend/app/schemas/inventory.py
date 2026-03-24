from pydantic import BaseModel
from datetime import datetime


class InventoryBase(BaseModel):
    product_id: int
    location_id: int | None = None
    quantity: float = 0.0
    theoretical_quantity: float = 0.0


class InventoryUpdate(BaseModel):
    quantity: float | None = None
    theoretical_quantity: float | None = None


class InventoryResponse(InventoryBase):
    id: int
    last_count_date: datetime | None
    updated_at: datetime

    class Config:
        from_attributes = True


class InventoryWithProduct(InventoryResponse):
    product_name: str
    product_unit: str | None
    product_category: str | None = None
    product_unit_price: float = 0.0
    supplier_name: str | None = None
    min_stock: float
    variance_pct: float | None = None
