
def test_search_returns_relevant_chunks(client, monkeypatch):
    from app.api.routes import search as search_route

    monkeypatch.setattr(
        search_route,
        "search_document_chunks",
        lambda query, scheme_id=None, limit=5: [
            {
                "document_id": 10,
                "scheme_id": 2,
                "chunk_index": 0,
                "text": "Applicants must satisfy the scheme eligibility criteria.",
                "score": 0.87,
            }
        ],
    )

    response = client.post(
        "/api/v1/search/",
        json={
            "query": "What are the eligibility criteria?",
            "scheme_id": 2,
            "limit": 5,
        },
    )

    assert response.status_code == 200

    data = response.json()
    assert data["total_results"] == 1
    assert data["results"][0]["document_id"] == 10
    assert data["results"][0]["scheme_id"] == 2
    assert data["results"][0]["score"] == 0.87


def test_search_returns_empty_results(client, monkeypatch):
    from app.api.routes import search as search_route

    monkeypatch.setattr(
        search_route,
        "search_document_chunks",
        lambda query, scheme_id=None, limit=5: [],
    )

    response = client.post(
        "/api/v1/search/",
        json={"query": "Find government welfare schemes"},
    )

    assert response.status_code == 200
    assert response.json()["results"] == []
    assert response.json()["total_results"] == 0


def test_search_rejects_short_query(client):
    response = client.post(
        "/api/v1/search/",
        json={"query": "hi"},
    )

    assert response.status_code == 422


def test_search_rejects_invalid_limit(client):
    response = client.post(
        "/api/v1/search/",
        json={
            "query": "Eligibility for this scheme",
            "limit": 100,
        },
    )

    assert response.status_code == 422


def test_search_handles_service_validation_error(client, monkeypatch):
    from app.api.routes import search as search_route

    def invalid_search(*args, **kwargs):
        raise ValueError("The search query must contain at least 3 characters.")

    monkeypatch.setattr(
        search_route,
        "search_document_chunks",
        invalid_search,
    )

    response = client.post(
        "/api/v1/search/",
        json={"query": "Valid-looking query"},
    )

    assert response.status_code == 422
