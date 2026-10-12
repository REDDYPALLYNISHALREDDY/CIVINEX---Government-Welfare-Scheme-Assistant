
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.eligibility import (
    EligibilityCheckRequest,
    EligibilityCheckResponse,
)
from app.services.eligibility_service import check_scheme_eligibility

router = APIRouter(prefix="/eligibility", tags=["Eligibility"])


@router.post(
    "/check",
    response_model=EligibilityCheckResponse,
)
def check_eligibility(
    payload: EligibilityCheckRequest,
    db: Session = Depends(get_db),
):
    result = check_scheme_eligibility(
        db,
        scheme_id=payload.scheme_id,
        profile=payload.profile.model_dump(),
    )

    if result.get("error") == "active_scheme_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested active scheme was not found.",
        )

    return result
