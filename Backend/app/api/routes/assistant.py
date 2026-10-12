
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.assistant import (
    AssistantAnswer,
    AssistantQuestion,
)
from app.services.assistant_service import answer_scheme_question

router = APIRouter(prefix="/assistant", tags=["AI Assistant"])


@router.post(
    "/ask",
    response_model=AssistantAnswer,
)
def ask_assistant(
    payload: AssistantQuestion,
    db: Session = Depends(get_db),
):
    question = payload.question.strip()

    if len(question) < 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Enter a question containing at least 3 characters.",
        )

    try:
        result = answer_scheme_question(
            db,
            question=question,
            scheme_id=payload.scheme_id,
            language=payload.language,
        )

        return AssistantAnswer(**result)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        # Keep implementation details and internal paths out of responses.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "The Assistant is temporarily unavailable. "
                "Check the backend logs and try again."
            ),
        ) from exc
