from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from datetime import date
from ..database import get_db
from ..models.order import Order, OrderItem
from ..models.recipe import Recipe
from ..schemas.order import OrderCreate, OrderResponse, OrderItemResponse

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderResponse])
def list_orders(
    skip: int = 0,
    limit: int = 100,
    location_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Order).options(
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
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.recipe)
    ).filter(Order.id == order_id).first()

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
def create_order(data: OrderCreate, db: Session = Depends(get_db)):
    # Calculate total from items
    total = sum(item.quantity * item.unit_price for item in data.items)

    order = Order(
        location_id=data.location_id,
        date=data.date,
        total=total,
    )
    db.add(order)
    db.flush()

    # Add items
    for item_data in data.items:
        item = OrderItem(
            order_id=order.id,
            recipe_id=item_data.recipe_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
        )
        db.add(item)

    db.commit()
    db.refresh(order)

    return get_order(order.id, db)


@router.delete("/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
    return {"ok": True}
