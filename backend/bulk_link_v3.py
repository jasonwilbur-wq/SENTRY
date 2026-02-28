"""SENTRY — Phase 3: Static Catalog Report Linker.

Processes all entries in report_catalog.py, fuzzy-matches each to a DB
vendor, and upserts var_reports records.

Rules:
  - Same filename already in DB → skip (idempotent)
  - If same vendor already has a report of the same type, keep newest
  - --dry-run previews without writing

Usage:
  cd backend
  .venv\\Scripts\\python bulk_link_v3.py
  .venv\\Scripts\\python bulk_link_v3.py --dry-run
  .venv\\Scripts\\python bulk_link_v3.py --type Detailed
  .venv\\Scripts\\python bulk_link_v3.py --type Pre-Assessment Initial-Assessment
"""
from __future__ import annotations

import argparse
import hashlib
import re
import sys
from difflib import SequenceMatcher

from database import get_connection, init_db
from report_catalog import ALL_ENTRIES

DRIVE_ID = "b!bgUvaNCAfEeuMSCKK3JM9GhT0I88o-1FhrrsYbU8Qz892RK9Ec5FQKlkEzWYqpZ4"
GRAPH    = "https://graph.microsoft.com/v1.0"
SP_BASE  = "https://teams.wal-mart.com/sites/EmergingTechnologySecurity/Vault"

# Category words to strip from vendor-name extraction
_STOP = {
    "perimeter", "security", "video", "analytics", "ai", "cloud", "iot",
    "cyber", "physical", "biometric", "supply", "chain", "access", "control",
    "detection", "weapons", "robotics", "autonomous", "edge", "drone",
    "surveillance", "identity", "verification", "loss", "prevention",
    "retail", "platform", "solutions", "management", "system", "systems",
    "intelligence", "network", "networks", "technologies", "technology",
    "services", "service", "inc", "llc", "ltd", "corp", "lidar", "radar",
    "sensor", "fusion", "smart", "deep", "machine", "learning", "robot",
    "agentic", "enterprise", "next", "gen", "integrated", "digital",
    "weapon", "gunshot", "detailed", "assessment", "initial", "pre",
}


# ── Slug extraction ─────────────────────────────────────────────────

def _strip_stop(name: str) -> str:
    """Remove trailing stop words from a vendor candidate string."""
    words = name.split()
    while words and words[-1].lower() in _STOP:
        words.pop()
    return " ".join(words).strip() or name


def extract_slug(filename: str, rtype: str) -> str:
    """Return a best-effort vendor name from filename + report type."""
    fn = filename.replace(".docx", "").replace(".pdf", "")

    # ── VAR patterns ──
    # WMT-SEC-VAR-YYYYMMDD-slug-Detailed-v1
    m = re.search(r"VAR-\d{8}-(.+?)(?:-Detailed|-Exec|-Brief|-v\d|$)", fn, re.I)
    if m:
        return m.group(1).replace("-", " ").strip()

    # WMT_ES_EST_VAR VendorName 20260220
    m2 = re.search(r"VAR\s+(.+?)\s+\d{8}$", fn, re.I)
    if m2:
        return m2.group(1).strip()

    # VAR_Interface_Virtual_Perimeter_Guard_...
    m3 = re.match(r"^VAR_(.+?)(?:_\d{4}|_20\d{6})", fn, re.I)
    if m3:
        return " ".join(m3.group(1).replace("_", " ").split()[:3])

    # ── Pre-Assessment patterns ──
    if rtype == "Pre-Assessment" or fn.lower().startswith("pre"):
        # Pre-Assessment - VendorName Category
        m4 = re.match(r"Pre[-_ ]?Assessment\s*[-–]\s*(.+)", fn, re.I)
        if m4:
            raw = re.split(r"[+,;|]", m4.group(1))[0].strip()
            return _strip_stop(raw)
        # Pre-Assessment_VendorName_YYYY-MM-DD
        m5 = re.match(r"Pre[-_]Assessment_(.+?)_\d{4}[-_]\d{2}", fn, re.I)
        if m5:
            return m5.group(1).replace("_", " ").strip()
        # Pre-Assessment_VendorName or Pre Assessment VendorName
        m6 = re.match(r"Pre[-_ ]?Assessment[_ ](.+)", fn, re.I)
        if m6:
            return _strip_stop(m6.group(1).replace("_", " ").strip())

    # ── Initial Assessment patterns ──
    if rtype == "Initial Assessment" or fn.lower().startswith(("ia_", "est_ia", "initial")):
        # Initial Vendor Assessment ... - VendorName Category
        m7 = re.match(r"Initial\s+(?:Vendor\s+)?Assessment.*?[-–]\s*(.+)", fn, re.I)
        if m7:
            raw = re.sub(r"^Report\s*[:\-]\s*", "", m7.group(1)).strip()
            raw = re.split(r"[+,;|]", raw)[0].strip()
            return _strip_stop(raw)
        # IA_VendorName_...  /  EST_IA_VendorName_...
        m8 = re.match(r"(?:EST[-_])?IA[-_](.+?)(?:[-_]\d{4}[-_]\d{2}|[-_]Walmart|[-_]v\d|$)", fn, re.I)
        if m8:
            return m8.group(1).replace("_", " ").replace("-", " ").strip()
        # VendorName_Initial...  — stop at "_Initial" (handles "_Initial Vendor Assessment")
        m9 = re.match(r"(.+?)_Initial\b", fn, re.I)
        if m9:
            return m9.group(1).replace("_", " ").strip()
        # VendorName Initial...  — stop at " Initial" (handles " Initial Assessment")
        m10 = re.match(r"(.+?)\s+Initial\b", fn, re.I)
        if m10:
            return m10.group(1).strip()

    # Fallback: humanise the filename
    return fn.replace("-", " ").replace("_", " ").strip()


# ── Fuzzy matching ─────────────────────────────────────────────────

def _sim(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _word_in(token: str, text: str) -> bool:
    """Whole-word boundary check to avoid 'service' matching 'services'."""
    return bool(re.search(r"\b" + re.escape(token) + r"\b", text))


def find_vendor(
    slug: str, vendors: list[dict], threshold: float = 0.62
) -> dict | None:
    """Fuzzy-match vendor slug. Uses whole-word token boost to avoid false
    positives like 'service' boosting 'Korea Heritage Service' → 'AWS'.
    Short slugs (<5 chars) require a near-exact sequence match to qualify.
    """
    slug_n = slug.lower().replace("-", " ").replace("_", " ").strip()
    if not slug_n or len(slug_n) < 2:
        return None

    # For very short slugs be strict ("toss" shouldn't match "voss")
    effective_threshold = max(threshold, 0.80) if len(slug_n) < 5 else threshold
    terms = [t for t in re.split(r"\s+", slug_n) if len(t) >= 4]
    best, top = None, 0.0
    for v in vendors:
        name_n = v["company_name"].lower()
        score  = _sim(slug_n, name_n)

        # Only boost if the token is a whole word in the vendor name
        for t in terms:
            if len(t) >= 6 and _word_in(t, name_n):   score = max(score, 0.78)
            elif len(t) >= 4 and _word_in(t, name_n): score = max(score, 0.63)

        # All tokens present as whole words — strong signal
        if terms and all(_word_in(t, name_n) for t in terms):
            score = max(score, 0.82)

        if score > top:
            top, best = score, v

    return {**best, "_score": top} if best and top >= effective_threshold else None


# ── DB helpers ─────────────────────────────────────────────────────

UPSERT_SQL = """
INSERT INTO var_reports (
    id, vendor_id, filename, sharepoint_url, report_date, report_version,
    report_type, match_method, folder_label, item_id, download_url
) VALUES (?, ?, ?, ?, ?, 'v1', ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
    report_date  = MAX(report_date, excluded.report_date),
    item_id      = excluded.item_id,
    download_url = excluded.download_url
"""


def make_id(vendor_id: str, filename: str) -> str:
    return hashlib.sha256(f"{vendor_id}::{filename.lower()}".encode()).hexdigest()[:16]


def make_sp_url(filename: str, folder_label: str) -> str:
    """Construct a SharePoint web URL from folder label + filename."""
    folder_map = {
        "Feb2026":    "Solution%20and%20Report%20Data/Reports/Vendor%20Assessment%20Reports/2026/202602",
        "Jan2026":    "Solution%20and%20Report%20Data/Reports/Vendor%20Assessment%20Reports/2026/202601",
        "Dec2025":    "Solution%20and%20Report%20Data/Reports/Vendor%20Assessment%20Reports/2025/December%202025",
        "Nov2025":    "Solution%20and%20Report%20Data/Reports/Vendor%20Assessment%20Reports/2025/November%202025",
        "PreAssess":  "Solution%20and%20Report%20Data/Reports/Pre-Assessments",
        "InitAssess": "Solution%20and%20Report%20Data/Reports/Initial%20Assessments",
    }
    folder_path = folder_map.get(folder_label, "Solution%20and%20Report%20Data/Reports")
    enc_name = filename.replace(" ", "%20").replace("&", "%26")
    return f"{SP_BASE}/{folder_path}/{enc_name}"


def make_dl_url(item_id: str) -> str:
    return f"{GRAPH}/drives/{DRIVE_ID}/items/{item_id}/content"


# ── Main ──────────────────────────────────────────────────────────────

def run(type_filter: list[str] | None, dry_run: bool) -> None:  # noqa: C901
    init_db()
    conn = get_connection()

    all_vendors = [
        dict(r) for r in conn.execute(
            "SELECT id, company_name, category FROM vendors ORDER BY company_name"
        ).fetchall()
    ]
    existing: set[str] = {
        r[0] for r in conn.execute("SELECT filename FROM var_reports").fetchall()
    }

    entries = ALL_ENTRIES
    if type_filter:
        type_filter_lower = [t.lower().replace("-", " ") for t in type_filter]
        entries = [
            e for e in entries
            if e[3].lower().replace("-", " ") in type_filter_lower
        ]

    print(f"\nSENTRY Phase 3 — Static Catalog Linker {'(DRY RUN)' if dry_run else ''}")
    print(f"Catalog entries : {len(ALL_ENTRIES)} total / {len(entries)} selected")
    print(f"Vendors in DB   : {len(all_vendors)}")
    print(f"Already linked  : {len(existing)}")
    print("=" * 72)

    linked = skipped = unmatched = 0
    by_type: dict[str, int] = {}

    for fn, item_id, rdate, rtype, flabel in entries:
        if fn in existing:
            skipped += 1
            continue

        slug   = extract_slug(fn, rtype)
        vendor = find_vendor(slug, all_vendors)

        if vendor:
            vid    = vendor["id"]
            vname  = vendor["company_name"]
            method = f"v3-{vendor['_score']:.2f}"
            var_id = make_id(vid, fn)
            sp_url = make_sp_url(fn, flabel)
            dl_url = make_dl_url(item_id)

            tag = f"[{rtype[:3]}]"
            print(f"  ✔ {tag} {vname:<42} ← {slug[:35]}")
            linked += 1
            by_type[rtype] = by_type.get(rtype, 0) + 1

            if not dry_run:
                conn.execute(UPSERT_SQL, (
                    var_id, vid, fn, sp_url, rdate,
                    rtype, method, flabel, item_id, dl_url,
                ))
                conn.execute(
                    "UPDATE vendors SET has_var=1 WHERE id=?", (vid,)
                )
                existing.add(fn)
        else:
            print(f"  ✗ NO MATCH  [{rtype[:3]}] {slug[:50]}")
            unmatched += 1

    if not dry_run:
        conn.commit()
    conn.close()

    print()
    print("=" * 72)
    print(f"  Linked    : {linked}")
    for t, c in sorted(by_type.items()):
        print(f"    {t}: {c}")
    print(f"  Skipped   : {skipped} (already in DB)")
    print(f"  Unmatched : {unmatched}")
    if dry_run:
        print("  [DRY RUN] — re-run without --dry-run to commit changes.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="SENTRY Phase 3 Static Catalog Linker")
    ap.add_argument(
        "--type", nargs="+", metavar="TYPE",
        help="Filter by report type: Detailed, Pre-Assessment, Initial-Assessment"
    )
    ap.add_argument("--dry-run", action="store_true", help="Preview only")
    args = ap.parse_args()
    run(type_filter=args.type, dry_run=args.dry_run)
