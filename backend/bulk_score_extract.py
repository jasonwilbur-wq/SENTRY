"""Bulk VAR score extraction pipeline — Phase 2 deliverable.

Downloads each linked VAR DOCX from SharePoint, extracts dimension scores
using var_score_extractor, and writes them back to the var_reports table.

Usage:
    python bulk_score_extract.py [--dry-run]
"""
from __future__ import annotations

import json
import sys
import tempfile
import time
from pathlib import Path

import requests

from database import get_connection
from var_score_extractor import extract_scores

URLs_FILE = Path(__file__).parent / "data" / "var_download_urls.json"
SAMPLE_DOCX = Path(__file__).parent / "data" / "sample_var.docx"  # Asylon pre-downloaded

# Dimension columns we want to write
DIM_COLS = [
    "compliance_score", "risk_score", "maturity_score",
    "integration_score", "roi_score", "viability_score",
    "differentiation_score", "cloud_dep_score",
]


def _download_docx(url: str, dest: Path) -> bool:
    """Download a file from a pre-authenticated URL. Returns True on success."""
    try:
        r = requests.get(url, timeout=30, stream=True)
        r.raise_for_status()
        dest.write_bytes(r.content)
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"    ❌ Download failed: {exc}")
        return False


def _update_db(var_id: str, scores: dict, conn) -> None:
    """Write extracted scores to var_reports row."""
    set_clauses = []
    values = []

    # Overall score + band
    if "overall_score" in scores:
        set_clauses.append("overall_score = ?")
        values.append(scores["overall_score"])
    if "decision_band" in scores:
        set_clauses.append("decision_band = ?")
        values.append(scores["decision_band"])

    # Dimension scores
    for col in DIM_COLS:
        if col in scores:
            set_clauses.append(f"{col} = ?")
            values.append(scores[col])

    if not set_clauses:
        print("    ⚠ No scores to write.")
        return

    values.append(var_id)
    conn.execute(
        f"UPDATE var_reports SET {', '.join(set_clauses)} WHERE id = ?",
        values,
    )
    conn.commit()


def _also_update_vendor_rating(vendor_id: str, overall_score: float, conn) -> None:
    """If vendor has no overall_rating yet, backfill from the VAR score."""
    row = conn.execute(
        "SELECT overall_rating FROM vendors WHERE id = ?", (vendor_id,)
    ).fetchone()
    if row and (row["overall_rating"] is None or row["overall_rating"] == 0.0):
        conn.execute(
            "UPDATE vendors SET overall_rating = ? WHERE id = ?",
            (overall_score, vendor_id),
        )
        conn.commit()


def run(dry_run: bool = False) -> None:
    """Main pipeline."""
    url_map: dict[str, str] = {
        entry["filename"]: entry["download_url"]
        for entry in json.loads(URLs_FILE.read_text(encoding="utf-8"))
    }

    conn = get_connection()
    var_rows = [
        dict(r)
        for r in conn.execute(
            "SELECT id, vendor_id, filename FROM var_reports ORDER BY report_date DESC"
        ).fetchall()
    ]

    print(f"\n🐶 SENTRY Phase 2 — Bulk VAR Score Extraction")
    print(f"   Processing {len(var_rows)} linked VARs")
    print(f"   Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print("-" * 60)

    results = {"ok": 0, "no_scores": 0, "download_fail": 0, "skipped": 0}

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)

        for row in var_rows:
            fname = row["filename"]
            var_id = row["id"]
            vendor_id = row["vendor_id"]

            print(f"\n📄 {fname}")

            # Special case: Asylon is pre-downloaded
            if "AsylonDroneDog" in fname and SAMPLE_DOCX.exists():
                docx_path = SAMPLE_DOCX
                print("    → Using pre-downloaded sample_var.docx")
            elif fname in url_map and url_map[fname] not in ("ALREADY_DOWNLOADED", ""):
                docx_path = tmp / fname
                print(f"    ↓ Downloading ({url_map[fname][:60]}...)")
                if not _download_docx(url_map[fname], docx_path):
                    results["download_fail"] += 1
                    continue
                time.sleep(0.3)  # be polite to SharePoint
            elif "AsylonDroneDog" in fname:
                print("    ⚠ No download URL — skipping")
                results["skipped"] += 1
                continue
            else:
                print(f"    ⚠ No download URL for {fname} — skipping")
                results["skipped"] += 1
                continue

            # Extract scores
            scores = extract_scores(docx_path)

            if "_error" in scores:
                print(f"    ❌ Parse error: {scores['_error']}")
                results["no_scores"] += 1
                continue

            if "overall_score" not in scores:
                print("    ⚠ No scores found in document")
                results["no_scores"] += 1
                continue

            print(
                f"    ✓ Score: {scores['overall_score']:.2f} "
                f"— {scores.get('decision_band', '?')} "
                f"| C:{scores.get('compliance_score','?')} "
                f"R:{scores.get('risk_score','?')} "
                f"M:{scores.get('maturity_score','?')}"
            )

            if not dry_run:
                _update_db(var_id, scores, conn)
                if "overall_score" in scores:
                    _also_update_vendor_rating(vendor_id, scores["overall_score"], conn)

            results["ok"] += 1

    conn.close()

    print("\n" + "=" * 60)
    print("📊 Results:")
    print(f"   ✅ Scores extracted: {results['ok']}")
    print(f"   ⚠  No scores found:  {results['no_scores']}")
    print(f"   ❌ Download failed:  {results['download_fail']}")
    print(f"   ⏩ Skipped:          {results['skipped']}")
    if dry_run:
        print("\n   (DRY RUN — no DB changes made)")
    else:
        print("\n   ✅ Database updated!")


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    run(dry_run=dry)
