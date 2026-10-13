
import re
import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.scheme import Scheme
from app.services.retrieval_service import search_document_chunks


SUPPORTED_LANGUAGES = {"en", "te", "hi", "ta"}

FALLBACK_MESSAGES = {
    "en": (
        "I could not find enough relevant information in the available "
        "scheme records or indexed documents. Please try another question "
        "or consult the official government scheme website."
    ),
    "te": (
        "అందుబాటులో ఉన్న పథకాల రికార్డులు లేదా పత్రాల్లో తగిన సమాచారం "
        "కనుగొనలేకపోయాను. మరో ప్రశ్న అడగండి లేదా అధికారిక వెబ్‌సైట్‌ను చూడండి."
    ),
    "hi": (
        "उपलब्ध योजना रिकॉर्ड या अनुक्रमित दस्तावेज़ों में पर्याप्त "
        "जानकारी नहीं मिली। कृपया दूसरा प्रश्न पूछें या आधिकारिक वेबसाइट देखें।"
    ),
    "ta": (
        "கிடைக்கக்கூடிய திட்டப் பதிவுகள் அல்லது ஆவணங்களில் போதுமான "
        "தகவல் கிடைக்கவில்லை. வேறு கேள்வியைக் கேட்கவும் அல்லது அதிகாரப்பூர்வ "
        "இணையதளத்தைப் பார்க்கவும்."
    ),
}

UNVERIFIED_MESSAGES = {
    "en": "Relevant results were found, but their source records could not be verified.",
    "te": "தொடர்புடைய முடிவுகள் கிடைத்தன, ஆனால் அவற்றின் மூலப் பதிவுகளைச் சரிபார்க்க முடியவில்லை.",
    "hi": "संबंधित परिणाम मिले, लेकिन उनके स्रोत रिकॉर्ड सत्यापित नहीं हो सके।",
    "ta": "தொடர்புடைய முடிவுகள் கிடைத்தன, ஆனால் அவற்றின் மூலப் பதிவுகளைச் சரிபார்க்க முடியவில்லை.",
}

# Small common-word filter. This is keyword retrieval, not semantic search.
STOP_WORDS = {
    "a", "an", "the", "is", "are", "am", "do", "does", "did",
    "i", "me", "my", "we", "you", "your", "they", "their",
    "what", "which", "who", "how", "can", "could", "would",
    "for", "of", "to", "in", "on", "with", "and", "or", "about",
    "scheme", "schemes", "government", "please", "tell", "show",
    "find", "available", "any", "there", "have", "has", "under",
}


def _tokens(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[^\W_]+", value.casefold(), flags=re.UNICODE)
        if len(token) > 1 and token not in STOP_WORDS
    }


def _find_scheme_matches(
    db: Session,
    question: str,
    scheme_id: int | None,
    limit: int = 5,
) -> list[tuple[Scheme, float]]:
    """Find active scheme records with overlapping query keywords."""

    statement = select(Scheme).where(Scheme.is_active.is_(True))

    if scheme_id is not None:
        statement = statement.where(Scheme.id == scheme_id)

    schemes = list(db.scalars(statement.order_by(Scheme.name)).all())
    query_tokens = _tokens(question)

    if not query_tokens:
        return []

    matches: list[tuple[Scheme, float]] = []

    for scheme in schemes:
        eligibility_text = json.dumps(
            scheme.eligibility_rules or {},
            ensure_ascii=False,
            default=str,
        )

        searchable_text = " ".join(
            part or ""
            for part in (
                scheme.name,
                scheme.scheme_code,
                scheme.description,
                scheme.category,
                scheme.state,
                scheme.benefits,
                eligibility_text,
            )
        )

        scheme_tokens = _tokens(searchable_text)
        overlap = query_tokens.intersection(scheme_tokens)

        if not overlap:
            continue

        # A simple lexical relevance score, not a probability.
        score = len(overlap) / len(query_tokens)

        # Give scheme-name matches a modest ranking boost.
        name_tokens = _tokens(scheme.name)
        if query_tokens.intersection(name_tokens):
            score = min(1.0, score + 0.25)

        matches.append((scheme, round(score, 4)))

    matches.sort(key=lambda item: (-item[1], item[0].name.casefold()))
    return matches[:limit]


def answer_scheme_question(
    db: Session,
    *,
    question: str,
    scheme_id: int | None = None,
    language: str = "en",
) -> dict:
    """Answer using verified database scheme records and indexed passages."""

    if language not in SUPPORTED_LANGUAGES:
        language = "en"

    scheme_matches = _find_scheme_matches(
        db,
        question,
        scheme_id,
        limit=5,
    )

    chunks = search_document_chunks(
        question,
        scheme_id=scheme_id,
        limit=5,
    )

    passages: list[dict] = []
    sources: list[dict] = []
    verified_scheme_ids: set[int] = set()

    # Add verified scheme records as evidence, even when no PDFs exist.
    for scheme, score in scheme_matches:
        verified_scheme_ids.add(scheme.id)

        eligibility_text = json.dumps(
            scheme.eligibility_rules or {},
            ensure_ascii=False,
            indent=2,
            default=str,
        )

        record_text = (
            f"Scheme ID: {scheme.id}\n"
            f"Scheme code: {scheme.scheme_code or 'Not provided'}\n"
            f"Government level: {scheme.government_level}\n"
            f"State: {scheme.state or 'Not specified'}\n"
            f"Category: {scheme.category or 'Not specified'}\n"
            f"Description: {scheme.description or 'Not provided'}\n"
            f"Benefits: {scheme.benefits or 'Not provided'}\n"
            f"Eligibility rules recorded in CIVINEX: {eligibility_text}\n"
            f"Official URL: {scheme.official_url or 'Not provided'}"
        )

        passages.append(
            {
                "scheme_name": scheme.name,
                "document_title": (
                    f"CIVINEX database record — Scheme ID {scheme.id}"
                ),
                "text": record_text,
            }
        )

    # Add document evidence only after verifying database records.
    for chunk in chunks:
        document = db.get(Document, chunk["document_id"])
        scheme = db.get(Scheme, chunk["scheme_id"])

        if document is None or scheme is None or not scheme.is_active:
            continue

        if scheme_id is not None and scheme.id != scheme_id:
            continue

        verified_scheme_ids.add(scheme.id)

        passages.append(
            {
                "scheme_name": scheme.name,
                "document_title": document.title,
                "text": chunk["text"],
            }
        )

        sources.append(
            {
                "document_id": document.id,
                "scheme_id": scheme.id,
                "scheme_name": scheme.name,
                "document_title": document.title,
                "official_url": document.source_url or scheme.official_url,
                "chunk_indexes": [chunk["chunk_index"]],
                "relevance_score": chunk["score"],
            }
        )

    matched_schemes = [
        {
            "scheme_id": scheme.id,
            "scheme_name": scheme.name,
            "description": scheme.description,
            "benefits": scheme.benefits,
            "official_url": scheme.official_url,
            "relevance_score": score,
        }
        for scheme, score in scheme_matches
    ]

    if not passages:
        return {
            "question": question,
            "answer": FALLBACK_MESSAGES[language],
            "sources": [],
            "scheme_matches": [],
            "grounded": False,
        }

    from app.services.llm_service import generate_grounded_answer

    answer = generate_grounded_answer(
        question,
        passages,
        language=language,
    )

    return {
        "question": question,
        "answer": answer,
        "sources": sources,
        "scheme_matches": matched_schemes,
        "grounded": bool(verified_scheme_ids),
    }
