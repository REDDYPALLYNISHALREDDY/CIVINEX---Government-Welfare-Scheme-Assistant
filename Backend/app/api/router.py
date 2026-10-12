

from fastapi import APIRouter
from app.core.config import get_settings
from app.api.routes import (
    health,
    schemes,
    documents,
    eligibility,
    auth,
    saved_schemes,
    tracked_applications,
)

settings = get_settings()
api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(schemes.router)
api_router.include_router(documents.router)
api_router.include_router(eligibility.router)
api_router.include_router(auth.router)
api_router.include_router(saved_schemes.router)
api_router.include_router(tracked_applications.router)

if settings.ENABLE_LOCAL_AI:
    from app.api.routes import search, assistant

    api_router.include_router(search.router)
    api_router.include_router(assistant.router)
