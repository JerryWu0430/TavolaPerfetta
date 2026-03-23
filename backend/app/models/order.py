from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, Date, func
from sqlalchemy.orm import relationship
from ..database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    date = Column(Date, nullable=False)
    total = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=func.now())

    location = relationship("Location", backref="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    recipe = relationship("Recipe", backref="order_items")
