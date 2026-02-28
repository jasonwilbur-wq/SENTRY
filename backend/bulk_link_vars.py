"""SENTRY — Phase 2A: Bulk VAR Linker.

Hardcodes all 23 unique VARs discovered via Microsoft Graph on 2026-02-24.
Fuzzy-matches each vendor slug to a company in the SENTRY vendors table,
then inserts/updates var_reports records.

Usage:
  cd backend
  .venv\\Scripts\\python.exe bulk_link_vars.py
  .venv\\Scripts\\python.exe bulk_link_vars.py --dry-run   # preview only
"""
import argparse
import hashlib
import re
from difflib import SequenceMatcher, get_close_matches

from database import get_connection, init_db

# ---------------------------------------------------------------------------
# All VARs discovered via Microsoft Graph on 2026-02-24
# ---------------------------------------------------------------------------
SP_BASE = "https://teams.wal-mart.com/sites/EmergingTechnologySecurity"
VAULT   = f"{SP_BASE}/Vault/Solution%20and%20Report%20Data/Reports/Vendor%20Assessment%20Reports"
OD_BASE = "https://my.wal-mart.com/personal/j0w16ja_homeoffice_wal-mart_com/Documents/Microsoft%20Teams%20Chat%20Files"

# ---------------------------------------------------------------------------
# Explicit vendor_id overrides  (slug -> exact DB vendor id)
# Use when fuzzy match resolves to the wrong company
# ---------------------------------------------------------------------------
EXPLICIT_OVERRIDES: dict[str, str] = {
    # luma-snapone -> Snap One (Luma)  id confirmed via direct SQL lookup
    "luma": "9f069856cee0",
}

# Slugs that are NOT in the vendor DB yet - we'll auto-insert stub records
# and then link the VAR. Fill in company_name / category per VAR knowledge.
STUB_VENDORS: dict[str, dict] = {
    "TroutSoftware": dict(
        company_name="Trout Software",
        category="Cloud Security",
        vendor_status="In Assessment",
        risk_level="Unknown",
    ),
    "OMNIQ": dict(
        company_name="OMNIQ Corp",
        category="Autonomous Systems: Robotics (AMR/Patrol)",
        vendor_status="In Assessment",
        risk_level="Unknown",
    ),
    "advancis": dict(
        company_name="Advancis Software (WinGuard AIM)",
        category="Video Management & Recording (VMS)",
        vendor_status="In Assessment",
        risk_level="Unknown",
    ),
    "PyramidNS": dict(
        company_name="Pyramid Network Services",
        category="Networking & Connectivity",
        vendor_status="In Assessment",
        risk_level="Unknown",
    ),
    "specter": dict(
        company_name="Specter Co",
        category="Aerial Systems: Drones/UAS/DFR",
        vendor_status="In Assessment",
        risk_level="Unknown",
    ),
    "surveil": dict(
        company_name="Surveil Group",
        category="Video Analytics & AI",
        vendor_status="In Assessment",
        risk_level="Unknown",
    ),
}

# Vendor slugs that are known bad fuzzy matches AND not in STUB_VENDORS
# (i.e. the company genuinely doesn't belong in our DB right now)
SKIP_SLUGS: set[str] = set()

VAR_CATALOG = [
    # ---- SharePoint canonical (EST Vault) --------------------------------
    dict(
        filename="WMT-SEC-VAR-20260219-InterfaceSystems-Detailed-v1.docx",
        sp_url=f"{VAULT}/2026/202602/WMT-SEC-VAR-20260219-InterfaceSystems-Detailed-v1.docx",
        report_date="2026-02-19", report_type="Detailed",
        vendor_slug="InterfaceSystems",
    ),
    dict(
        filename="WMT-SEC-VAR-20260210-ProdataKey-Detailed-v1.docx",
        sp_url=f"{VAULT}/2026/202602/WMT-SEC-VAR-20260210-ProdataKey-Detailed-v1%20(1).docx",
        report_date="2026-02-10", report_type="Detailed",
        vendor_slug="ProdataKey",
    ),
    dict(
        filename="WMT-SEC-VAR-20260130-Exiger-Detailed-v1.docx",
        sp_url=f"{VAULT}/2026/202602/WMT-SEC-VAR-20260130-Exiger-Detailed-v1.docx",
        report_date="2026-01-30", report_type="Detailed",
        vendor_slug="Exiger",
    ),
    dict(
        filename="WMT-SEC-VAR-20260205-TroutSoftware-Detailed-v1.docx",
        sp_url=f"{VAULT}/2026/202602/WMT-SEC-VAR-20260205-TroutSoftware-Detailed-v1.docx",
        report_date="2026-02-05", report_type="Detailed",
        vendor_slug="TroutSoftware",
    ),
    dict(
        filename="WMT-SEC-VAR-20260208-Cyera-Detailed-v1.docx",
        sp_url=f"{VAULT}/2026/202602/WMT-SEC-VAR-20260208-Cyera-Detailed-v1.docx",
        report_date="2026-02-08", report_type="Detailed",
        vendor_slug="Cyera",
    ),
    dict(
        filename="WMT-SEC-VAR-20260218-OMNIQ-Detailed-v1.docx",
        sp_url=f"{VAULT}/2026/202602/WMT-SEC-VAR-20260218-OMNIQ-Detailed-v1.docx",
        report_date="2026-02-18", report_type="Detailed",
        vendor_slug="OMNIQ",
    ),
    dict(
        filename="WMT-SEC-VAR-20260105-Wegmans-FR-ALPR-Detailed-v1.docx",
        sp_url=f"{VAULT}/2026/202601/WMT-SEC-VAR-20260105-Wegmans-FR-ALPR-Detailed-v1.docx",
        report_date="2026-01-05", report_type="Detailed",
        vendor_slug="Wegmans",
    ),
    dict(
        filename="WMT-SEC-VAR-20251201-authid-Detailed-v1.docx",
        sp_url=f"{VAULT}/2025/December%202025/WMT-SEC-VAR-20251201-authid-Detailed-v1%20(1).docx",
        report_date="2025-12-01", report_type="Detailed",
        vendor_slug="authid",
    ),
    dict(
        filename="WMT-SEC-VAR-20251221-gatewise-detailed-v1.docx",
        sp_url=f"{VAULT}/2025/December%202025/WMT-SEC-VAR-20251221-gatewise-detailed-v1%20(1).docx",
        report_date="2025-12-21", report_type="Detailed",
        vendor_slug="gatewise",
    ),
    dict(
        filename="WMT-SEC-VAR-20251219-SiteOwl-Detailed-v1.docx",
        sp_url=f"{VAULT}/2025/December%202025/WMT-SEC-VAR-20251219-SiteOwl-Detailed-v1.docx",
        report_date="2025-12-19", report_type="Detailed",
        vendor_slug="SiteOwl",
    ),
    dict(
        filename="WMT-SEC-VAR-20251223-gambit-cyber-Detailed-v1.docx",
        sp_url=f"{VAULT}/2025/December%202025/WMT-SEC-VAR-20251223-gambit-cyber-Detailed-v1%20(1).docx",
        report_date="2025-12-23", report_type="Detailed",
        vendor_slug="gambit",
    ),
    dict(
        filename="WMT-SEC-VAR-20260114-Mantacus-Detailed-v1.docx",
        sp_url=f"{SP_BASE}/Vault/Projects/Mantacus/WMT-SEC-VAR-20260114-Mantacus-Detailed-v1.docx",
        report_date="2026-01-14", report_type="Detailed",
        vendor_slug="Mantacus",
    ),
    dict(
        filename="WMT-SEC-VAR-20251120-surveil-v1.docx",
        sp_url=f"{VAULT}/2025/November%202025/WMT-SEC-VAR-20251120-surveil-v1%20(1).docx",
        report_date="2025-11-20", report_type="Detailed",
        vendor_slug="surveil",
    ),
    dict(
        filename="WMT-SEC-VAR-20251118-monogoto-v1.docx",
        sp_url=f"{VAULT}/2025/November%202025/WMT-SEC-VAR-20251118-monogoto-v1%20(1).docx",
        report_date="2025-11-18", report_type="Detailed",
        vendor_slug="monogoto",
    ),
    dict(
        filename="WMT-SEC-VAR-20251119-Suprema-BioStarX-v1.docx",
        sp_url=f"{VAULT}/2025/November%202025/WMT-SEC-VAR-20251119-Suprema-BioStarX-v1%20(1).docx",
        report_date="2025-11-19", report_type="Detailed",
        vendor_slug="Suprema",
    ),
    # ---- OneDrive / Teams Chat Files (working copies) -------------------
    dict(
        filename="WMT-SEC-VAR-20260218-advancis-winguard-aim-Detailed-v1.docx",
        sp_url=f"{OD_BASE}/WMT-SEC-VAR-20260218-advancis-winguard-aim-Detailed-v1.docx",
        report_date="2026-02-18", report_type="Detailed",
        vendor_slug="advancis",
    ),
    dict(
        filename="WMT-SEC-VAR-20260210-PyramidNS-Detailed-v1.docx",
        sp_url=f"{OD_BASE}/WMT-SEC-VAR-20260210-PyramidNS-Detailed-v1.docx",
        report_date="2026-02-10", report_type="Detailed",
        vendor_slug="PyramidNS",
    ),
    dict(
        filename="WMT-SEC-VAR-20260202-AsylonDroneDog-Detailed-v1.docx",
        sp_url=f"{OD_BASE}/WMT-SEC-VAR-20260202-AsylonDroneDog-Detailed-v1.docx",
        report_date="2026-02-02", report_type="Detailed",
        vendor_slug="Asylon",
    ),
    dict(
        filename="WMT-SEC-VAR-20260119-luma-snapone-Detailed-v1.docx",
        sp_url=f"{OD_BASE}/WMT-SEC-VAR-20260119-luma-snapone-Detailed-v1.docx",
        report_date="2026-01-19", report_type="Detailed",
        vendor_slug="luma",
    ),
    dict(
        filename="WMT-SEC-VAR-20260115-Percipientai-Detailed-v1.docx",
        sp_url=f"{OD_BASE}/WMT-SEC-VAR-20260115-Percipientai-Detailed-v1.docx",
        report_date="2026-01-15", report_type="Detailed",
        vendor_slug="Percipient",
    ),
    dict(
        filename="WMT-SEC-VAR-20260113-shooterdetectionsystems-Detailed-v1.docx",
        sp_url=f"{OD_BASE}/WMT-SEC-VAR-20260113-shooterdetectionsystems-Detailed-v1.docx",
        report_date="2026-01-13", report_type="Detailed",
        vendor_slug="Shooter Detection",
    ),
    dict(
        filename="WMT-SEC-VAR-20260106-specter-co-Detailed-v1.docx",
        sp_url=f"{OD_BASE}/WMT-SEC-VAR-20260106-specter-co-Detailed-v1.docx",
        report_date="2026-01-06", report_type="Detailed",
        vendor_slug="specter",
    ),
    dict(
        filename="WMT-SEC-VAR-20251120-march-networks-v1.docx",
        sp_url=f"{OD_BASE}/WMT-SEC-VAR-20251120-march-networks-v1%20(2).docx",
        report_date="2025-11-20", report_type="Detailed",
        vendor_slug="March Networks",
    ),
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_var_id(vendor_id: str, filename: str) -> str:
    slug = f"{vendor_id}::{filename}".lower()
    return hashlib.sha256(slug.encode()).hexdigest()[:16]


def _slug_to_terms(slug: str) -> list[str]:
    """Split a CamelCase/hyphenated slug into searchable terms."""
    # Split on hyphen, underscore, capital letters
    parts = re.sub(r'([A-Z])', r' \1', slug).replace('-', ' ').replace('_', ' ').split()
    terms = [p.lower().strip() for p in parts if len(p) > 2]
    return terms


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _find_best_vendor(
    conn,
    slug: str,
    all_vendors: list[dict],
    threshold: float = 0.45,
) -> dict | None:
    """Find the best-matching vendor for a slug. Returns None if no confident match."""
    slug_lower = slug.lower().replace('-', ' ').replace('_', ' ')
    terms = _slug_to_terms(slug)

    best_vendor = None
    best_score  = 0.0

    for v in all_vendors:
        name_lower = v["company_name"].lower()

        # Direct similarity
        sim = _similarity(slug_lower, name_lower)

        # Boost: all slug terms present in company name
        all_terms_match = terms and all(
            any(t in word for word in name_lower.split()) for t in terms
        )
        if all_terms_match:
            sim = max(sim, 0.80)

        # Boost: any single meaningful term is a substring
        for t in terms:
            if len(t) >= 4 and t in name_lower:
                sim = max(sim, 0.70)

        if sim > best_score:
            best_score  = sim
            best_vendor = v

    if best_score >= threshold:
        return {**best_vendor, "_score": best_score}
    return None


UPSERT_VAR_SQL = """
INSERT INTO var_reports (
    id, vendor_id, filename, sharepoint_url, report_date,
    report_version, report_type, match_method
) VALUES (?, ?, ?, ?, ?, 'v1', ?, ?)
ON CONFLICT(id) DO UPDATE SET
    sharepoint_url = excluded.sharepoint_url,
    report_date    = excluded.report_date,
    report_type    = excluded.report_type,
    match_method   = excluded.match_method
"""

STUB_UPSERT_SQL = """
INSERT OR IGNORE INTO vendors (
    id, company_name, category, vendor_status, risk_level,
    overall_rating, last_assessed
) VALUES (?, ?, ?, ?, ?, 2.0, date('now'))
"""


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def _get_or_create_stub(
    conn, slug: str, all_vendors: list[dict], dry_run: bool
) -> tuple[str | None, str]:
    """Insert a stub vendor for a missing slug. Returns (vendor_id, company_name)."""
    stub_info = STUB_VENDORS.get(slug)
    if not stub_info:
        return None, ""
    vendor_id = hashlib.sha256(
        stub_info["company_name"].lower().encode()
    ).hexdigest()[:12]
    print(f"    ↳ stub vendor: {stub_info['company_name']} ({vendor_id})")
    if not dry_run:
        conn.execute(STUB_UPSERT_SQL, (
            vendor_id,
            stub_info["company_name"],
            stub_info["category"],
            stub_info["vendor_status"],
            stub_info["risk_level"],
        ))
    # Add to in-memory list so later searches can see it
    all_vendors.append({"id": vendor_id, "company_name": stub_info["company_name"], "category": ""})
    return vendor_id, stub_info["company_name"]


def run(dry_run: bool = False) -> None:
    init_db()
    conn = get_connection()

    all_vendors = [
        dict(r) for r in conn.execute(
            "SELECT id, company_name, category FROM vendors ORDER BY company_name"
        ).fetchall()
    ]

    print(f"\nSENTRY Phase 2A — Bulk VAR Linker {'(DRY RUN)' if dry_run else ''}")
    print(f"VARs to process : {len(VAR_CATALOG)}")
    print(f"Vendors in DB   : {len(all_vendors)}")
    print("=" * 72)

    linked: list[tuple] = []
    stubbed: list[dict] = []
    unmatched: list[dict] = []

    for var in VAR_CATALOG:
        slug = var["vendor_slug"]

        if slug.lower() in SKIP_SLUGS:
            print(f"  ■ SKIPPED    ← {slug}")
            continue

        vendor_id: str | None = None
        company_name = ""
        method = "bulk-auto"

        # 1. Explicit override (highest priority)
        for key, vid in EXPLICIT_OVERRIDES.items():
            if key.lower() in slug.lower():
                vendor_id    = vid
                method       = "explicit-override"
                row = conn.execute(
                    "SELECT company_name FROM vendors WHERE id=?", (vid,)
                ).fetchone()
                company_name = row[0] if row else slug
                break

        # 2. Fuzzy match — SKIP if slug is in STUB_VENDORS (stub takes priority)
        if not vendor_id and slug not in STUB_VENDORS:
            vendor = _find_best_vendor(conn, slug, all_vendors, threshold=0.75)
            if vendor:
                vendor_id    = vendor["id"]
                company_name = vendor["company_name"]
                method       = f"fuzzy-{vendor['_score']:.2f}"

        # 3. Stub insert for known-missing vendors
        if not vendor_id:
            vendor_id, company_name = _get_or_create_stub(
                conn, slug, all_vendors, dry_run
            )
            if vendor_id:
                method = "stub-created"
                stubbed.append(var)

        if vendor_id:
            var_id = _make_var_id(vendor_id, var["filename"])
            print(f"  ✔ {company_name:<44} ({method})")
            linked.append((var, vendor_id))

            if not dry_run:
                conn.execute(UPSERT_VAR_SQL, (
                    var_id, vendor_id,
                    var["filename"], var["sp_url"],
                    var["report_date"], var["report_type"],
                    method,
                ))
        else:
            print(f"  ✗ UNMATCHED  ← slug: {slug!r}")
            unmatched.append(var)

    if not dry_run:
        conn.commit()
    conn.close()

    print("=" * 72)
    print(f"\n  Linked    : {len(linked)} total ({len(stubbed)} via new vendor stubs)")
    print(f"  Unmatched : {len(unmatched)}")
    if unmatched:
        print("\n  Unmatched slugs (run link_var.py manually):")
        for v in unmatched:
            print(f"    - {v['vendor_slug']} ({v['filename']})")
    if dry_run:
        print("\n  Dry run only — re-run without --dry-run to commit.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="SENTRY Phase 2A Bulk VAR Linker")
    ap.add_argument("--dry-run", action="store_true", help="Preview only, no DB writes")
    args = ap.parse_args()
    run(dry_run=args.dry_run)
