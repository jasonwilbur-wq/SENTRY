"""Seed the projects table from projects.csv + known compliance metadata.

Run from: C:\\Users\\j0w16ja\\SENTRY_v2-main\\backend\\
    python seed_projects_compliance.py
"""
import json
import sqlite3
import csv
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "sentry.db"
CSV_PATH = Path(__file__).parent.parent / "data" / "projects.csv"

# ── Known compliance metadata (Phase 3: NDA, Phase 6: APM/ERPA/SSP) ────────
# Source: SENTRY_STATUS.md + stakeholder emails
COMPLIANCE: dict[str, dict] = {
    "PRJ-UAS-2025": {
        "est_phase_index": 7,
        "current_phase": "Pilot",
        "erpa_number": "",
        "erpa_status": "in_progress",
        "apm_number": "",
        "apm_status": "in_progress",
        "ssp_number": "",
        "ssp_status": "in_progress",
        "nda_numbers": json.dumps([]),
    },
    "PRJ-SECROBOT-2025": {
        "est_phase_index": 5,
        "current_phase": "Lab Testing",
        "erpa_number": "",
        "erpa_status": "not_started",
        "apm_number": "",
        "apm_status": "not_started",
        "ssp_number": "",
        "ssp_status": "not_started",
        "nda_numbers": json.dumps([]),
    },
    "PRJ-MST-2025": {
        "est_phase_index": 5,
        "current_phase": "Lab Testing",
        "erpa_number": "",
        "erpa_status": "not_started",
        "apm_number": "",
        "apm_status": "not_started",
        "ssp_number": "",
        "ssp_status": "not_started",
        "nda_numbers": json.dumps([]),
    },
    "PRJ-BWC-2025": {
        "est_phase_index": 4,
        "current_phase": "Technical Assessment",
        "erpa_number": "",
        "erpa_status": "in_progress",
        "apm_number": "",
        "apm_status": "not_started",
        "ssp_number": "",
        "ssp_status": "not_started",
        "nda_numbers": json.dumps([]),
    },
    "PRJ-CUAS-2025": {
        "est_phase_index": 1,
        "current_phase": "Intake",
        "erpa_number": "",
        "erpa_status": "not_started",
        "apm_number": "",
        "apm_status": "arted",
        "ssp_number": "",
        "ssp_status": "not_started",
        "nda_numbers": json.dumps([]),
    },
    "PRJ-IDENTITY-2026": {
        "est_phase_index": 4,
        "current_phase": "Technical Assessment",
        "erpa_number": "",
        "erpa_status": "not_started",
        "apm_number": "",
        "apm_status": "not_started",
        "ssp_number": "",
        "ssp_status": "not_started",
        "nda_numbers": json.dumps([]),
    },
    "PRJ-BOTDEF-2026": {
        "est_phase_index": 4,
        "current_phase": "ROM",
        "erpa_number": "",
        "erpa_status": "not_started",
        "apm_number": "",
        "apm_status": "not_started",
        "ssp_number": "",
        "ssp_status": "not_started",
        "nda_numbers": json.dumps([]),
    },
    "PRJ-RETURNS-2026": {
        "est_phase_index": 4,
        "current_phase": "Technical Assessment",
        "erpa_number": "",
        "erpa_status": "not_started",
        "apm_number": "",
        "apm_status": "not_started",
        "ssp_number": "",
        "ssp_status": "not_started",
        "nda_numbers": json.dumps([]),
    },
    "PRJ-SHRINK-2026": {
        "est_phase_index": 4,
        "current_phase": "ROM",
        "erpa_number": "",
        "erpa_status": "not_started",
        "apm_number": "",
        "apm_status": "not_started",
        "ssp_number": "",
        "ssp_status": "not_started",
        "nda_numbers": json.dumps([]),
    },
    "PRJ-RETAILCV-2026": {
        "est_phase_index": 4,
        "current_phase": "Technical Assessment",
        "erpa_number": "",
        "erpa_status": "not_started",
        "apm_number": "",
        "apm_status": "not_started",
        "ssp_number": "",
        "ssp_status": "not_started",
        "nda_numbers": json.dumps([]),
    },
    "PRJ-RFIDCOC-2026": {
        "est_phase_index": 4,
        "current_phase": "ROM",
        "erpa_number": "",
        "erpa_status": "not_started",
        "apm_number": "",
        "apm_status": "not_started",
        "ssp_number": "",
        "ssp_status": "not_started",
        "nda_numbers": json.dumps([]),
    },
    "PRJ-DURESS-2026": {
        "est_phase_index": 1,
        "current_phase": "Intake",
        "erpa_number": "",
        "erpa_status": "not_started",
        "apm_number": "",
        "apm_status": "not_started",
        "ssp_number": "",
        "ssp_status": "not_started",
        "nda_numbers": json.dumps([]),
    },
    "PRJ-EPCIS-2026": {
        "est_phase_index": 1,
        "current_phase": "Intake",
        "erpa_number": "",
        "erpa_status": "not_started",
        "apm_number": "",
        "apm_status": "not_started",
        "ssp_number": "",
        "ssp_status": "not_started",
        "nda_numbers": json.dumps([]),
    },
}

_PHASE_MAP: dict[str, int] = {
    "intake": 1, "var": 1,
    "vendor engagement": 2,
    "nda": 3, "legal": 3,
    "rom": 4, "technical assessment": 4,
    "lab testing": 5, "lab": 5, "poc": 5, "pot": 5,
    "apm": 6, "erpa": 6, "ssp": 6, "compliance": 6,
    "pilot": 7, "lao": 7,
    "bau": 8, "program": 8, "completed": 8,
}


def phase_to_index(phase: str) -> int:
    lower = phase.lower().strip()
    for k, v in _PHASE_MAP.items():
        if k in lower:
            return v
    return 1


def main():
    print(f"DB: {DB_PATH}")
    print(f"CSV: {CSV_PATH}")

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    # Ensure table exists
    conn.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            project_id TEXT PRIMARY KEY, project_name TEXT NOT NULL,
            summary TEXT DEFAULT '', managing_unit TEXT DEFAULT '',
            lifecycle_state TEXT DEFAULT 'active', health TEXT DEFAULT 'green',
            current_phase TEXT DEFAULT 'Intake', est_phase_index INTEGER DEFAULT 1,
            risk_score INTEGER DEFAULT 0, sensitivity TEXT DEFAULT 'internal',
            tags TEXT DEFAULT '', progress_pct INTEGER DEFAULT 0,
            next_milestone TEXT DEFAULT '', next_due_date TEXT DEFAULT '',
            blockers_count INTEGER DEFAULT 0,
            last_update_at TEXT DEFAULT (datetime('now')),
            last_update_by TEXT DEFAULT '', est_cost TEXT DEFAULT '',
            business_owner TEXT DEFAULT '',
            nda_numbers TEXT DEFAULT '[]', erpa_number TEXT DEFAULT '',
            erpa_status TEXT DEFAULT 'not_started', apm_number TEXT DEFAULT '',
            apm_status TEXT DEFAULT 'not_started', ssp_number TEXT DEFAULT '',
            ssp_status TEXT DEFAULT 'not_started', compliance_notes TEXT DEFAULT '',
            phase_history TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()

    inserted = 0
    updated = 0

    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pid = row.get('project_id', '').strip()
            if not pid:
                continue

            phase_text = (row.get('current_phase') or '').strip()
            comp = COMPLIANCE.get(pid, {})

            # Check if row exists
            existing = conn.execute('SELECT project_id FROM projects WHERE project_id=?', (pid,)).fetchone()

            fields = {
                'project_id':     pid,
                'project_name':   (row.get('project_name') or '').strip(),
                'summary':        (row.get('summary') or '').strip(),
                'managing_unit':  (row.get('managing_unit') or '').strip(),
                'lifecycle_state':(row.get('lifecycle_state') or 'active').strip(),
                'health':         (row.get('health') or 'green').strip(),
                'current_phase':  comp.get('current_phase', phase_text) or phase_text,
                'est_phase_index':comp.get('est_phase_index', phase_to_index(phase_text)),
                'risk_score':     int(row.get('risk_score') or 0),
                'sensitivity':    (row.get('sensitivity') or 'internal').strip(),
                'tags':           (row.get('tags') or '').strip(),
                'progress_pct':   int(float(row.get('progress_pct') or 0)),
                'next_milestone': (row.get('next_milestone') or '').strip(),
                'next_due_date':  (row.get('next_due_date') or '').strip(),
                'blockers_count': int(row.get('blockers_count') or 0),
                'last_update_at': (row.get('last_update_at') or '').strip(),
                'last_update_by': (row.get('last_update_by') or '').strip(),
                'est_cost':       (row.get('est_cost') or '').strip(),
                'business_owner': '',
                'nda_numbers':    comp.get('nda_numbers', '[]'),
                'erpa_number':    comp.get('erpa_number', (row.get('ERPA') or '').strip()),
                'erpa_status':    comp.get('erpa_status', 'not_started'),
                'apm_number':     comp.get('apm_number', (row.get('APM') or '').strip()),
                'apm_status':     comp.get('apm_status', 'not_started'),
                'ssp_number':     comp.get('ssp_number', (row.get('SSP') or '').strip()),
                'ssp_status':     comp.get('ssp_status', 'not_started'),
                'compliance_notes': '',
                'phase_history':  '[]',
            }

            if existing:
                # Update compliance fields + phase, leave rest intact
                conn.execute("""
                    UPDATE projects SET
                        est_phase_index=:est_phase_index,
                        current_phase=:current_phase,
                        erpa_number=:erpa_number, erpa_status=:erpa_status,
                        apm_number=:apm_number, apm_status=:apm_status,
                        ssp_number=:ssp_number, ssp_status=:ssp_status,
                        nda_numbers=:nda_numbers
                    WHERE project_id=:project_id
                """, fields)
                updated += 1
            else:
                cols = ', '.join(fields.keys())
                placeholders = ', '.join(f':{k}' for k in fields)
                conn.execute(f'INSERT INTO projects ({cols}) VALUES ({placeholders})', fields)
                inserted += 1

    conn.commit()
    conn.close()
    print(f"Done. Inserted: {inserted}, Updated: {updated}")

    # Verify
    conn2 = sqlite3.connect(str(DB_PATH))
    rows = conn2.execute('SELECT project_id, current_phase, est_phase_index, apm_number, erpa_number FROM projects ORDER BY est_phase_index DESC').fetchall()
    print(f"\nAll projects ({len(rows)} total):")
    for r in rows:
        print(f"  {r[0]:<25} phase={r[2]}/8  {r[1]:<25} APM={r[3] or 'TBD'}  ERPA={r[4] or 'TBD'}")
    conn2.close()


if __name__ == '__main__':
    main()
