
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.scheme import Scheme
from app.models.user import User
from app.schemas.saved_scheme import (
    SavedSchemeCreate,
    SavedSchemeResponse,
)
from app.services.saved_scheme_service import (
    list_saved_schemes,
    remove_saved_scheme,
    save_scheme,
)


router = APIRouter(
    prefix="/saved-schemes",
    tags=["Saved Schemes"],
)


@router.get(
    "/",
    response_model=list[SavedSchemeResponse],
)
def get_saved_schemes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_saved_schemes(
        db=db,
        user_id=current_user.id,
    )


@router.post(
    "/",
    response_model=SavedSchemeResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_saved_scheme(
    payload: SavedSchemeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scheme = (
        db.query(Scheme)
        .filter(
            Scheme.id == payload.scheme_id,
            Scheme.is_active.is_(True),
        )
        .first()
    )

    if scheme is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active scheme not found.",
        )

    try:
        saved = save_scheme(
            db=db,
            user_id=current_user.id,
            scheme_id=payload.scheme_id,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This scheme is already saved.",
        )

    return {
        "id": saved.id,
        "scheme_id": scheme.id,
        "created_at": saved.created_at,
        "name": scheme.name,
        "scheme_code": scheme.scheme_code,
        "description": scheme.description,
        "government_level": scheme.government_level,
        "state": scheme.state,
        "category": scheme.category,
        "official_url": scheme.official_url,
        "benefits": scheme.benefits,
    }


@router.delete(
    "/{scheme_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_saved_scheme(
    scheme_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    removed = remove_saved_scheme(
        db=db,
        user_id=current_user.id,
        scheme_id=scheme_id,
    )

    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved scheme not found.",
        )

    return None
