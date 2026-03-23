from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..models.price_history import PriceHistory
from ..schemas.price_history import PriceHistoryCreate, PriceHistoryResponse

router = APIRouter(prefix="/price-history", tags=["price-history"])


@router.get("", response_model=list[PriceHistoryResponse])
def list_price_history(
    product_id: int | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(PriceHistory)
    if product_id:
        query = query.filter(PriceHistory.product_id == product_id)
    if start_date:
        query = query.filter(PriceHistory.recorded_at >= start_date)
    if end_date:
        query = query.filter(PriceHistory.recorded_at <= end_date)
    return query.order_by(PriceHistory.recorded_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=PriceHistoryResponse)
def create_price_history(data: PriceHistoryCreate, db: Session = Depends(get_db)):
    record = PriceHistory(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
