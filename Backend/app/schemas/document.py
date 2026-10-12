from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    scheme_id: int
    uploaded_by_user_id: int | None
    title: str
    original_filename: str
    source_url: str | None
    document_version: str | None
    processing_status: str
    created_at: datetime