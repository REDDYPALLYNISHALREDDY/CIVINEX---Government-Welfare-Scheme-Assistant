
from pathlib import Path

import pymupdf
from fastapi.testclient import TestClient

from app.models.scheme import Scheme
from app.services import document_service


def create_scheme(db_session) -> Scheme:
    scheme = Scheme(
        name="Test Welfare Scheme",
        scheme_code="TEST-UPLOAD-001",
        description="A scheme for upload tests.",
        government_level="central",
        state=None,
        category="welfare",
        official_url=None,
        eligibility_rules={},
        benefits="Test benefits",
        is_active=True,
    )

    db_session.add(scheme)
    db_session.commit()
    db_session.refresh(scheme)

    return scheme


def create_valid_pdf_bytes() -> bytes:
    """Generate a valid PDF containing extractable text."""
    pdf = pymupdf.open()

    try:
        page = pdf.new_page()
        page.insert_text(
            (72, 72),
            "Official scheme guidelines and eligibility criteria.",
        )
        return pdf.tobytes()
    finally:
        pdf.close()


def test_upload_valid_pdf(
    client: TestClient,
    db_session,
    tmp_path: Path,
    monkeypatch,
    admin_headers,
):
    monkeypatch.setattr(document_service, "STORAGE_ROOT", tmp_path)
    scheme = create_scheme(db_session)

    response = client.post(
        "/api/v1/documents/upload",
        data={
            "scheme_id": str(scheme.id),
            "title": "Test PDF",
            "document_version": "1.0",
        },
        files={
            "file": (
                "official-guidelines.pdf",
                create_valid_pdf_bytes(),
                "application/pdf",
            )
        },
        headers=admin_headers,
    )

    assert response.status_code == 201, response.text

    payload = response.json()

    assert payload["scheme_id"] == scheme.id
    assert payload["title"] == "Test PDF"
    assert payload["original_filename"] == "official-guidelines.pdf"
    assert payload["document_version"] == "1.0"
    assert payload["processing_status"] == "processed"

    assert "storage_path" not in payload
    assert "extracted_text" not in payload

    stored_files = list(tmp_path.glob("*.pdf"))
    assert len(stored_files) == 1

    stored_content = stored_files[0].read_bytes()
    assert stored_content.startswith(b"%PDF-")

    with pymupdf.open(stored_files[0]) as pdf:
        extracted_text = "\n".join(
            page.get_text("text") for page in pdf
        )

    assert "Official scheme guidelines" in extracted_text


def test_upload_rejects_missing_scheme(
    client: TestClient,
    tmp_path: Path,
    monkeypatch,
    admin_headers,
):
    monkeypatch.setattr(document_service, "STORAGE_ROOT", tmp_path)

    response = client.post(
        "/api/v1/documents/upload",
        data={"scheme_id": "999999"},
        files={
            "file": (
                "guidelines.pdf",
                create_valid_pdf_bytes(),
                "application/pdf",
            )
        },
        headers=admin_headers,
    )

    assert response.status_code == 404
    assert list(tmp_path.glob("*")) == []


def test_upload_rejects_non_pdf_extension(
    client: TestClient,
    db_session,
    tmp_path: Path,
    monkeypatch,
    admin_headers,
):
    monkeypatch.setattr(document_service, "STORAGE_ROOT", tmp_path)
    scheme = create_scheme(db_session)

    response = client.post(
        "/api/v1/documents/upload",
        data={"scheme_id": str(scheme.id)},
        files={
            "file": (
                "guidelines.txt",
                create_valid_pdf_bytes(),
                "application/pdf",
            )
        },
        headers=admin_headers,
    )

    assert response.status_code == 415
    assert list(tmp_path.glob("*")) == []


def test_upload_rejects_invalid_pdf_signature(
    client: TestClient,
    db_session,
    tmp_path: Path,
    monkeypatch,
    admin_headers,
):
    monkeypatch.setattr(document_service, "STORAGE_ROOT", tmp_path)
    scheme = create_scheme(db_session)

    response = client.post(
        "/api/v1/documents/upload",
        data={"scheme_id": str(scheme.id)},
        files={
            "file": (
                "fake.pdf",
                b"This is not a PDF file",
                "application/pdf",
            )
        },
        headers=admin_headers,
    )

    assert response.status_code == 400
    assert list(tmp_path.glob("*")) == []


def test_upload_rejects_oversized_file(
    client: TestClient,
    db_session,
    tmp_path: Path,
    monkeypatch,
    admin_headers,
):
    monkeypatch.setattr(document_service, "STORAGE_ROOT", tmp_path)
    scheme = create_scheme(db_session)

    oversized_content = b"%PDF-1.4\n" + (
        b"A" * document_service.MAX_FILE_SIZE
    )

    response = client.post(
        "/api/v1/documents/upload",
        data={"scheme_id": str(scheme.id)},
        files={
            "file": (
                "large.pdf",
                oversized_content,
                "application/pdf",
            )
        },
        headers=admin_headers,
    )

    assert response.status_code == 413
    assert list(tmp_path.glob("*")) == []
