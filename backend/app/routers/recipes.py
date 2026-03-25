from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime, timedelta
from ..database import get_db
from ..auth import get_current_user, CurrentUser
from ..models.recipe import Recipe, RecipeIngredient
from ..models.product import Product
from ..models.order import Order, OrderItem
from ..schemas.recipe import (
    RecipeCreate,
    RecipeUpdate,
    RecipeResponse,
    RecipeListResponse,
    RecipeIngredientResponse,
    WeeklySales,
)

router = APIRouter(prefix="/recipes", tags=["recipes"])


def calculate_cost_from_loaded(ingredients: list) -> float:
    """Calculate total cost from pre-loaded ingredients."""
    total = 0.0
    for ing in ingredients:
        if ing.product:
            waste_mult = 1 + (ing.waste_pct or 0) / 100
            total += ing.quantity * ing.product.unit_price * waste_mult
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
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Recipe).filter(
        Recipe.restaurant_id == user.restaurant_id
    ).options(
        joinedload(Recipe.ingredients).joinedload(RecipeIngredient.product)
    )
    if category:
        query = query.filter(Recipe.category == category)
    if is_active is not None:
        query = query.filter(Recipe.is_active == is_active)

    recipes = query.offset(skip).limit(limit).all()

    week_ago = datetime.now() - timedelta(days=7)

    result = []
    for recipe in recipes:
        cost = calculate_cost_from_loaded(recipe.ingredients)
        margin = calculate_margin(recipe.price, cost)

        sales = db.query(func.sum(OrderItem.quantity)).join(Order).filter(
            OrderItem.recipe_id == recipe.id,
            Order.date >= week_ago.date(),
            Order.restaurant_id == user.restaurant_id,
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


def get_weekly_sales(recipe_id: int, restaurant_id: int, db: Session) -> list[WeeklySales]:
    """Get sales for last 4 weeks."""
    result = []
    now = datetime.now()
    for i in range(4, 0, -1):
        week_start = now - timedelta(days=7 * i)
        week_end = now - timedelta(days=7 * (i - 1))
        sales = db.query(func.sum(OrderItem.quantity)).join(Order).filter(
            OrderItem.recipe_id == recipe_id,
            Order.date >= week_start.date(),
            Order.date < week_end.date(),
            Order.restaurant_id == restaurant_id,
        ).scalar() or 0
        result.append(WeeklySales(week=f"W{5 - i}", quantity=int(sales)))
    return result


def is_best_seller(recipe_id: int, restaurant_id: int, db: Session) -> bool:
    """Check if recipe is in top 3 by sales in last 4 weeks."""
    four_weeks_ago = datetime.now() - timedelta(days=28)
    top_recipes = db.query(
        OrderItem.recipe_id,
        func.sum(OrderItem.quantity).label("total")
    ).join(Order).filter(
        Order.date >= four_weeks_ago.date(),
        Order.restaurant_id == restaurant_id,
    ).group_by(OrderItem.recipe_id).order_by(
        func.sum(OrderItem.quantity).desc()
    ).limit(3).all()
    return recipe_id in [r[0] for r in top_recipes]


@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(
    recipe_id: int,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id,
        Recipe.restaurant_id == user.restaurant_id,
    ).options(
        joinedload(Recipe.ingredients)
        .joinedload(RecipeIngredient.product)
        .joinedload(Product.supplier)
    ).first()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    cost = calculate_cost_from_loaded(recipe.ingredients)
    margin = calculate_margin(recipe.price, cost)
    margin_value = recipe.price - cost

    ingredients = []
    for ing in recipe.ingredients:
        waste_mult = 1 + (ing.waste_pct or 0) / 100
        ing_cost = ing.quantity * (ing.product.unit_price if ing.product else 0) * waste_mult
        supplier_name = ing.product.supplier.name if ing.product and ing.product.supplier else None
        ingredients.append(RecipeIngredientResponse(
            id=ing.id,
            product_id=ing.product_id,
            quantity=ing.quantity,
            unit=ing.unit,
            waste_pct=ing.waste_pct or 0.0,
            product_name=ing.product.name if ing.product else None,
            product_unit_price=ing.product.unit_price if ing.product else None,
            supplier_name=supplier_name,
            cost=round(ing_cost, 2),
        ))

    weekly_sales = get_weekly_sales(recipe_id, user.restaurant_id, db)
    best_seller = is_best_seller(recipe_id, user.restaurant_id, db)

    return RecipeResponse(
        id=recipe.id,
        name=recipe.name,
        category=recipe.category,
        description=recipe.description,
        price=recipe.price,
        is_active=recipe.is_active,
        created_at=recipe.created_at,
        updated_at=recipe.updated_at,
        cost=round(cost, 2),
        margin=round(margin, 1),
        margin_value=round(margin_value, 2),
        ingredients=ingredients,
        weekly_sales=weekly_sales,
        is_best_seller=best_seller,
    )


@router.post("", response_model=RecipeResponse)
def create_recipe(
    data: RecipeCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recipe = Recipe(
        name=data.name,
        category=data.category,
        description=data.description,
        price=data.price,
        is_active=data.is_active,
        restaurant_id=user.restaurant_id,
    )
    db.add(recipe)
    db.flush()

    for ing_data in data.ingredients:
        ingredient = RecipeIngredient(
            recipe_id=recipe.id,
            product_id=ing_data.product_id,
            quantity=ing_data.quantity,
            unit=ing_data.unit,
            waste_pct=ing_data.waste_pct,
        )
        db.add(ingredient)

    db.commit()
    db.refresh(recipe)

    return get_recipe(recipe.id, user, db)


@router.patch("/{recipe_id}", response_model=RecipeResponse)
def update_recipe(
    recipe_id: int,
    data: RecipeUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id,
        Recipe.restaurant_id == user.restaurant_id,
    ).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    update_data = data.model_dump(exclude_unset=True, exclude={"ingredients"})
    for key, value in update_data.items():
        setattr(recipe, key, value)

    if data.ingredients is not None:
        db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe_id).delete()

        for ing_data in data.ingredients:
            ingredient = RecipeIngredient(
                recipe_id=recipe_id,
                product_id=ing_data.product_id,
                quantity=ing_data.quantity,
                unit=ing_data.unit,
                waste_pct=ing_data.waste_pct,
            )
            db.add(ingredient)

    db.commit()
    return get_recipe(recipe_id, user, db)


@router.delete("/{recipe_id}")
def delete_recipe(
    recipe_id: int,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id,
        Recipe.restaurant_id == user.restaurant_id,
    ).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete(recipe)
    db.commit()
    return {"ok": True}
