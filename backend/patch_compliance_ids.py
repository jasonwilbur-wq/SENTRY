"""Patch confirmed compliance IDs (sourced from stakeholder emails via msgraph)
into the SENTRY projects DB.

Source: Email audit 2026-03-24 — Bobby Bertuca / Cody Smith / Jason Wilbur threads.
Run from: C:\\Users\\j0w16ja\\SENTRY_v2-main\\backend\\
    python patch_compliance_ids.py
"""
import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "sentry.db"

# ────────────────────────────────────────────────────────────────────────
# CONFIRMED IDs — sourced from email audit via Microsoft Graph (2026-03-24)
# Signatories verified via Coupa contract notification emails.
# ────────────────────────────────────────────────────────────────────────

PATCHES = {
    # ── UAS / Drone-in-a-Box ──────────────────────────────────────────
    # 3 separate NDAs (Sunflower Labs, Nightingale, Brecourt); 2 APMs; 1 SSP
    # Source: Coupa NDA acceptance emails + Prakash Singh APM/SSP email thread
    "PRJ-UAS-2025": {
        "est_phase_index": 7,
        "current_phase": "Pilot",
        "nda_numbers": json.dumps([
            {"nda_number": "92431", "vendor": "Sunflower Labs",       "status": "executed", "note": "Larry Lundeen signatory, 2025-07-23"},
            {"nda_number": "92435", "vendor": "Nightingale Security", "status": "executed", "note": "Larry Lundeen signatory, 2025-08-28"},
            {"nda_number": "99944", "vendor": "Brecourt Solutions LLC","status": "executed", "note": "Larry Lundeen signatory, 2025-11-28 (Indoor Aerial)"},
        ]),
        # Multiple APMs — store primary (Nightingale) as apm_number, note Skydio in notes
        "apm_number":  "APM0022259",
        "apm_status":  "complete",
        "ssp_number":  "SSP00012298",
        "ssp_status":  "complete",
        "erpa_number": "",
        "erpa_status": "not_started",
        "compliance_notes": "Skydio APM: APM0022260 (RITM72962246). "
                            "Nightingale APM: APM0022259 (RITM72962255). "
                            "SSP00012298 covers Skydio X10 dock Walmart network integration. "
                            "Sunflower Labs / Brecourt NDAs cover outdoor patrol / indoor aerial pilots.",
    },

    # ── Mobile Surveillance Trailer ─────────────────────────────────────
    # NDA #89616 with RAD Security confirmed via Coupa email 2025-07-21
    "PRJ-MST-2025": {
        "est_phase_index": 5,
        "current_phase": "Lab Testing",
        "nda_numbers": json.dumps([
            {"nda_number": "89616", "vendor": "Robotic Assistance Devices (RAD Security)",
             "status": "executed", "note": "Larry Lundeen signatory, 2025-07-23"},
        ]),
        "apm_number":  "",
        "apm_status":  "not_started",
        "ssp_number":  "",
        "ssp_status":  "not_started",
        "erpa_number": "",
        "erpa_status": "not_started",
        "compliance_notes": "NDA 89616 with RAD Security executed. APM/SSP/ERPA not yet initiated — pending lab test completion.",
    },

    # ── Counter-UAS / Drone Detection ───────────────────────────────
    # NDA #108317 with Fotokite (filed 2026-02-25, Jarred Crabtree signatory)
    # Fusus RTCC ERPA doc shared Jan 2026 but no numeric ID assigned yet
    # SSP for Fusus in-process as of 2026-02-10 (per Jason Wilbur email)
    "PRJ-CUAS-2025": {
        "est_phase_index": 2,
        "current_phase": "Vendor Engagement",
        "nda_numbers": json.dumps([
            {"nda_number": "108317", "vendor": "Fotokite US LLC",
             "status": "executed", "note": "Jarred Crabtree signatory, filed 2026-02-25"},
        ]),
        "apm_number":  "",
        "apm_status":  "not_started",
        "ssp_number":  "",
        "ssp_status":  "in_progress",
        "erpa_number": "",
        "erpa_status": "in_progress",
        "compliance_notes": "ERPA for Fusus RTCC shared by Cody Smith 2026-01-29 — no numeric ID assigned yet. "
                            "SSP in-process as of 2026-02-10 (per Jason Wilbur). APM field listed as None on Fotokite NDA intake.",
    },

    # ── Body-Worn Cameras ───────────────────────────────────────────
    # Axon engagement via existing MSA/ISA — no standalone NDA required
    "PRJ-BWC-2025": {
        "est_phase_index": 4,
        "current_phase": "Technical Assessment",
        "nda_numbers": json.dumps([]),
        "apm_number":  "",
        "apm_status":  "not_started",
        "ssp_number":  "",
        "ssp_status":  "not_started",
        "erpa_number": "",
        "erpa_status": "not_started",
        "compliance_notes": "Axon engaged under existing Walmart MSA/ISA — standalone NDA not required. "
                            "APM/ERPA/SSP not yet initiated — pending Privacy Impact Assessment (PIA) completion.",
    },

    # ── Security Robotics ────────────────────────────────────────────
    # SSP waiver granted for PoC (no associate data collected)
    "PRJ-SECROBOT-2025": {
        "est_phase_index": 5,
        "current_phase": "Lab Testing",
        "nda_numbers": json.dumps([]),
        "apm_number":  "",
        "apm_status":  "not_started",
        "ssp_number":  "",
        "ssp_status":  "not_started",
        "erpa_number": "",
        "erpa_status": "not_started",
        "compliance_notes": "SSP waiver previously granted for robotics PoC (no associate data involved). "
                            "Full APM/SSP/ERPA required before any production deployment.",
    },
}


def main() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    for project_id, data in PATCHES.items():
        existing = conn.execute(
            "SELECT project_id FROM projects WHERE project_id = ?", (project_id,)
        ).fetchone()

        if not existing:
            print(f"  ⚠️  {project_id} not found in DB — skipping")
            continue

        conn.execute("""
            UPDATE projects SET
                est_phase_index  = :est_phase_index,
                current_phase    = :current_phase,
                nda_numbers      = :nda_numbers,
                apm_number       = :apm_number,
                apm_status       = :apm_status,
                ssp_number       = :ssp_number,
                ssp_status       = :ssp_status,
                erpa_number      = :erpa_number,
                erpa_status      = :erpa_status,
                compliance_notes = :compliance_notes,
                updated_at       = datetime('now')
            WHERE project_id = :project_id
        """, {**data, "project_id": project_id})
        print(f"  ✓  {project_id} patched")

    conn.commit()
    conn.close()
    print("\nDone.")

    # Verification readout
    conn2 = sqlite3.connect(str(DB_PATH))
    rows = conn2.execute("""
        SELECT project_id, current_phase, est_phase_index,
               nda_numbers, apm_number, ssp_number, erpa_number, compliance_notes
        FROM projects
        ORDER BY est_phase_index DESC
    """).fetchall()
    print(f"\n{'Project ID':<25} {'Ph':>2}  {'APM':<14} {'SSP':<14} {'ERPA':<10} NDAs")
    print("-" * 90)
    for r in rows:
        ndas = json.loads(r[3] or "[]")
        nda_str = ", ".join(f"{n['nda_number']} ({n['vendor'][:12]})" for n in ndas) or "—"
        print(f"{r[0]:<25} {r[2]:>2}  {(r[4] or '—'):<14} {(r[5] or '—'):<14} {(r[6] or '—'):<10} {nda_str}")
    conn2.close()


if __name__ == "__main__":
    main()
