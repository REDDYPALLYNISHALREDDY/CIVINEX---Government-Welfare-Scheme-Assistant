
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.scheme import Scheme
from app.services.retrieval_service import search_document_chunks


SUPPORTED_LANGUAGES = {"en", "te", "hi", "ta"}

FALLBACK_MESSAGES = {
    "en": {
        "no_chunks": (
            "I could not find relevant information in the indexed "
            "scheme documents. Please try another question or consult "
            "the official government scheme website."
        ),
        "unverified": (
            "Relevant search results were found, but their source "
            "records could not be verified. Please try again later."
        ),
    },
    "te": {
        "no_chunks": (
            "ఇండెక్స్ చేసిన పథకాల పత్రాల్లో సంబంధిత సమాచారం కనుగొనలేకపోయాను. "
            "దయచేసి మరో ప్రశ్న అడగండి లేదా అధికారిక ప్రభుత్వ పథకం వెబ్‌సైట్‌ను చూడండి."
        ),
        "unverified": (
            "సంబంధిత శోధన ఫలితాలు లభించాయి, కానీ వాటి మూల రికార్డులను "
            "ధృవీకరించలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి."
        ),
    },
    "hi": {
        "no_chunks": (
            "मुझे अनुक्रमित योजना दस्तावेज़ों में संबंधित जानकारी नहीं मिली। "
            "कृपया कोई दूसरा प्रश्न पूछें या सरकारी योजना की आधिकारिक वेबसाइट देखें।"
        ),
        "unverified": (
            "संबंधित खोज परिणाम मिले, लेकिन उनके स्रोत रिकॉर्ड सत्यापित नहीं हो सके। "
            "कृपया बाद में फिर प्रयास करें।"
        ),
    },
    "ta": {
        "no_chunks": (
            "குறியிடப்பட்ட திட்ட ஆவணங்களில் தொடர்புடைய தகவலைக் கண்டறிய முடியவில்லை. "
            "வேறு கேள்வியைக் கேட்கவும் அல்லது அதிகாரப்பூர்வ அரசுத் திட்ட இணையதளத்தைப் பார்க்கவும்."
        ),
        "unverified": (
            "தொடர்புடைய தேடல் முடிவுகள் கிடைத்தன, ஆனால் அவற்றின் மூலப் பதிவுகளை "
            "சரிபார்க்க முடியவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்."
        ),
    },
}


def answer_scheme_question(
    db: Session,
    *,
    question: str,
    scheme_id: int | None = None,
    language: str = "en",
) -> dict:
    """Retrieve relevant passages and generate a grounded answer."""

    if language not in SUPPORTED_LANGUAGES:
        language = "en"

    # Retrieve relevant document chunks.
    chunks = search_document_chunks(
        question,
        scheme_id=scheme_id,
        limit=5,
    )

    # Return a localized fallback when no relevant chunks are found.
    if not chunks:
        return {
            "question": question,
            "answer": FALLBACK_MESSAGES[language]["no_chunks"],
            "sources": [],
            "grounded": False,
        }

    passages = []
    sources = []

    # Verify that retrieved chunks refer to existing database records.
    for chunk in chunks:
        document = db.get(Document, chunk["document_id"])
        scheme = db.get(Scheme, chunk["scheme_id"])

        if document is None or scheme is None:
            continue

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
                "official_url": (
                    document.source_url or scheme.official_url
                ),
                "chunk_indexes": [chunk["chunk_index"]],
                "relevance_score": chunk["score"],
            }
        )

    # Do not generate an answer without verified source records.
    if not passages:
        return {
            "question": question,
            "answer": FALLBACK_MESSAGES[language]["unverified"],
            "sources": [],
            "grounded": False,
        }

    # Import the language model service only when generation is required.
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
        "grounded": True,
    }
