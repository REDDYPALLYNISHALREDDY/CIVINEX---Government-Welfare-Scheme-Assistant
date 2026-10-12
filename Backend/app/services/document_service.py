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


# backend/storage/scheme_documents
STORAGE_ROOT = (
    Path(__file__).resolve().parents[2]
    / "storage"
    / "scheme_documents"
)

MAX_FILE_SIZE = 10 * 1024 * 1024
READ_CHUNK_SIZE = 1024 * 1024
PDF_SIGNATURE = b"%PDF-"


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


async def upload_scheme_document(
    db: Session,
    *,
    scheme_id: int,
    title: str | None,
    document_version: str | None,
    file: UploadFile,
) -> Document:
    # Confirm that the target scheme exists and is active.
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

    original_filename = (file.filename or "").replace("\\", "/").split("/")[-1]

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

    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="The uploaded file must have a PDF content type.",
        )

    # Read at most 10 MB plus one byte to enforce the size limit.
    content = bytearray()

    while True:
        remaining = MAX_FILE_SIZE + 1 - len(content)

        if remaining <= 0:
            break

        chunk = await file.read(min(READ_CHUNK_SIZE, remaining))

        if not chunk:
            break

        content.extend(chunk)

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="The PDF exceeds the 10 MB upload limit.",
        )

    # Extension and MIME type alone do not establish that a file is a PDF.
    if not content.startswith(PDF_SIGNATURE):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The file does not have a valid PDF signature.",
        )

    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)

    # A random storage name prevents user-controlled paths and filename clashes.
    storage_name = f"{uuid4().hex}.pdf"
    storage_path = STORAGE_ROOT / storage_name

    try:
        with storage_path.open("xb") as stored_file:
            stored_file.write(content)

        
        # Extract text from the stored PDF.
        extracted_text = None
        processing_status = "failed"

        try:
            extracted_text = extract_pdf_text(storage_path)

            if extracted_text:
                processing_status = "processed"
            else:
                processing_status = "needs_ocr"

        except PDFExtractionError:
            # Keep the uploaded PDF, but record that extraction failed.
            processing_status = "failed"

        # Create the database record with the extraction result.
        document = Document(
            scheme_id=scheme_id,
            uploaded_by_user_id=None,
            title=(title or "").strip() or Path(original_filename).stem,
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

        return document

    except Exception:
        db.rollback()

        # Avoid leaving an orphaned file if the database transaction fails.
        storage_path.unlink(missing_ok=True)
        raise