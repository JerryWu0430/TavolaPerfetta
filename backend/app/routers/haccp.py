from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from ..database import get_db
from ..auth import get_current_user, CurrentUser
from ..models import HACCPChecklist, HACCPItem, HACCPTemplate
from ..schemas import (
    HACCPTemplateCreate,
    HACCPTemplateResponse,
    HACCPChecklistCreate,
    HACCPChecklistResponse,
)

router = APIRouter(prefix="/haccp", tags=["haccp"])


# Templates (configurable checklist items)
@router.get("/templates", response_model=list[HACCPTemplateResponse])
def list_templates(
    active_only: bool = True,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(HACCPTemplate).filter(HACCPTemplate.restaurant_id == user.restaurant_id)
    if active_only:
        query = query.filter(HACCPTemplate.is_active == True)
    return query.order_by(HACCPTemplate.sort_order).all()


@router.post("/templates", response_model=HACCPTemplateResponse)
def create_template(
    data: HACCPTemplateCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = HACCPTemplate(**data.model_dump(), restaurant_id=user.restaurant_id)
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.patch("/templates/{template_id}", response_model=HACCPTemplateResponse)
def update_template(
    template_id: int,
    data: HACCPTemplateCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = db.query(HACCPTemplate).filter(
        HACCPTemplate.id == template_id,
        HACCPTemplate.restaurant_id == user.restaurant_id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(template, key, value)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: int,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = db.query(HACCPTemplate).filter(
        HACCPTemplate.id == template_id,
        HACCPTemplate.restaurant_id == user.restaurant_id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    template.is_active = False  # soft delete
    db.commit()
    return {"ok": True}


# Checklists
@router.get("/checklists", response_model=list[HACCPChecklistResponse])
def list_checklists(
    skip: int = 0,
    limit: int = 30,
    location_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(HACCPChecklist).filter(HACCPChecklist.restaurant_id == user.restaurant_id)
    if location_id:
        query = query.filter(HACCPChecklist.location_id == location_id)
    if start_date:
        query = query.filter(HACCPChecklist.date >= start_date)
    if end_date:
        query = query.filter(HACCPChecklist.date <= end_date)
    return query.order_by(HACCPChecklist.date.desc()).offset(skip).limit(limit).all()


@router.get("/checklists/{checklist_id}", response_model=HACCPChecklistResponse)
def get_checklist(
    checklist_id: int,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checklist = db.query(HACCPChecklist).filter(
        HACCPChecklist.id == checklist_id,
        HACCPChecklist.restaurant_id == user.restaurant_id,
    ).first()
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist not found")
    return checklist


@router.post("/checklists", response_model=HACCPChecklistResponse)
def create_checklist(
    data: HACCPChecklistCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items_data = data.items
    checklist_data = data.model_dump(exclude={"items"})
    checklist = HACCPChecklist(**checklist_data, restaurant_id=user.restaurant_id)
    db.add(checklist)
    db.flush()

    all_passed = True
    for item_data in items_data:
        item = HACCPItem(**item_data.model_dump(), checklist_id=checklist.id)
        db.add(item)
        if item.passed is False:
            all_passed = False

    checklist.status = "passed" if all_passed else "failed"
    db.commit()
    db.refresh(checklist)
    return checklist


@router.get("/today", response_model=HACCPChecklistResponse | None)
def get_today_checklist(
    location_id: int | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get today's checklist if it exists"""
    today = date.today()
    query = db.query(HACCPChecklist).filter(
        HACCPChecklist.date == today,
        HACCPChecklist.restaurant_id == user.restaurant_id,
    )
    if location_id:
        query = query.filter(HACCPChecklist.location_id == location_id)
    return query.first()
