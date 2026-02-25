"""Bulk-link all SharePoint VAR files to vendors in the SENTRY database.

Strategy
--------
1. Load catalog from build_var_catalog.py (generates it first if needed).
2. Fuzzy-match each VAR slug against vendor names in vendors.db.
3. Deduplicate: same (vendor_id + normalized slug) → keep most-recent date.
4. INSERT OR IGNORE into var_reports (skips already-linked records).
5. Print a full summary report.

Usage
-----
    cd backend
    python data/bulk_link_vars.py
    python data/bulk_link_vars.py --dry-run   # preview only, no writes
    python data/bulk_link_vars.py --min-score 70  # default: 65
"""
from __future__ import annotations

import argparse
import re
import sqlite3
import subprocess
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT      = Path(__file__).parent.parent          # backend/
DB_PATH   = ROOT / "data" / "sentry.db"
CATALOG_SCRIPT = Path(__file__).parent / "build_var_catalog.py"

# ---------------------------------------------------------------------------
# Optional fuzzy-matching: try rapidfuzz, fall back to difflib
# ---------------------------------------------------------------------------
try:
    from rapidfuzz import fuzz as _fuzz
    def token_sort_ratio(a: str, b: str) -> float:
        return _fuzz.token_sort_ratio(a, b)
except ImportError:
    from difflib import SequenceMatcher
    def token_sort_ratio(a: str, b: str) -> float:          # type: ignore[misc]
        a_s = " ".join(sorted(a.lower().split()))
        b_s = " ".join(sorted(b.lower().split()))
        return SequenceMatcher(None, a_s, b_s).ratio() * 100


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
NORM_RE = re.compile(r"[^a-z0-9 ]")

def _normalise(s: str) -> str:
    """Lowercase, strip hyphens/underscores, collapse spaces."""
    return NORM_RE.sub(" ", s.lower()).split()

def _slug_to_search(slug: str) -> str:
    """Convert a filename slug to a human-readable search string."""
    # Replace hyphens and underscores with spaces, strip common suffix words
    s = slug.replace("-", " ").replace("_", " ")
    # Remove trailing product qualifiers that aren't company names
    for noise in [
        "detailed", "exec", "brief", "v1", "v2", "v3",
        "ai", "security", "platform", "solutions", "technologies",
        "systems", "networks", "software",
    ]:
        # only strip from END, not middle (to preserve e.g. "Deep Instinct")
        parts = s.strip().split()
        while parts and parts[-1].lower() == noise:
            parts.pop()
        s = " ".join(parts)
    return s.strip()


def _best_match(
    slug: str,
    vendors: list[tuple[str, str, str]],  # (id, name, vendor_name)
    min_score: float,
) -> tuple[str, str, float] | None:
    """Return (vendor_id, vendor_name, score) or None."""
    search = _slug_to_search(slug)
    best_score = 0.0
    best_vendor: tuple[str, str, float] | None = None

    for vid, name, display_name in vendors:
        score = max(
            token_sort_ratio(search, name),
            token_sort_ratio(search, display_name) if display_name else 0,
        )
        if score > best_score:
            best_score = score
            best_vendor = (vid, name, score)

    if best_vendor and best_score >= min_score:
        return best_vendor
    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description="Bulk-link VARs to vendors")
    parser.add_argument("--dry-run",  action="store_true", help="Preview only")
    parser.add_argument("--min-score", type=float, default=65,
                        help="Minimum fuzzy match score (0-100, default 65)")
    args = parser.parse_args()

    # ------------------------------------------------------------------
    # 1. Build / load the catalog
    # ------------------------------------------------------------------
    print("[1/4] Building VAR catalog...")
    # run build_var_catalog.py to produce var_catalog_full.json
    subprocess.run(
        [sys.executable, str(CATALOG_SCRIPT)], check=True,
        cwd=str(CATALOG_SCRIPT.parent)
    )
    import json
    catalog_path = CATALOG_SCRIPT.parent / "var_catalog_full.json"
    catalog: list[dict] = json.loads(catalog_path.read_text(encoding="utf-8"))
    print(f"    Catalog size: {len(catalog)} unique VAR slugs")

    # ------------------------------------------------------------------
    # 2. Load vendors from DB
    # ------------------------------------------------------------------
    print("[2/4] Loading vendors from database...")
    if not DB_PATH.exists():
        print(f"ERROR: DB not found at {DB_PATH}")
        sys.exit(1)

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    vendors_raw = cur.execute(
        "SELECT id, company_name, technology_product FROM vendors"
    ).fetchall()
    # Normalise names for matching: (id, company_name_lower, tech_product_lower)
    vendors: list[tuple[str, str, str]] = [
        (row[0], (row[1] or "").lower(), (row[2] or "").lower())
        for row in vendors_raw
    ]
    print(f"    {len(vendors)} vendors loaded")

    # Already-linked filenames (to skip duplicates)
    existing_slugs: set[str] = set()
    for (fn,) in cur.execute(
        "SELECT filename FROM var_reports WHERE filename IS NOT NULL"
    ).fetchall():
        existing_slugs.add(fn.lower().replace(" ", "").replace("-", ""))

    print(f"    {len(existing_slugs)} existing var_report slugs (will skip duplicates)")

    # ------------------------------------------------------------------
    # 3. Match each catalog entry to a vendor
    # ------------------------------------------------------------------
    print(f"[3/4] Fuzzy-matching {len(catalog)} slugs (min_score={args.min_score})...")

    matched:   list[dict] = []
    unmatched: list[dict] = []
    skipped:   int = 0

    for entry in catalog:
        slug = entry["slug"]
        # Check both slug key AND filename key
        filename_key = entry["filename"].lower().replace("-", "").replace("_", "").replace(" ", "")
        slug_key = slug.lower().replace("-", "").replace("_", "")

        if filename_key in existing_slugs or slug_key in existing_slugs:
            skipped += 1
            continue

        result = _best_match(slug, vendors, args.min_score)
        if result:
            vid, vname, score = result
            matched.append({
                **entry,
                "vendor_id":   vid,
                "vendor_name": vname,
                "score":       round(score, 1),
            })
        else:
            unmatched.append(entry)

    print(f"    Matched:   {len(matched)}")
    print(f"    Unmatched: {len(unmatched)}")
    print(f"    Skipped:   {skipped} (already in DB)")

    # ------------------------------------------------------------------
    # 4. Insert
    # ------------------------------------------------------------------
    if args.dry_run:
        print("\n[DRY RUN] Matched entries (top 40):")
        for e in matched[:40]:
            print(f"  [{e['score']:5.1f}] {e['slug'][:45]:<45} → {e['vendor_name'][:35]}")
        if unmatched:
            print(f"\n  Unmatched slugs ({len(unmatched)}):")
            for e in unmatched[:30]:
                print(f"    - {e['slug']}")
        return

    print("[4/4] Inserting into var_reports...")
    import uuid
    inserted = 0
    for e in matched:
        try:
            cur.execute(
                """
                INSERT OR IGNORE INTO var_reports
                  (id, vendor_id, filename, report_date,
                   sharepoint_url, report_type, match_method)
                VALUES (?, ?, ?, ?, ?, 'Detailed', 'auto-fuzzy')
                """,
                (
                    str(uuid.uuid4()),
                    e["vendor_id"],
                    e["filename"],
                    e["report_date"],
                    e["sharepoint_url"],
                ),
            )
            if cur.rowcount:
                inserted += 1
        except sqlite3.Error as exc:
            print(f"  WARN: {exc} for {e['slug']}")

    con.commit()
    con.close()

    print(f"\n✅ Done! Inserted {inserted} new var_report rows.")
    if unmatched:
        print(f"⚠️  {len(unmatched)} slugs had no vendor match (min_score={args.min_score}):")
        for e in unmatched[:30]:
            print(f"   - {e['slug']}")
        if len(unmatched) > 30:
            print(f"   ... and {len(unmatched)-30} more")


if __name__ == "__main__":
    main()
