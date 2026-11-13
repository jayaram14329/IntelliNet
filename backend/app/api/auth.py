from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database.session import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.auth import UserCreate, UserLogin, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Validate password match
    if user_in.confirm_password and user_in.password != user_in.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and confirmation password do not match."
        )

    # Check existing username or email
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already registered."
        )
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered."
        )

    # Create new analyst user
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name or user_in.username,
        hashed_password=get_password_hash(user_in.password),
        role="ANALYST", # Default public registration is strictly ANALYST
        is_active=True
    )
    db.add(new_user)
    
    # Audit log
    audit = AuditLog(
        username=user_in.username,
        action="USER_REGISTER",
        details=f"New user registered with email {user_in.email}"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == credentials.username_or_email) | (User.email == credentials.username_or_email)
    ).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is disabled.")

    token = create_access_token(subject=user.username, role=user.role)
    
    audit = AuditLog(
        username=user.username,
        action="USER_LOGIN",
        details=f"User {user.username} authenticated successfully"
    )
    db.add(audit)
    db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == form_data.username) | (User.email == form_data.username)
    ).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=user.username, role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    audit = AuditLog(
        username=current_user.username,
        action="USER_LOGOUT",
        details=f"User {current_user.username} logged out"
    )
    db.add(audit)
    db.commit()
    return {"message": "Logged out successfully."}

@router.post("/forgot-password")
def forgot_password(payload: dict):
    email = payload.get("email")
    return {
        "status": "info",
        "message": f"Password reset request received for '{email}'. Note: In local development, an SMTP mailer is not configured. Administrators can reset passwords via the backend CLI seed script."
    }
