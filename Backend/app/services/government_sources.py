
# backend/app/services/government_sources.py

import logging
import os
from typing import Any
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

DATA_GOV_API_BASE = "https://api.data.gov.in/resource"
PAGE_SIZE = 100
MAX_RECORDS_PER_RUN = 5000
TIMEOUT_SECONDS = 30


class GovernmentSourceError(RuntimeError):
    """Raised when an official data source cannot be read safely."""


def fetch_data_gov_records() -> list[dict[str, Any]]:
    """
    Fetch raw records from one configured data.gov.in resource.

    This function does not modify the database. The resource must be
    verified as a relevant scheme catalogue before importing its data.
    """
    api_key = os.getenv("DATA_GOV_API_KEY", "").strip()
    resource_id = os.getenv("DATA_GOV_SCHEME_RESOURCE_ID", "").strip()

    if not api_key or not resource_id:
        raise GovernmentSourceError(
            "Configure DATA_GOV_API_KEY and "
            "DATA_GOV_SCHEME_RESOURCE_ID in backend/.env."
        )

    # Resource IDs should be a single URL path component.
    if "/" in resource_id or "?" in resource_id or "#" in resource_id:
        raise GovernmentSourceError("Invalid data.gov.in resource ID.")

    endpoint = f"{DATA_GOV_API_BASE}/{resource_id}"
    if urlparse(endpoint).hostname != "api.data.gov.in":
        raise GovernmentSourceError("Unexpected API host.")

    records: list[dict[str, Any]] = []
    offset = 0

    try:
        with httpx.Client(
            timeout=TIMEOUT_SECONDS,
            follow_redirects=False,
        ) as client:
            while offset < MAX_RECORDS_PER_RUN:
                limit = min(
                    PAGE_SIZE,
                    MAX_RECORDS_PER_RUN - offset,
                )
                response = client.get(
                    endpoint,
                    params={
                        "api-key": api_key,
                        "format": "json",
                        "offset": offset,
                        "limit": limit,
                    },
                )
                response.raise_for_status()

                payload = response.json()
                if not isinstance(payload, dict):
                    raise GovernmentSourceError(
                        "The API returned an unexpected response."
                    )

                page = payload.get("records")
                if not isinstance(page, list):
                    raise GovernmentSourceError(
                        "No 'records' list found. Check the selected "
                        "resource's API documentation and response format."
                    )

                if not all(isinstance(item, dict) for item in page):
                    raise GovernmentSourceError(
                        "The API returned records in an unexpected format."
                    )

                if not page:
                    break

                records.extend(page)
                logger.info(
                    "Fetched %s records from data.gov.in; total=%s",
                    len(page),
                    len(records),
                )

                offset += len(page)

                if len(page) < limit:
                    break

    except httpx.HTTPStatusError as exc:
        # Do not log request URLs: query parameters may contain the API key.
        raise GovernmentSourceError(
            f"data.gov.in returned HTTP {exc.response.status_code}."
        ) from exc
    except httpx.HTTPError as exc:
        raise GovernmentSourceError(
            "Could not connect to data.gov.in."
        ) from exc
    except ValueError as exc:
        raise GovernmentSourceError(
            "data.gov.in returned invalid JSON."
        ) from exc

    logger.info("Finished fetching %s raw records.", len(records))
    return records
