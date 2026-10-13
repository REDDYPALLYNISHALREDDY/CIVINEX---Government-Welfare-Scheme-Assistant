
from typing import Literal

from pydantic import BaseModel, Field


AssistantLanguage = Literal["en", "te", "hi", "ta"]


class AssistantQuestion(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    scheme_id: int | None = Field(default=None, gt=0)
    language: AssistantLanguage = "en"


class AssistantSource(BaseModel):
    document_id: int
    scheme_id: int
    scheme_name: str
    document_title: str
    official_url: str | None = None
    chunk_indexes: list[int]
    relevance_score: float
    
class AssistantSchemeMatch(BaseModel):
    scheme_id: int
    scheme_name: str
    description: str | None = None
    benefits: str | None = None
    official_url: str | None = None
    relevance_score: float


class AssistantAnswer(BaseModel):
    question: str
    answer: str
    sources: list[AssistantSource]
    scheme_matches: list[AssistantSchemeMatch] = Field(default_factory=list)
    grounded: bool

