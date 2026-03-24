from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from ..database import get_db
from ..models import Supplier
from ..models.product import Product
from ..models.delivery import Delivery, DeliveryItem
from ..models.price_history import PriceHistory
from ..schemas.supplier import (
    SupplierCreate,
    SupplierUpdate,
    SupplierResponse,
    SupplierList,
    SupplierListItem,
    SupplierDetail,
    ProductPriceTrend,
    PricePoint,
    DeliveryInfo,
)

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


def get_supplier_stats(supplier_id: int, db: Session) -> dict:
    """Calculate computed fields for a supplier."""
    # Product count
    product_count = db.query(Product).filter(Product.supplier_id == supplier_id).count()

    # Get product IDs for this supplier
    product_ids = [p.id for p in db.query(Product.id).filter(Product.supplier_id == supplier_id).all()]

    # Price change % (last 3 months)
    price_change_pct = 0.0
    if product_ids:
        three_months_ago = datetime.now() - timedelta(days=90)

        # Get price history for these products
        old_prices = {}
        new_prices = {}

        for pid in product_ids:
            # Get oldest price in last 3 months
            old_record = db.query(PriceHistory).filter(
                PriceHistory.product_id == pid,
                PriceHistory.recorded_at >= three_months_ago
            ).order_by(PriceHistory.recorded_at.asc()).first()

            # Get newest price
            new_record = db.query(PriceHistory).filter(
                PriceHistory.product_id == pid
            ).order_by(PriceHistory.recorded_at.desc()).first()

            if old_record and new_record and old_record.price > 0:
                old_prices[pid] = old_record.price
                new_prices[pid] = new_record.price

        if old_prices:
            total_change = sum(
                ((new_prices[pid] - old_prices[pid]) / old_prices[pid]) * 100
                for pid in old_prices
            )
            price_change_pct = round(total_change / len(old_prices), 1)

    # Last delivery date
    last_delivery = db.query(Delivery).filter(
        Delivery.supplier_id == supplier_id
    ).order_by(Delivery.date.desc()).first()
    last_delivery_date = last_delivery.date if last_delivery else None

    # Open anomalies (late or partial deliveries in last 30 days)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    open_anomalies = db.query(Delivery).filter(
        Delivery.supplier_id == supplier_id,
        Delivery.date >= thirty_days_ago.date(),
        Delivery.status.in_(["late", "partial"])
    ).count()

    return {
        "product_count": product_count,
        "price_change_pct": price_change_pct,
        "last_delivery_date": str(last_delivery_date) if last_delivery_date else None,
        "open_anomalies": open_anomalies,
    }


@router.get("", response_model=SupplierList)
def list_suppliers(
    skip: int = 0,
    limit: int = 100,
    category: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Supplier)
    if category:
        query = query.filter(Supplier.category == category)
    total = query.count()
    items = query.offset(skip).limit(limit).all()

    # Build response with computed fields
    result = []
    for supplier in items:
        stats = get_supplier_stats(supplier.id, db)
        result.append(SupplierListItem(
            id=supplier.id,
            name=supplier.name,
            category=supplier.category,
            contact_name=supplier.contact_name,
            contact_email=supplier.contact_email,
            contact_phone=supplier.contact_phone,
            address=supplier.address,
            payment_terms=supplier.payment_terms,
            reliability_score=supplier.reliability_score,
            avg_delivery_days=supplier.avg_delivery_days,
            created_at=supplier.created_at,
            updated_at=supplier.updated_at,
            **stats
        ))

    return SupplierList(items=result, total=total)


@router.get("/{supplier_id}", response_model=SupplierDetail)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    stats = get_supplier_stats(supplier_id, db)

    # Get price trends for top products (by price history records)
    products = db.query(Product).filter(Product.supplier_id == supplier_id).limit(5).all()
    price_trends = []

    for product in products:
        history = db.query(PriceHistory).filter(
            PriceHistory.product_id == product.id
        ).order_by(PriceHistory.recorded_at.asc()).all()

        if history:
            price_trends.append(ProductPriceTrend(
                product_id=product.id,
                product_name=product.name,
                unit=product.unit,
                prices=[
                    PricePoint(
                        date=str(h.recorded_at.date()),
                        price=h.price
                    ) for h in history
                ]
            ))

    # Get recent deliveries
    deliveries = db.query(Delivery).filter(
        Delivery.supplier_id == supplier_id
    ).order_by(Delivery.date.desc()).limit(10).all()

    recent_deliveries = []
    for d in deliveries:
        # Calculate total from items
        total = sum(item.quantity * item.unit_price for item in d.items) if d.items else 0
        recent_deliveries.append(DeliveryInfo(
            id=d.id,
            date=str(d.date),
            total=round(total, 2),
            status=d.status,
            notes=d.notes
        ))

    return SupplierDetail(
        id=supplier.id,
        name=supplier.name,
        category=supplier.category,
        contact_name=supplier.contact_name,
        contact_email=supplier.contact_email,
        contact_phone=supplier.contact_phone,
        address=supplier.address,
        payment_terms=supplier.payment_terms,
        reliability_score=supplier.reliability_score,
        avg_delivery_days=supplier.avg_delivery_days,
        created_at=supplier.created_at,
        updated_at=supplier.updated_at,
        price_trends=price_trends,
        recent_deliveries=recent_deliveries,
        **stats
    )


@router.post("", response_model=SupplierResponse)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db)):
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.patch("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(supplier_id: int, data: SupplierUpdate, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(supplier, key, value)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    db.delete(supplier)
    db.commit()
    return {"ok": True}
