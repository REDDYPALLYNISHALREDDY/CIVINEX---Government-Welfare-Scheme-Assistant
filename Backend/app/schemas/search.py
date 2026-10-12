
from pydantic import BaseModel, Field


class DocumentSearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=2000)
    scheme_id: int | None = Field(default=None, gt=0)
    limit: int = Field(default=5, ge=1, le=20)


class RetrievedChunk(BaseModel):
    document_id: int
    scheme_id: int
    chunk_index: int
    text: str
    score: float


class DocumentSearchResponse(BaseModel):
    query: str
    results: list[RetrievedChunk]
    total_results: int
