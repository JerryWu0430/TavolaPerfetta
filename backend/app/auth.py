from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
import jwt

from .database import get_db
from .config import get_settings
from .models.restaurant_member import RestaurantMember
from .models.restaurant import Restaurant

security = HTTPBearer()
settings = get_settings()


class CurrentUser(BaseModel):
    id: str
    email: str
    restaurant_id: int
    restaurant_name: str
    role: str

    class Config:
        from_attributes = True


def verify_jwt(token: str) -> dict:
    """Verify Supabase JWT and return payload."""
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> CurrentUser:
    """Get current authenticated user with restaurant context."""
    payload = verify_jwt(credentials.credentials)
    user_id = payload.get("sub")
    email = payload.get("email")

    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # Find member by email
    member = db.query(RestaurantMember).filter(
        RestaurantMember.email == email
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Contact administrator.",
        )

    # Update user_id on first login
    if not member.user_id:
        member.user_id = user_id
        db.commit()

    restaurant = db.query(Restaurant).filter(
        Restaurant.id == member.restaurant_id
    ).first()

    return CurrentUser(
        id=user_id,
        email=email,
        restaurant_id=member.restaurant_id,
        restaurant_name=restaurant.name if restaurant else "",
        role=member.role,
    )


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Require admin role."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
