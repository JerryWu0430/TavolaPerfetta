from datetime import date as DateType, datetime
from pydantic import BaseModel


class HACCPTemplateBase(BaseModel):
    name: str
    category: str | None = None
    input_type: str = "boolean"
    min_value: float | None = None
    max_value: float | None = None
    unit: str | None = None
    frequency: str = "daily"
    sort_order: int = 0


class HACCPTemplateCreate(HACCPTemplateBase):
    pass


class HACCPTemplateResponse(HACCPTemplateBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class HACCPItemCreate(BaseModel):
    template_id: int | None = None
    name: str
    category: str | None = None
    value: str | None = None
    passed: bool | None = None
    notes: str | None = None


class HACCPItemResponse(HACCPItemCreate):
    id: int

    class Config:
        from_attributes = True


class HACCPChecklistBase(BaseModel):
    location_id: int | None = None
    date: DateType
    operator: str | None = None
    shift: str | None = None
    notes: str | None = None


class HACCPChecklistCreate(HACCPChecklistBase):
    items: list[HACCPItemCreate] = []


class HACCPChecklistResponse(HACCPChecklistBase):
    id: int
    status: str
    created_at: datetime
    items: list[HACCPItemResponse] = []

    class Config:
        from_attributes = True
