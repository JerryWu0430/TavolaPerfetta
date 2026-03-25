from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_user, CurrentUser
from ..models import Invoice, InvoiceLine
from ..schemas import InvoiceCreate, InvoiceResponse

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=list[InvoiceResponse])
def list_invoices(
    skip: int = 0,
    limit: int = 100,
    supplier_id: int | None = None,
    status: str | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Invoice).filter(Invoice.restaurant_id == user.restaurant_id)
    if supplier_id:
        query = query.filter(Invoice.supplier_id == supplier_id)
    if status:
        query = query.filter(Invoice.status == status)
    return query.order_by(Invoice.date.desc()).offset(skip).limit(limit).all()


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.restaurant_id == user.restaurant_id,
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.post("", response_model=InvoiceResponse)
def create_invoice(
    data: InvoiceCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lines_data = data.lines
    invoice_data = data.model_dump(exclude={"lines", "total"})
    invoice = Invoice(**invoice_data, restaurant_id=user.restaurant_id)
    db.add(invoice)
    db.flush()

    lines_total = 0.0
    for line_data in lines_data:
        line_dict = line_data.model_dump()
        if not line_dict.get("total"):
            line_dict["total"] = line_dict["quantity"] * line_dict.get("unit_price", 0)
        lines_total += line_dict["total"]
        line = InvoiceLine(**line_dict, invoice_id=invoice.id)
        db.add(line)

    invoice.total = lines_total

    db.commit()
    db.refresh(invoice)
    return invoice


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    status: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.restaurant_id == user.restaurant_id,
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.status = status
    db.commit()
    db.refresh(invoice)
    return invoice


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.restaurant_id == user.restaurant_id,
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(invoice)
    db.commit()
    return {"ok": True}
