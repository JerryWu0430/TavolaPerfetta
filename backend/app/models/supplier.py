from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50))  # produce, meat, dairy, seafood, dry_goods, beverages
    contact_name = Column(String(100))
    contact_email = Column(String(100))
    contact_phone = Column(String(20))
    address = Column(String(255))
    reliability_score = Column(Float, default=100.0)  # 0-100
    avg_delivery_days = Column(Float, default=1.0)
    payment_terms = Column(String(50))  # net30, net60, cod
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    restaurant = relationship("Restaurant", back_populates="suppliers")
    products = relationship("Product", back_populates="supplier")
    deliveries = relationship("Delivery", back_populates="supplier")
    invoices = relationship("Invoice", back_populates="supplier")
