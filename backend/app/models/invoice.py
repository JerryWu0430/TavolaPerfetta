from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Text, func
from sqlalchemy.orm import relationship
from ..database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    invoice_number = Column(String(50))
    date = Column(Date, nullable=False)
    total = Column(Float, default=0.0)
    vat = Column(Float, default=0.0)
    file_url = Column(String(255))
    status = Column(String(20), default="pending")  # pending, verified, paid
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    supplier = relationship("Supplier", back_populates="invoices")
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"))
    description = Column(String(255))
    quantity = Column(Float, nullable=False)
    unit = Column(String(20))
    unit_price = Column(Float, default=0.0)
    total = Column(Float, default=0.0)

    invoice = relationship("Invoice", back_populates="lines")
