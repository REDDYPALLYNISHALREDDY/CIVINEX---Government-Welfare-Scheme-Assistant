
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.scheme import Scheme
from app.models.tracked_application import TrackedApplication
from app.models.user import User
from app.schemas.tracked_application import (
    TrackedApplicationCreate,
    TrackedApplicationResponse,
    TrackedApplicationUpdate,
)


router = APIRouter(
    prefix="/applications",
    tags=["Application Tracking"],
)


@router.get(
    "/",
    response_model=list[TrackedApplicationResponse],
)
def list_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(TrackedApplication)
        .filter(TrackedApplication.user_id == current_user.id)
        .order_by(TrackedApplication.created_at.desc())
        .all()
    )


@router.post(
    "/",
    response_model=TrackedApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_application(
    payload: TrackedApplicationCreate,
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
            status_code=404,
            detail="Active scheme not found.",
        )

    record = TrackedApplication(
        user_id=current_user.id,
        scheme_id=payload.scheme_id,
        reference_number=payload.reference_number,
        application_date=payload.application_date,
        status=payload.status,
        notes=payload.notes,
    )

    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.patch(
    "/{application_id}",
    response_model=TrackedApplicationResponse,
)
def update_application(
    application_id: int,
    payload: TrackedApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(TrackedApplication)
        .filter(
            TrackedApplication.id == application_id,
            TrackedApplication.user_id == current_user.id,
        )
        .first()
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Application record not found.",
        )

    for field, value in payload.model_dump().items():
        setattr(record, field, value)

    db.commit()
    db.refresh(record)
    return record


@router.delete(
    "/{application_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(TrackedApplication)
        .filter(
            TrackedApplication.id == application_id,
            TrackedApplication.user_id == current_user.id,
        )
        .first()
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Application record not found.",
        )

    db.delete(record)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
