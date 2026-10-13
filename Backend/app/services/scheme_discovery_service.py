
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.scheme import Scheme


STOP_WORDS = {
    "a", "an", "the", "i", "me", "my", "we", "our", "you", "am",
    "is", "are", "for", "to", "of", "in", "on", "with", "and",
    "or", "can", "could", "would", "please", "tell", "show",
    "find", "give", "need", "want", "about", "which", "what",
    "scheme", "schemes", "government", "available", "suitable",
}

# Basic vocabulary expansion for common welfare-search language.
SYNONYMS = {
    "farmer": {
        "farmers", "farming", "agriculture", "agricultural",
        "cultivation", "kisan",
    },
    "student": {
        "students", "education", "educational", "scholarship",
        "school", "college", "study",
    },
    "woman": {
        "women", "woman", "female", "girl", "girls",
        "mother", "mothers",
    },
    "senior": {
        "elderly", "pension", "pensioner", "oldage", "aged",
    },
    "disability": {
        "disabled", "divyang", "differently", "impairment",
    },
    "employment": {
        "job", "jobs", "worker", "workers", "employment",
        "unemployment", "livelihood", "self-employment",
    },
    "health": {
        "medical", "healthcare", "hospital", "treatment",
    },
    "housing": {
        "house", "home", "housing", "shelter",
    },
}


def _tokens(value: str) -> set[str]:
    words = set(re.findall(r"[a-zA-Z]{2,}", value.lower()))
    return words - STOP_WORDS


def _expand_terms(tokens: set[str]) -> set[str]:
    expanded = set(tokens)

    for canonical, alternatives in SYNONYMS.items():
        group = {canonical, *alternatives}
        if tokens & group:
            expanded.update(group)

    return expanded


def _scheme_text(scheme: Scheme) -> str:
    rules: Any = scheme.eligibility_rules or {}

    return " ".join(
        str(value)
        for value in (
            scheme.name,
            scheme.scheme_code,
            scheme.description,
            scheme.category,
            scheme.benefits,
            scheme.state,
            rules,
        )
        if value is not None
    ).lower()


def discover_schemes(
    db: Session,
    *,
    query: str,
    state: str | None = None,
    government_level: str | None = None,
    limit: int = 10,
) -> list[dict]:
    """Rank active database schemes against a natural-language query."""

    normalized_query = query.strip()

    if len(normalized_query) < 3:
        raise ValueError("Enter at least 3 characters to search.")

    if not 1 <= limit <= 50:
        raise ValueError("Limit must be between 1 and 50.")

    statement = select(Scheme).where(Scheme.is_active.is_(True))

    if state and state.strip():
        statement = statement.where(
            Scheme.state.ilike(f"%{state.strip()}%")
        )

    if government_level:
        level = government_level.lower().strip()
        if level not in {"central", "state"}:
            raise ValueError(
                "Government level must be 'central' or 'state'."
            )
        statement = statement.where(
            Scheme.government_level == level
        )

    # Score locally so searches such as "help for farmers" do not
    # require the entire sentence to occur verbatim in a database field.
    candidates = list(db.scalars(statement).all())
    query_terms = _expand_terms(_tokens(normalized_query))

    ranked: list[tuple[int, Scheme]] = []

    for scheme in candidates:
        name_terms = _tokens(scheme.name or "")
        category_terms = _tokens(scheme.category or "")
        description_terms = _tokens(scheme.description or "")
        benefit_terms = _tokens(scheme.benefits or "")
        state_terms = _tokens(scheme.state or "")
        rule_terms = _tokens(str(scheme.eligibility_rules or ""))

        searchable_terms = (
            name_terms
            | category_terms
            | description_terms
            | benefit_terms
            | state_terms
            | rule_terms
            | _tokens(scheme.scheme_code or "")
        )

        matched = query_terms & searchable_terms

        if not matched:
            continue

        # Name/category matches carry more weight than incidental
        # matches in long descriptions or JSON eligibility rules.
        score = (
            5 * len(query_terms & name_terms)
            + 4 * len(query_terms & category_terms)
            + 3 * len(query_terms & benefit_terms)
            + 2 * len(query_terms & description_terms)
            + len(query_terms & (state_terms | rule_terms))
        )

        if normalized_query.lower() in (scheme.name or "").lower():
            score += 8

        ranked.append((score, scheme))

    ranked.sort(
        key=lambda item: (
            -item[0],
            (item[1].name or "").lower(),
            item[1].id,
        )
    )

    return [
        {
            "scheme": scheme,
            "relevance_score": score,
        }
        for score, scheme in ranked[:limit]
    ]
