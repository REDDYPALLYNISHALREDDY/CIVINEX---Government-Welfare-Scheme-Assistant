
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.core.database import get_db
from app.models.user import User
from app.schemas.scheme import SchemeCreate, SchemeResponse
from app.services.scheme_service import (
    create_scheme,
    get_scheme_by_id,
    list_schemes,
)


router = APIRouter(prefix="/schemes", tags=["Schemes"])


@router.get("/", response_model=list[SchemeResponse])
def get_schemes(
    search: str | None = Query(default=None, max_length=200),
    government_level: str | None = Query(
        default=None,
        pattern=r"^(central|state)$",
    ),
    state: str | None = Query(default=None, max_length=100),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return list_schemes(
        db=db,
        search=search,
        government_level=government_level,
        state=state,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/",
    response_model=SchemeResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_scheme(
    payload: SchemeCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    try:
        return create_scheme(db, payload)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A scheme with this scheme code already exists. "
                "Use a different code or leave it empty."
            ),
        )


@router.get("/{scheme_id}", response_model=SchemeResponse)
def get_scheme(
    scheme_id: int,
    db: Session = Depends(get_db),
):
    scheme = get_scheme_by_id(db, scheme_id)

    if scheme is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scheme not found",
        )

    return scheme
