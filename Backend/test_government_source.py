
# backend/test_government_source.py

from app.services.government_sources import fetch_data_gov_records

if __name__ == "__main__":
    records = fetch_data_gov_records()
    print(f"Records fetched: {len(records)}")

    # Show field names only; avoid printing potentially sensitive data.
    if records:
        print("Available fields:", sorted(records[0].keys()))
