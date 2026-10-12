
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.services.primary_admin import ensure_primary_admin


settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "An AI-assisted platform for discovering government "
        "welfare schemes and understanding eligibility."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    api_router,
    prefix=settings.API_V1_PREFIX,
)


@app.get("/", tags=["Root"])
def root() -> dict[str, str]:
    return {
        "message": "Government Welfare Scheme Assistant API",
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
    }
    
@app.on_event("startup")
def restore_primary_admin() -> None:
    db = SessionLocal()
    try:
        ensure_primary_admin(db)
    finally:
        db.close()
