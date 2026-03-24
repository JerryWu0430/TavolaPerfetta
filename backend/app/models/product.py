from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from ..database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50))  # vegetable, meat, dairy, seafood, spice, grain
    unit = Column(String(20))  # kg, g, l, ml, pcs
    unit_price = Column(Float, default=0.0)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="RESTRICT"))
    sku = Column(String(50))
    min_stock = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    supplier = relationship("Supplier", back_populates="products")
    inventory = relationship("Inventory", back_populates="product", uselist=False)
