"""SENTRY — Populate vendor_highlights table from monthly CSVs.

Each row in a CSV becomes one highlight record, linked back to its vendor
by the same SHA-256 slug used by import_vendor_data.py.

Usage:
  cd backend
  .venv\\Scripts\\activate
  python import_highlights.py
"""
import csv
import hashlib
from pathlib import Path

from database import get_connection, init_db

DATA_DIR = Path(
    r"C:\Users\j0w16ja\OneDrive - Walmart Inc"
    r"\Data Entries\Datasets\Vendor Highlighted Data"
)


def _make_vendor_id(company: str, product: str) -> str:
    slug = f"{company}::{product}".lower().strip()
    return hashlib.sha256(slug.encode()).hexdigest()[:12]


def _make_highlight_id(vendor_id: str, source_file: str, row_index: int) -> str:
    slug = f"{vendor_id}::{source_file}::{row_index}"
    return hashlib.sha256(slug.encode()).hexdigest()[:16]


def _clean(val: str | None) -> str:
    return (val or "").strip()


def _safe_float(val: str | None) -> float | None:
    if not val:
        return None
    try:
        return float(val.strip())
    except (ValueError, TypeError):
        return None


_MATURITY_SCORE: dict[str, float] = {
    "market-ready":    1.5,
    "early adoption":  1.0,
    "pilot/beta":      0.5,
    "pilot":           0.3,
    "unknown":         0.5,
}

_INITIAL_SCORE: dict[str, float] = {
    "pass": 2.0,
    "yes":  1.5,
    "fail": 0.5,
    "no":   0.5,
}


def _derive_pre_score(row: dict) -> float | None:
    """Synthesise a pre-assessment score from Schema A pipeline fields."""
    pre = _clean(row.get("Pre Assessment", "")).lower()
    if not pre:
        return None
    score = 2.0 if pre == "pass" else 1.0
    maturity = _clean(row.get("Maturity Level", "")).lower()
    score += _MATURITY_SCORE.get(maturity, 0.5)
    initial = (
        _clean(row.get("Complete Initial Assessment", ""))
        or _clean(row.get("Initial Assessment", ""))
    ).lower()
    score += _INITIAL_SCORE.get(initial, 0.0)
    return round(min(score, 5.0), 2)


UPSERT_HIGHLIGHT = """
INSERT INTO vendor_highlights
  (id, vendor_id, source_file, assessment_date, product_name,
   pre_assessment_score, pre_assessment_decision, maturity_level,
   initial_assessment, technical_assessment)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  assessment_date         = excluded.assessment_date,
  pre_assessment_score    = excluded.pre_assessment_score,
  pre_assessment_decision = excluded.pre_assessment_decision,
  maturity_level          = excluded.maturity_level,
  initial_assessment      = excluded.initial_assessment,
  technical_assessment    = excluded.technical_assessment
"""


def _is_schema_b(headers: list[str]) -> bool:
    return "overall rating" in {h.lower().strip() for h in headers}


def import_highlights() -> None:
    """Import per-row highlight records from all monthly CSVs."""
    init_db()
    conn = get_connection()

    # Build a quick lookup of vendor IDs that exist in the DB
    existing_ids = {
        r[0] for r in conn.execute("SELECT id FROM vendors").fetchall()
    }

    csv_files = sorted(DATA_DIR.glob("*.csv"))
    if not csv_files:
        print(f"No CSV files found in {DATA_DIR}")
        return

    total_inserted = 0
    total_skipped = 0

    for csv_path in csv_files:
        inserted, skipped = _import_one(conn, csv_path, existing_ids)
        total_inserted += inserted
        total_skipped += skipped

    conn.commit()
    row = conn.execute("SELECT COUNT(*) FROM vendor_highlights").fetchone()
    conn.close()

    print(f"\n{'='*60}")
    print(f"  Inserted : {total_inserted} highlight rows")
    print(f"  Skipped  : {total_skipped} rows (vendor not in DB)")
    print(f"  Total    : {row[0]} highlights in SQLite")
    print(f"{'='*60}")


def _import_one(
    conn,
    csv_path: Path,
    existing_ids: set[str],
) -> tuple[int, int]:
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            return 0, 0

        schema_b = _is_schema_b(reader.fieldnames)
        inserted = 0
        skipped = 0

        for idx, row in enumerate(reader):
            company = _clean(row.get("Company", ""))
            if not company:
                continue
            product = _clean(row.get("Technology_Product", ""))
            vendor_id = _make_vendor_id(company, product)

            if vendor_id not in existing_ids:
                skipped += 1
                continue

            highlight_id = _make_highlight_id(vendor_id, csv_path.name, idx)

            if schema_b:
                score_raw = _safe_float(row.get("Overall Rating"))
                decision = _clean(row.get("Vendor Status", ""))
                maturity = _clean(row.get("Maturity Level", ""))
                initial = _clean(row.get("Decision Band", ""))
                tech = ""
                date_val = _clean(row.get("Last Assessed", ""))
            else:
                score_raw = _derive_pre_score(row)
                decision = _clean(row.get("Pre Assessment", ""))
                maturity = _clean(row.get("Maturity Level", ""))
                initial = (
                    _clean(row.get("Complete Initial Assessment", ""))
                    or _clean(row.get("Initial Assessment", ""))
                )
                tech = _clean(row.get("Technical Assessment", ""))
                date_val = _clean(row.get("Date", "")).split(" ")[0]

            conn.execute(UPSERT_HIGHLIGHT, (
                highlight_id,
                vendor_id,
                csv_path.name,
                date_val,
                product,
                score_raw,
                decision,
                maturity,
                initial,
                tech,
            ))
            inserted += 1

    label = "B" if schema_b else "A"
    print(f"  {csv_path.name:<32} Schema {label}  {inserted:>4} inserted  {skipped:>4} skipped")
    return inserted, skipped


if __name__ == "__main__":
    import_highlights()
