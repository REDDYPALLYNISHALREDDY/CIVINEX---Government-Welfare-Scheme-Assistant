
from functools import lru_cache

from sentence_transformers import SentenceTransformer


# Multilingual model suitable for English and many Indian languages.
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    """Load the local embedding model once per process."""
    return SentenceTransformer(MODEL_NAME)


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Convert text passages into normalized embedding vectors."""
    if not texts:
        return []

    if any(not text.strip() for text in texts):
        raise ValueError("Embedding input cannot contain empty text.")

    model = get_embedding_model()

    vectors = model.encode(
        texts,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )

    return vectors.tolist()
