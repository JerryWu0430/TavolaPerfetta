from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from datetime import date
from ..database import get_db
from ..auth import get_current_user, CurrentUser
from ..models.order import Order, OrderItem
from ..models.recipe import Recipe, RecipeIngredient
from ..models.inventory import Inventory
from ..schemas.order import OrderCreate, OrderResponse, OrderItemResponse

router = APIRouter(prefix="/orders", tags=["orders"])


def deduct_inventory_for_order(db: Session, order_items: list, restaurant_id: int):
    """Deduct inventory based on recipe ingredients for each order item."""
    for item in order_items:
        recipe = db.query(Recipe).options(
            joinedload(Recipe.ingredients)
        ).filter(Recipe.id == item.recipe_id).first()

        if not recipe:
            continue

        for ing in recipe.ingredients:
            waste_mult = 1 + (ing.waste_pct or 0) / 100
            qty_to_deduct = ing.quantity * item.quantity * waste_mult

            inv = db.query(Inventory).filter(
                Inventory.product_id == ing.product_id,
                Inventory.restaurant_id == restaurant_id,
            ).first()

            if inv:
                inv.quantity = max(0, inv.quantity - qty_to_deduct)


@router.get("", response_model=list[OrderResponse])
def list_orders(
    skip: int = 0,
    limit: int = 100,
    location_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Order).filter(
        Order.restaurant_id == user.restaurant_id
    ).options(
        joinedload(Order.items).joinedload(OrderItem.recipe)
    )
    if location_id:
        query = query.filter(Order.location_id == location_id)
    if start_date:
        query = query.filter(Order.date >= start_date)
    if end_date:
        query = query.filter(Order.date <= end_date)

    orders = query.order_by(Order.date.desc()).offset(skip).limit(limit).all()

    result = []
    for order in orders:
        items = []
        for item in order.items:
            items.append(OrderItemResponse(
                id=item.id,
                recipe_id=item.recipe_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                recipe_name=item.recipe.name if item.recipe else None,
            ))
        result.append(OrderResponse(
            id=order.id,
            location_id=order.location_id,
            date=order.date,
            total=order.total,
            created_at=order.created_at,
            items=items,
        ))

    return result


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.restaurant_id == user.restaurant_id,
    ).options(
        joinedload(Order.items).joinedload(OrderItem.recipe)
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    items = []
    for item in order.items:
        items.append(OrderItemResponse(
            id=item.id,
            recipe_id=item.recipe_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            recipe_name=item.recipe.name if item.recipe else None,
        ))

    return OrderResponse(
        id=order.id,
        location_id=order.location_id,
        date=order.date,
        total=order.total,
        created_at=order.created_at,
        items=items,
    )


@router.post("", response_model=OrderResponse)
def create_order(
    data: OrderCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total = sum(item.quantity * item.unit_price for item in data.items)

    order = Order(
        location_id=data.location_id,
        date=data.date,
        total=total,
        restaurant_id=user.restaurant_id,
    )
    db.add(order)
    db.flush()

    order_items = []
    for item_data in data.items:
        item = OrderItem(
            order_id=order.id,
            recipe_id=item_data.recipe_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
        )
        db.add(item)
        order_items.append(item)

    deduct_inventory_for_order(db, order_items, user.restaurant_id)

    db.commit()
    db.refresh(order)

    return get_order(order.id, user, db)


@router.delete("/{order_id}")
def delete_order(
    order_id: int,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.restaurant_id == user.restaurant_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
    return {"ok": True}
