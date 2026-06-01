"""Build an accurate competitor geocode cache from the Desktop SENTRY CSVs.

This script is intentionally offline-by-default for safe enterprise use. The
runtime API does not invent coordinates. To populate exact pins for competitors
whose CSVs only contain addresses, run this script in an environment with an
approved geocoding provider and write results to the cache path below.

Default cache output:
  <Competitors>/competitor_geocode_cache.csv

Expected cache columns:
  competitor,source_file,name,street_address,city,state,zip,lat,lng,geocode_status,provider

Rows in this cache can then be merged by competitor_locations.py in a follow-up
step once verified/approved coordinates are available.
"""
from __future__ import annotations

import csv
from pathlib import Path

from competitor_locations import build_competitor_location_summary
from path_config import COMPETITORS_ROOT

CACHE_PATH = COMPETITORS_ROOT / "competitor_geocode_cache.csv"


def main() -> None:
    data = build_competitor_location_summary()
    rows: list[dict[str, str]] = []
    for competitor in data["competitors"]:
        for sample in competitor.get("sample_locations", []):
            # sample_locations are only a small preview; this file is a template
            # generator and diagnostic until an approved geocoder is connected.
            if sample.get("coordinate_source") == "source":
                continue
            rows.append({
                "competitor": competitor["name"],
                "source_file": sample.get("source_file", ""),
                "name": sample.get("name", ""),
                "street_address": sample.get("street_address", ""),
                "city": sample.get("city", ""),
                "state": sample.get("state", ""),
                "zip": sample.get("zip", ""),
                "lat": "",
                "lng": "",
                "geocode_status": "needs_geocode",
                "provider": "",
            })

    fieldnames = [
        "competitor", "source_file", "name", "street_address", "city", "state",
        "zip", "lat", "lng", "geocode_status", "provider",
    ]
    with CACHE_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote geocode cache template: {CACHE_PATH}")
    print("Runtime API remains accurate-only: no estimated coordinates are emitted.")


if __name__ == "__main__":
    main()
