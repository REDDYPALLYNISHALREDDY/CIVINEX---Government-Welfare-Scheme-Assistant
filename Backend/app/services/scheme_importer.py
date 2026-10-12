
from __future__ import annotations

import hashlib
import logging
import re
from typing import Any
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.scheme import Scheme

logger = logging.getLogger(__name__)

VALID_LEVELS = {"central", "state"}
MAX_NAME_LENGTH = 255
MAX_CODE_LENGTH = 100
MAX_STATE_LENGTH = 100
MAX_CATEGORY_LENGTH = 100
MAX_URL_LENGTH = 2048


def _clean(value: Any, max_length: int | None = None) -> str:
    if value is None:
        return ""

    result = re.sub(r"\s+", " ", str(value)).strip()
    return result[:max_length] if max_length else result


def _stable_code(source: str, name: str, url: str) -> str:
    raw = f"{source}|{name.casefold()}|{url}".encode("utf-8")
    digest = hashlib.sha256(raw).hexdigest()[:32]
    return f"{source[:10].upper()}-{digest}"


def normalize_scheme(
    record: dict[str, Any],
    source: str,
) -> dict[str, Any] | None:
    name = _clean(record.get("name"), MAX_NAME_LENGTH)
    level = _clean(record.get("government_level")).lower()
    url = _clean(record.get("official_url"), MAX_URL_LENGTH)

    if not name or level not in VALID_LEVELS:
        return None

    parsed_url = urlparse(url)
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
        return None

    state = _clean(record.get("state"), MAX_STATE_LENGTH) or None
    if level == "state" and not state:
        return None

    code = _clean(record.get("scheme_code"), MAX_CODE_LENGTH)
    if not code:
        code = _stable_code(source, name, url)

    eligibility = record.get("eligibility_rules")
    if not isinstance(eligibility, dict):
        eligibility = {}

    return {
        "name": name,
        "scheme_code": code,
        "description": _clean(record.get("description")) or None,
        "government_level": level,
        "state": state,
        "category": _clean(record.get("category"), MAX_CATEGORY_LENGTH) or None,
        "official_url": url,
        "eligibility_rules": eligibility,
        "benefits": _clean(record.get("benefits")) or None,
    }



def upsert_schemes(
    db: Session,
    records: list[dict[str, Any]],
    source: str,
) -> dict[str, int]:
    stats = {
        "inserted": 0,
        "updated": 0,
        "skipped": 0,
        "conflicts": 0,
    }

    try:
        for record in records:
            data = normalize_scheme(record, source)

            if data is None:
                stats["skipped"] += 1
                continue

            scheme_code = data.get("scheme_code")
            official_url = data.get("official_url")

            # Match only on identifiers that actually exist.
            by_code = None
            by_url = None

            if scheme_code:
                by_code = db.scalar(
                    select(Scheme).where(
                        Scheme.scheme_code == scheme_code
                    )
                )

            if official_url:
                by_url = db.scalar(
                    select(Scheme).where(
                        Scheme.official_url == official_url
                    )
                )

            # The two identifiers point to different records.
            if (
                by_code is not None
                and by_url is not None
                and by_code.id != by_url.id
            ):
                stats["conflicts"] += 1
                stats["skipped"] += 1
                logger.warning(
                    "Skipped conflicting scheme: %s", data.get("name")
                )
                continue

            existing = by_code or by_url

            if existing is None:
                db.add(Scheme(**data))
                stats["inserted"] += 1
                continue

            # Do not silently change a record's identity when the
            # identifiers do not agree with its existing name.
            old_name = (existing.name or "").strip().casefold()
            new_name = (data.get("name") or "").strip().casefold()

            if (
                old_name
                and new_name
                and old_name != new_name
                and by_code is not None
                and by_url is None
            ):
                stats["conflicts"] += 1
                stats["skipped"] += 1
                logger.warning(
                    "Skipped possible scheme-code collision: %s",
                    data.get("name"),
                )
                continue

            # Preserve existing values; fill only empty fields.
            for field, value in data.items():
                if value is None or value == "":
                    continue
                if field == "eligibility_rules" and not value:
                    continue

                current = getattr(existing, field, None)
                if current is None or current == "" or current == {}:
                    setattr(existing, field, value)

            stats["updated"] += 1

        db.commit()
        logger.info("Scheme import completed: %s", stats)
        return stats

    except Exception:
        db.rollback()
        logger.exception(
            "Scheme import failed; transaction rolled back"
        )
        raise
