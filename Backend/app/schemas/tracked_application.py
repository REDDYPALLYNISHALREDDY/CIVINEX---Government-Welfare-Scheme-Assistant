
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ApplicationStatus = Literal[
    "planning",
    "submitted",
    "under_review",
    "approved",
    "rejected",
    "withdrawn",
]


class TrackedApplicationCreate(BaseModel):
    scheme_id: int = Field(gt=0)
    reference_number: str | None = Field(default=None, max_length=150)
    application_date: date | None = None
    status: ApplicationStatus = "planning"
    notes: str | None = Field(default=None, max_length=5000)


class TrackedApplicationUpdate(BaseModel):
    reference_number: str | None = Field(default=None, max_length=150)
    application_date: date | None = None
    status: ApplicationStatus
    notes: str | None = Field(default=None, max_length=5000)


class TrackedApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    scheme_id: int
    reference_number: str | None
    application_date: date | None
    status: ApplicationStatus
    notes: str | None
    created_at: datetime
    updated_at: datetime
