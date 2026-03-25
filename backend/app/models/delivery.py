from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Text, func
from sqlalchemy.orm import relationship
from ..database import Base


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String(20), default="pending")  # pending, on_time, late, partial
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    supplier = relationship("Supplier", back_populates="deliveries")
    items = relationship("DeliveryItem", back_populates="delivery", cascade="all, delete-orphan")


class DeliveryItem(Base):
    __tablename__ = "delivery_items"

    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"))
    product_name = Column(String(100))  # fallback if product not in system
    quantity = Column(Float, nullable=False)
    unit = Column(String(20))
    unit_price = Column(Float, default=0.0)

    delivery = relationship("Delivery", back_populates="items")
    product = relationship("Product", backref="delivery_items")
