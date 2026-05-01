"""Seed initial vendor rosters for existing SENTRY projects.

Run once:
    cd backend
    .venv\Scripts\python.exe seed_project_vendors.py

Safe to re-run — skips projects that already have vendor entries.
"""
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "sentry.db"

# Format: (project_id, vendor_name, vendor_id, role, status, notes)
INITIAL_VENDORS = [
    # PRJ-UAS-2025 — Drone in a Box
    ("PRJ-UAS-2025", "Skydio",         "", "Primary Vendor",  "active",     "Drone-in-a-Box solution — primary hardware provider"),
    ("PRJ-UAS-2025", "Sunflower Labs", "", "Primary Vendor",  "active",     "Autonomous security drone platform — active evaluation"),
    ("PRJ-UAS-2025", "Nightingale",    "", "Alternative",     "removed",    "Removed from project — no longer in evaluation"),

    # PRJ-MST-2025 — Mobile Surveillance Trailer
    ("PRJ-MST-2025", "Stealth CCTV",   "", "Primary Vendor",  "active",     "MST hardware and deployment"),
    ("PRJ-MST-2025", "WatchGuard",      "", "Alternative",     "evaluating", "Under evaluation for MST integration"),

    # PRJ-SECROBOT-2025 — Security Robotics
    ("PRJ-SECROBOT-2025", "Knightscope",   "", "Primary Vendor",  "active",   "K5/K1 autonomous security robots"),
    ("PRJ-SECROBOT-2025", "Cobalt Robotics","", "Alternative",    "inactive",  "Evaluated — paused pending cost review"),

    # PRJ-BWC-2025 — Body-Worn Cameras
    ("PRJ-BWC-2025", "Axon",           "", "Primary Vendor",  "active",     "BWC hardware and Evidence.com cloud platform"),
    ("PRJ-BWC-2025", "Motorola SI",    "", "Alternative",     "evaluating", "VB400 evaluation in progress"),

    # PRJ-CUAS-2025 — Counter-UAS
    ("PRJ-CUAS-2025", "Dedrone",        "", "Primary Vendor",  "active",     "RF-based drone detection platform"),
    ("PRJ-CUAS-2025", "D-Fend Solutions","", "Alternative",    "evaluating", "Cyber-takeover C-UAS — under NDA"),
    ("PRJ-CUAS-2025", "Fortem Technologies","","Alternative",   "removed",   "Removed — NDAA compliance gap identified"),

    # PRJ-IDENTITY-2026 — Identity Hardening
    ("PRJ-IDENTITY-2026", "Yubico",     "", "Primary Vendor",  "active",     "Hardware security keys for MFA"),
    ("PRJ-IDENTITY-2026", "Okta",       "", "Primary Vendor",  "active",     "Identity platform / passkey orchestration"),

    # PRJ-BOTDEF-2026 — Bot/Abuse Defense
    ("PRJ-BOTDEF-2026", "Cloudflare",   "", "Primary Vendor",  "active",     "Bot management and DDoS protection"),
    ("PRJ-BOTDEF-2026", "Arkose Labs",  "", "Alternative",     "evaluating", "CAPTCHA and bot defense — PoC underway"),

    # PRJ-RETAILCV-2026 — Retail CV
    ("PRJ-RETAILCV-2026", "Focal Systems","", "Primary Vendor", "active",    "Edge CV for shelf intelligence"),
    ("PRJ-RETAILCV-2026", "Evolent AI",  "", "Alternative",    "evaluating", "Loss prevention CV — PoC in lab"),

    # PRJ-SHRINK-2026 — Shrink/TLog Analytics
    ("PRJ-SHRINK-2026", "Appriss Retail","", "Primary Vendor", "active",    "Exception-based reporting & analytics"),

    # PRJ-RETURNS-2026 — Returns Fraud
    ("PRJ-RETURNS-2026", "Appriss Retail","","Primary Vendor", "active",    "Entity resolution for returns fraud detection"),
    ("PRJ-RETURNS-2026", "Ekata",        "", "Alternative",    "evaluating", "Identity graph for fraud scoring"),

    # PRJ-RFIDCOC-2026 — RFID Chain-of-Custody
    ("PRJ-RFIDCOC-2026", "Impinj",      "", "Primary Vendor",  "active",     "RAIN RFID readers and antennas"),
    ("PRJ-RFIDCOC-2026", "Zebra Technologies","","Alternative", "evaluating", "RFID handheld readers for COC verification"),

    # PRJ-DURESS-2026 — Retail Duress Response
    ("PRJ-DURESS-2026", "Rave Mobile Safety","","Primary Vendor","active",  "Duress alerting and response platform"),
]


def seed():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    now = datetime.now(timezone.utc).isoformat()

    # Group by project and skip projects already seeded
    projects_with_vendors = {
        r[0] for r in conn.execute("SELECT DISTINCT project_id FROM project_vendors").fetchall()
    }

    inserted = 0
    for proj_id, vname, vid, role, status, notes in INITIAL_VENDORS:
        if proj_id in projects_with_vendors:
            print(f"  SKIP {proj_id} (already has vendors)")
            continue
        conn.execute(
            "INSERT INTO project_vendors (id, project_id, vendor_name, vendor_id, role, status, notes, added_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), proj_id, vname, vid, role, status, notes, now, now),
        )
        inserted += 1
        print(f"  + {proj_id}: {vname} ({status})")

    conn.commit()
    conn.close()
    print(f"\nDone — {inserted} vendor entries inserted.")


if __name__ == "__main__":
    seed()