
def test_assistant_returns_grounded_answer(client, monkeypatch):
    from app.api.routes import assistant

    monkeypatch.setattr(
        assistant,
        "answer_scheme_question",
        lambda db, *, question, scheme_id=None: {
            "question": question,
            "answer": (
                "The supplied scheme document describes the requirements. "
                "[Source 1]"
            ),
            "sources": [
                {
                    "document_id": 1,
                    "scheme_id": 2,
                    "scheme_name": "Test Welfare Scheme",
                    "document_title": "Official Guidelines",
                    "official_url": "https://example.gov.in/scheme",
                    "chunk_indexes": [0],
                    "relevance_score": 0.82,
                }
            ],
            "grounded": True,
        },
    )

    response = client.post(
        "/api/v1/assistant/ask",
        json={
            "question": "What are the scheme requirements?",
            "scheme_id": 2,
        },
    )

    assert response.status_code == 200

    data = response.json()
    assert data["grounded"] is True
    assert "[Source 1]" in data["answer"]
    assert data["sources"][0]["document_id"] == 1
    assert data["sources"][0]["official_url"].startswith("https://")


def test_assistant_returns_unavailable_message_when_no_passages(
    client,
    monkeypatch,
):
    from app.api.routes import assistant

    monkeypatch.setattr(
        assistant,
        "answer_scheme_question",
        lambda db, *, question, scheme_id=None: {
            "question": question,
            "answer": (
                "I could not find relevant information in the indexed "
                "scheme documents."
            ),
            "sources": [],
            "grounded": False,
        },
    )

    response = client.post(
        "/api/v1/assistant/ask",
        json={"question": "What are the scheme requirements?"},
    )

    assert response.status_code == 200

    data = response.json()
    assert data["grounded"] is False
    assert data["sources"] == []


def test_assistant_rejects_short_question(client):
    response = client.post(
        "/api/v1/assistant/ask",
        json={"question": "hi"},
    )

    assert response.status_code == 422


def test_assistant_rejects_invalid_scheme_id(client):
    response = client.post(
        "/api/v1/assistant/ask",
        json={
            "question": "What are the scheme requirements?",
            "scheme_id": 0,
        },
    )

    assert response.status_code == 422
