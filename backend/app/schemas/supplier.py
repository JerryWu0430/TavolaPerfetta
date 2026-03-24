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


class SupplierListItem(SupplierResponse):
    """Extended supplier info for list view."""
    product_count: int = 0
    price_change_pct: float = 0.0
    last_delivery_date: str | None = None
    open_anomalies: int = 0


class SupplierList(BaseModel):
    items: list[SupplierListItem]
    total: int


class PricePoint(BaseModel):
    date: str
    price: float


class ProductPriceTrend(BaseModel):
    product_id: int
    product_name: str
    unit: str | None
    prices: list[PricePoint]


class DeliveryInfo(BaseModel):
    id: int
    date: str
    total: float
    status: str
    notes: str | None = None


class SupplierDetail(SupplierResponse):
    """Full supplier detail with computed fields."""
    product_count: int = 0
    price_change_pct: float = 0.0
    last_delivery_date: str | None = None
    open_anomalies: int = 0
    price_trends: list[ProductPriceTrend] = []
    recent_deliveries: list[DeliveryInfo] = []
