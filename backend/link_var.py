"""SENTRY — VAR Report Linker (Phase 2 tool).

Links a VAR report DOCX to a vendor record in the SENTRY SQLite DB.
Run this whenever a new VAR is published to SharePoint.

Usage examples:
  # Link by vendor ID (exact)
  python link_var.py --vendor-id 889e38c69a9a --filename "WMT-SEC-VAR-20251221-Axis-Detailed-v1.docx" --sharepoint-url "https://walmart.sharepoint.com/..."

  # Link by company name fuzzy match
  python link_var.py --company "Axis Communications" --filename "WMT-SEC-VAR-20251221-Axis-Detailed-v1.docx" --sharepoint-url "https://walmart.sharepoint.com/..."

  # List all vendors (for finding IDs)
  python link_var.py --list-vendors

  # List all linked VARs
  python link_var.py --list-vars
"""
import argparse
import hashlib
import sys
from difflib import get_close_matches

from database import get_connection, init_db


def _make_id(vendor_id: str, filename: str) -> str:
    slug = f"{vendor_id}::{filename}".lower()
    return hashlib.sha256(slug.encode()).hexdigest()[:16]


def find_vendor_by_name(conn, name: str) -> list[dict]:
    """Find vendors by fuzzy company name match."""
    rows = conn.execute(
        "SELECT id, company_name, category FROM vendors ORDER BY company_name"
    ).fetchall()
    names = [r["company_name"] for r in rows]
    matches = get_close_matches(name, names, n=5, cutoff=0.5)
    return [
        dict(r) for r in rows if r["company_name"] in matches
    ]


def link_var(
    vendor_id: str,
    filename: str,
    sharepoint_url: str,
    report_date: str = "",
    report_version: str = "v1",
    report_type: str = "Detailed",
    overall_score: float | None = None,
    decision_band: str = "",
    compliance_score: float | None = None,
    risk_score: float | None = None,
    maturity_score: float | None = None,
    integration_score: float | None = None,
    roi_score: float | None = None,
    viability_score: float | None = None,
    differentiation_score: float | None = None,
    cloud_dep_score: float | None = None,
) -> str:
    """Insert or update a VAR report record. Returns the VAR id."""
    init_db()
    conn = get_connection()

    # Verify vendor exists
    vendor = conn.execute(
        "SELECT id, company_name FROM vendors WHERE id = ?", (vendor_id,)
    ).fetchone()
    if not vendor:
        conn.close()
        raise ValueError(f"No vendor found with id={vendor_id!r}")

    var_id = _make_id(vendor_id, filename)

    conn.execute("""
        INSERT INTO var_reports (
            id, vendor_id, filename, sharepoint_url, report_date,
            report_version, report_type, overall_score, decision_band,
            compliance_score, risk_score, maturity_score, integration_score,
            roi_score, viability_score, differentiation_score, cloud_dep_score,
            match_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')
        ON CONFLICT(id) DO UPDATE SET
            sharepoint_url       = excluded.sharepoint_url,
            report_date          = excluded.report_date,
            report_version       = excluded.report_version,
            report_type          = excluded.report_type,
            overall_score        = excluded.overall_score,
            decision_band        = excluded.decision_band,
            compliance_score     = excluded.compliance_score,
            risk_score           = excluded.risk_score,
            maturity_score       = excluded.maturity_score,
            integration_score    = excluded.integration_score,
            roi_score            = excluded.roi_score,
            viability_score      = excluded.viability_score,
            differentiation_score = excluded.differentiation_score,
            cloud_dep_score      = excluded.cloud_dep_score
    """, (
        var_id, vendor_id, filename, sharepoint_url, report_date,
        report_version, report_type, overall_score, decision_band,
        compliance_score, risk_score, maturity_score, integration_score,
        roi_score, viability_score, differentiation_score, cloud_dep_score,
    ))
    conn.commit()
    conn.close()

    print(f"\n  Linked VAR \u2714")
    print(f"  Vendor  : {vendor['company_name']} ({vendor_id})")
    print(f"  File    : {filename}")
    print(f"  SP URL  : {sharepoint_url or '(not set)'}")
    print(f"  Score   : {overall_score or 'N/A'} — {decision_band or 'N/A'}")
    return var_id


def cli() -> None:
    ap = argparse.ArgumentParser(
        description="SENTRY VAR Report Linker — Phase 2 tool"
    )
    ap.add_argument("--vendor-id",   help="Exact vendor ID (12-char hash)")
    ap.add_argument("--company",     help="Fuzzy match by company name")
    ap.add_argument("--filename",    help="VAR filename (e.g. WMT-SEC-VAR-...docx)")
    ap.add_argument("--sharepoint-url", default="", help="SharePoint link to the DOCX")
    ap.add_argument("--report-date",    default="", help="Report date YYYY-MM-DD")
    ap.add_argument("--version",        default="v1")
    ap.add_argument("--type",           default="Detailed")
    ap.add_argument("--score",          type=float, help="Overall weighted score")
    ap.add_argument("--band",           default="", help="Decision band")
    ap.add_argument("--compliance",     type=float)
    ap.add_argument("--risk",           type=float)
    ap.add_argument("--maturity",       type=float)
    ap.add_argument("--integration",    type=float)
    ap.add_argument("--roi",            type=float)
    ap.add_argument("--viability",      type=float)
    ap.add_argument("--differentiation",type=float)
    ap.add_argument("--cloud-dep",      type=float)
    ap.add_argument("--list-vendors",   action="store_true")
    ap.add_argument("--list-vars",      action="store_true")

    args = ap.parse_args()
    init_db()
    conn = get_connection()

    if args.list_vendors:
        rows = conn.execute(
            "SELECT id, company_name, category, overall_rating FROM vendors "
            "ORDER BY company_name LIMIT 100"
        ).fetchall()
        print(f"\n{'ID':<14} {'Rating':>6}  {'Category':<35} Company")
        print("-" * 80)
        for r in rows:
            print(f"  {r['id']:<12} {r['overall_rating']:>5.2f}  {r['category'][:33]:<35} {r['company_name']}")
        conn.close()
        return

    if args.list_vars:
        rows = conn.execute(
            "SELECT vr.id, vr.filename, vr.overall_score, vr.decision_band, v.company_name "
            "FROM var_reports vr JOIN vendors v ON vr.vendor_id = v.id "
            "ORDER BY v.company_name"
        ).fetchall()
        print(f"\nLinked VARs: {len(rows)}")
        for r in rows:
            print(f"  {r['company_name']}: {r['filename']} (score={r['overall_score']}, {r['decision_band']})")
        conn.close()
        return

    # Resolve vendor ID
    vendor_id = args.vendor_id
    if not vendor_id and args.company:
        matches = find_vendor_by_name(conn, args.company)
        if not matches:
            print(f"No vendor found matching '{args.company}'")
            conn.close()
            sys.exit(1)
        if len(matches) == 1:
            vendor_id = matches[0]["id"]
            print(f"Matched: {matches[0]['company_name']} ({vendor_id})")
        else:
            print("Multiple matches — pick one:")
            for i, m in enumerate(matches):
                print(f"  [{i}] {m['id']} — {m['company_name']} ({m['category']})")
            choice = int(input("Enter number: "))
            vendor_id = matches[choice]["id"]
    conn.close()

    if not vendor_id or not args.filename:
        print("Error: --vendor-id (or --company) and --filename are required.")
        sys.exit(1)

    link_var(
        vendor_id=vendor_id,
        filename=args.filename,
        sharepoint_url=args.sharepoint_url,
        report_date=args.report_date,
        report_version=args.version,
        report_type=args.type,
        overall_score=args.score,
        decision_band=args.band,
        compliance_score=args.compliance,
        risk_score=args.risk,
        maturity_score=args.maturity,
        integration_score=args.integration,
        roi_score=args.roi,
        viability_score=args.viability,
        differentiation_score=args.differentiation,
        cloud_dep_score=args.cloud_dep,
    )


if __name__ == "__main__":
    cli()
