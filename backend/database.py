"""SENTRY Backend — SQLite database setup.

Single-file DB layer. Vendors table matches the frontend's expected schema.
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "sentry.db"

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS vendors (
    id                  TEXT PRIMARY KEY,
    company_name        TEXT NOT NULL,
    company_url         TEXT DEFAULT '',
    category            TEXT DEFAULT 'Other',
    technology_product  TEXT DEFAULT '',
    report_url          TEXT DEFAULT '',
    overall_rating      REAL DEFAULT 0.0,
    vendor_status       TEXT DEFAULT 'Active',
    risk_level          TEXT DEFAULT 'Medium',
    last_assessed       TEXT DEFAULT '',
    has_var             INTEGER DEFAULT 0,
    description         TEXT DEFAULT '',
    founded_year        TEXT DEFAULT '',
    hq_location         TEXT DEFAULT '',
    business_owner      TEXT DEFAULT '',
    sourcing_manager    TEXT DEFAULT '',
    deployment_status   TEXT DEFAULT 'Prospect',
    hosting_type        TEXT DEFAULT '',
    data_classification TEXT DEFAULT 'Internal',
    vendor_highlight    TEXT DEFAULT '',
    pros                TEXT DEFAULT '',
    cons                TEXT DEFAULT '',
    concerns            TEXT DEFAULT '',
    use_cases           TEXT DEFAULT '',
    value_to_walmart    TEXT DEFAULT '',
    maturity_level      TEXT DEFAULT ''
);
"""

CREATE_VAR_REPORTS = """
CREATE TABLE IF NOT EXISTS var_reports (
    id                   TEXT PRIMARY KEY,
    vendor_id            TEXT NOT NULL REFERENCES vendors(id),
    filename             TEXT NOT NULL,
    sharepoint_url       TEXT DEFAULT '',
    report_date          TEXT DEFAULT '',
    report_version       TEXT DEFAULT 'v1',
    report_type          TEXT DEFAULT 'Detailed',
    overall_score        REAL,
    decision_band        TEXT DEFAULT '',
    compliance_score     REAL,
    risk_score           REAL,
    maturity_score       REAL,
    integration_score    REAL,
    roi_score            REAL,
    viability_score      REAL,
    differentiation_score REAL,
    cloud_dep_score      REAL,
    match_method         TEXT DEFAULT 'manual',
    created_at           TEXT DEFAULT (datetime('now'))
);
"""

CREATE_HIGHLIGHTS = """
CREATE TABLE IF NOT EXISTS vendor_highlights (
    id                      TEXT PRIMARY KEY,
    vendor_id               TEXT NOT NULL REFERENCES vendors(id),
    source_file             TEXT NOT NULL,
    assessment_date         TEXT DEFAULT '',
    product_name            TEXT DEFAULT '',
    pre_assessment_score    REAL,
    pre_assessment_decision TEXT DEFAULT '',
    maturity_level          TEXT DEFAULT '',
    initial_assessment      TEXT DEFAULT '',
    technical_assessment    TEXT DEFAULT '',
    notes                   TEXT DEFAULT ''
);
"""


def get_connection() -> sqlite3.Connection:
    """Return a connection with row-factory for dict-like access.

    timeout=30  — wait up to 30 s for a write-lock to clear before raising
                  OperationalError; the default of 5 s was too short for
                  concurrent FastAPI thread-pool requests and caused the
                  'database is locked' 500s that silently broke the UI.
    check_same_thread=False — required because FastAPI dispatches each
                  request on a different thread from its thread-pool.
    """
    conn = sqlite3.connect(str(DB_PATH), timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # WAL mode: readers don't block writers and vice versa.  Set it every
    # connection — it's a no-op if already in WAL mode, but harmless.
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")   # belt-and-suspenders: 30 s
    conn.execute("PRAGMA synchronous=NORMAL")   # safe + faster than FULL
    return conn


CREATE_INCIDENTS = """
CREATE TABLE IF NOT EXISTS incidents (
    id                  TEXT PRIMARY KEY,
    incident_date       TEXT DEFAULT '',
    incident_type       TEXT DEFAULT 'Other',
    severity            TEXT DEFAULT 'Medium',
    location            TEXT DEFAULT '',
    region              TEXT DEFAULT 'Other',
    country             TEXT DEFAULT 'USA',
    summary             TEXT DEFAULT '',
    impact              TEXT DEFAULT '',
    recommended_action  TEXT DEFAULT '',
    source_url          TEXT DEFAULT '',
    tags                TEXT DEFAULT '',
    source_file         TEXT DEFAULT '',
    created_at          TEXT DEFAULT (datetime('now'))
);
"""


CREATE_PROJECTS = """
CREATE TABLE IF NOT EXISTS projects (
    project_id          TEXT PRIMARY KEY,
    project_name        TEXT NOT NULL,
    summary             TEXT DEFAULT '',
    managing_unit       TEXT DEFAULT '',
    lifecycle_state     TEXT DEFAULT 'active',
    health              TEXT DEFAULT 'green',
    current_phase       TEXT DEFAULT 'Intake',
    est_phase_index     INTEGER DEFAULT 1,
    risk_score          INTEGER DEFAULT 0,
    sensitivity         TEXT DEFAULT 'internal',
    tags                TEXT DEFAULT '',
    progress_pct        INTEGER DEFAULT 0,
    next_milestone      TEXT DEFAULT '',
    next_due_date       TEXT DEFAULT '',
    blockers_count      INTEGER DEFAULT 0,
    last_update_at      TEXT DEFAULT (datetime('now')),
    last_update_by      TEXT DEFAULT '',
    est_cost            TEXT DEFAULT '',
    business_owner      TEXT DEFAULT '',
    -- Compliance artifacts (Phase 3: NDA, Phase 6: ERPA/APM/SSP)
    nda_numbers         TEXT DEFAULT '[]',
    erpa_number         TEXT DEFAULT '',
    erpa_status         TEXT DEFAULT 'not_started',
    apm_number          TEXT DEFAULT '',
    apm_status          TEXT DEFAULT 'not_started',
    ssp_number          TEXT DEFAULT '',
    ssp_status          TEXT DEFAULT 'not_started',
    compliance_notes    TEXT DEFAULT '',
    exit_reason         TEXT DEFAULT '',
    -- Phase gate tracking (JSON array of {phase_index, entered_at, gate_decision, notes})
    phase_history       TEXT DEFAULT '[]',
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now')),
    -- Multi-vendor compliance entries (JSON arrays, Phase 6)
    apm_entries         TEXT DEFAULT '[]',
    erpa_entries        TEXT DEFAULT '[]',
    ssp_entries         TEXT DEFAULT '[]'
);
"""


CREATE_PROJECT_VENDORS = """
CREATE TABLE IF NOT EXISTS project_vendors (
    id           TEXT PRIMARY KEY,
    project_id   TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    vendor_name  TEXT NOT NULL,
    vendor_id    TEXT DEFAULT '',
    role         TEXT DEFAULT 'Vendor',
    status       TEXT DEFAULT 'active',
    notes        TEXT DEFAULT '',
    added_at     TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
);
"""


def init_db() -> None:
    """Create tables if they don't exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        conn.execute(CREATE_TABLE)
        conn.execute(CREATE_VAR_REPORTS)
        conn.execute(CREATE_HIGHLIGHTS)
        conn.execute(CREATE_INCIDENTS)
        conn.execute(CREATE_PROJECTS)
        conn.execute(CREATE_PROJECT_VENDORS)
        # Safe migrations — add any columns that may be missing from older DBs
        cols = {r[1] for r in conn.execute("PRAGMA table_info(projects)").fetchall()}
        migrations = [
            ("exit_reason",  "ALTER TABLE projects ADD COLUMN exit_reason TEXT DEFAULT ''"),
            ("apm_entries",  "ALTER TABLE projects ADD COLUMN apm_entries TEXT DEFAULT '[]'"),
            ("erpa_entries", "ALTER TABLE projects ADD COLUMN erpa_entries TEXT DEFAULT '[]'"),
            ("ssp_entries",  "ALTER TABLE projects ADD COLUMN ssp_entries TEXT DEFAULT '[]'"),
        ]
        for col_name, sql in migrations:
            if col_name not in cols:
                conn.execute(sql)
        conn.commit()
