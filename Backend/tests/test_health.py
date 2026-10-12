
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_root_endpoint() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert "message" in response.json()
    assert response.json()["health"] == "/api/v1/health"


def test_health_endpoint() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"
    assert data["service"] == "Government Welfare Scheme Assistant"
    assert data["version"] == "0.1.0"
    assert data["environment"] == "development"


def test_database_health_endpoint() -> None:
    response = client.get("/api/v1/health/database")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "database": "connected",
    }
