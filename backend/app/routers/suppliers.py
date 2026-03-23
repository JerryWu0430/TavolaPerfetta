from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Supplier
from ..schemas import SupplierCreate, SupplierUpdate, SupplierResponse, SupplierList

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


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
    return SupplierList(items=items, total=total)


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


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
