
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class SchemeCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    scheme_code: str | None = Field(default=None, max_length=100)
    description: str | None = None

    government_level: str = Field(
        default="central",
        pattern=r"^(central|state)$",
    )

    state: str | None = Field(default=None, max_length=100)
    category: str | None = Field(default=None, max_length=100)
    official_url: HttpUrl | None = None

    eligibility_rules: dict[str, Any] = Field(default_factory=dict)
    benefits: str | None = None


class SchemeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    scheme_code: str | None
    description: str | None
    government_level: str
    state: str | None
    category: str | None
    official_url: str | None
    eligibility_rules: dict[str, Any]
    benefits: str | None
    is_active: bool
    created_at: Any
    updated_at: Any
