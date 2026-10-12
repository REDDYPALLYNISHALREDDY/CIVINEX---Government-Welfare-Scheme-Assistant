
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    TokenResponse,
    UserRegister,
    UserResponse,
)
from app.services.auth_service import (
    authenticate_user,
    create_user_token,
    register_user,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    data: UserRegister,
    db: Annotated[Session, Depends(get_db)],
):
    return register_user(db, data)


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: Annotated[
        OAuth2PasswordRequestForm,
        Depends(),
    ],
    db: Annotated[Session, Depends(get_db)],
):
    user = authenticate_user(
        db,
        form_data.username,
        form_data.password,
    )

    return TokenResponse(
        access_token=create_user_token(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
):
    return current_user
