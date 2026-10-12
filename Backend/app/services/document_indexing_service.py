
from sqlalchemy.orm import Session

from app.models.document import Document
from app.services.document_chunking_service import chunk_document_text
from app.services.embedding_service import generate_embeddings
from app.services.vector_store import upsert_document_chunks


def index_document(
    db: Session,
    document_id: int,
) -> dict:
    """
    Chunk an already-extracted document, generate embeddings,
    and store its passages in the local vector database.
    """
    document = db.get(Document, document_id)

    if document is None:
        raise ValueError("Document not found.")

    if not document.extracted_text:
        raise ValueError(
            "The document has no extracted text. Process the PDF first."
        )

    chunks = chunk_document_text(document.extracted_text)

    if not chunks:
        raise ValueError("No usable text chunks were generated.")

    embeddings = generate_embeddings(
        [chunk.text for chunk in chunks]
    )

    stored_count = upsert_document_chunks(
        document_id=document.id,
        scheme_id=document.scheme_id,
        chunks=[
            {"index": chunk.index, "text": chunk.text}
            for chunk in chunks
        ],
        embeddings=embeddings,
    )

    return {
        "document_id": document.id,
        "scheme_id": document.scheme_id,
        "chunks_created": len(chunks),
        "vectors_stored": stored_count,
    }
