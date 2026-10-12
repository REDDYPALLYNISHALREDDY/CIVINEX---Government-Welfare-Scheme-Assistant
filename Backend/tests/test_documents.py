
from app.models.document import Document
from app.models.scheme import Scheme


def create_test_scheme(db_session) -> Scheme:
    scheme = Scheme(
        name="Test Document Scheme",
        scheme_code="TEST-DOCUMENT",
        government_level="central",
        is_active=True,
    )

    db_session.add(scheme)
    db_session.commit()
    db_session.refresh(scheme)

    return scheme


def test_list_documents(client, db_session, citizen_headers):
    scheme = create_test_scheme(db_session)

    document = Document(
        scheme_id=scheme.id,
        title="Test Guidelines",
        original_filename="test_guidelines.pdf",
        storage_path="private/test_guidelines.pdf",
        source_url=None,
        document_version="1.0",
        processing_status="pending",
        extracted_text="Internal test text",
    )

    db_session.add(document)
    db_session.commit()

    response = client.get(
        "/api/v1/documents/",
        headers=citizen_headers,
    )

    assert response.status_code == 200
    data = response.json()

    assert len(data) == 1
    assert data[0]["title"] == "Test Guidelines"
    assert "storage_path" not in data[0]
    assert "extracted_text" not in data[0]


def test_filter_documents_by_scheme(
    client, db_session, citizen_headers
):
    scheme_one = create_test_scheme(db_session)

    scheme_two = Scheme(
        name="Second Test Scheme",
        scheme_code="TEST-DOCUMENT-2",
        government_level="central",
        is_active=True,
    )

    db_session.add(scheme_two)
    db_session.commit()
    db_session.refresh(scheme_two)

    db_session.add_all([
        Document(
            scheme_id=scheme_one.id,
            title="First Document",
            original_filename="first.pdf",
            storage_path="private/first.pdf",
            processing_status="pending",
        ),
        Document(
            scheme_id=scheme_two.id,
            title="Second Document",
            original_filename="second.pdf",
            storage_path="private/second.pdf",
            processing_status="pending",
        ),
    ])
    db_session.commit()

    response = client.get(
        "/api/v1/documents/",
        params={"scheme_id": scheme_one.id},
        headers=citizen_headers,
    )

    assert response.status_code == 200
    data = response.json()

    assert len(data) == 1
    assert data[0]["title"] == "First Document"


def test_missing_scheme_returns_404(client, citizen_headers):
    response = client.get(
        "/api/v1/documents/",
        params={"scheme_id": 99999},
        headers=citizen_headers,
    )

    assert response.status_code == 404


def test_invalid_document_pagination_returns_422(
    client, citizen_headers
):
    response = client.get(
        "/api/v1/documents/",
        params={"limit": 101},
        headers=citizen_headers,
    )

    assert response.status_code == 422
