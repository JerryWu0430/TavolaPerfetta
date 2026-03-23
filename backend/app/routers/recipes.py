from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime, timedelta
from ..database import get_db
from ..models.recipe import Recipe, RecipeIngredient
from ..models.product import Product
from ..models.order import Order, OrderItem
from ..schemas.recipe import (
    RecipeCreate,
    RecipeUpdate,
    RecipeResponse,
    RecipeListResponse,
    RecipeIngredientResponse,
)

router = APIRouter(prefix="/recipes", tags=["recipes"])


def calculate_cost(ingredients: list, db: Session) -> float:
    """Calculate total cost from ingredients."""
    total = 0.0
    for ing in ingredients:
        product = db.query(Product).filter(Product.id == ing.product_id).first()
        if product:
            total += ing.quantity * product.unit_price
    return total


def calculate_margin(price: float, cost: float) -> float:
    """Calculate margin percentage."""
    if price <= 0:
        return 0.0
    return ((price - cost) / price) * 100


@router.get("", response_model=list[RecipeListResponse])
def list_recipes(
    skip: int = 0,
    limit: int = 100,
    category: str | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Recipe).options(joinedload(Recipe.ingredients))
    if category:
        query = query.filter(Recipe.category == category)
    if is_active is not None:
        query = query.filter(Recipe.is_active == is_active)

    recipes = query.offset(skip).limit(limit).all()

    # Calculate sales per week (last 7 days)
    week_ago = datetime.now() - timedelta(days=7)

    result = []
    for recipe in recipes:
        cost = calculate_cost(recipe.ingredients, db)
        margin = calculate_margin(recipe.price, cost)

        # Get sales count
        sales = db.query(func.sum(OrderItem.quantity)).join(Order).filter(
            OrderItem.recipe_id == recipe.id,
            Order.date >= week_ago.date()
        ).scalar() or 0

        result.append(RecipeListResponse(
            id=recipe.id,
            name=recipe.name,
            category=recipe.category,
            price=recipe.price,
            is_active=recipe.is_active,
            cost=round(cost, 2),
            margin=round(margin, 1),
            sales_per_week=int(sales),
        ))

    return result


@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(Recipe).options(
        joinedload(Recipe.ingredients).joinedload(RecipeIngredient.product)
    ).filter(Recipe.id == recipe_id).first()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    cost = calculate_cost(recipe.ingredients, db)
    margin = calculate_margin(recipe.price, cost)

    # Build ingredient responses with product info
    ingredients = []
    for ing in recipe.ingredients:
        ingredients.append(RecipeIngredientResponse(
            id=ing.id,
            product_id=ing.product_id,
            quantity=ing.quantity,
            unit=ing.unit,
            product_name=ing.product.name if ing.product else None,
            product_unit_price=ing.product.unit_price if ing.product else None,
        ))

    return RecipeResponse(
        id=recipe.id,
        name=recipe.name,
        category=recipe.category,
        price=recipe.price,
        is_active=recipe.is_active,
        created_at=recipe.created_at,
        updated_at=recipe.updated_at,
        cost=round(cost, 2),
        margin=round(margin, 1),
        ingredients=ingredients,
    )


@router.post("", response_model=RecipeResponse)
def create_recipe(data: RecipeCreate, db: Session = Depends(get_db)):
    recipe = Recipe(
        name=data.name,
        category=data.category,
        price=data.price,
        is_active=data.is_active,
    )
    db.add(recipe)
    db.flush()

    # Add ingredients
    for ing_data in data.ingredients:
        ingredient = RecipeIngredient(
            recipe_id=recipe.id,
            product_id=ing_data.product_id,
            quantity=ing_data.quantity,
            unit=ing_data.unit,
        )
        db.add(ingredient)

    db.commit()
    db.refresh(recipe)

    # Return with calculated values
    return get_recipe(recipe.id, db)


@router.patch("/{recipe_id}", response_model=RecipeResponse)
def update_recipe(recipe_id: int, data: RecipeUpdate, db: Session = Depends(get_db)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Update basic fields
    update_data = data.model_dump(exclude_unset=True, exclude={"ingredients"})
    for key, value in update_data.items():
        setattr(recipe, key, value)

    # Update ingredients if provided
    if data.ingredients is not None:
        # Remove existing ingredients
        db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe_id).delete()

        # Add new ingredients
        for ing_data in data.ingredients:
            ingredient = RecipeIngredient(
                recipe_id=recipe_id,
                product_id=ing_data.product_id,
                quantity=ing_data.quantity,
                unit=ing_data.unit,
            )
            db.add(ingredient)

    db.commit()
    return get_recipe(recipe_id, db)


@router.delete("/{recipe_id}")
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete(recipe)
    db.commit()
    return {"ok": True}
