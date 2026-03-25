from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_user, CurrentUser
from ..models import Delivery, DeliveryItem, Inventory, Supplier
from ..schemas import DeliveryCreate, DeliveryUpdate, DeliveryResponse

router = APIRouter(prefix="/deliveries", tags=["deliveries"])

RECEIVED_STATUSES = {"on_time", "late", "partial"}


def update_inventory_from_delivery(db: Session, delivery: Delivery, restaurant_id: int):
    """Add delivered quantities to inventory."""
    for item in delivery.items:
        if not item.product_id:
            continue
        inv = db.query(Inventory).filter(
            Inventory.product_id == item.product_id,
            Inventory.restaurant_id == restaurant_id,
        ).first()
        if inv:
            inv.quantity += item.quantity
        else:
            db.add(Inventory(
                product_id=item.product_id,
                quantity=item.quantity,
                restaurant_id=restaurant_id,
            ))


def update_supplier_reliability(db: Session, supplier_id: int, restaurant_id: int):
    """Recalculate supplier reliability from recent deliveries."""
    from datetime import datetime, timedelta
    ninety_days_ago = datetime.now() - timedelta(days=90)

    deliveries = db.query(Delivery).filter(
        Delivery.supplier_id == supplier_id,
        Delivery.restaurant_id == restaurant_id,
        Delivery.date >= ninety_days_ago.date(),
        Delivery.status.in_(RECEIVED_STATUSES)
    ).all()

    if not deliveries:
        return

    on_time = sum(1 for d in deliveries if d.status == "on_time")
    score = (on_time / len(deliveries)) * 100

    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.restaurant_id == restaurant_id,
    ).first()
    if supplier:
        supplier.reliability_score = round(score, 1)


@router.get("", response_model=list[DeliveryResponse])
def list_deliveries(
    skip: int = 0,
    limit: int = 100,
    supplier_id: int | None = None,
    status: str | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Delivery).filter(Delivery.restaurant_id == user.restaurant_id)
    if supplier_id:
        query = query.filter(Delivery.supplier_id == supplier_id)
    if status:
        query = query.filter(Delivery.status == status)
    return query.order_by(Delivery.date.desc()).offset(skip).limit(limit).all()


@router.get("/{delivery_id}", response_model=DeliveryResponse)
def get_delivery(
    delivery_id: int,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delivery = db.query(Delivery).filter(
        Delivery.id == delivery_id,
        Delivery.restaurant_id == user.restaurant_id,
    ).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery


@router.post("", response_model=DeliveryResponse)
def create_delivery(
    data: DeliveryCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items_data = data.items
    delivery_data = data.model_dump(exclude={"items"})
    delivery = Delivery(**delivery_data, restaurant_id=user.restaurant_id)
    db.add(delivery)
    db.flush()

    for item_data in items_data:
        item = DeliveryItem(**item_data.model_dump(), delivery_id=delivery.id)
        db.add(item)

    db.flush()

    if delivery.status in RECEIVED_STATUSES:
        update_inventory_from_delivery(db, delivery, user.restaurant_id)
        update_supplier_reliability(db, delivery.supplier_id, user.restaurant_id)

    db.commit()
    db.refresh(delivery)
    return delivery


@router.patch("/{delivery_id}", response_model=DeliveryResponse)
def update_delivery(
    delivery_id: int,
    data: DeliveryUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delivery = db.query(Delivery).filter(
        Delivery.id == delivery_id,
        Delivery.restaurant_id == user.restaurant_id,
    ).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")

    old_status = delivery.status
    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(delivery, key, value)

    new_status = update_data.get("status")
    if new_status and old_status == "pending" and new_status in RECEIVED_STATUSES:
        update_inventory_from_delivery(db, delivery, user.restaurant_id)
        update_supplier_reliability(db, delivery.supplier_id, user.restaurant_id)

    db.commit()
    db.refresh(delivery)
    return delivery


@router.delete("/{delivery_id}")
def delete_delivery(
    delivery_id: int,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delivery = db.query(Delivery).filter(
        Delivery.id == delivery_id,
        Delivery.restaurant_id == user.restaurant_id,
    ).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    db.delete(delivery)
    db.commit()
    return {"ok": True}
