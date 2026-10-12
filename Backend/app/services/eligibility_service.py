
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.scheme import Scheme


SUPPORTED_RULES = {
    "minimum_age",
    "maximum_age",
    "state",
    "maximum_annual_income",
    "minimum_annual_income",
}

PROFILE_FIELD_FOR_RULE = {
    "minimum_age": "age",
    "maximum_age": "age",
    "state": "state",
    "maximum_annual_income": "annual_income",
    "minimum_annual_income": "annual_income",
}


def evaluate_eligibility_rules(
    rules: dict[str, Any] | None,
    profile: dict[str, Any],
) -> dict:
    """
    Evaluate supported scheme rules without using an AI model.

    Missing values produce needs_more_information unless another
    known value already proves that a configured rule fails.
    """
    if not isinstance(rules, dict) or not rules:
        return {
            "status": "needs_more_information",
            "reasons": [
                "This scheme does not yet have configured eligibility rules."
            ],
            "missing_fields": [],
        }

    unsupported = sorted(set(rules) - SUPPORTED_RULES)

    if unsupported:
        return {
            "status": "needs_more_information",
            "reasons": [
                "Some scheme rules cannot yet be evaluated: "
                + ", ".join(unsupported)
            ],
            "missing_fields": [],
        }

    reasons: list[str] = []
    missing_fields: set[str] = set()
    failed = False

    for rule_name, rule_value in rules.items():
        profile_field = PROFILE_FIELD_FOR_RULE[rule_name]
        actual_value = profile.get(profile_field)

        if actual_value is None:
            missing_fields.add(profile_field)
            continue

        if rule_name in {"minimum_age", "maximum_age"}:
            if (
                isinstance(rule_value, bool)
                or not isinstance(rule_value, int)
                or not 0 <= rule_value <= 120
            ):
                return {
                    "status": "needs_more_information",
                    "reasons": [
                        f"The scheme's {rule_name} rule is invalid "
                        "and needs administrator review."
                    ],
                    "missing_fields": [],
                }

            if rule_name == "minimum_age":
                passed = actual_value >= rule_value
                description = f"Minimum age required: {rule_value}."

            else:
                passed = actual_value <= rule_value
                description = f"Maximum age allowed: {rule_value}."

        elif rule_name == "state":
            if not isinstance(rule_value, str) or not rule_value.strip():
                return {
                    "status": "needs_more_information",
                    "reasons": [
                        "The scheme's state rule is invalid and needs review."
                    ],
                    "missing_fields": [],
                }

            passed = (
                isinstance(actual_value, str)
                and actual_value.strip().casefold()
                == rule_value.strip().casefold()
            )
            description = f"Required state: {rule_value}."

        else:
            if (
                isinstance(rule_value, bool)
                or not isinstance(rule_value, (int, float))
                or rule_value < 0
            ):
                return {
                    "status": "needs_more_information",
                    "reasons": [
                        f"The scheme's {rule_name} rule is invalid "
                        "and needs administrator review."
                    ],
                    "missing_fields": [],
                }

            if rule_name == "maximum_annual_income":
                passed = actual_value <= rule_value
                description = (
                    f"Maximum annual income allowed: {rule_value}."
                )
            else:
                passed = actual_value >= rule_value
                description = (
                    f"Minimum annual income required: {rule_value}."
                )

        if passed:
            reasons.append(f"Passed: {description}")
        else:
            failed = True
            reasons.append(f"Not satisfied: {description}")

    if failed:
        result_status = "not_eligible"
    elif missing_fields:
        result_status = "needs_more_information"
        reasons.append(
            "Provide the missing profile details to evaluate all configured rules."
        )
    else:
        result_status = "potentially_eligible"
        reasons.append(
            "All configured rules passed. Verify any additional official "
            "requirements before relying on this assessment."
        )

    return {
        "status": result_status,
        "reasons": reasons,
        "missing_fields": sorted(missing_fields),
    }


def check_scheme_eligibility(
    db: Session,
    *,
    scheme_id: int,
    profile: dict[str, Any],
) -> dict:
    scheme = db.scalar(
        select(Scheme).where(
            Scheme.id == scheme_id,
            Scheme.is_active.is_(True),
        )
    )

    if scheme is None:
        return {
            "error": "active_scheme_not_found",
        }

    result = evaluate_eligibility_rules(
        scheme.eligibility_rules,
        profile,
    )

    return {
        "scheme_id": scheme.id,
        "scheme_name": scheme.name,
        **result,
        "disclaimer": (
            "This is a preliminary assessment based only on the rules "
            "currently configured in JanSahay. It is not an official "
            "eligibility decision. Verify all requirements with the "
            "relevant government department."
        ),
    }
