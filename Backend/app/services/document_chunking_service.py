
from dataclasses import dataclass


@dataclass(frozen=True)
class TextChunk:
    index: int
    text: str


def chunk_document_text(
    text: str,
    chunk_size: int = 1200,
    overlap: int = 200,
) -> list[TextChunk]:
    """
    Split extracted document text into overlapping character-based chunks.

    Character-based chunking is a simple starting point. We can improve it
    later to preserve section headings and page boundaries more precisely.
    """
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero.")

    if overlap < 0:
        raise ValueError("overlap cannot be negative.")

    if overlap >= chunk_size:
        raise ValueError("overlap must be smaller than chunk_size.")

    normalized_text = " ".join(text.split())

    if not normalized_text:
        return []

    chunks: list[TextChunk] = []
    step = chunk_size - overlap
    start = 0

    while start < len(normalized_text):
        end = min(start + chunk_size, len(normalized_text))
        chunk_text = normalized_text[start:end].strip()

        if chunk_text:
            chunks.append(
                TextChunk(
                    index=len(chunks),
                    text=chunk_text,
                )
            )

        if end == len(normalized_text):
            break

        start += step

    return chunks
