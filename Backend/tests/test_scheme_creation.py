
def test_create_scheme(client, admin_headers):
    payload = {
        "name": "JanSahay Test Education Scheme",
        "scheme_code": "JANSAHAY-EDU-001",
        "description": "A test scheme for education support.",
        "government_level": "state",
        "state": "Telangana",
        "category": "Education",
        "official_url": "https://www.telangana.gov.in/",
        "eligibility_rules": {
            "minimum_age": 18,
            "state": "Telangana",
        },
        "benefits": "Education assistance, subject to official rules.",
    }

    response = client.post(
        "/api/v1/schemes/",
        json=payload,
        headers=admin_headers,
    )

    assert response.status_code == 201

    data = response.json()
    assert data["name"] == payload["name"]
    assert data["scheme_code"] == payload["scheme_code"]
    assert data["government_level"] == "state"
    assert data["state"] == "Telangana"
    assert data["is_active"] is True


def test_create_scheme_with_duplicate_code_returns_409(
    client, admin_headers
):
    payload = {
        "name": "Duplicate Test Scheme One",
        "scheme_code": "DUPLICATE-TEST-001",
        "government_level": "central",
        "eligibility_rules": {},
    }

    first_response = client.post(
        "/api/v1/schemes/",
        json=payload,
        headers=admin_headers,
    )
    assert first_response.status_code == 201

    second_payload = {
        **payload,
        "name": "Duplicate Test Scheme Two",
    }

    second_response = client.post(
        "/api/v1/schemes/",
        json=second_payload,
        headers=admin_headers,
    )

    assert second_response.status_code == 409


def test_create_scheme_rejects_invalid_government_level(
    client, admin_headers
):
    payload = {
        "name": "Invalid Level Test Scheme",
        "government_level": "district",
        "eligibility_rules": {},
    }

    response = client.post(
        "/api/v1/schemes/",
        json=payload,
        headers=admin_headers,
    )

    assert response.status_code == 422


def test_create_scheme_rejects_short_name(client, admin_headers):
    payload = {
        "name": "A",
        "government_level": "central",
        "eligibility_rules": {},
    }

    response = client.post(
        "/api/v1/schemes/",
        json=payload,
        headers=admin_headers,
    )

    assert response.status_code == 422
