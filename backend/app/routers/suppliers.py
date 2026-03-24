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

    # Price change % (last 3 months) - batch query approach
    price_change_pct = 0.0
    if product_ids:
        three_months_ago = datetime.now() - timedelta(days=90)

        # Get oldest price in last 3 months for each product (single query)
        from sqlalchemy import and_
        old_subq = db.query(
            PriceHistory.product_id,
            func.min(PriceHistory.recorded_at).label("min_date")
        ).filter(
            PriceHistory.product_id.in_(product_ids),
            PriceHistory.recorded_at >= three_months_ago
        ).group_by(PriceHistory.product_id).subquery()

        old_prices_query = db.query(PriceHistory).join(
            old_subq,
            and_(
                PriceHistory.product_id == old_subq.c.product_id,
                PriceHistory.recorded_at == old_subq.c.min_date
            )
        ).all()
        old_prices = {p.product_id: p.price for p in old_prices_query if p.price > 0}

        # Get newest price for each product (single query)
        new_subq = db.query(
            PriceHistory.product_id,
            func.max(PriceHistory.recorded_at).label("max_date")
        ).filter(
            PriceHistory.product_id.in_(product_ids)
        ).group_by(PriceHistory.product_id).subquery()

        new_prices_query = db.query(PriceHistory).join(
            new_subq,
            and_(
                PriceHistory.product_id == new_subq.c.product_id,
                PriceHistory.recorded_at == new_subq.c.max_date
            )
        ).all()
        new_prices = {p.product_id: p.price for p in new_prices_query}

        # Calculate average price change
        changes = []
        for pid in old_prices:
            if pid in new_prices and old_prices[pid] > 0:
                change = ((new_prices[pid] - old_prices[pid]) / old_prices[pid]) * 100
                changes.append(change)
        if changes:
            price_change_pct = round(sum(changes) / len(changes), 1)

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
    from sqlalchemy.orm import joinedload

    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    stats = get_supplier_stats(supplier_id, db)

    # Get price trends for top products - batch load price history
    products = db.query(Product).filter(Product.supplier_id == supplier_id).limit(5).all()
    product_ids = [p.id for p in products]

    # Single query for all price history
    all_history = db.query(PriceHistory).filter(
        PriceHistory.product_id.in_(product_ids)
    ).order_by(PriceHistory.product_id, PriceHistory.recorded_at.asc()).all()

    # Group by product_id
    history_by_product = {}
    for h in all_history:
        history_by_product.setdefault(h.product_id, []).append(h)

    price_trends = []
    for product in products:
        history = history_by_product.get(product.id, [])
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

    # Get recent deliveries with items eager loaded
    deliveries = db.query(Delivery).options(
        joinedload(Delivery.items)
    ).filter(
        Delivery.supplier_id == supplier_id
    ).order_by(Delivery.date.desc()).limit(10).all()

    recent_deliveries = []
    for d in deliveries:
        # Items already loaded
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
