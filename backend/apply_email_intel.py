"""Apply Cody Smith + Chris Epling email intelligence to the SENTRY project portfolio.

Run once:
    cd backend && .venv\Scripts\python.exe apply_email_intel.py

Safe to re-run — skips existing projects, updates only changed fields.
"""
import sqlite3
import uuid
import json
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "sentry.db"
NOW = datetime.now(timezone.utc).isoformat()
UPDATED_BY = "Jason.Wilbur@walmart.com"

# ── helpers ───────────────────────────────────────────────────────────────────

def conn():
    c = sqlite3.connect(str(DB_PATH))
    c.row_factory = sqlite3.Row
    return c

def update_project(db, project_id: str, **fields):
    exists = db.execute(
        "SELECT 1 FROM projects WHERE project_id=?", (project_id,)
    ).fetchone()
    if not exists:
        print(f"  SKIP (not found): {project_id}")
        return
    fields["last_update_at"] = NOW
    fields["last_update_by"] = UPDATED_BY
    set_clause = ", ".join(f"{k}=?" for k in fields)
    db.execute(
        f"UPDATE projects SET {set_clause} WHERE project_id=?",
        (*fields.values(), project_id),
    )
    print(f"  UPDATED: {project_id}")

def insert_project(db, row: dict):
    exists = db.execute(
        "SELECT 1 FROM projects WHERE project_id=?", (row["project_id"],)
    ).fetchone()
    if exists:
        print(f"  EXISTS (skip): {row['project_id']}")
        return
    cols = list(row.keys())
    placeholders = ", ".join("?" * len(cols))
    db.execute(
        f"INSERT INTO projects ({', '.join(cols)}) VALUES ({placeholders})",
        list(row.values()),
    )
    print(f"  INSERTED: {row['project_id']} — {row['project_name']}")

def ensure_vendors(db, project_id: str, vendors: list[dict]):
    """Add vendors that don't already exist (matched by project_id + vendor_name)."""
    existing = {
        r[0] for r in db.execute(
            "SELECT vendor_name FROM project_vendors WHERE project_id=?", (project_id,)
        ).fetchall()
    }
    for v in vendors:
        if v["vendor_name"] in existing:
            continue
        db.execute(
            """
            INSERT INTO project_vendors
                (id, project_id, vendor_name, vendor_id, role, status, notes, added_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?)
            """,
            (str(uuid.uuid4()), project_id, v["vendor_name"], v.get("vendor_id", ""),
             v.get("role", "Vendor"), v.get("status", "active"),
             v.get("notes", ""), NOW, NOW),
        )
        print(f"    + vendor {v['vendor_name']} ({v.get('status','active')}) on {project_id}")

def update_vendor_status(db, project_id: str, vendor_name: str, **fields):
    db.execute(
        f"UPDATE project_vendors SET {', '.join(f'{k}=?' for k in fields)}, updated_at=?"
        " WHERE project_id=? AND vendor_name=?",
        (*fields.values(), NOW, project_id, vendor_name),
    )
    print(f"    ~ vendor update: {vendor_name} on {project_id}")

# ── main ──────────────────────────────────────────────────────────────────────

def main():
    db = conn()

    # ====================================================================
    # 1. UPDATES TO EXISTING PROJECTS
    # ====================================================================

    print("\n[1] Updating existing projects...")

    # PRJ-UAS-2025 — Skydio is in active installation but BLOCKED on permits
    update_project(
        db, "PRJ-UAS-2025",
        project_name="UAS — Drone in a Box Security Solution (Skydio + SFL)",
        summary=(
            "Dual UAS pilot: (A) Skydio Drone-in-a-Box at Store US11155 — "
            "PO $19,183 issued to Telaid (installer). Blocked on architectural prints "
            "for permits and 220v PE stamp. (B) Sunflower Labs eval running in parallel "
            "at a second site — Technical Assessment complete, RFI artifacts outstanding, "
            "Wachter pricing received Mar 12. Fusus CORE governance running in parallel "
            "to cover both drone locations."
        ),
        health="yellow",
        current_phase="Active Installation",
        est_phase_index=7,
        progress_pct=68,
        blockers_count=2,
        next_milestone="Skydio: Permits pulled + installation complete",
        next_due_date="2026-04-30",
    )
    # Add Telaid as installer vendor
    ensure_vendors(db, "PRJ-UAS-2025", [
        {"vendor_name": "Telaid",        "role": "Installer",       "status": "active",
         "notes": "PM: Jordan Wille. Installing Skydio at US11155. Permit blocker — needs architectural prints."},
        {"vendor_name": "Wachter",       "role": "Installer",       "status": "active",
         "notes": "Installer for Sunflower Labs site. Combined pricing submitted Mar 12, 2026."},
        {"vendor_name": "Axon",          "role": "Partner",         "status": "active",
         "notes": "Referred Telaid as Skydio installer. BWC contract separate."},
        {"vendor_name": "Fusus",         "role": "Partner",         "status": "evaluating",
         "notes": "RTCC/CORE governance covering both drone locations — parallel to SSP."},
    ])
    # Mark Nightingale as removed (confirmed from SSP email Nov 11)
    update_vendor_status(db, "PRJ-UAS-2025", "Nightingale",
        status="removed",
        notes="Removed from evaluation. SSP submitted Nov 11 but not progressing.")

    # PRJ-BWC-2025 — Axon contract is EXECUTED — move to BAU
    update_project(
        db, "PRJ-BWC-2025",
        summary=(
            "Axon Body-Worn Camera program for Global Security associates. "
            "Contract finalized and executed (confirmed Dec 30, 2025 — Bobby Bertuca). "
            "Redline SSP process complete. Now in BAU/deployment phase. "
            "Motorola SI evaluation paused — Axon selected."
        ),
        health="green",
        current_phase="BAU",
        est_phase_index=8,
        progress_pct=100,
        blockers_count=0,
        lifecycle_state="active",
        next_milestone="BAU Rollout to remaining locations",
    )
    update_vendor_status(db, "PRJ-BWC-2025", "Axon",
        status="active",
        notes="Contract finalized and executed Dec 30, 2025. BWC + Evidence.com platform. Skydio SSP also under this vendor relationship.")
    update_vendor_status(db, "PRJ-BWC-2025", "Motorola SI",
        status="inactive",
        notes="Axon selected — Motorola SI evaluation paused.")

    # PRJ-MST-2025 — RFP was in progress Nov 2025; update milestones/owner
    update_project(
        db, "PRJ-MST-2025",
        summary=(
            "Mobile Surveillance Trailers for high-risk Walmart locations. "
            "RFP in progress with 5 competing vendors as of Nov 2025 — awaiting "
            "final pricing from all vendors before selection. Chris Epling declined "
            "Axis PTZ add (already advanced in RFP). "
            "SharePoint Vault: 12 project files."
        ),
        health="green",
        next_milestone="Final vendor selection from RFP",
        next_due_date="2026-05-15",
        business_owner="Chris.Epling@walmart.com",
    )

    # PRJ-CUAS-2025 — Update with Vault activity (16 files, Dec 2025)
    update_project(
        db, "PRJ-CUAS-2025",
        summary=(
            "Counter-UAS / Drone Detection program — detection and intelligence only "
            "(no defeat/intercept). Dedrone RF platform primary. D-Fend Solutions "
            "cyber-takeover under NDA evaluation. Fortem Technologies removed due to "
            "NDAA compliance gap. SharePoint Vault: 16 project files (last activity Dec 15, 2025)."
        ),
        current_phase="Vendor Engagement",
        health="yellow",
        lifecycle_state="active",
        blockers_count=1,
        next_milestone="NDAA compliance review complete — D-Fend NDA decision",
    )

    # PRJ-RETAILCV-2026 — Anava is in this space
    update_project(
        db, "PRJ-RETAILCV-2026",
        summary=(
            "Non-biometric edge computer vision for retail security. "
            "Focal Systems (shelf intelligence) primary. Anava.ai (GCP-integrated) "
            "in PoC prerequisites — network access issue (400 error on docs.anava.ai) "
            "being resolved. Evolent AI evaluation paused. "
            "Vendor contacts: Ryan Wager + Matt Ebben (Anava.ai)."
        ),
        health="yellow",
        blockers_count=1,
        next_milestone="Anava prerequisites resolved — PoC kickoff",
    )
    ensure_vendors(db, "PRJ-RETAILCV-2026", [
        {"vendor_name": "Anava.ai", "role": "Primary Vendor", "status": "evaluating",
         "notes": "GCP-integrated CV platform. PoC prereqs phase — 400 error on docs.anava.ai being fixed. Contacts: Ryan Wager, Matt Ebben."},
    ])

    # PRJ-RETURNS-2026 — Darwinium is in Fraud Tech space (separate from Returns)
    # Darwinium is its own project — see new projects below
    # PRJ-SECROBOT-2025 is rejected — add RAD as discovery note in summary
    update_project(
        db, "PRJ-SECROBOT-2025",
        summary=(
            "Autonomous security patrol robots — Knightscope K5/K1 evaluation. "
            "Project rejected after evaluation. RAD Security ROAMEO being evaluated "
            "separately (Discovery phase, Oct 2025) as potential alternative. "
            "Cobalt Robotics evaluation also paused."
        ),
    )

    # ====================================================================
    # 2. NEW PROJECTS FROM EMAIL INTELLIGENCE
    # ====================================================================

    print("\n[2] Inserting new projects from email intelligence...")

    new_projects = [
        {
            "project_id": "PRJ-SUNFLOWER-2026",
            "project_name": "Sunflower Labs — Autonomous Security Drone Platform",
            "summary": (
                "Sunflower Labs autonomous drone-in-a-box platform evaluation. "
                "Technical Assessment completed by Jason Wilbur (Feb 4, 2026). "
                "RFI packet submitted but missing artifacts — updated packet to be "
                "sent to Jeff at Sunflower Labs. Wachter submitted combined installation "
                "pricing (Mar 12, 2026). SSP in progress. Running in parallel with Skydio pilot."
            ),
            "managing_unit": "Emerging Security Technology",
            "lifecycle_state": "active",
            "health": "yellow",
            "current_phase": "VAR / Validation",
            "est_phase_index": 2,
            "risk_score": 4,
            "sensitivity": "confidential",
            "tags": "drones;uas;autonomous;security",
            "progress_pct": 30,
            "next_milestone": "Complete RFI packet → send to Jeff @ Sunflower Labs",
            "next_due_date": "2026-04-15",
            "blockers_count": 1,
            "last_update_at": NOW,
            "last_update_by": UPDATED_BY,
            "est_cost": "",
            "business_owner": "Cody.Smith1@walmart.com",
            "nda_numbers": "[]",
            "apm_entries": "[]",
            "erpa_entries": "[]",
            "ssp_entries": json.dumps([{"vendor": "Sunflower Labs", "number": "", "status": "in_progress", "note": "SSP in progress as of Mar 18, 2026"}]),
            "compliance_notes": "SSP in progress. RFI artifacts outstanding.",
            "exit_reason": "",
        },
        {
            "project_id": "PRJ-ANAVA-2026",
            "project_name": "Anava — AI Computer Vision (GCP-Integrated)",
            "summary": (
                "Anava.ai computer vision platform integrated with Google Cloud Platform. "
                "Team: Cody Smith, Brandon Hodges, Jason Wilbur. "
                "Vendor contacts: Ryan Wager + Matt Ebben (Anava.ai). "
                "Currently in prerequisites / deployment setup phase. "
                "Blocker: 400 error on docs.anava.ai prerequisites page (Mar 21, 2026). "
                "PDF deployment methodology received Mar 3."
            ),
            "managing_unit": "Emerging Security Technology",
            "lifecycle_state": "active",
            "health": "yellow",
            "current_phase": "PoC Prerequisites",
            "est_phase_index": 5,
            "risk_score": 3,
            "sensitivity": "confidential",
            "tags": "computer-vision;ai;gcp;cv;retail",
            "progress_pct": 45,
            "next_milestone": "Resolve docs.anava.ai 400 error → complete prerequisites → PoC kickoff",
            "next_due_date": "2026-04-01",
            "blockers_count": 1,
            "last_update_at": NOW,
            "last_update_by": UPDATED_BY,
            "est_cost": "",
            "business_owner": "Cody.Smith1@walmart.com",
            "nda_numbers": "[]",
            "apm_entries": "[]",
            "erpa_entries": "[]",
            "ssp_entries": "[]",
            "compliance_notes": "",
            "exit_reason": "",
        },
        {
            "project_id": "PRJ-FUSUS-2026",
            "project_name": "RTCC + Fusus CORE — Real-Time Crime Center Governance",
            "summary": (
                "Fusus CORE real-time crime center integration for drone operations. "
                "Governance draft distributed by Mary Beth McCutcheon (Legal) Feb 10-16, 2026. "
                "Cody Smith proposing to run governance approval PARALLEL to SSP to reduce "
                "bureaucracy. Two drone locations being added to Fusus governance scope. "
                "Blocker: 'Enrollment groups' legal wording needs David (Legal) sign-off — "
                "need 30-min meeting. Richard Ivy can expedite once stakeholders aligned. "
                "Todd Clow CC'd throughout. Marked Privileged & Confidential."
            ),
            "managing_unit": "Emerging Security Technology",
            "lifecycle_state": "active",
            "health": "yellow",
            "current_phase": "APM / ERPA / SSP",
            "est_phase_index": 6,
            "risk_score": 5,
            "sensitivity": "restricted",
            "tags": "rtcc;fusus;drone;governance;legal",
            "progress_pct": 55,
            "next_milestone": "Lock enrollment group wording with David (Legal) → parallel governance + SSP approval",
            "next_due_date": "2026-04-15",
            "blockers_count": 1,
            "last_update_at": NOW,
            "last_update_by": UPDATED_BY,
            "est_cost": "",
            "business_owner": "Cody.Smith1@walmart.com",
            "nda_numbers": "[]",
            "apm_entries": "[]",
            "erpa_entries": "[]",
            "ssp_entries": json.dumps([{"vendor": "Fusus", "number": "", "status": "in_progress", "note": "Running parallel to governance approval per Cody proposal"}]),
            "compliance_notes": "Privileged & Confidential. Governance + SSP running in parallel. Legal enrollment groups wording outstanding.",
            "exit_reason": "",
        },
        {
            "project_id": "PRJ-ASSAABLOY-2026",
            "project_name": "ASSA ABLOY — NFC Access Control (Distribution Centers)",
            "summary": (
                "NFC access control evaluation for Walmart distribution centers. "
                "Owner: Chris Epling. Requirements: NFC chip with read/write capability, "
                "mobile credentials (NFC/Bluetooth) + physical fobs/pucks, red/green "
                "indicator light above door, integration with existing AC infrastructure. "
                "Evaluating Aperio line. Vendor contacts: Chris Villarreal PSP + Kevin Shaw "
                "(ASSA ABLOY National Accounts). Call scheduled for Friday 4pm EST (Feb 25, 2026)."
            ),
            "managing_unit": "Facility Security & Technology",
            "lifecycle_state": "active",
            "health": "green",
            "current_phase": "Vendor Engagement",
            "est_phase_index": 2,
            "risk_score": 2,
            "sensitivity": "internal",
            "tags": "access-control;nfc;distribution-centers;hardware",
            "progress_pct": 20,
            "next_milestone": "Complete vendor call → Aperio NFC demo / evaluation",
            "next_due_date": "2026-05-01",
            "blockers_count": 0,
            "last_update_at": NOW,
            "last_update_by": UPDATED_BY,
            "est_cost": "",
            "business_owner": "Chris.Epling@walmart.com",
            "nda_numbers": "[]",
            "apm_entries": "[]",
            "erpa_entries": "[]",
            "ssp_entries": "[]",
            "compliance_notes": "",
            "exit_reason": "",
        },
        {
            "project_id": "PRJ-RAD-2026",
            "project_name": "RAD Security — ROAMEO Patrol Robot Evaluation",
            "summary": (
                "RAD Security ROAMEO autonomous patrol robot evaluation for Walmart "
                "parking lots and facilities. Contact: Christina Reilly (RAD Security). "
                "Specs reviewed Oct 2025: RIO MINI uses 48V batteries, solar units available. "
                "Jason Wilbur raised concerns — RAD responding with technical specs. "
                "Follows PRJ-SECROBOT-2025 (Knightscope — rejected) as follow-on evaluation."
            ),
            "managing_unit": "Emerging Security Technology",
            "lifecycle_state": "active",
            "health": "green",
            "current_phase": "Intake",
            "est_phase_index": 1,
            "risk_score": 3,
            "sensitivity": "internal",
            "tags": "robotics;patrol;autonomous;parking-lot",
            "progress_pct": 15,
            "next_milestone": "Technical spec review complete → VAR submission",
            "next_due_date": "2026-05-01",
            "blockers_count": 0,
            "last_update_at": NOW,
            "last_update_by": UPDATED_BY,
            "est_cost": "",
            "business_owner": "Jason.Wilbur@walmart.com",
            "nda_numbers": "[]",
            "apm_entries": "[]",
            "erpa_entries": "[]",
            "ssp_entries": "[]",
            "compliance_notes": "",
            "exit_reason": "",
        },
        {
            "project_id": "PRJ-DARWINIUM-2026",
            "project_name": "Darwinium — Fraud Tech & Behavioral Biometrics",
            "summary": (
                "Darwinium fraud detection and behavioral biometrics platform evaluation. "
                "Technical Assessment COMPLETED by Jason Wilbur (After-Action sent Oct 27, 2025). "
                "Darwinium completed Walmart Info Mgmt Questionnaire + supporting docs (Oct 26, 2025). "
                "Stakeholders: Bobby Bertuca, Emmerson. "
                "SharePoint Vault: 3 files in Fraud Tech folder. "
                "Awaiting Go/No-Go decision from leadership."
            ),
            "managing_unit": "Emerging Security Technology",
            "lifecycle_state": "active",
            "health": "green",
            "current_phase": "Results / Go-No-Go",
            "est_phase_index": 6,
            "risk_score": 3,
            "sensitivity": "confidential",
            "tags": "fraud;behavioral-biometrics;fintech;analytics",
            "progress_pct": 70,
            "next_milestone": "Leadership Go/No-Go decision",
            "next_due_date": "2026-04-30",
            "blockers_count": 0,
            "last_update_at": NOW,
            "last_update_by": UPDATED_BY,
            "est_cost": "",
            "business_owner": "Jason.Wilbur@walmart.com",
            "nda_numbers": "[]",
            "apm_entries": "[]",
            "erpa_entries": "[]",
            "ssp_entries": "[]",
            "compliance_notes": "Walmart Info Management Questionnaire completed by vendor.",
            "exit_reason": "",
        },
        {
            "project_id": "PRJ-ACOUSTICS-2026",
            "project_name": "Acoustics — Audio-Based Security Detection",
            "summary": (
                "Acoustic detection technology evaluation for security applications "
                "(gunshot detection, audio anomaly, perimeter). "
                "SharePoint Vault: 4 files — most recently active folder (Feb 25, 2026). "
                "Details TBD — project file review needed from Vault/Projects/Acoustics."
            ),
            "managing_unit": "Emerging Security Technology",
            "lifecycle_state": "active",
            "health": "yellow",
            "current_phase": "Intake",
            "est_phase_index": 1,
            "risk_score": 2,
            "sensitivity": "confidential",
            "tags": "acoustics;audio;gunshot-detection;perimeter",
            "progress_pct": 10,
            "next_milestone": "Review Vault project files → intake documentation",
            "next_due_date": "2026-04-30",
            "blockers_count": 0,
            "last_update_at": NOW,
            "last_update_by": UPDATED_BY,
            "est_cost": "",
            "business_owner": "Jason.Wilbur@walmart.com",
            "nda_numbers": "[]",
            "apm_entries": "[]",
            "erpa_entries": "[]",
            "ssp_entries": "[]",
            "compliance_notes": "",
            "exit_reason": "",
        },
        {
            "project_id": "PRJ-MANTACUS-2026",
            "project_name": "Mantacus — Security Technology Platform",
            "summary": (
                "Mantacus security technology platform evaluation. "
                "SharePoint Vault: 1 file (Jan 14, 2026). "
                "Details limited — project file review needed from Vault/Projects/Mantacus."
            ),
            "managing_unit": "Emerging Security Technology",
            "lifecycle_state": "active",
            "health": "yellow",
            "current_phase": "Intake",
            "est_phase_index": 1,
            "risk_score": 2,
            "sensitivity": "confidential",
            "tags": "security-platform",
            "progress_pct": 5,
            "next_milestone": "Review Vault project file → intake documentation",
            "next_due_date": "",
            "blockers_count": 0,
            "last_update_at": NOW,
            "last_update_by": UPDATED_BY,
            "est_cost": "",
            "business_owner": "Jason.Wilbur@walmart.com",
            "nda_numbers": "[]",
            "apm_entries": "[]",
            "erpa_entries": "[]",
            "ssp_entries": "[]",
            "compliance_notes": "",
            "exit_reason": "",
        },
        {
            "project_id": "PRJ-FR-2026",
            "project_name": "Facial Recognition (FR) — Scoped Security Evaluation",
            "summary": (
                "Facial recognition technology scoped evaluation within EST. "
                "SharePoint Vault: 1 file (Nov 14, 2025). "
                "High regulatory sensitivity — subject to biometric/ALPR laws in "
                "multiple states. Likely on hold pending legal/privacy review. "
                "Details TBD — project file review needed from Vault/Projects/FR."
            ),
            "managing_unit": "Emerging Security Technology",
            "lifecycle_state": "active",
            "health": "red",
            "current_phase": "Intake",
            "est_phase_index": 1,
            "risk_score": 8,
            "sensitivity": "restricted",
            "tags": "facial-recognition;biometrics;legal;privacy",
            "progress_pct": 5,
            "next_milestone": "Legal/Privacy review — determine if evaluation may proceed",
            "next_due_date": "",
            "blockers_count": 1,
            "last_update_at": NOW,
            "last_update_by": UPDATED_BY,
            "est_cost": "",
            "business_owner": "Jason.Wilbur@walmart.com",
            "nda_numbers": "[]",
            "apm_entries": "[]",
            "erpa_entries": "[]",
            "ssp_entries": "[]",
            "compliance_notes": "High regulatory sensitivity — state biometric laws apply. Legal/Privacy clearance required before proceeding.",
            "exit_reason": "",
        },
    ]

    for row in new_projects:
        insert_project(db, row)

    # ====================================================================
    # 3. VENDOR ROSTERS FOR NEW PROJECTS
    # ====================================================================

    print("\n[3] Setting up vendor rosters for new projects...")

    ensure_vendors(db, "PRJ-SUNFLOWER-2026", [
        {"vendor_name": "Sunflower Labs", "role": "Primary Vendor", "status": "active",
         "notes": "Contact: Jeff @ Sunflower Labs. Tech Assessment complete. RFI artifacts outstanding."},
        {"vendor_name": "Wachter",        "role": "Installer",      "status": "active",
         "notes": "Combined installation pricing submitted Mar 12, 2026."},
    ])

    ensure_vendors(db, "PRJ-ANAVA-2026", [
        {"vendor_name": "Anava.ai", "role": "Primary Vendor", "status": "active",
         "notes": "Contacts: Ryan Wager + Matt Ebben. GCP-integrated CV platform. 400 error on prereqs docs — being resolved."},
        {"vendor_name": "Google Cloud (GCP)", "role": "Partner", "status": "active",
         "notes": "Cloud infrastructure for Anava integration."},
    ])

    ensure_vendors(db, "PRJ-FUSUS-2026", [
        {"vendor_name": "Fusus", "role": "Primary Vendor", "status": "active",
         "notes": "RTCC CORE platform. Governance draft distributed Feb 2026. Privileged & Confidential."},
    ])

    ensure_vendors(db, "PRJ-ASSAABLOY-2026", [
        {"vendor_name": "ASSA ABLOY", "role": "Primary Vendor", "status": "evaluating",
         "notes": "Aperio line. Contacts: Chris Villarreal PSP + Kevin Shaw (National Accounts). Call scheduled."},
    ])

    ensure_vendors(db, "PRJ-RAD-2026", [
        {"vendor_name": "RAD Security", "role": "Primary Vendor", "status": "evaluating",
         "notes": "ROAMEO robot. Contact: Christina Reilly. RIO MINI: 48V batteries, solar units available."},
    ])

    ensure_vendors(db, "PRJ-DARWINIUM-2026", [
        {"vendor_name": "Darwinium", "role": "Primary Vendor", "status": "active",
         "notes": "Tech Assessment complete Oct 2025. WMT Info Mgmt Questionnaire + docs submitted. Awaiting Go/No-Go."},
    ])

    db.commit()
    db.close()

    print("\n✅ Done — all updates applied.")


if __name__ == "__main__":
    main()