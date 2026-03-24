"""Seed the projects table from the CSV + MsgGraph compliance scan results.

Run once (or re-run to upsert) after init_db():
    cd backend
    .venv/Scripts/python seed_projects.py
"""
import json
import sys
from pathlib import Path

# Allow running from project root too
sys.path.insert(0, str(Path(__file__).parent))

from database import get_connection, init_db

# ── EST Phase index helper ─────────────────────────────────────────────────────────
_PHASE_MAP = {
    "intake": 1, "var": 1, "vendor assessment": 1,
    "vendor engagement": 2, "technical assessment": 4,
    "nda": 3, "legal": 3,
    "rom": 4,
    "lab testing": 5, "lab": 5,
    "apm": 6, "erpa": 6, "ssp": 6,
    "pilot": 7, "lao": 7,
    "bau": 8, "program": 8, "completed": 8, "ended": 8,
}


def phase_index(label: str) -> int:
    key = label.strip().lower()
    if key in _PHASE_MAP:
        return _PHASE_MAP[key]
    for token, idx in _PHASE_MAP.items():
        if token in key:
            return idx
    return 1


# ── Compliance metadata (from MsgGraph inbox + OneDrive scan) ──────────────────
#
# Format for nda_numbers:
#   [{"nda_number": "#XXXXX", "vendor": "...", "status": "executed"|"pending"|"via_msa", "note": "..."}]

COMPLIANCE: dict[str, dict] = {
    "PRJ-UAS-2025": {
        "nda_numbers": [
            {"nda_number": "#92431",  "vendor": "Sunflower Labs",         "status": "executed", "note": "Outdoor drone perimeter security — DC, retail & Home Office"},
            {"nda_number": "#92435",  "vendor": "Nightingale Security",   "status": "executed", "note": "Autonomous drone perimeter — DC deployments"},
            {"nda_number": "#99944",  "vendor": "Brecourt Solutions LLC", "status": "executed", "note": "Indoor Aerial Security Pilot — may be separate sub-project"},
            {"nda_number": "#108317", "vendor": "Fotokite US LLC",        "status": "executed", "note": "UAS/drone evaluation — confirmed Feb 25 2026"},
        ],
        "ssp_status": "in_progress",
        "compliance_notes": "⚠️ 4 vendor NDAs under one project code. Brecourt (#99944) references Indoor Aerial — confirm if separate PRJ. Sunflower Labs SSP docs submitted Mar 18 2026 to Prakash Singh (InfoSec).",
    },
    "PRJ-MST-2025": {
        "nda_numbers": [
            {"nda_number": "#89604", "vendor": "Backstreet Surveillance",         "status": "executed", "note": "MST competitive eval — Jul 21 2025"},
            {"nda_number": "#89615", "vendor": "Stallion Infrastructure",          "status": "executed", "note": "MST competitive eval — Jul 21 2025"},
            {"nda_number": "#89616", "vendor": "Robotic Assistance Devices (RAD)", "status": "executed", "note": "MST competitive eval — Jul 21 2025"},
            {"nda_number": "#83238", "vendor": "Sun Surveillance Inc.",            "status": "executed", "note": "Solar CCTV eval — May 12 2025 (predates MST cohort; submitted by Cody Smith)"},
        ],
        "compliance_notes": "All 4 NDAs included per user decision. NDA #83238 (Sun Surveillance) predates MST cohort by ~2 months and was categorized as solar CCTV — monitor if this should split to separate PRJ.",
    },
    "PRJ-RETAILCV-2026": {
        "nda_numbers": [],
        "erpa_status": "in_progress",
        "ssp_status":  "in_progress",
        "compliance_notes": "No standalone NDA found for Fusus/RTCC — may operate under existing agreement. ERPA submitted Jan 29 2026 by Cody Smith (no number confirmed). SSP in processing as of Feb 16 2026. Follow up: Cody Smith + Prakash Singh (InfoSec). Allison Dolan coordinating legal review with David James.",
    },
    "PRJ-CUAS-2025": {
        "nda_numbers": [
            {"nda_number": "", "vendor": "Skydio (via Axon MSA/ISA)", "status": "via_msa", "note": "No standalone NDA — covered under Axon existing MSA/ISA per Cody Smith confirmation"},
        ],
        "ssp_status": "in_progress",
        "compliance_notes": "Skydio has no standalone NDA — routed via Axon MSA/ISA. SSP initiated Sep 12 2025 with Prakash Singh (InfoSec), Chris Epling CC’d. No SSP number confirmed yet.",
    },
    "PRJ-BWC-2025": {
        "nda_numbers": [],
        "compliance_notes": "No NDA, SSP, ERPA, or APM found. Brandon Hodges + Jeremy Ratliff/Matt Baughman are operational contacts. VAR completed Jan 7 2026 for 8 vendors (IBM, BrightAI, GIDR.ai, Nano Seimitsu, SEW AI, Overview.ai, Matroid, Baumann Automation). Initiate NDA process — project is at Phase 4 (Technical Assessment).",
    },
    # All remaining projects have zero compliance artifacts — MISSING badges shown
    "PRJ-SECROBOT-2025": {"nda_numbers": [], "compliance_notes": "Ended project. No compliance artifacts found. Verify if Knightscope or other vendor NDAs exist offline."},
    "PRJ-IDENTITY-2026": {"nda_numbers": [], "compliance_notes": "No compliance artifacts found. Project at Phase 4 — NDA required."},
    "PRJ-BOTDEF-2026":   {"nda_numbers": [], "compliance_notes": "Darwinium technical deep dive Sep 29 2025 — no Coupa NDA found. Initiate NDA submission."},
    "PRJ-RETURNS-2026":  {"nda_numbers": [], "compliance_notes": "No compliance artifacts found. Project at Phase 4."},
    "PRJ-SHRINK-2026":   {"nda_numbers": [], "compliance_notes": "No compliance artifacts found. Project at Phase 4."},
    "PRJ-RFIDCOC-2026":  {"nda_numbers": [], "compliance_notes": "No compliance artifacts found. Project at Phase 4."},
    "PRJ-DURESS-2026":   {"nda_numbers": [], "compliance_notes": "No compliance artifacts found. PIA required before progressing."},
    "PRJ-EPCIS-2026":    {"nda_numbers": [], "compliance_notes": "No compliance artifacts found. Early-stage Phase 1."},
}

# ── Project seed data (mirrors CSV + enriched compliance fields) ───────────────
PROJECTS = [
    {
        "project_id":     "PRJ-SECROBOT-2025",
        "project_name":   "Security Robotics - Autonomous Sentry Patrols",
        "summary":        "Deploy autonomous security sentry robots to patrol Walmart parking lots and perimeters to enhance associate and customer safety (86% of incidents happen in parking lots).",
        "managing_unit":  "Global Security - Enterprise Security Technology",
        "lifecycle_state": "Ended",
        "health":         "green",
        "current_phase":  "Completed",
        "risk_score":     3,
        "sensitivity":    "confidential",
        "tags":           "robotics;parking-lot-security;autonomous-patrol;physical-security;perimeter-security",
        "progress_pct":   75,
        "next_milestone": "KABAM Lab Testing",
        "next_due_date":  "2026-06-30",
        "blockers_count": 0,
        "last_update_at": "2026-02-28T20:30:00Z",
        "last_update_by": "Cody.Smith@walmart.com",
        "business_owner": "Cody Smith",
    },
    {
        "project_id":     "PRJ-BWC-2025",
        "project_name":   "Body-Worn Cameras (BWC) + Incident Reporting Metadata",
        "summary":        "Standardized incident reporting as evidence program with sealed evidence packages (BWC + digital evidence) with audit-grade chain-of-custody and tiered retention and legal-hold execution.",
        "managing_unit":  "Global Security - Asset Protection & Enterprise Security Technology",
        "lifecycle_state": "active",
        "health":         "yellow",
        "current_phase":  "Technical Assessment",
        "risk_score":     5,
        "sensitivity":    "confidential",
        "tags":           "bwc;body-worn-camera;evidence-governance;chain-of-custody;incident-reporting;legal-hold;redaction;privacy;life-safety",
        "progress_pct":   65,
        "next_milestone": "Privacy Impact Assessment (PIA) Completion",
        "next_due_date":  "2026-04-30",
        "blockers_count": 1,
        "last_update_at": "2026-02-28T21:00:00Z",
        "last_update_by": "Jason.Wilbur@walmart.com",
        "business_owner": "Brandon Hodges",
    },
    {
        "project_id":     "PRJ-CUAS-2025",
        "project_name":   "Counter-UAS / Drone Detection (Detection & Intelligence Only)",
        "summary":        "Detect drones as leading indicator for perimeter security — build low-noise alert/evidence workflow for store and distribution center protection (detection-only, no interdiction).",
        "managing_unit":  "Global Security - Enterprise Security Technology",
        "lifecycle_state": "On Hold",
        "health":         "red",
        "current_phase":  "Intake",
        "risk_score":     3,
        "sensitivity":    "confidential",
        "tags":           "counter-uas;drone-detection;perimeter-security;rf-detection;passive-detection;pilot;physical-security",
        "progress_pct":   40,
        "next_milestone": "Pilot Completion & Scale Decision",
        "next_due_date":  "2026-07-31",
        "blockers_count": 0,
        "last_update_at": "2026-02-28T21:30:00Z",
        "last_update_by": "Jason.Wilbur@walmart.com",
        "business_owner": "Jason Wilbur",
    },
    {
        "project_id":     "PRJ-IDENTITY-2026",
        "project_name":   "Identity Hardening & Telemetry (Passkeys/MFA)",
        "summary":        "Harden identity authentication with passkeys/FIDO2 for workforce and deploy comprehensive telemetry for risk-based MFA — targeting >90% workforce coverage and ~100% privileged users.",
        "managing_unit":  "Global Security - Identity & Access Management",
        "lifecycle_state": "active",
        "health":         "green",
        "current_phase":  "Technical Assessment",
        "risk_score":     3,
        "sensitivity":    "confidential",
        "tags":           "identity;mfa;passkeys;fido2;telemetry;authentication;zero-trust",
        "progress_pct":   60,
        "next_milestone": "Entra ID Integration Architecture Finalized",
        "next_due_date":  "2026-05-31",
        "blockers_count": 0,
        "last_update_at": "2026-02-28T22:00:00Z",
        "last_update_by": "Jason.Wilbur@walmart.com",
        "business_owner": "Jason Wilbur",
    },
    {
        "project_id":     "PRJ-BOTDEF-2026",
        "project_name":   "Bot/Abuse Defense (Customer + Internal)",
        "summary":        "Deploy bot detection and abuse defense for customer-facing and internal applications — targeting <0.01% insult rate with ATO reduction and scraping prevention.",
        "managing_unit":  "Global Security - Application Security",
        "lifecycle_state": "active",
        "health":         "green",
        "current_phase":  "ROM",
        "risk_score":     3,
        "sensitivity":    "internal",
        "tags":           "bot-defense;abuse-detection;ato-prevention;scraping;captcha;fraud",
        "progress_pct":   50,
        "next_milestone": "Vendor Selection (Cloudflare vs DataDome)",
        "next_due_date":  "2026-05-15",
        "blockers_count": 0,
        "last_update_at": "2026-02-28T22:00:00Z",
        "last_update_by": "Jason.Wilbur@walmart.com",
        "business_owner": "Jason Wilbur",
    },
    {
        "project_id":     "PRJ-RETURNS-2026",
        "project_name":   "Returns Fraud (Entity Resolution + Graph)",
        "summary":        "Deploy entity resolution and graph analytics to detect returns fraud rings — track loss prevented $ and precision/hit-rate with explainable AI.",
        "managing_unit":  "Global Security - Loss Prevention & Fraud",
        "lifecycle_state": "active",
        "health":         "green",
        "current_phase":  "Technical Assessment",
        "risk_score":     3,
        "sensitivity":    "confidential",
        "tags":           "returns-fraud;entity-resolution;graph-analytics;fraud-rings;loss-prevention",
        "progress_pct":   55,
        "next_milestone": "Pilot Planning (Graph + Entity Resolution)",
        "next_due_date":  "2026-06-30",
        "blockers_count": 0,
        "last_update_at": "2026-02-28T22:00:00Z",
        "last_update_by": "Jason.Wilbur@walmart.com",
        "business_owner": "Jason Wilbur",
    },
    {
        "project_id":     "PRJ-SHRINK-2026",
        "project_name":   "Shrink/TLog Analytics (Signal Fusion)",
        "summary":        "Deploy transaction log analytics and signal fusion to detect shrink patterns — targeting alert burden reduction and intervention success rate improvement.",
        "managing_unit":  "Global Security - Loss Prevention & Shrink",
        "lifecycle_state": "active",
        "health":         "green",
        "current_phase":  "ROM",
        "risk_score":     3,
        "sensitivity":    "confidential",
        "tags":           "shrink;tlog-analytics;signal-fusion;loss-prevention;self-checkout",
        "progress_pct":   45,
        "next_milestone": "ROM Finalization & Vendor Shortlist",
        "next_due_date":  "2026-05-31",
        "blockers_count": 0,
        "last_update_at": "2026-02-28T22:00:00Z",
        "last_update_by": "Jason.Wilbur@walmart.com",
        "business_owner": "Jason Wilbur",
    },
    {
        "project_id":     "PRJ-RETAILCV-2026",
        "project_name":   "Retail CV (Edge Non-Biometric)",
        "summary":        "Deploy edge-based computer vision for retail events (non-biometric) — targeting <500ms latency and <5% FPR with >90% recall on verified events.",
        "managing_unit":  "Global Security - Computer Vision & Analytics",
        "lifecycle_state": "active",
        "health":         "yellow",
        "current_phase":  "Technical Assessment",
        "risk_score":     5,
        "sensitivity":    "confidential",
        "tags":           "retail-cv;computer-vision;edge-computing;non-biometric;privacy;video-analytics",
        "progress_pct":   50,
        "next_milestone": "Vendor Selection & Privacy Scope Lock",
        "next_due_date":  "2026-06-30",
        "blockers_count": 1,
        "last_update_at": "2026-02-28T22:00:00Z",
        "last_update_by": "Jason.Wilbur@walmart.com",
        "business_owner": "Cody Smith",
    },
    {
        "project_id":     "PRJ-RFIDCOC-2026",
        "project_name":   "RFID Chain-of-Custody (EPC as EAS)",
        "summary":        "Deploy RFID-based chain-of-custody tracking using EPC as electronic article surveillance — targeting exception precision and shrink impact measurement.",
        "managing_unit":  "Global Security - Loss Prevention & RFID",
        "lifecycle_state": "active",
        "health":         "green",
        "current_phase":  "ROM",
        "risk_score":     4,
        "sensitivity":    "confidential",
        "tags":           "rfid;chain-of-custody;epc;eas;loss-prevention;behavioral-tracking",
        "progress_pct":   40,
        "next_milestone": "Privacy Controls & Read Reliability Testing",
        "next_due_date":  "2026-07-31",
        "blockers_count": 0,
        "last_update_at": "2026-02-28T22:00:00Z",
        "last_update_by": "Jason.Wilbur@walmart.com",
        "business_owner": "Jason Wilbur",
    },
    {
        "project_id":     "PRJ-DURESS-2026",
        "project_name":   "Retail Duress Response Analytics",
        "summary":        "Deploy duress response analytics to improve response time and reduce false alarm rate while maintaining privacy compliance and minimizing surveillance optics.",
        "managing_unit":  "Global Security - Duress & Emergency Response",
        "lifecycle_state": "blocked",
        "health":         "red",
        "current_phase":  "Intake",
        "risk_score":     4,
        "sensitivity":    "confidential",
        "tags":           "duress;emergency-response;privacy;workforce-surveillance;panic-button",
        "progress_pct":   10,
        "next_milestone": "Privacy Impact Assessment (PIA) REQUIRED",
        "next_due_date":  "2026-05-31",
        "blockers_count": 1,
        "last_update_at": "2026-02-28T22:00:00Z",
        "last_update_by": "Jason.Wilbur@walmart.com",
        "business_owner": "Jason Wilbur",
    },
    {
        "project_id":     "PRJ-EPCIS-2026",
        "project_name":   "EPCIS 2.0 + Digital Product Passport",
        "summary":        "Implement EPCIS 2.0 and Digital Product Passport for supply chain traceability — targeting supplier onboarding time reduction and valid event percentage improvement.",
        "managing_unit":  "Global Security - Supply Chain Security",
        "lifecycle_state": "active",
        "health":         "green",
        "current_phase":  "Intake",
        "risk_score":     2,
        "sensitivity":    "internal",
        "tags":           "epcis;digital-product-passport;supply-chain;traceability;gs1;sustainability",
        "progress_pct":   25,
        "next_milestone": "MVP Architecture & Supplier Onboarding Plan",
        "next_due_date":  "2026-09-30",
        "blockers_count": 0,
        "last_update_at": "2026-02-28T22:00:00Z",
        "last_update_by": "Jason.Wilbur@walmart.com",
        "business_owner": "Jason Wilbur",
    },
    {
        "project_id":     "PRJ-UAS-2025",
        "project_name":   "UAS — Drone in a Box Security Solution",
        "summary":        "Deploy Drone-in-a-Box UAS at retail, home office and supply chain to determine effectiveness for autonomous perimeter security coverage.",
        "managing_unit":  "Global Security - Supply Chain Security",
        "lifecycle_state": "active",
        "health":         "green",
        "current_phase":  "Pilot",
        "risk_score":     3,
        "sensitivity":    "confidential",
        "tags":           "uas;drone;drone-in-a-box;perimeter-security;autonomous;sunflower-labs",
        "progress_pct":   75,
        "next_milestone": "Pilot KPI Review & LAO Extension Decision",
        "next_due_date":  "2026-06-30",
        "blockers_count": 0,
        "last_update_at": "2026-02-28T22:00:00Z",
        "last_update_by": "Jason.Wilbur@walmart.com",
        "business_owner": "Cody Smith",
    },
    {
        "project_id":     "PRJ-MST-2025",
        "project_name":   "Mobile Surveillance Trailer (MST)",
        "summary":        "Assess and test better Mobile Surveillance Trailer options for the Walmart environment — targeting improved coverage and lower total cost vs. current fleet.",
        "managing_unit":  "Global Security - Supply Chain Security",
        "lifecycle_state": "active",
        "health":         "green",
        "current_phase":  "Lab Testing",
        "risk_score":     2,
        "sensitivity":    "internal",
        "tags":           "mst;mobile-surveillance;trailer;physical-security;parking",
        "progress_pct":   86,
        "next_milestone": "Lab Testing Report & Vendor Recommendation",
        "next_due_date":  "2026-04-30",
        "blockers_count": 0,
        "last_update_at": "2026-02-28T22:00:00Z",
        "last_update_by": "Cody.Smith@walmart.com",
        "business_owner": "Cody Smith",
    },
]


def seed() -> None:
    init_db()
    with get_connection() as conn:
        for p in PROJECTS:
            pid = p["project_id"]
            compliance = COMPLIANCE.get(pid, {})

            nda_json   = json.dumps(compliance.get("nda_numbers", []))
            erpa_status = compliance.get("erpa_status", "not_started")
            ssp_status  = compliance.get("ssp_status",  "not_started")
            apm_status  = compliance.get("apm_status",  "not_started")
            notes       = compliance.get("compliance_notes", "")
            idx         = phase_index(p["current_phase"])

            conn.execute(
                """
                INSERT INTO projects (
                    project_id, project_name, summary, managing_unit,
                    lifecycle_state, health, current_phase, est_phase_index,
                    risk_score, sensitivity, tags, progress_pct,
                    next_milestone, next_due_date, blockers_count,
                    last_update_at, last_update_by, business_owner,
                    nda_numbers, erpa_status, ssp_status, apm_status, compliance_notes
                ) VALUES (
                    :project_id, :project_name, :summary, :managing_unit,
                    :lifecycle_state, :health, :current_phase, :est_phase_index,
                    :risk_score, :sensitivity, :tags, :progress_pct,
                    :next_milestone, :next_due_date, :blockers_count,
                    :last_update_at, :last_update_by, :business_owner,
                    :nda_numbers, :erpa_status, :ssp_status, :apm_status, :compliance_notes
                )
                ON CONFLICT(project_id) DO UPDATE SET
                    project_name   = excluded.project_name,
                    summary        = excluded.summary,
                    managing_unit  = excluded.managing_unit,
                    lifecycle_state= excluded.lifecycle_state,
                    health         = excluded.health,
                    current_phase  = excluded.current_phase,
                    est_phase_index= excluded.est_phase_index,
                    risk_score     = excluded.risk_score,
                    sensitivity    = excluded.sensitivity,
                    tags           = excluded.tags,
                    progress_pct   = excluded.progress_pct,
                    next_milestone = excluded.next_milestone,
                    next_due_date  = excluded.next_due_date,
                    blockers_count = excluded.blockers_count,
                    last_update_at = excluded.last_update_at,
                    last_update_by = excluded.last_update_by,
                    business_owner = excluded.business_owner,
                    nda_numbers    = excluded.nda_numbers,
                    erpa_status    = excluded.erpa_status,
                    ssp_status     = excluded.ssp_status,
                    apm_status     = excluded.apm_status,
                    compliance_notes = excluded.compliance_notes,
                    updated_at     = datetime('now')
                """,
                {
                    **p,
                    "est_phase_index": idx,
                    "nda_numbers":     nda_json,
                    "erpa_status":     erpa_status,
                    "ssp_status":      ssp_status,
                    "apm_status":      apm_status,
                    "compliance_notes": notes,
                },
            )
        conn.commit()
    print(f"[seed_projects] ✓ Seeded/updated {len(PROJECTS)} projects.")


if __name__ == "__main__":
    seed()
