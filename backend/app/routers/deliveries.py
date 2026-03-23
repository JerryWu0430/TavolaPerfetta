from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Delivery, DeliveryItem
from ..schemas import DeliveryCreate, DeliveryUpdate, DeliveryResponse

router = APIRouter(prefix="/deliveries", tags=["deliveries"])


@router.get("", response_model=list[DeliveryResponse])
def list_deliveries(
    skip: int = 0,
    limit: int = 100,
    supplier_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Delivery)
    if supplier_id:
        query = query.filter(Delivery.supplier_id == supplier_id)
    if status:
        query = query.filter(Delivery.status == status)
    return query.order_by(Delivery.date.desc()).offset(skip).limit(limit).all()


@router.get("/{delivery_id}", response_model=DeliveryResponse)
def get_delivery(delivery_id: int, db: Session = Depends(get_db)):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery


@router.post("", response_model=DeliveryResponse)
def create_delivery(data: DeliveryCreate, db: Session = Depends(get_db)):
    items_data = data.items
    delivery_data = data.model_dump(exclude={"items"})
    delivery = Delivery(**delivery_data)
    db.add(delivery)
    db.flush()

    for item_data in items_data:
        item = DeliveryItem(**item_data.model_dump(), delivery_id=delivery.id)
        db.add(item)

    db.commit()
    db.refresh(delivery)
    return delivery


@router.patch("/{delivery_id}", response_model=DeliveryResponse)
def update_delivery(delivery_id: int, data: DeliveryUpdate, db: Session = Depends(get_db)):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(delivery, key, value)
    db.commit()
    db.refresh(delivery)
    return delivery


@router.delete("/{delivery_id}")
def delete_delivery(delivery_id: int, db: Session = Depends(get_db)):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    db.delete(delivery)
    db.commit()
    return {"ok": True}
