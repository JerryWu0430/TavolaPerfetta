from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Date, Text, func
from sqlalchemy.orm import relationship
from ..database import Base


class HACCPTemplate(Base):
    """Configurable checklist items that admin can add/edit"""
    __tablename__ = "haccp_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50))  # temperature, cleaning, hygiene, storage
    input_type = Column(String(20), default="boolean")  # boolean, number, text
    min_value = Column(Float)  # for temperature checks
    max_value = Column(Float)
    unit = Column(String(20))  # °C, °F
    frequency = Column(String(20), default="daily")  # daily, weekly, monthly
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class HACCPChecklist(Base):
    __tablename__ = "haccp_checklists"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    date = Column(Date, nullable=False)
    operator = Column(String(100))
    shift = Column(String(20))  # morning, afternoon, evening
    status = Column(String(20), default="incomplete")  # incomplete, passed, failed
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    items = relationship("HACCPItem", back_populates="checklist", cascade="all, delete-orphan")


class HACCPItem(Base):
    __tablename__ = "haccp_items"

    id = Column(Integer, primary_key=True, index=True)
    checklist_id = Column(Integer, ForeignKey("haccp_checklists.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("haccp_templates.id"))
    name = Column(String(100), nullable=False)
    category = Column(String(50))
    value = Column(String(100))  # stores boolean as "true"/"false", numbers, or text
    passed = Column(Boolean)
    notes = Column(Text)

    checklist = relationship("HACCPChecklist", back_populates="items")
