
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_admin
from app.core.database import get_db
from app.models.scheme import Scheme
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.services.document_service import (
    list_documents,
    upload_scheme_document,
)


router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("/", response_model=list[DocumentResponse])
def get_documents(
    scheme_id: int | None = Query(default=None, gt=0),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DocumentResponse]:
    if scheme_id is not None:
        scheme_exists = db.scalar(
            select(Scheme.id).where(Scheme.id == scheme_id)
        )

        if scheme_exists is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scheme not found.",
            )

    return list_documents(
        db,
        scheme_id=scheme_id,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    scheme_id: int = Form(..., gt=0),
    title: str | None = Form(default=None, max_length=255),
    document_version: str | None = Form(default=None, max_length=100),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
) -> DocumentResponse:
    try:
        return await upload_scheme_document(
            db,
            scheme_id=scheme_id,
            title=title,
            document_version=document_version,
            file=file,
        )
    finally:
        await file.close()
