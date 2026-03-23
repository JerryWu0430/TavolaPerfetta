from pydantic import BaseModel
from datetime import datetime


class RecipeIngredientBase(BaseModel):
    product_id: int
    quantity: float
    unit: str | None = None
    waste_pct: float = 0.0


class RecipeIngredientCreate(RecipeIngredientBase):
    pass


class RecipeIngredientResponse(RecipeIngredientBase):
    id: int
    product_name: str | None = None
    product_unit_price: float | None = None
    supplier_name: str | None = None
    cost: float = 0.0  # calculated: quantity * unit_price

    class Config:
        from_attributes = True


class WeeklySales(BaseModel):
    week: str  # "W1", "W2", etc.
    quantity: int


class RecipeBase(BaseModel):
    name: str
    category: str | None = None
    description: str | None = None
    price: float = 0.0
    is_active: bool = True


class RecipeCreate(RecipeBase):
    ingredients: list[RecipeIngredientCreate] = []


class RecipeUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    description: str | None = None
    price: float | None = None
    is_active: bool | None = None
    ingredients: list[RecipeIngredientCreate] | None = None


class RecipeResponse(RecipeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    cost: float = 0.0
    margin: float = 0.0
    margin_value: float = 0.0  # price - cost
    ingredients: list[RecipeIngredientResponse] = []
    weekly_sales: list[WeeklySales] = []
    is_best_seller: bool = False

    class Config:
        from_attributes = True


class RecipeListResponse(RecipeBase):
    id: int
    cost: float = 0.0
    margin: float = 0.0
    sales_per_week: int = 0

    class Config:
        from_attributes = True
