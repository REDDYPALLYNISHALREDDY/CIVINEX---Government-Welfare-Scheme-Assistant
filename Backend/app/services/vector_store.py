
from functools import lru_cache
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from qdrant_client import QdrantClient, models


VECTOR_STORE_PATH = (
    Path(__file__).resolve().parents[2]
    / "storage"
    / "qdrant"
)

COLLECTION_NAME = "jansahay_document_chunks"
VECTOR_SIZE = 384


@lru_cache(maxsize=1)
def get_qdrant_client() -> QdrantClient:
    """Open a persistent local Qdrant database."""
    VECTOR_STORE_PATH.mkdir(parents=True, exist_ok=True)

    return QdrantClient(path=str(VECTOR_STORE_PATH))


def ensure_collection() -> None:
    """Create the collection if it does not already exist."""
    client = get_qdrant_client()

    if not client.collection_exists(COLLECTION_NAME):
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(
                size=VECTOR_SIZE,
                distance=models.Distance.COSINE,
            ),
        )


def upsert_document_chunks(
    *,
    document_id: int,
    scheme_id: int,
    chunks: list[dict],
    embeddings: list[list[float]],
) -> int:
    """Store document chunks, vectors, and searchable metadata."""
    if len(chunks) != len(embeddings):
        raise ValueError("Each chunk must have exactly one embedding.")

    if not chunks:
        return 0

    ensure_collection()
    client = get_qdrant_client()

    points = []

    for chunk, embedding in zip(chunks, embeddings):
        point_id = str(
            uuid5(
                NAMESPACE_URL,
                f"jansahay-document-{document_id}-chunk-{chunk['index']}",
            )
        )

        points.append(
            models.PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "document_id": document_id,
                    "scheme_id": scheme_id,
                    "chunk_index": chunk["index"],
                    "text": chunk["text"],
                },
            )
        )

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points,
        wait=True,
    )

    return len(points)
