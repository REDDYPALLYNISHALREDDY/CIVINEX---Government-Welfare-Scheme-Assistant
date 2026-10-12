
from typing import Literal

from pydantic import BaseModel, Field


class CitizenProfile(BaseModel):
    age: int | None = Field(default=None, ge=0, le=120)
    state: str | None = Field(default=None, max_length=100)
    annual_income: float | None = Field(default=None, ge=0)


class EligibilityCheckRequest(BaseModel):
    scheme_id: int = Field(gt=0)
    profile: CitizenProfile


class EligibilityCheckResponse(BaseModel):
    scheme_id: int
    scheme_name: str
    status: Literal[
        "potentially_eligible",
        "not_eligible",
        "needs_more_information",
    ]
    reasons: list[str]
    missing_fields: list[str]
    disclaimer: str
