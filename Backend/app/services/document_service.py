
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.scheme import Scheme
from app.services.document_extraction_service import (
    PDFExtractionError,
    extract_pdf_text,
)

import logging

from qdrant_client import models
from sqlalchemy import delete

from app.services.vector_store import (
    COLLECTION_NAME,
    VECTOR_STORE_PATH,
    get_qdrant_client,
)

logger = logging.getLogger(__name__)


STORAGE_ROOT = (
    Path(__file__).resolve().parents[2]
    / "storage"
    / "scheme_documents"
)

MAX_FILE_SIZE = 10 * 1024 * 1024
READ_CHUNK_SIZE = 1024 * 1024
PDF_SIGNATURE = b"%PDF-"

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150


def list_documents(
    db: Session,
    scheme_id: int | None = None,
    skip: int = 0,
    limit: int = 20,
) -> list[Document]:
    statement = select(Document)

    if scheme_id is not None:
        statement = statement.where(Document.scheme_id == scheme_id)

    statement = (
        statement
        .order_by(Document.created_at.desc(), Document.id.desc())
        .offset(skip)
        .limit(limit)
    )

    return list(db.scalars(statement).all())


def split_text_into_chunks(text: str) -> list[dict]:
    """Split extracted text into overlapping searchable passages."""
    normalized = " ".join(text.split())

    if not normalized:
        return []

    chunks = []
    start = 0
    index = 0

    while start < len(normalized):
        end = min(start + CHUNK_SIZE, len(normalized))
        chunk_text = normalized[start:end].strip()

        if chunk_text:
            chunks.append({
                "index": index,
                "text": chunk_text,
            })
            index += 1

        if end == len(normalized):
            break

        start = end - CHUNK_OVERLAP

    return chunks


def index_document(
    *,
    document_id: int,
    scheme_id: int,
    extracted_text: str,
) -> int:
    """Embed and store searchable chunks in Qdrant."""
    from app.services.embedding_service import generate_embeddings
    from app.services.vector_store import upsert_document_chunks

    chunks = split_text_into_chunks(extracted_text)

    if not chunks:
        return 0

    embeddings = generate_embeddings(
        [chunk["text"] for chunk in chunks]
    )

    return upsert_document_chunks(
        document_id=document_id,
        scheme_id=scheme_id,
        chunks=chunks,
        embeddings=embeddings,
    )


async def upload_scheme_document(
    db: Session,
    *,
    scheme_id: int,
    title: str | None,
    document_version: str | None,
    file: UploadFile,
) -> Document:
    scheme = db.scalar(
        select(Scheme).where(
            Scheme.id == scheme_id,
            Scheme.is_active.is_(True),
        )
    )

    if scheme is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested active scheme was not found.",
        )

    original_filename = (
        (file.filename or "").replace("\\", "/").split("/")[-1]
    )

    if not original_filename or original_filename in {".", ".."}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid filename is required.",
        )

    if Path(original_filename).suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF files are accepted.",
        )

    if file.content_type not in {
        "application/pdf",
        "application/octet-stream",
    }:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="The uploaded file must have a PDF content type.",
        )

    content = bytearray()

    while True:
        remaining = MAX_FILE_SIZE + 1 - len(content)

        if remaining <= 0:
            break

        chunk = await file.read(
            min(READ_CHUNK_SIZE, remaining)
        )

        if not chunk:
            break

        content.extend(chunk)

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="The PDF exceeds the 10 MB upload limit.",
        )

    if not content.startswith(PDF_SIGNATURE):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The file does not have a valid PDF signature.",
        )

    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)

    storage_path = STORAGE_ROOT / f"{uuid4().hex}.pdf"

    try:
        with storage_path.open("xb") as stored_file:
            stored_file.write(content)

        try:
            extracted_text = extract_pdf_text(storage_path)
            
            print("EXTRACTED TEXT LENGTH:", len(extracted_text))
            print("EXTRACTED TEXT PREVIEW:", repr(extracted_text[:500]))
        except PDFExtractionError:
            extracted_text = None

        if extracted_text:
            processing_status = "processed"
        else:
            processing_status = "needs_ocr"

        document = Document(
            scheme_id=scheme_id,
            uploaded_by_user_id=None,
            title=(title or "").strip()
            or Path(original_filename).stem,
            original_filename=original_filename[:255],
            storage_path=str(storage_path.resolve()),
            source_url=None,
            document_version=(document_version or "").strip() or None,
            processing_status=processing_status,
            extracted_text=extracted_text,
        )

        db.add(document)
        db.commit()
        db.refresh(document)

        if extracted_text:
            try:
                indexed_count = index_document(
                    document_id=document.id,
                    scheme_id=scheme_id,
                    extracted_text=extracted_text,
                )

                if indexed_count > 0:
                    document.processing_status = "processed"
                else:
                    document.processing_status = "failed"

            except Exception:
                # Preserve the uploaded document if indexing fails.
                document.processing_status = "failed"

            db.commit()
            db.refresh(document)

        return document

    except Exception:
        db.rollback()
        storage_path.unlink(missing_ok=True)
        raise


def delete_all_scheme_documents(db: Session) -> dict:
    """
    Delete all document records, their stored PDFs, and vectors
    associated with their document IDs.

    Database changes are committed before external storage cleanup.
    Cleanup failures are returned as warnings for later recovery.
    """
    documents = list(db.scalars(select(Document)).all())
    document_ids = [document.id for document in documents]

    if not documents:
        return {
            "deleted_documents": 0,
            "deleted_files": 0,
            "warnings": [],
        }

    storage_root = STORAGE_ROOT.resolve()
    file_paths: list[Path] = []
    warnings: list[str] = []

    # Validate every path before allowing filesystem deletion.
    for document in documents:
        try:
            path = Path(document.storage_path).resolve()

            if not path.is_relative_to(storage_root):
                warnings.append(
                    f"Document {document.id}: file path is outside "
                    "the document storage directory."
                )
                continue

            file_paths.append(path)

        except (OSError, ValueError) as exc:
            warnings.append(
                f"Document {document.id}: could not validate file path: {exc}"
            )

    # Commit database deletion first. Roll back if the transaction fails.
    try:
        for document in documents:
            db.delete(document)

        db.commit()
    except Exception:
        db.rollback()
        raise

    # Remove vectors belonging only to the deleted document IDs.
    try:
        client = get_qdrant_client()

        if client.collection_exists(COLLECTION_NAME):
            client.delete(
                collection_name=COLLECTION_NAME,
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="document_id",
                                match=models.MatchAny(any=document_ids),
                            )
                        ]
                    )
                ),
                wait=True,
            )
    except Exception as exc:
        warnings.append(f"Qdrant cleanup failed: {exc}")

    # Remove validated files without touching unrelated files.
    deleted_files = 0

    for path in file_paths:
        try:
            if path.exists():
                path.unlink()
                deleted_files += 1
        except OSError as exc:
            warnings.append(f"File cleanup failed for {path.name}: {exc}")

    return {
        "deleted_documents": len(documents),
        "deleted_files": deleted_files,
        "warnings": warnings,
    }