"""Competitor location CSV ingestion for map visualizations.

Reads curated competitor location CSVs from the Desktop SENTRY workspace and
returns a compact, deterministic summary suitable for the frontend map. The
source files have contributor-specific schemas, so this module normalizes common
fields while avoiding external geocoding/network calls.
"""
from __future__ import annotations

import csv
import os
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from path_config import COMPETITORS_ROOT

CSV_GLOB = "*.csv"
MAX_SAMPLE_LOCATIONS_PER_COMPETITOR = 12
# Keep every accurately geocoded competitor location mappable by default. The
# current trusted coordinate set is small enough for the API/frontend renderer.
MAX_MAP_POINTS_PER_COMPETITOR = int(os.environ.get("SENTRY_COMPETITOR_MAP_POINT_LIMIT", "25000"))

COMPETITOR_DISPLAY_NAMES = {
    "ALBERTSONS": "Albertsons",
    "AMAZON": "Amazon",
    "COSTCO": "Costco",
    "KROGER": "Kroger",
    "SAFEWAY": "Safeway",
    "TARGET": "Target",
    "WHOLEFOODS": "Whole Foods",
}

STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri",
    "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
    "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
    "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
    "DC": "District of Columbia",
}

STATE_ABBREVIATIONS = {name.upper(): code for code, name in STATE_NAMES.items()}

STATE_CENTERS = {
    "AL": (32.8, -86.8), "AK": (64.2, -149.5), "AZ": (34.3, -111.7), "AR": (35.0, -92.4),
    "CA": (37.2, -119.7), "CO": (39.0, -105.5), "CT": (41.6, -72.7), "DE": (39.0, -75.5),
    "FL": (28.1, -82.0), "GA": (32.7, -83.4), "HI": (20.9, -157.5), "ID": (44.2, -114.5),
    "IL": (40.0, -89.2), "IN": (40.0, -86.1), "IA": (42.0, -93.4), "KS": (38.5, -98.0),
    "KY": (37.5, -85.3), "LA": (31.0, -92.0), "ME": (45.3, -69.0), "MD": (39.0, -76.7),
    "MA": (42.3, -71.8), "MI": (44.3, -85.6), "MN": (46.3, -94.2), "MS": (32.7, -89.7),
    "MO": (38.4, -92.5), "MT": (46.9, -110.4), "NE": (41.5, -99.8), "NV": (39.3, -116.6),
    "NH": (43.7, -71.6), "NJ": (40.1, -74.7), "NM": (34.5, -106.1), "NY": (42.9, -75.5),
    "NC": (35.5, -79.4), "ND": (47.5, -100.5), "OH": (40.3, -82.8), "OK": (35.6, -97.5),
    "OR": (44.0, -120.6), "PA": (40.9, -77.8), "RI": (41.7, -71.6), "SC": (33.8, -80.9),
    "SD": (44.4, -100.2), "TN": (35.8, -86.4), "TX": (31.0, -99.9), "UT": (39.3, -111.7),
    "VT": (44.1, -72.7), "VA": (37.6, -78.7), "WA": (47.4, -120.7), "WV": (38.6, -80.6),
    "WI": (44.6, -89.6), "WY": (43.0, -107.6), "DC": (38.9, -77.0),
}


def _display_name_from_file(path: Path) -> str:
    token = path.stem.split("_")[0].upper()
    return COMPETITOR_DISPLAY_NAMES.get(token, token.title())


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _state(value: Any) -> str:
    state = _clean(value).upper()
    if state in STATE_NAMES:
        return state
    return STATE_ABBREVIATIONS.get(state, "")


def _first(row: dict[str, Any], keys: tuple[str, ...]) -> str:
    for key in keys:
        value = _clean(row.get(key))
        if value:
            return value
    return ""


def _float_or_none(value: Any) -> float | None:
    try:
        text = _clean(value)
        return float(text) if text else None
    except (TypeError, ValueError):
        return None



def _location_name(row: dict[str, Any], fallback: str) -> str:
    return _first(row, ("store_name", "warehouse_name", "facility_name", "name", "storeNumber", "facility_code")) or fallback


def _location_type(row: dict[str, Any], fallback: str) -> str:
    return _first(row, ("facility_type", "type", "banner", "brand", "depts")) or fallback


def _street(row: dict[str, Any]) -> str:
    return _first(row, ("street_address", "address", "addr"))


def _zip(row: dict[str, Any]) -> str:
    return _first(row, ("zip_code", "zip"))


def _url(row: dict[str, Any]) -> str:
    return _first(row, ("url", "source_url"))


def _normalized_location(
    row: dict[str, Any],
    competitor: str,
    csv_path: Path,
    state: str,
    loc_type: str,
    lat: float | None,
    lng: float | None,
    coordinate_source: str = "source",
) -> dict[str, Any]:
    return {
        "name": _location_name(row, competitor),
        "type": loc_type,
        "street_address": _street(row),
        "city": _clean(row.get("city")),
        "state": state,
        "zip": _zip(row),
        "lat": lat,
        "lng": lng,
        "coordinate_source": coordinate_source,
        "url": _url(row),
        "source_file": csv_path.name,
    }


def build_competitor_location_summary(root: Path = COMPETITORS_ROOT) -> dict[str, Any]:
    """Return normalized competitor location counts by competitor and state."""
    root = Path(root)
    if not root.exists():
        return {
            "source_available": False,
            "source_root": str(root),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_locations": 0,
            "competitors": [],
            "states": [],
        }

    competitors: dict[str, dict[str, Any]] = {}
    state_totals: dict[str, dict[str, Any]] = defaultdict(lambda: {
        "state": "",
        "state_name": "",
        "total_locations": 0,
        "competitors": defaultdict(int),
    })

    for csv_path in sorted(root.glob(CSV_GLOB), key=lambda p: p.name.lower()):
        competitor = _display_name_from_file(csv_path)
        entry = competitors.setdefault(competitor, {
            "name": competitor,
            "total_locations": 0,
            "files": [],
            "facility_types": defaultdict(int),
            "by_state": defaultdict(int),
            "geocoded_locations": 0,
            "estimated_locations": 0,
            "mappable_locations": 0,
            "unmapped_locations": 0,
            "sample_locations": [],
            "map_points": [],
        })
        entry["files"].append(csv_path.name)

        with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
            for row in csv.DictReader(handle):
                state = _state(row.get("state"))
                if not state:
                    continue

                loc_type = _location_type(row, "Location")
                lat = _float_or_none(row.get("lat"))
                lng = _float_or_none(row.get("lng"))
                coordinate_source = "source" if lat is not None and lng is not None else "unmapped"

                entry["total_locations"] += 1
                entry["by_state"][state] += 1
                entry["facility_types"][loc_type] += 1
                if coordinate_source == "source":
                    entry["geocoded_locations"] += 1
                    entry["mappable_locations"] += 1
                else:
                    entry["unmapped_locations"] += 1

                state_entry = state_totals[state]
                state_entry["state"] = state
                state_entry["state_name"] = STATE_NAMES[state]
                state_entry["total_locations"] += 1
                state_entry["competitors"][competitor] += 1

                location = _normalized_location(row, competitor, csv_path, state, loc_type, lat, lng, coordinate_source)
                if len(entry["sample_locations"]) < MAX_SAMPLE_LOCATIONS_PER_COMPETITOR:
                    entry["sample_locations"].append(location)
                if lat is not None and lng is not None and len(entry["map_points"]) < MAX_MAP_POINTS_PER_COMPETITOR:
                    entry["map_points"].append(location)

    competitor_rows = []
    for entry in competitors.values():
        competitor_rows.append({
            **entry,
            "facility_types": dict(sorted(entry["facility_types"].items(), key=lambda item: (-item[1], item[0]))),
            "by_state": dict(sorted(entry["by_state"].items())),
        })

    state_rows = []
    for entry in state_totals.values():
        state_rows.append({
            **entry,
            "competitors": dict(sorted(entry["competitors"].items(), key=lambda item: (-item[1], item[0]))),
        })

    competitor_rows.sort(key=lambda row: (-row["total_locations"], row["name"]))
    state_rows.sort(key=lambda row: (-row["total_locations"], row["state"]))

    return {
        "source_available": True,
        "source_root": str(root),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_locations": sum(row["total_locations"] for row in competitor_rows),
        "competitors": competitor_rows,
        "states": state_rows,
    }
