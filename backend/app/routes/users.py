from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud import get_or_create_default_user, get_user_by_id
from app.schemas import UserResponse
from app.models import User

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/current", response_model=UserResponse)
def get_current_user(db: Session = Depends(get_db)):
    """Retrieve the current logged-in user (Alex Johnson - Host default)."""
    user = get_or_create_default_user(db)
    return user

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/", response_model=list[UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users
