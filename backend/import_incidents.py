"""Import all incident CSVs from OneDrive into the SENTRY incidents table.

Run once (or monthly) to refresh incident data:
  python import_incidents.py

Idempotent — rows are inserted with OR IGNORE so re-running is safe.
"""
from __future__ import annotations

import csv
import glob
import hashlib
import os
import re
import sys
from datetime import datetime
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).parent))
from database import get_connection, init_db  # noqa: E402

# ── Config ────────────────────────────────────────────────────────────────

DEFAULT_ONEDRIVE_ROOT = Path(os.environ.get("ONEDRIVE", r"C:\Users\j0w16ja\OneDrive - Walmart Inc"))
DEFAULT_SENTRY_ROOT = Path(
    os.environ.get("SENTRY_DATA_ROOT", str(DEFAULT_ONEDRIVE_ROOT / "Desktop" / "SENTRY"))
)
INCIDENT_DIR = Path(
    os.environ.get("SENTRY_INCIDENT_DIR", str(DEFAULT_SENTRY_ROOT / "Incidents"))
)
INCIDENT_WORKBOOK_GLOB = os.environ.get(
    "SENTRY_INCIDENT_WORKBOOK_GLOB",
    str(DEFAULT_SENTRY_ROOT / "Incident Tracker*.xlsx"),
)
LEGACY_INCIDENT_DIR = DEFAULT_ONEDRIVE_ROOT / "ET" / "SENTRY_Data" / "Incidents"

# ── Severity inference ────────────────────────────────────────────────────

_CRITICAL_KW = [
    "cyber", "ransomware", "data breach", "shooting", "terrorism",
    "bomb", "attack", "violence", "murder", "fatal",
]
_HIGH_KW = [
    "cargo theft", "robbery", "armed", "arson", "trafficking",
    "smash", "organized retail crime", "orc",
]
_LOW_KW = ["arrest", "court", "fine", "regulatory", "policy", "settlement"]


def _infer_severity(incident_type: str, summary: str, tags: str) -> str:
    text = f"{incident_type} {summary} {tags}".lower()
    if any(k in text for k in _CRITICAL_KW):
        return "Critical"
    if any(k in text for k in _HIGH_KW):
        return "High"
    if any(k in text for k in _LOW_KW):
        return "Low"
    return "Medium"


# ── Region / country inference ────────────────────────────────────────────

_US_INDICATORS = [
    "usa", "u.s.", "united states", "alaska", "hawaii",
    ", al", ", ak", ", az", ", ar", ", ca", ", co", ", ct",
    ", de", ", fl", ", ga", ", hi", ", id", ", il", ", in",
    ", ia", ", ks", ", ky", ", la", ", me", ", md", ", ma",
    ", mi", ", mn", ", ms", ", mo", ", mt", ", ne", ", nv",
    ", nh", ", nj", ", nm", ", ny", ", nc", ", nd", ", oh",
    ", ok", ", or", ", pa", ", ri", ", sc", ", sd", ", tn",
    ", tx", ", ut", ", vt", ", va", ", wa", ", wv", ", wi",
    ", wy", ", dc",
]
_REGION_MAP = {
    "northeast": ["maine", "new hampshire", "vermont", "massachusetts",
                  "rhode island", "connecticut", "new york", "new jersey",
                  "pennsylvania", ", me", ", nh", ", vt", ", ma",
                  ", ri", ", ct", ", ny", ", nj", ", pa"],
    "southeast": ["alabama", "arkansas", "florida", "georgia", "kentucky",
                  "louisiana", "mississippi", "north carolina", "south carolina",
                  "tennessee", "virginia", "west virginia", ", al", ", ar",
                  ", fl", ", ga", ", ky", ", la", ", ms", ", nc",
                  ", sc", ", tn", ", va", ", wv"],
    "midwest":   ["illinois", "indiana", "iowa", "kansas", "michigan",
                  "minnesota", "missouri", "nebraska", "north dakota",
                  "ohio", "south dakota", "wisconsin", ", il", ", in",
                  ", ia", ", ks", ", mi", ", mn", ", mo", ", ne",
                  ", nd", ", oh", ", sd", ", wi"],
    "southwest": ["arizona", "new mexico", "oklahoma", "texas",
                  ", az", ", nm", ", ok", ", tx"],
    "west":      ["alaska", "california", "colorado", "hawaii", "idaho",
                  "montana", "nevada", "oregon", "utah", "washington",
                  "wyoming", ", ak", ", ca", ", co", ", hi", ", id",
                  ", mt", ", nv", ", or", ", ut", ", wa", ", wy"],
}
_INTL_COUNTRY_KW = {
    "Canada": ["canada", ", bc", ", on", ", qc", ", ab", ", mb",
               "toronto", "vancouver", "montreal", "ontario"],
    "UK":     ["united kingdom", "england", "london", ", uk", "britain"],
    "Australia": ["australia", "sydney", "melbourne", "brisbane"],
    "Mexico": ["mexico", "cdmx", "tijuana", "monterrey"],
    "Brazil": ["brazil", "brasil", "são paulo", "rio"],
    "India":  ["india", "delhi", "mumbai", "bangalore", "chennai"],
    "China":  ["china", "beijing", "shanghai", "shenzhen"],
    "Europe": ["europe", "germany", "france", "spain", "italy",
               "netherlands", "sweden", "norway", "denmark"],
}


def _infer_location_meta(location: str) -> tuple[str, str]:
    """Return (region, country) for a location string."""
    loc = location.lower()
    if not loc:
        return "Unknown", "Unknown"

    # Check international first
    for country, keywords in _INTL_COUNTRY_KW.items():
        if any(k in loc for k in keywords):
            return "International", country

    # US region check
    is_us = any(k in loc for k in _US_INDICATORS)
    for region, keywords in _REGION_MAP.items():
        if any(k in loc for k in keywords):
            return region.title(), "USA"

    if is_us:
        return "USA", "USA"

    return "International", "International"


# ── Date normalisation ────────────────────────────────────────────────────

def _normalise_date(raw: str) -> str:
    if not raw or not raw.strip():
        return ""
    raw = raw.strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%d/%m/%Y",
                "%B %d, %Y", "%b %d, %Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    # Try just a 4-digit year
    m = re.search(r"\b(20\d{2})\b", raw)
    if m:
        return f"{m.group(1)}-01-01"
    return ""


# ── Column mapping ────────────────────────────────────────────────────────

_COL_DATE     = ["date", "incident date", "inferred date (from url)"]
_COL_TYPE     = ["incident type", "type", "category"]
_COL_LOCATION = ["location", "city", "state", "region"]
_COL_SUMMARY  = ["summary", "description", "details"]
_COL_IMPACT   = ["impact to walmart or retail sector", "impact", "walmart impact"]
_COL_ACTION   = ["recommended action/tracking note", "action", "recommended action"]
_COL_SOURCE   = ["source url/publisher", "source url (parsed)", "source url", "url"]
_COL_TAGS     = ["tag", "tags"]


def _pick(row: dict, candidates: list[str]) -> str:
    for c in candidates:
        for k, v in row.items():
            if k and k.lower().strip() == c:
                val = (v or "").strip()
                if val:
                    return val
    return ""


# ── Row stable ID ─────────────────────────────────────────────────────────

def _row_id(source_file: str, incident_type: str, date: str, summary: str) -> str:
    key = f"{source_file}|{incident_type}|{date}|{summary[:80]}"
    return hashlib.sha1(key.encode()).hexdigest()[:16]


# ── Source discovery ─────────────────────────────────────────────────────

def _load_sources() -> list[tuple[str, list[dict]]]:
    csv_files = sorted(glob.glob(str(INCIDENT_DIR / "*.csv")))
    if csv_files:
        sources: list[tuple[str, list[dict]]] = []
        for path in csv_files:
            fname = os.path.basename(path)
            with open(path, encoding="utf-8", errors="replace") as fh:
                sources.append((fname, list(csv.DictReader(fh))))
        print(f"[INFO] Using incident CSVs from {INCIDENT_DIR}")
        return sources

    legacy_csv_files = sorted(glob.glob(str(LEGACY_INCIDENT_DIR / "*.csv")))
    if legacy_csv_files:
        sources = []
        for path in legacy_csv_files:
            fname = os.path.basename(path)
            with open(path, encoding="utf-8", errors="replace") as fh:
                sources.append((fname, list(csv.DictReader(fh))))
        print(f"[INFO] Using legacy incident CSVs from {LEGACY_INCIDENT_DIR}")
        return sources

    workbook_paths = sorted(glob.glob(INCIDENT_WORKBOOK_GLOB))
    if workbook_paths:
        workbook_path = workbook_paths[0]
        wb = openpyxl.load_workbook(workbook_path, data_only=True)
        ws = wb.worksheets[0]
        raw_rows = list(ws.iter_rows(values_only=True))
        if not raw_rows:
            print(f"[WARN] Incident workbook is empty: {workbook_path}")
            return []

        headers = [str(c or f"col_{i}").strip() for i, c in enumerate(raw_rows[0])]
        rows = [
            {
                headers[i]: "" if cell is None else str(cell).strip()
                for i, cell in enumerate(row)
            }
            for row in raw_rows[1:]
            if not all(cell is None for cell in row)
        ]
        print(f"[INFO] Using incident workbook fallback: {workbook_path}")
        return [(os.path.basename(workbook_path), rows)]

    print(f"[WARN] No incident CSVs found in {INCIDENT_DIR}")
    print(f"[WARN] No incident workbook matched {INCIDENT_WORKBOOK_GLOB}")
    return []


# ── Main import ───────────────────────────────────────────────────────────

def import_all() -> None:
    init_db()
    sources = _load_sources()
    if not sources:
        return

    conn = get_connection()
    inserted = 0
    skipped  = 0

    for fname, rows in sources:
        for row in rows:
            raw_date = _pick(row, _COL_DATE)
            inc_type = _pick(row, _COL_TYPE) or "Other"
            location = _pick(row, _COL_LOCATION)
            summary  = _pick(row, _COL_SUMMARY)
            impact   = _pick(row, _COL_IMPACT)
            action   = _pick(row, _COL_ACTION)
            source   = _pick(row, _COL_SOURCE)
            tags     = _pick(row, _COL_TAGS)

            if not summary and not inc_type:
                skipped += 1
                continue

            date     = _normalise_date(raw_date)
            severity = _infer_severity(inc_type, summary, tags)
            region, country = _infer_location_meta(location)
            row_id   = _row_id(fname, inc_type, date, summary)

            try:
                conn.execute(
                    """
                    INSERT OR IGNORE INTO incidents
                      (id, incident_date, incident_type, severity,
                       location, region, country,
                       summary, impact, recommended_action,
                       source_url, tags, source_file)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """,
                    (row_id, date, inc_type, severity,
                     location, region, country,
                     summary, impact, action,
                     source, tags, fname),
                )
                inserted += 1
            except Exception as exc:
                print(f"[ERROR] insert {fname}: {exc}")

    conn.commit()
    conn.close()
    print(f"\n✅  Import complete: {inserted} rows inserted, {skipped} skipped")
    print(f"    Source files: {len(sources)}")


if __name__ == "__main__":
    import_all()
