"""Apply the SENTRY vendor report archive manifest.

Default mode is dry-run. Use --apply only after spot-checking
00_System/sentry_vendor_report_archive_manifest.csv.
"""
from __future__ import annotations

import argparse
import csv
import shutil
from pathlib import Path

from path_config import VENDOR_REPORT_ARCHIVE_MANIFEST_CSV, VENDOR_REPORTS_ROOT


def unique_destination(path: Path) -> Path:
    if not path.exists():
        return path
    stem = path.stem
    suffix = path.suffix
    parent = path.parent
    counter = 2
    while True:
        candidate = parent / f"{stem}__{counter}{suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Archive superseded SENTRY vendor reports from manifest")
    parser.add_argument("--apply", action="store_true", help="Move files. Default is dry-run only.")
    parser.add_argument("--limit", type=int, default=0, help="Optional max rows to process for staged rollouts.")
    parser.add_argument("--manifest", type=Path, default=VENDOR_REPORT_ARCHIVE_MANIFEST_CSV)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.manifest.exists():
        raise FileNotFoundError(f"Archive manifest not found: {args.manifest}")

    processed = 0
    moved = 0
    missing = 0
    with args.manifest.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            if args.limit and processed >= args.limit:
                break
            processed += 1
            source_rel = Path(str(row.get("source_relative_path") or ""))
            dest_rel = Path(str(row.get("destination_relative_path") or ""))
            if not source_rel or not dest_rel:
                continue
            source = VENDOR_REPORTS_ROOT / source_rel
            destination = unique_destination(VENDOR_REPORTS_ROOT / dest_rel)
            if not source.exists():
                missing += 1
                print(f"MISSING: {source_rel}")
                continue
            if args.apply:
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(source), str(destination))
                moved += 1
                print(f"MOVED: {source_rel} -> {destination.relative_to(VENDOR_REPORTS_ROOT)}")
            else:
                print(f"DRY-RUN: {source_rel} -> {dest_rel}")

    print("\nArchive manifest summary")
    print(f"  Rows processed : {processed}")
    print(f"  Files moved    : {moved}")
    print(f"  Missing files  : {missing}")
    if not args.apply:
        print("  Mode           : dry-run; re-run with --apply to move files")


if __name__ == "__main__":
    main()
