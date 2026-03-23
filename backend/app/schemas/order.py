from pydantic import BaseModel
from datetime import date, datetime


class OrderItemBase(BaseModel):
    recipe_id: int
    quantity: int = 1
    unit_price: float


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemResponse(OrderItemBase):
    id: int
    recipe_name: str | None = None

    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    location_id: int | None = None
    date: date
    total: float = 0.0


class OrderCreate(OrderBase):
    items: list[OrderItemCreate] = []


class OrderResponse(OrderBase):
    id: int
    created_at: datetime
    items: list[OrderItemResponse] = []

    class Config:
        from_attributes = True
