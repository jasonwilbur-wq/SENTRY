"""Migrate APM/ERPA/SSP from single scalars to JSON entry lists.

Adds three new columns (apm_entries, erpa_entries, ssp_entries) and
migrates existing scalar data into the first list entry.  The old scalar
columns are left in place but are no longer read or written by the app.

Run once from: C:\\Users\\j0w16ja\\SENTRY_v2-main\\backend\\
    python migrate_compliance_to_lists.py
"""
import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "sentry.db"


def main() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    # ── 1. Add new columns if they don’t exist ───────────────────────────
    existing = {r[1] for r in conn.execute("PRAGMA table_info(projects)").fetchall()}
    for col in ("apm_entries", "erpa_entries", "ssp_entries"):
        if col not in existing:
            conn.execute(f"ALTER TABLE projects ADD COLUMN {col} TEXT DEFAULT '[]'")
            print(f"  ✓ added column: {col}")
        else:
            print(f"  — column already exists: {col}")

    # ── 2. Migrate scalar values → first list entry per project ────────────
    rows = conn.execute(
        "SELECT project_id, apm_number, apm_status, "
        "erpa_number, erpa_status, ssp_number, ssp_status FROM projects"
    ).fetchall()

    for r in rows:
        pid = r["project_id"]

        apm_entries  = json.loads(conn.execute(
            "SELECT apm_entries  FROM projects WHERE project_id=?", (pid,)
        ).fetchone()[0] or "[]")
        erpa_entries = json.loads(conn.execute(
            "SELECT erpa_entries FROM projects WHERE project_id=?", (pid,)
        ).fetchone()[0] or "[]")
        ssp_entries  = json.loads(conn.execute(
            "SELECT ssp_entries  FROM projects WHERE project_id=?", (pid,)
        ).fetchone()[0] or "[]")

        # Only seed from old scalar if the new list is empty
        if not apm_entries and r["apm_number"]:
            apm_entries = [{
                "vendor": "", "number": r["apm_number"],
                "status": r["apm_status"] or "not_started", "note": "",
            }]
        if not erpa_entries and r["erpa_number"]:
            erpa_entries = [{
                "vendor": "", "number": r["erpa_number"],
                "status": r["erpa_status"] or "not_started", "note": "",
            }]
        if not ssp_entries and r["ssp_number"]:
            ssp_entries = [{
                "vendor": "", "number": r["ssp_number"],
                "status": r["ssp_status"] or "not_started", "note": "",
            }]

        conn.execute(
            "UPDATE projects SET apm_entries=?, erpa_entries=?, ssp_entries=? "
            "WHERE project_id=?",
            (json.dumps(apm_entries), json.dumps(erpa_entries),
             json.dumps(ssp_entries), pid),
        )

    # ── 3. Special-case: UAS already has TWO known APMs ──────────────────
    # APM0022259 = Nightingale (RITM72962255)
    # APM0022260 = Skydio      (RITM72962246)
    # SSP00012298 = Skydio (network dock integration)
    uas_apm = [
        {"vendor": "Nightingale Security", "number": "APM0022259",
         "status": "complete", "note": "RITM72962255"},
        {"vendor": "Skydio",               "number": "APM0022260",
         "status": "complete", "note": "RITM72962246"},
    ]
    uas_ssp = [
        {"vendor": "Skydio", "number": "SSP00012298",
         "status": "complete", "note": "Covers X10 dock Walmart network integration"},
    ]
    conn.execute(
        "UPDATE projects SET apm_entries=?, ssp_entries=? WHERE project_id=?",
        (json.dumps(uas_apm), json.dumps(uas_ssp), "PRJ-UAS-2025"),
    )
    print("  ✓ UAS multi-APM seeded")

    conn.commit()
    conn.close()
    print("\nMigration complete.")

    # ── Verify ──────────────────────────────────────────────────────────
    conn2 = sqlite3.connect(str(DB_PATH))
    rows2 = conn2.execute(
        "SELECT project_id, apm_entries, erpa_entries, ssp_entries FROM projects"
    ).fetchall()
    print(f"\n{'Project':<25}  APM  ERPA  SSP")
    print("-" * 52)
    for r in rows2:
        a = json.loads(r[1] or "[]")
        e = json.loads(r[2] or "[]")
        s = json.loads(r[3] or "[]")
        print(f"{r[0]:<25}  {len(a):>3}  {len(e):>4}  {len(s):>3}")
    conn2.close()


if __name__ == "__main__":
    main()
