from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_user, CurrentUser
from ..models import Location
from ..schemas import LocationCreate, LocationResponse

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("", response_model=list[LocationResponse])
def list_locations(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Location).filter(Location.restaurant_id == user.restaurant_id).all()


@router.get("/{location_id}", response_model=LocationResponse)
def get_location(
    location_id: int,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    location = db.query(Location).filter(
        Location.id == location_id,
        Location.restaurant_id == user.restaurant_id,
    ).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.post("", response_model=LocationResponse)
def create_location(
    data: LocationCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    location = Location(**data.model_dump(), restaurant_id=user.restaurant_id)
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@router.delete("/{location_id}")
def delete_location(
    location_id: int,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    location = db.query(Location).filter(
        Location.id == location_id,
        Location.restaurant_id == user.restaurant_id,
    ).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    db.delete(location)
    db.commit()
    return {"ok": True}
