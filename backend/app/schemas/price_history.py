from pydantic import BaseModel
from datetime import datetime


class PriceHistoryBase(BaseModel):
    product_id: int
    price: float


class PriceHistoryCreate(PriceHistoryBase):
    pass


class PriceHistoryResponse(PriceHistoryBase):
    id: int
    recorded_at: datetime

    class Config:
        from_attributes = True
