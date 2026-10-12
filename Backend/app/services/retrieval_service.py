
from qdrant_client import models

from app.services.embedding_service import generate_embeddings
from app.services.vector_store import (
    COLLECTION_NAME,
    get_qdrant_client,
)


def search_document_chunks(
    query: str,
    *,
    scheme_id: int | None = None,
    limit: int = 5,
) -> list[dict]:
    """
    Find semantically relevant document chunks in Qdrant.

    The embedding model and Qdrant collection must use compatible
    vector dimensions.
    """
    normalized_query = query.strip()

    if len(normalized_query) < 3:
        raise ValueError("The search query must contain at least 3 characters.")

    if not 1 <= limit <= 20:
        raise ValueError("Limit must be between 1 and 20.")

    client = get_qdrant_client()

    # No indexed collection means there are no passages to retrieve.
    if not client.collection_exists(COLLECTION_NAME):
        return []

    query_embeddings = generate_embeddings([normalized_query])

    if not query_embeddings:
        return []

    query_filter = None

    if scheme_id is not None:
        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="scheme_id",
                    match=models.MatchValue(value=scheme_id),
                )
            ]
        )

    response = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embeddings[0],
        query_filter=query_filter,
        limit=limit,
        with_payload=True,
    )

    results: list[dict] = []

    for point in response.points:
        payload = point.payload or {}

        # Skip malformed points instead of returning incomplete sources.
        required_fields = (
            "document_id",
            "scheme_id",
            "chunk_index",
            "text",
        )

        if any(field not in payload for field in required_fields):
            continue

        results.append(
            {
                "document_id": int(payload["document_id"]),
                "scheme_id": int(payload["scheme_id"]),
                "chunk_index": int(payload["chunk_index"]),
                "text": str(payload["text"]),
                "score": float(point.score),
            }
        )

    return results
