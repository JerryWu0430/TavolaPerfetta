from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from ..database import Base


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), unique=True, nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"))
    quantity = Column(Float, default=0.0)
    theoretical_quantity = Column(Float, default=0.0)
    last_count_date = Column(DateTime)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    product = relationship("Product", back_populates="inventory")
