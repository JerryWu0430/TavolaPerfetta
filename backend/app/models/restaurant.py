from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from ..database import Base


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    members = relationship("RestaurantMember", back_populates="restaurant")
    locations = relationship("Location", back_populates="restaurant")
    suppliers = relationship("Supplier", back_populates="restaurant")
    products = relationship("Product", back_populates="restaurant")
    recipes = relationship("Recipe", back_populates="restaurant")
