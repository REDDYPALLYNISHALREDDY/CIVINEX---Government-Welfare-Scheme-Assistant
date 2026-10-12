
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SavedSchemeCreate(BaseModel):
    scheme_id: int


class SavedSchemeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    scheme_id: int
    created_at: datetime
    name: str
    scheme_code: str | None = None
    description: str | None = None
    government_level: str
    state: str | None = None
    category: str | None = None
    official_url: str | None = None
    benefits: str | None = None
