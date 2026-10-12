
from app.services.scheme_importer import normalize_scheme


def test_normalizes_valid_central_scheme():
    record = {
        "name": "Example Central Scheme",
        "government_level": "central",
        "official_url": "https://example.gov.in/scheme",
        "description": "Example description",
        "category": "Education",
        "benefits": "Educational support",
        "eligibility_rules": {"age_min": 18},
    }

    result = normalize_scheme(record, "test")

    assert result is not None
    assert result["name"] == "Example Central Scheme"
    assert result["government_level"] == "central"
    assert result["eligibility_rules"] == {"age_min": 18}
    assert result["scheme_code"].startswith("TEST-")


def test_rejects_scheme_without_name():
    record = {
        "name": "",
        "government_level": "central",
        "official_url": "https://example.gov.in/scheme",
    }

    assert normalize_scheme(record, "test") is None


def test_rejects_invalid_url():
    record = {
        "name": "Example Scheme",
        "government_level": "central",
        "official_url": "not-a-valid-url",
    }

    assert normalize_scheme(record, "test") is None


def test_requires_state_for_state_scheme():
    record = {
        "name": "Example State Scheme",
        "government_level": "state",
        "official_url": "https://example.gov.in/scheme",
    }

    assert normalize_scheme(record, "test") is None


def test_accepts_union_territory_in_state_field():
    record = {
        "name": "Example UT Scheme",
        "government_level": "state",
        "state": "Puducherry",
        "official_url": "https://example.gov.in/scheme",
    }

    result = normalize_scheme(record, "test")

    assert result is not None
    assert result["state"] == "Puducherry"
