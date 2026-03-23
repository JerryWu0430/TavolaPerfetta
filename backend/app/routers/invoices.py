from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Invoice, InvoiceLine
from ..schemas import InvoiceCreate, InvoiceResponse

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=list[InvoiceResponse])
def list_invoices(
    skip: int = 0,
    limit: int = 100,
    supplier_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Invoice)
    if supplier_id:
        query = query.filter(Invoice.supplier_id == supplier_id)
    if status:
        query = query.filter(Invoice.status == status)
    return query.order_by(Invoice.date.desc()).offset(skip).limit(limit).all()


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.post("", response_model=InvoiceResponse)
def create_invoice(data: InvoiceCreate, db: Session = Depends(get_db)):
    lines_data = data.lines
    invoice_data = data.model_dump(exclude={"lines"})
    invoice = Invoice(**invoice_data)
    db.add(invoice)
    db.flush()

    for line_data in lines_data:
        line = InvoiceLine(**line_data.model_dump(), invoice_id=invoice.id)
        db.add(line)

    db.commit()
    db.refresh(invoice)
    return invoice


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(invoice_id: int, status: str, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.status = status
    db.commit()
    db.refresh(invoice)
    return invoice


@router.delete("/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(invoice)
    db.commit()
    return {"ok": True}
