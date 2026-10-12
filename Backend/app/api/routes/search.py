
from fastapi import APIRouter, HTTPException, status

from app.schemas.search import (
    DocumentSearchRequest,
    DocumentSearchResponse,
)
from app.services.retrieval_service import search_document_chunks

router = APIRouter(prefix="/search", tags=["Document Search"])


@router.post(
    "/",
    response_model=DocumentSearchResponse,
)
def search_documents(payload: DocumentSearchRequest):
    try:
        results = search_document_chunks(
            payload.query,
            scheme_id=payload.scheme_id,
            limit=payload.limit,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        # Do not expose internal paths, database details, or secrets.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document search is temporarily unavailable.",
        ) from exc

    return DocumentSearchResponse(
        query=payload.query.strip(),
        results=results,
        total_results=len(results),
    )
