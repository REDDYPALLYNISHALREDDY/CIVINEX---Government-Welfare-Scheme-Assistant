
import argparse
import csv
import logging
import sys
from pathlib import Path

from app.core.database import get_db
from app.services.scheme_importer import upsert_schemes

CSV_PATH = (
    Path(__file__).resolve().parent
    / "data"
    / "gov_myscheme_data.csv"
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def clean(value):
    if value is None:
        return None

    value = str(value).strip()
    return value or None


def normalize_header(header):
    return " ".join(
        str(header or "").strip().lower().replace("_", " ").split()
    )


def get_column(row, *names):
    normalized = {
        normalize_header(key): value
        for key, value in row.items()
        if key is not None
    }

    for name in names:
        value = clean(normalized.get(normalize_header(name)))
        if value:
            return value

    return None


def read_schemes():
    if not CSV_PATH.is_file():
        raise FileNotFoundError(
            f"CSV file not found: {CSV_PATH}"
        )

    schemes = []
    skipped = 0

    with CSV_PATH.open(
        "r", encoding="utf-8-sig", newline=""
    ) as file:
        reader = csv.DictReader(file)

        if not reader.fieldnames:
            raise ValueError("The CSV has no column headers.")

        logger.info("CSV columns: %s", reader.fieldnames)

        for row_number, row in enumerate(reader, start=2):
            name = get_column(row, "Scheme Name", "name")

            if not name:
                skipped += 1
                continue

            level_raw = (
                get_column(row, "Level", "government_level") or ""
            ).strip().lower()

            location = get_column(
                row,
                "State / UT / Ministry",
                "State / UT",
                "State",
                "UT",
            )

            if level_raw == "central government":
                level = "central"
                state = None

            elif level_raw == "state / ut government":
                level = "state"

                if (
                    not location
                    or location.lower().startswith("ministry of ")
                ):
                    logger.warning(
                        "Skipped row %s: invalid state/UT location "
                        "for %s: %r",
                        row_number,
                        name,
                        location,
                    )
                    skipped += 1
                    continue

                state = location

            else:
                logger.warning(
                    "Skipped row %s: unknown level %r",
                    row_number,
                    level_raw,
                )
                skipped += 1
                continue

            scheme_code = get_column(
                row, "Scheme Slug", "Scheme Code", "scheme_code"
            )

            category = get_column(
                row, "Tags / Categories", "Category", "Tags"
            )

            description = get_column(row, "Description")
            benefits = get_column(row, "Benefits")

            official_url = (
                get_column(row, "Official Link", "Official URL")
                or get_column(row, "MyScheme URL", "Scheme URL")
            )

            # Preserve the additional source information in the
            # existing JSON eligibility_rules column.
            extra_details = {}

            extra_fields = {
                "Application Mode": ("Application Mode",),
                "Eligibility Criteria": ("Eligibility Criteria",),
                "Eligibility (General)": ("Eligibility (General)",),
                "Exclusions / Ineligibility": (
                    "Exclusions / Ineligibility",
                    "Exclusions",
                    "Ineligibility",
                ),
                "Application Process": ("Application Process",),
                "Documents Required": (
                    "Documents Required",
                    "Documents",
                ),
                "Frequently Asked Questions": (
                    "Frequently Asked Questions (FAQs)",
                    "Frequently Asked Questions",
                    "FAQs",
                ),
            }

            for destination, source_names in extra_fields.items():
                value = get_column(row, *source_names)
                if value:
                    extra_details[destination] = value

            record = {
                "name": name,
                "scheme_code": scheme_code,
                "government_level": level,
                "state": state,
                "category": category,
                "description": description,
                "benefits": benefits,
                "official_url": official_url,
                "eligibility_rules": extra_details,
            }

            schemes.append(record)

    logger.info("CSV candidate records: %s", len(schemes))
    logger.info("Rows skipped during CSV parsing: %s", skipped)

    return schemes


def main():
    parser = argparse.ArgumentParser(
        description="Import MyScheme CSV into the existing CIVINEX database."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Read and validate the CSV without database writes.",
    )
    args = parser.parse_args()

    records = read_schemes()

    if args.dry_run:
        print(
            f"Dry run complete: {len(records)} candidate records. "
            "No database changes were made."
        )
        return

    # The actual importer uses the existing configured database.
    # No database or tables are created by this script.
    db_generator = get_db()
    db = next(db_generator)

    try:
        stats = upsert_schemes(
            db,
            records,
            source="gov_myscheme_csv",
        )
        print("Import statistics:", stats)

    finally:
        db.close()
        db_generator.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        logger.error("Import failed: %s", exc)
        sys.exit(1)
