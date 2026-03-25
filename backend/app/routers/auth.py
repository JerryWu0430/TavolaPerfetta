from fastapi import APIRouter, Depends
from ..auth import get_current_user, CurrentUser

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
def get_me(user: CurrentUser = Depends(get_current_user)):
    """Get current authenticated user info."""
    return {
        "id": user.id,
        "email": user.email,
        "restaurant_id": user.restaurant_id,
        "restaurant_name": user.restaurant_name,
        "role": user.role,
    }
