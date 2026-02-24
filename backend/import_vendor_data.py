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

DATA_DIR = Path(
    r"C:\Users\j0w16ja\OneDrive - Walmart Inc"
    r"\Data Entries\Datasets\Vendor Highlighted Data"
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


def import_all() -> None:
    """Import all CSVs from the Vendor Highlighted Data folder."""
    init_db()
    conn = get_connection()

    csv_files = sorted(DATA_DIR.glob("*.csv"))
    if not csv_files:
        print(f"No CSV files found in {DATA_DIR}")
        return

    total = 0
    for csv_path in csv_files:
        count = _import_one(conn, csv_path)
        total += count

    conn.commit()

    # Print summary stats
    row = conn.execute("SELECT COUNT(*) as cnt FROM vendors").fetchone()
    conn.close()
    print(f"\n{'='*60}")
    print(f"✅  Processed {total} rows from {len(csv_files)} files")
    print(f"📊  {row['cnt']} unique vendor-products in SQLite")
    print(f"📁  Database: backend/data/sentry.db")
    print(f"{'='*60}")


def _import_one(conn: sqlite3.Connection, csv_path: Path) -> int:
    """Import a single CSV file, auto-detecting its schema."""
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
            count += 1
    print(f"  ✔ {csv_path.name:<30} Schema {schema_label:<15} {count:>4} rows")
    return count


if __name__ == "__main__":
    import_all()
