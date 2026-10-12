
from app.services.eligibility_service import evaluate_eligibility_rules


def test_all_rules_pass():
    result = evaluate_eligibility_rules(
        {
            "minimum_age": 18,
            "maximum_age": 60,
            "state": "Telangana",
            "maximum_annual_income": 200000,
        },
        {
            "age": 25,
            "state": "telangana",
            "annual_income": 150000,
        },
    )

    assert result["status"] == "potentially_eligible"
    assert result["missing_fields"] == []


def test_age_rule_fails():
    result = evaluate_eligibility_rules(
        {"minimum_age": 18},
        {"age": 16},
    )

    assert result["status"] == "not_eligible"
    assert any("Not satisfied" in reason for reason in result["reasons"])


def test_missing_profile_field():
    result = evaluate_eligibility_rules(
        {
            "minimum_age": 18,
            "state": "Telangana",
        },
        {"age": 25},
    )

    assert result["status"] == "needs_more_information"
    assert result["missing_fields"] == ["state"]


def test_failed_rule_takes_precedence_over_missing_field():
    result = evaluate_eligibility_rules(
        {
            "minimum_age": 18,
            "state": "Telangana",
        },
        {"age": 16},
    )

    assert result["status"] == "not_eligible"
    assert "state" in result["missing_fields"]


def test_empty_rules_do_not_claim_eligibility():
    result = evaluate_eligibility_rules({}, {"age": 25})

    assert result["status"] == "needs_more_information"


def test_unsupported_rule_does_not_claim_eligibility():
    result = evaluate_eligibility_rules(
        {"occupation": "farmer"},
        {"age": 25},
    )

    assert result["status"] == "needs_more_information"


def test_invalid_rule_does_not_claim_eligibility():
    result = evaluate_eligibility_rules(
        {"minimum_age": "eighteen"},
        {"age": 25},
    )

    assert result["status"] == "needs_more_information"


def test_income_rule_fails():
    result = evaluate_eligibility_rules(
        {"maximum_annual_income": 200000},
        {"annual_income": 250000},
    )

    assert result["status"] == "not_eligible"


def test_minimum_income_rule_passes():
    result = evaluate_eligibility_rules(
        {"minimum_annual_income": 100000},
        {"annual_income": 150000},
    )

    assert result["status"] == "potentially_eligible"
