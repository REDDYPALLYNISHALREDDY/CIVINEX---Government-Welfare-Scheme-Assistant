
from fastapi import APIRouter

from app.api.routes import documents, health, schemes, search, assistant, eligibility, auth, saved_schemes, tracked_applications

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(schemes.router)
api_router.include_router(documents.router)
api_router.include_router(search.router)
api_router.include_router(assistant.router)
api_router.include_router(eligibility.router)
api_router.include_router(auth.router)
api_router.include_router(saved_schemes.router)
api_router.include_router(tracked_applications.router)