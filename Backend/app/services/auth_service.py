
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import UserRegister


def register_user(db: Session, data: UserRegister) -> User:
    normalized_email = str(data.email).strip().lower()

    existing_user = (
        db.query(User)
        .filter(func.lower(User.email) == normalized_email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already registered.",
        )

    user = User(
        full_name=data.full_name.strip(),
        email=normalized_email,
        password_hash=hash_password(data.password),
        role="citizen",
        is_active=True,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    return user


def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> User:
    normalized_email = email.strip().lower()

    user = (
        db.query(User)
        .filter(func.lower(User.email) == normalized_email)
        .first()
    )

    if (
        user is None
        or not user.is_active
        or not verify_password(password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def create_user_token(user: User) -> str:
    return create_access_token(str(user.id))
