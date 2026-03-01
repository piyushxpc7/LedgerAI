"""FastAPI route: authentication (register firm, login, get current user, password reset)."""
import secrets
import hashlib
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from db.database import get_db
from db import models, schemas
from core.auth import authenticate_user, create_access_token, get_password_hash, get_current_user
from core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Simple in-memory reset token store ─────────────────────────────────────
# For production with multiple workers, move this to Redis (Upstash free)
_reset_tokens: dict[str, dict] = {}  # token_hash → {user_id, expires_at}


# ── Rate limiting helpers ─────────────────────────────────────────────
def _apply_rate_limit(request: Request, route: str):
    """Apply rate limiting if slowapi is available."""
    # slowapi handles this via decorator — this is a no-op fallback
    pass


@router.post("/register", response_model=schemas.TokenResponse)
def register_firm(payload: schemas.FirmRegister, db: Session = Depends(get_db)):
    """Register a new CA firm and create the admin (PARTNER) user."""
    # Check email uniqueness
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Create firm
    firm = models.Firm(
        name=payload.firm_name,
        email=payload.email,
        phone=payload.phone,
    )
    db.add(firm)
    db.flush()

    # Create admin user
    user = models.User(
        firm_id=firm.id,
        name=payload.name or payload.firm_name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=models.UserRole.PARTNER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Welcome email (non-critical)
    try:
        from services.email_service import send_welcome
        send_welcome(to=user.email, firm_name=firm.name)
    except Exception:
        pass

    token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "firm_id": user.firm_id},
    }


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login with email and password."""
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated. Contact your firm admin.")

    token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "firm_id": user.firm_id},
    }


@router.get("/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    """Get currently authenticated user."""
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "firm_id": current_user.firm_id,
    }


@router.post("/forgot-password")
def forgot_password(payload: schemas.ForgotPassword, db: Session = Depends(get_db)):
    """
    Send a password reset link to the user's email.
    Always returns 200 to avoid leaking whether an email exists.
    """
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user and user.is_active:
        # Generate a secure token, store its hash (never store raw tokens)
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        _reset_tokens[token_hash] = {
            "user_id": user.id,
            "expires_at": datetime.utcnow() + timedelta(hours=1),
        }
        try:
            from services.email_service import send_password_reset
            send_password_reset(to=user.email, reset_token=raw_token)
        except Exception as e:
            print(f"Password reset email failed: {e}")

    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(payload: schemas.ResetPassword, db: Session = Depends(get_db)):
    """Verify reset token and update password."""
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()
    entry = _reset_tokens.get(token_hash)
    if not entry or datetime.utcnow() > entry["expires_at"]:
        raise HTTPException(status_code=400, detail="Reset link is invalid or has expired.")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    user = db.query(models.User).filter(models.User.id == entry["user_id"]).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found.")

    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    del _reset_tokens[token_hash]  # invalidate token after use

    return {"message": "Password updated successfully."}
