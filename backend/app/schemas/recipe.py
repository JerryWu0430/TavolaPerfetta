from pydantic import BaseModel
from datetime import datetime


class RecipeIngredientBase(BaseModel):
    product_id: int
    quantity: float
    unit: str | None = None


class RecipeIngredientCreate(RecipeIngredientBase):
    pass


class RecipeIngredientResponse(RecipeIngredientBase):
    id: int
    product_name: str | None = None
    product_unit_price: float | None = None

    class Config:
        from_attributes = True


class RecipeBase(BaseModel):
    name: str
    category: str | None = None
    price: float = 0.0
    is_active: bool = True


class RecipeCreate(RecipeBase):
    ingredients: list[RecipeIngredientCreate] = []


class RecipeUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    price: float | None = None
    is_active: bool | None = None
    ingredients: list[RecipeIngredientCreate] | None = None


class RecipeResponse(RecipeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    cost: float = 0.0
    margin: float = 0.0
    ingredients: list[RecipeIngredientResponse] = []

    class Config:
        from_attributes = True


class RecipeListResponse(RecipeBase):
    id: int
    cost: float = 0.0
    margin: float = 0.0
    sales_per_week: int = 0

    class Config:
        from_attributes = True
