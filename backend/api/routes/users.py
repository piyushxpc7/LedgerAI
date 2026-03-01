"""FastAPI routes: team management (list, invite, update users)."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import get_db
from db import models, schemas
from core.auth import get_current_user, get_password_hash

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=List[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List all users in the same firm."""
    return db.query(models.User).filter(models.User.firm_id == current_user.firm_id).all()

@router.post("", response_model=schemas.UserOut)
def invite_user(
    payload: schemas.FirmRegister, # Reusing FirmRegister but firm_name is ignored
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Invite a new user to the firm.
    In a real app, this would send an invitation email.
    For MVP, we create the user directly with a password.
    """
    if current_user.role != models.UserRole.PARTNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only firm PARTNERS (admins) can invite users."
        )

    # Check email uniqueness
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    new_user = models.User(
        firm_id=current_user.firm_id,
        name=payload.name or payload.firm_name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=models.UserRole.SENIOR_CA, # Default role for new invites
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{user_id}", response_model=schemas.UserOut)
def update_user_status(
    user_id: str,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Admin update of user status/role."""
    if current_user.role != models.UserRole.PARTNER:
         raise HTTPException(status_code=403, detail="Not authorized.")

    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.firm_id == current_user.firm_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in your firm.")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot update your own status here.")

    if payload.name is not None: user.name = payload.name
    if payload.role is not None: user.role = payload.role
    if payload.is_active is not None: user.is_active = payload.is_active

    db.commit()
    db.refresh(user)
    return user
