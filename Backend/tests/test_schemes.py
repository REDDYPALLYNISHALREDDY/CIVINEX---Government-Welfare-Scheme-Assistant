
from sqlalchemy.orm import Session

from app.models.scheme import Scheme


def create_scheme(
    db: Session,
    *,
    name: str,
    scheme_code: str,
    government_level: str = "central",
    state: str | None = None,
    is_active: bool = True,
) -> Scheme:
    scheme = Scheme(
        name=name,
        scheme_code=scheme_code,
        description=f"Description for {name}",
        government_level=government_level,
        state=state,
        category="welfare",
        official_url=None,
        eligibility_rules={},
        benefits=None,
        is_active=is_active,
    )

    db.add(scheme)
    db.commit()
    db.refresh(scheme)

    return scheme


def test_list_schemes(client, db_session):
    create_scheme(
        db_session,
        name="Example Central Scheme",
        scheme_code="TEST-CENTRAL",
    )

    response = client.get("/api/v1/schemes/")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Example Central Scheme"


def test_search_schemes(client, db_session):
    create_scheme(
        db_session,
        name="Education Support Scheme",
        scheme_code="TEST-EDU",
    )
    create_scheme(
        db_session,
        name="Housing Support Scheme",
        scheme_code="TEST-HOUSE",
    )

    response = client.get(
        "/api/v1/schemes/",
        params={"search": "Education"},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Education Support Scheme"


def test_filter_schemes_by_state(client, db_session):
    create_scheme(
        db_session,
        name="Telangana Example Scheme",
        scheme_code="TEST-TG",
        government_level="state",
        state="Telangana",
    )
    create_scheme(
        db_session,
        name="Central Example Scheme",
        scheme_code="TEST-IN",
    )

    response = client.get(
        "/api/v1/schemes/",
        params={
            "government_level": "state",
            "state": "telangana",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["state"] == "Telangana"


def test_inactive_schemes_are_not_listed(client, db_session):
    create_scheme(
        db_session,
        name="Inactive Example Scheme",
        scheme_code="TEST-INACTIVE",
        is_active=False,
    )

    response = client.get("/api/v1/schemes/")

    assert response.status_code == 200
    assert response.json() == []


def test_get_missing_scheme_returns_404(client):
    response = client.get("/api/v1/schemes/99999")

    assert response.status_code == 404


def test_invalid_government_level_returns_422(client):
    response = client.get(
        "/api/v1/schemes/",
        params={"government_level": "invalid"},
    )

    assert response.status_code == 422


def test_scheme_pagination_limit_is_validated(client):
    response = client.get(
        "/api/v1/schemes/",
        params={"limit": 101},
    )

    assert response.status_code == 422
