from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models import Inventory, Product, Supplier
from ..schemas import InventoryUpdate, InventoryResponse
from ..schemas.inventory import InventoryWithProduct

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=list[InventoryWithProduct])
def list_inventory(
    skip: int = 0,
    limit: int = 100,
    location_id: int | None = None,
    low_stock: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(Inventory).join(Product).options(joinedload(Inventory.product))
    if location_id:
        query = query.filter(Inventory.location_id == location_id)

    items = query.offset(skip).limit(limit).all()
    result = []
    for inv in items:
        variance = None
        if inv.theoretical_quantity > 0:
            variance = ((inv.quantity - inv.theoretical_quantity) / inv.theoretical_quantity) * 100

        # Get supplier name if product has supplier
        supplier_name = None
        if inv.product.supplier_id:
            supplier = db.query(Supplier).filter(Supplier.id == inv.product.supplier_id).first()
            if supplier:
                supplier_name = supplier.name

        item = InventoryWithProduct(
            id=inv.id,
            product_id=inv.product_id,
            location_id=inv.location_id,
            quantity=inv.quantity,
            theoretical_quantity=inv.theoretical_quantity,
            last_count_date=inv.last_count_date,
            updated_at=inv.updated_at,
            product_name=inv.product.name,
            product_unit=inv.product.unit,
            product_category=inv.product.category,
            product_unit_price=inv.product.unit_price or 0.0,
            supplier_name=supplier_name,
            min_stock=inv.product.min_stock,
            variance_pct=variance,
        )
        if low_stock and inv.quantity >= inv.product.min_stock:
            continue
        result.append(item)

    return result


@router.get("/{inventory_id}", response_model=InventoryResponse)
def get_inventory(inventory_id: int, db: Session = Depends(get_db)):
    inv = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory not found")
    return inv


@router.patch("/{inventory_id}", response_model=InventoryResponse)
def update_inventory(inventory_id: int, data: InventoryUpdate, db: Session = Depends(get_db)):
    inv = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(inv, key, value)
    db.commit()
    db.refresh(inv)
    return inv


@router.post("/count/{product_id}", response_model=InventoryResponse)
def record_count(product_id: int, quantity: float, location_id: int | None = None, db: Session = Depends(get_db)):
    """Record a physical inventory count"""
    from datetime import datetime

    inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inv:
        inv = Inventory(product_id=product_id, location_id=location_id)
        db.add(inv)

    inv.quantity = quantity
    inv.last_count_date = datetime.utcnow()
    db.commit()
    db.refresh(inv)
    return inv
