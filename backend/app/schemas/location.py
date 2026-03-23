from pydantic import BaseModel
from datetime import datetime


class LocationBase(BaseModel):
    name: str
    address: str | None = None


class LocationCreate(LocationBase):
    pass


class LocationResponse(LocationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
