"""Sync SENTRY vendor directory with canonical Vendor Assessments library.

Source of truth:
  <SENTRY_VENDOR_ASSESSMENTS_ROOT>/00_System/vendor_assessment_vendor_profiles.csv

Behavior:
  - Finds vendor rows in backend/data/sentry.db whose normalized company name
    is NOT present in the canonical profile CSV.
  - Optionally deletes those vendors and related VAR/highlight records.

Usage:
  python sync_vendor_directory.py                # dry-run
  python sync_vendor_directory.py --apply        # execute deletions
  python sync_vendor_directory.py --apply --no-backup
"""

from __future__ import annotations

import argparse
import csv
import re
import shutil
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


DEFAULT_ROOT = Path(
    r"C:\Users\j0w16ja\OneDrive - Walmart Inc\Desktop\SENTRY\Vendor Assessments"
)
DB_PATH = Path(__file__).parent / "data" / "sentry.db"


@dataclass(frozen=True)
class VendorRow:
    vendor_id: str
    company_name: str


def normalize_vendor_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())


def load_canonical_keys(root: Path) -> set[str]:
    profile_csv = root / "00_System" / "vendor_assessment_vendor_profiles.csv"
    if not profile_csv.exists():
        raise FileNotFoundError(f"Canonical profile CSV not found: {profile_csv}")

    keys: set[str] = set()
    with profile_csv.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            key = str(row.get("vendor_normalized_key") or "").strip().lower()
            if key:
                keys.add(key)
    return keys


def fetch_vendors(conn: sqlite3.Connection) -> list[VendorRow]:
    rows = conn.execute("SELECT id, company_name FROM vendors ORDER BY company_name").fetchall()
    return [VendorRow(vendor_id=str(r[0]), company_name=str(r[1] or "")) for r in rows]


def find_noncanonical_vendors(vendors: list[VendorRow], canonical_keys: set[str]) -> list[VendorRow]:
    if not canonical_keys:
        return []
    return [v for v in vendors if normalize_vendor_key(v.company_name) not in canonical_keys]


def backup_db(db_path: Path) -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.with_suffix(f".backup_vendor_sync_{stamp}.db")
    shutil.copy2(db_path, backup_path)
    return backup_path


def chunked(items: list[str], size: int = 500) -> list[list[str]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def delete_vendors(conn: sqlite3.Connection, vendor_ids: list[str]) -> tuple[int, int, int]:
    if not vendor_ids:
        return 0, 0, 0

    deleted_var = 0
    deleted_highlights = 0
    deleted_vendors = 0

    for group in chunked(vendor_ids, 500):
        placeholders = ",".join(["?"] * len(group))

        deleted_var += conn.execute(
            f"DELETE FROM var_reports WHERE vendor_id IN ({placeholders})",
            group,
        ).rowcount

        deleted_highlights += conn.execute(
            f"DELETE FROM vendor_highlights WHERE vendor_id IN ({placeholders})",
            group,
        ).rowcount

        deleted_vendors += conn.execute(
            f"DELETE FROM vendors WHERE id IN ({placeholders})",
            group,
        ).rowcount

    return deleted_vendors, deleted_var, deleted_highlights


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync SENTRY vendor directory with canonical assessment library")
    parser.add_argument(
        "--root",
        type=Path,
        default=DEFAULT_ROOT,
        help="Vendor Assessments root folder",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply deletions (default is dry-run)",
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Skip DB backup before apply",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    canonical_keys = load_canonical_keys(args.root)
    with sqlite3.connect(DB_PATH) as conn:
        vendors = fetch_vendors(conn)
        to_remove = find_noncanonical_vendors(vendors, canonical_keys)

        print("=== SENTRY Vendor Directory Sync ===")
        print(f"DB vendors total            : {len(vendors):,}")
        print(f"Canonical vendor keys       : {len(canonical_keys):,}")
        print(f"Vendors not in canonical set: {len(to_remove):,}")

        if to_remove:
            print("\nSample removals:")
            for row in to_remove[:30]:
                print(f"  - {row.company_name} ({row.vendor_id})")

        if not args.apply:
            print("\nDry-run only. Re-run with --apply to execute deletions.")
            return

        if not args.no_backup:
            backup_path = backup_db(DB_PATH)
            print(f"\nBackup created: {backup_path}")

        vendor_ids = [v.vendor_id for v in to_remove]
        deleted_vendors, deleted_var, deleted_highlights = delete_vendors(conn, vendor_ids)
        conn.commit()

        print("\nDeletion complete:")
        print(f"  Vendors deleted      : {deleted_vendors:,}")
        print(f"  VAR reports deleted  : {deleted_var:,}")
        print(f"  Highlights deleted   : {deleted_highlights:,}")


if __name__ == "__main__":
    main()
