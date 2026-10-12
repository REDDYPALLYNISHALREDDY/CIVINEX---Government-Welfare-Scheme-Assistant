
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    settings = get_settings()

    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


@router.get("/health/database")
def database_health_check(
    db: Session = Depends(get_db),
) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))

        return {
            "status": "ok",
            "database": "connected",
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed.",
        )
