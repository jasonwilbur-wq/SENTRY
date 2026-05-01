"""SENTRY — Unified vendor data importer.

Handles BOTH schema variants found in the Vendor Highlighted Data CSVs:

  Schema A (Jul–Oct): Assessment pipeline with Pass/Reject + Maturity.
    → Derives a synthetic 0–5 rating from assessment outcomes.

  Schema B (Nov–Dec): Scored profiles with numeric Overall Rating.
    → Imports directly.

Usage:
  cd backend
  .venv\\Scripts\\activate
  python import_vendor_data.py
"""
import csv
import hashlib
import sqlite3
from pathlib import Path

from database import get_connection, init_db

LEGACY_DATA_DIR = Path(
    r"C:\Users\j0w16ja\OneDrive - Walmart Inc"
    r"\Data Entries\Datasets\Vendor Highlighted Data"
)

ASSESSMENT_PROFILES_CSV = Path(
    r"C:\Users\j0w16ja\OneDrive - Walmart Inc\Desktop\SENTRY"
    r"\Vendor Assessments\00_System\vendor_assessment_vendor_profiles.csv"
)


# ─────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────

def _make_id(company: str, product: str) -> str:
    slug = f"{company}::{product}".lower().strip()
    return hashlib.sha256(slug.encode()).hexdigest()[:12]


def _risk_from_rating(rating: float) -> str:
    if rating >= 4.0:
        return "Low"
    if rating >= 3.0:
        return "Medium"
    if rating >= 2.0:
        return "High"
    return "Critical"


def _clamp(val: float, lo: float = 0.0, hi: float = 5.0) -> float:
    return max(lo, min(hi, val))


def _safe_float(val: str | None) -> float:
    if not val:
        return 0.0
    try:
        return float(val.strip())
    except (ValueError, TypeError):
        return 0.0


def _clean(val: str | None) -> str:
    return (val or "").strip()


# ─────────────────────────────────────────────────────────────────────
# Schema A: derive rating from assessment pipeline fields
# ─────────────────────────────────────────────────────────────────────

MATURITY_SCORES = {
    "market-ready":    1.5,
    "early adoption":  1.0,
    "pilot/beta":      0.5,
    "pilot":           0.3,
    "unknown":         0.5,
}

INITIAL_SCORES = {
    "pass": 1.0,
    "yes":  0.5,
    "fail": -0.5,
    "no":   0.0,
}


def _derive_rating(row: dict) -> float:
    """Synthesise a 0–5 rating from Schema A assessment fields."""
    score = 0.0
    # Pre Assessment: Pass = 2.0, Reject = 1.0
    pre = _clean(row.get("Pre Assessment", "")).lower()
    score += 2.0 if pre == "pass" else 1.0

    # Maturity Level
    maturity = _clean(row.get("Maturity Level", "")).lower()
    score += MATURITY_SCORES.get(maturity, 0.5)

    # Initial Assessment (column name varies)
    initial_raw = (
        _clean(row.get("Complete Initial Assessment", ""))
        or _clean(row.get("Initial Assessment", ""))
    ).lower()
    score += INITIAL_SCORES.get(initial_raw, 0.0)

    # Technical Assessment
    tech = _clean(row.get("Technical Assessment", "")).lower()
    if tech in ("yes", "pass"):
        score += 0.5

    return _clamp(round(score, 2))


def _derive_status(row: dict) -> str:
    """Map Pre Assessment to a vendor status string."""
    pre = _clean(row.get("Pre Assessment", "")).lower()
    initial_raw = (
        _clean(row.get("Complete Initial Assessment", ""))
        or _clean(row.get("Initial Assessment", ""))
    ).lower()

    if pre == "reject":
        return "Rejected"
    if initial_raw == "pass":
        return "Assessed"
    if initial_raw in ("fail", "no"):
        return "Under Review"
    return "Pre-Screened"


# ─────────────────────────────────────────────────────────────────────
# Schema detection & row parsing
# ─────────────────────────────────────────────────────────────────────

def _is_schema_b(headers: list[str]) -> bool:
    """Schema B has 'Overall Rating'; Schema A has 'Pre Assessment'."""
    lower_set = {h.lower().strip() for h in headers}
    return "overall rating" in lower_set


def _parse_schema_a(row: dict, filename: str) -> dict | None:
    """Parse a Jul–Oct assessment pipeline row."""
    company = _clean(row.get("Company", ""))
    if not company:
        return None
    product = _clean(row.get("Technology_Product", ""))
    rating = _derive_rating(row)
    # Extract month from filename for last_assessed fallback
    date_val = _clean(row.get("Date", "")).split(" ")[0]  # strip time
    return {
        "id": _make_id(company, product),
        "company_name": company,
        "company_url": "",
        "category": _clean(row.get("Category", "")) or "Other",
        "technology_product": product,
        "report_url": "",
        "overall_rating": rating,
        "vendor_status": _derive_status(row),
        "risk_level": _risk_from_rating(rating),
        "last_assessed": date_val,
    }


def _parse_schema_b(row: dict) -> dict | None:
    """Parse a Nov–Dec scored vendor row."""
    company = _clean(row.get("Company", ""))
    if not company:
        return None
    product = _clean(row.get("Technology_Product", ""))
    rating = _clamp(_safe_float(row.get("Overall Rating")))
    return {
        "id": _make_id(company, product),
        "company_name": company,
        "company_url": _clean(row.get("CompanyUrl", "")),
        "category": _clean(row.get("Category", "")) or "Other",
        "technology_product": product,
        "report_url": _clean(row.get("Vendor Report", "")),
        "overall_rating": rating,
        "vendor_status": _clean(row.get("Vendor Status", "")) or "Assessed",
        "risk_level": _risk_from_rating(rating),
        "last_assessed": _clean(row.get("Last Assessed", "")),
    }


def _domain_to_category(domain: str) -> str:
    """Convert profile domain labels to user-friendly category text."""
    clean_domain = _clean(domain)
    if not clean_domain or clean_domain.upper() == "UNKNOWN":
        return "Other"
    return clean_domain.replace("_", " ")


def _parse_assessment_profile(row: dict) -> dict | None:
    """Parse rows from vendor_assessment_vendor_profiles.csv."""
    company = _clean(row.get("vendor_folder", ""))
    if not company:
        return None

    report_count = int(_safe_float(row.get("report_count")))
    score_hint = _clamp(round(2.5 + min(report_count, 6) * 0.4, 2))
    tags = _clean(row.get("top_semantic_tags", ""))
    primary_tag = tags.split(";")[0] if tags else ""

    latest_modified = _clean(row.get("latest_modified_utc", ""))
    last_assessed = latest_modified.split("T")[0] if "T" in latest_modified else latest_modified

    return {
        "id": _make_id(company, primary_tag),
        "company_name": company,
        "company_url": "",
        "category": _domain_to_category(_clean(row.get("dominant_domain", ""))),
        "technology_product": primary_tag,
        "report_url": _clean(row.get("sample_report_path", "")),
        "overall_rating": score_hint,
        "vendor_status": "Assessed",
        "risk_level": _risk_from_rating(score_hint),
        "last_assessed": last_assessed,
    }


# ─────────────────────────────────────────────────────────────────────
# Main import
# ─────────────────────────────────────────────────────────────────────

UPSERT_SQL = """
INSERT INTO vendors
  (id, company_name, company_url, category, technology_product,
   report_url, overall_rating, vendor_status, risk_level, last_assessed)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  company_name     = excluded.company_name,
  company_url      = CASE WHEN excluded.company_url != '' THEN excluded.company_url ELSE vendors.company_url END,
  category         = excluded.category,
  technology_product = excluded.technology_product,
  report_url       = CASE WHEN excluded.report_url != '' THEN excluded.report_url ELSE vendors.report_url END,
  overall_rating   = excluded.overall_rating,
  vendor_status    = excluded.vendor_status,
  risk_level       = excluded.risk_level,
  last_assessed    = excluded.last_assessed
"""


def _upsert_vendor(conn: sqlite3.Connection, parsed: dict) -> None:
    conn.execute(UPSERT_SQL, (
        parsed["id"],
        parsed["company_name"],
        parsed["company_url"],
        parsed["category"],
        parsed["technology_product"],
        parsed["report_url"],
        parsed["overall_rating"],
        parsed["vendor_status"],
        parsed["risk_level"],
        parsed["last_assessed"],
    ))


def _import_legacy_file(conn: sqlite3.Connection, csv_path: Path) -> int:
    """Import a single legacy CSV file, auto-detecting Schema A/B."""
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            return 0
        schema_b = _is_schema_b(reader.fieldnames)
        schema_label = "B (scored)" if schema_b else "A (pipeline)"

        count = 0
        for row in reader:
            parsed = _parse_schema_b(row) if schema_b else _parse_schema_a(row, csv_path.name)
            if parsed is None:
                continue
            _upsert_vendor(conn, parsed)
            count += 1

    print(f"  ✔ {csv_path.name:<30} Schema {schema_label:<15} {count:>4} rows")
    return count


def _import_assessment_profiles(conn: sqlite3.Connection, csv_path: Path) -> int:
    """Import vendor profiles generated from Desktop/SENTRY/Vendor Assessments."""
    if not csv_path.exists():
        print(f"  • Skipping profiles import; file not found: {csv_path}")
        return 0

    count = 0
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            parsed = _parse_assessment_profile(row)
            if parsed is None:
                continue
            _upsert_vendor(conn, parsed)
            count += 1

    print(f"  ✔ {csv_path.name:<30} Schema Profiles         {count:>4} rows")
    return count


def import_all() -> None:
    """Import legacy highlighted CSVs plus Desktop Vendor Assessment profiles."""
    init_db()
    conn = get_connection()

    total_rows = 0
    files_processed = 0

    legacy_files = sorted(LEGACY_DATA_DIR.glob("*.csv"))
    if legacy_files:
        for csv_path in legacy_files:
            total_rows += _import_legacy_file(conn, csv_path)
            files_processed += 1
    else:
        print(f"  • No legacy CSV files found in {LEGACY_DATA_DIR}")

    total_rows += _import_assessment_profiles(conn, ASSESSMENT_PROFILES_CSV)
    files_processed += 1

    conn.commit()
    row = conn.execute("SELECT COUNT(*) as cnt FROM vendors").fetchone()
    conn.close()

    print(f"\n{'='*60}")
    print(f"✅  Processed {total_rows} rows from {files_processed} source file groups")
    print(f"📊  {row['cnt']} unique vendor-products in SQLite")
    print(f"📁  Database: backend/data/sentry.db")
    print(f"{'='*60}")


if __name__ == "__main__":
    import_all()
