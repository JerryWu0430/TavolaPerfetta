from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_user, CurrentUser
from ..models import Product
from ..models.price_history import PriceHistory
from ..schemas import ProductCreate, ProductUpdate, ProductResponse

router = APIRouter(prefix="/products", tags=["products"])


def record_price(db: Session, product_id: int, price: float, restaurant_id: int):
    """Record price in history if price > 0."""
    if price and price > 0:
        db.add(PriceHistory(product_id=product_id, price=price, restaurant_id=restaurant_id))


@router.get("", response_model=list[ProductResponse])
def list_products(
    skip: int = 0,
    limit: int = 100,
    category: str | None = None,
    supplier_id: int | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Product).filter(Product.restaurant_id == user.restaurant_id)
    if category:
        query = query.filter(Product.category == category)
    if supplier_id:
        query = query.filter(Product.supplier_id == supplier_id)
    return query.offset(skip).limit(limit).all()


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.restaurant_id == user.restaurant_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("", response_model=ProductResponse)
def create_product(
    data: ProductCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = Product(**data.model_dump(), restaurant_id=user.restaurant_id)
    db.add(product)
    db.flush()
    record_price(db, product.id, product.unit_price, user.restaurant_id)
    db.commit()
    db.refresh(product)
    return product


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.restaurant_id == user.restaurant_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = data.model_dump(exclude_unset=True)
    old_price = product.unit_price

    for key, value in update_data.items():
        setattr(product, key, value)

    new_price = update_data.get("unit_price")
    if new_price is not None and new_price != old_price:
        record_price(db, product_id, new_price, user.restaurant_id)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.restaurant_id == user.restaurant_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"ok": True}
