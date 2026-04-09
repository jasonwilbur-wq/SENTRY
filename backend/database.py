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
    item_id              TEXT DEFAULT '',
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
    extraction_review_status TEXT DEFAULT 'NOT_EXTRACTED',
    extraction_reviewed_by TEXT DEFAULT '',
    extraction_reviewed_at TEXT DEFAULT '',
    extraction_review_note TEXT DEFAULT '',
    extraction_last_run_at TEXT DEFAULT '',
    extraction_last_status TEXT DEFAULT 'NOT_EXTRACTED',
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

CREATE_COMPETITOR_EVENTS = """
CREATE TABLE IF NOT EXISTS competitor_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_date TEXT,
    competitor TEXT,
    event_title TEXT,
    event_type TEXT,
    detailed_description TEXT,
    category TEXT,
    location TEXT,
    security_implication TEXT,
    operational_impact TEXT,
    financial_impact TEXT,
    reputational_impact TEXT,
    source_link TEXT,
    analyst_notes TEXT,
    source_month TEXT,
    deleted_at TEXT DEFAULT NULL,
    confidence_level TEXT DEFAULT '',
    walmart_relevance_score REAL DEFAULT NULL,
    priority_tier TEXT DEFAULT '',
    signal_type TEXT DEFAULT '',
    recommended_owner TEXT DEFAULT '',
    why_walmart_cares TEXT DEFAULT '',
    strategic_score REAL DEFAULT NULL,
    security_score REAL DEFAULT NULL,
    operational_score REAL DEFAULT NULL,
    customer_trust_score REAL DEFAULT NULL,
    novelty_score REAL DEFAULT NULL,
    urgency_score REAL DEFAULT NULL,
    confidence_score REAL DEFAULT NULL,
    escalate_to_cso INTEGER DEFAULT 0,
    score_reason TEXT DEFAULT '',
    confidence_effect TEXT DEFAULT '',
    source_effect TEXT DEFAULT '',
    cso_candidate_reason TEXT DEFAULT '',
    scoring_version TEXT DEFAULT '',
    scored_at TEXT DEFAULT '',
    triage_status TEXT DEFAULT 'UNREVIEWED',
    triaged_by TEXT DEFAULT '',
    triaged_at TEXT DEFAULT '',
    triage_note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
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


CREATE_SERVICE_REQUESTS = """
CREATE TABLE IF NOT EXISTS service_requests (
    id              TEXT PRIMARY KEY,
    ref_id          TEXT NOT NULL UNIQUE,
    request_type    TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'SUBMITTED',
    created_by      TEXT NOT NULL DEFAULT 'anonymous',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_by      TEXT DEFAULT NULL,
    status_note     TEXT DEFAULT '',
    contact_name    TEXT NOT NULL,
    contact_email   TEXT NOT NULL,
    notes           TEXT DEFAULT '',
    vendor_name     TEXT DEFAULT NULL,
    assessment_type TEXT DEFAULT NULL,
    category        TEXT DEFAULT NULL,
    urgency         TEXT DEFAULT NULL,
    preferred_date  TEXT DEFAULT NULL,
    preferred_slot  TEXT DEFAULT NULL,
    equipment       TEXT DEFAULT NULL,
    attendees       INTEGER DEFAULT NULL
);
"""

CREATE_SERVICE_REQUESTS_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_svcreq_ref ON service_requests(ref_id);",
    "CREATE INDEX IF NOT EXISTS idx_svcreq_type ON service_requests(request_type, status);",
    "CREATE INDEX IF NOT EXISTS idx_svcreq_created_by ON service_requests(created_by);",
]


# ══════════════════════════════════════════════════════════════════════════════
# CSO BRIEFING PIPELINE TABLES  (approved MVP spec — do not rename fields)
# ══════════════════════════════════════════════════════════════════════════════

CREATE_CSO_BRIEFS = """
CREATE TABLE IF NOT EXISTS cso_briefs (
    id                 TEXT    PRIMARY KEY,
    title              TEXT    NOT NULL,
    period_start       TEXT    NOT NULL,
    period_end         TEXT    NOT NULL,
    status             TEXT    NOT NULL DEFAULT 'DRAFT',
    created_by         TEXT    NOT NULL,
    created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_by         TEXT    NOT NULL,
    updated_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    submitted_at       TEXT    DEFAULT NULL,
    submitted_by       TEXT    DEFAULT NULL,
    approved_at        TEXT    DEFAULT NULL,
    approved_by        TEXT    DEFAULT NULL,
    published_draft_at TEXT    DEFAULT NULL,
    published_draft_by TEXT    DEFAULT NULL,
    executive_summary  TEXT    DEFAULT '',
    review_notes       TEXT    DEFAULT '',
    quality_gate_result TEXT   DEFAULT '',
    snapshot_version   INTEGER NOT NULL DEFAULT 1
);
"""

CREATE_CSO_BRIEF_ITEMS = """
CREATE TABLE IF NOT EXISTS cso_brief_items (
    id                  TEXT    PRIMARY KEY,
    brief_id            TEXT    NOT NULL REFERENCES cso_briefs(id) ON DELETE CASCADE,
    competitor_event_id INTEGER NOT NULL REFERENCES competitor_events(id),
    rank                INTEGER NOT NULL,
    analyst_commentary  TEXT    DEFAULT '',
    uncertainty_note    TEXT    DEFAULT '',
    owner_assignment    TEXT    DEFAULT '',
    include_in_summary  INTEGER NOT NULL DEFAULT 1,
    frozen_payload      TEXT    NOT NULL,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);
"""

CREATE_CSO_BRIEF_AUDIT_LOG = """
CREATE TABLE IF NOT EXISTS cso_brief_audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    brief_id   TEXT    NOT NULL,
    action     TEXT    NOT NULL,
    actor_id   TEXT    NOT NULL,
    old_value  TEXT    DEFAULT '',
    new_value  TEXT    DEFAULT '',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
"""

CREATE_CSO_BRIEF_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_cso_brief_status ON cso_briefs(status);",
    "CREATE INDEX IF NOT EXISTS idx_cso_brief_items_brief ON cso_brief_items(brief_id);",
    "CREATE INDEX IF NOT EXISTS idx_cso_brief_items_event ON cso_brief_items(competitor_event_id);",
    "CREATE INDEX IF NOT EXISTS idx_cso_brief_audit_brief ON cso_brief_audit_log(brief_id);",
    "CREATE INDEX IF NOT EXISTS idx_cso_brief_audit_ts ON cso_brief_audit_log(created_at);",
]


# Canonical competitor scoring/explainability columns expected by routes + scorer.
COMPETITOR_SCORING_COLUMNS: list[tuple[str, str]] = [
    ("confidence_level", "TEXT DEFAULT ''"),
    ("walmart_relevance_score", "REAL DEFAULT NULL"),
    ("priority_tier", "TEXT DEFAULT ''"),
    ("signal_type", "TEXT DEFAULT ''"),
    ("recommended_owner", "TEXT DEFAULT ''"),
    ("why_walmart_cares", "TEXT DEFAULT ''"),
    ("strategic_score", "REAL DEFAULT NULL"),
    ("security_score", "REAL DEFAULT NULL"),
    ("operational_score", "REAL DEFAULT NULL"),
    ("customer_trust_score", "REAL DEFAULT NULL"),
    ("novelty_score", "REAL DEFAULT NULL"),
    ("urgency_score", "REAL DEFAULT NULL"),
    ("confidence_score", "REAL DEFAULT NULL"),
    ("escalate_to_cso", "INTEGER DEFAULT 0"),
    ("score_reason", "TEXT DEFAULT ''"),
    ("confidence_effect", "TEXT DEFAULT ''"),
    ("source_effect", "TEXT DEFAULT ''"),
    ("cso_candidate_reason", "TEXT DEFAULT ''"),
    ("scoring_version", "TEXT DEFAULT ''"),
    ("scored_at", "TEXT DEFAULT ''"),
]

COMPETITOR_TRIAGE_COLUMNS: list[tuple[str, str]] = [
    ("triage_status", "TEXT DEFAULT 'UNREVIEWED'"),
    ("triaged_by", "TEXT DEFAULT ''"),
    ("triaged_at", "TEXT DEFAULT ''"),
    ("triage_note", "TEXT DEFAULT ''"),
]


def _safe_add_column(conn: sqlite3.Connection, table: str, column: str, sql: str) -> None:
    """Add a column if it doesn't already exist. Idempotent.

    Silently skips if the table itself doesn't exist (e.g. fresh DB
    where import scripts haven't run yet).
    """
    # Check if table exists first
    table_exists = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).fetchone()
    if not table_exists:
        return
    cols = {r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()}
    if column not in cols:
        conn.execute(sql)


def _ensure_competitor_scoring_columns(conn: sqlite3.Connection) -> None:
    """Idempotently add all competitor scoring columns expected by API/scorer."""
    for column_name, column_def in COMPETITOR_SCORING_COLUMNS:
        _safe_add_column(
            conn,
            "competitor_events",
            column_name,
            f"ALTER TABLE competitor_events ADD COLUMN {column_name} {column_def}",
        )


def _ensure_competitor_triage_columns(conn: sqlite3.Connection) -> None:
    """Idempotently add triage workflow columns for competitor event review."""
    for column_name, column_def in COMPETITOR_TRIAGE_COLUMNS:
        _safe_add_column(
            conn,
            "competitor_events",
            column_name,
            f"ALTER TABLE competitor_events ADD COLUMN {column_name} {column_def}",
        )


# Canonical columns for cso_briefs / cso_brief_items that may be added
# after the initial CREATE TABLE (safe for existing DBs with older schemas).
_CSO_BRIEF_COLUMNS: list[tuple[str, str, str]] = [
    # (table, column, column_def)
    ("cso_briefs", "period_start",       "TEXT NOT NULL DEFAULT ''"),
    ("cso_briefs", "period_end",         "TEXT NOT NULL DEFAULT ''"),
    ("cso_briefs", "submitted_at",       "TEXT DEFAULT NULL"),
    ("cso_briefs", "submitted_by",       "TEXT DEFAULT NULL"),
    ("cso_briefs", "approved_at",        "TEXT DEFAULT NULL"),
    ("cso_briefs", "approved_by",        "TEXT DEFAULT NULL"),
    ("cso_briefs", "published_draft_at", "TEXT DEFAULT NULL"),
    ("cso_briefs", "published_draft_by", "TEXT DEFAULT NULL"),
    ("cso_briefs", "executive_summary",  "TEXT DEFAULT ''"),
    ("cso_briefs", "review_notes",       "TEXT DEFAULT ''"),
    ("cso_briefs", "quality_gate_result", "TEXT DEFAULT ''"),
    ("cso_briefs", "snapshot_version",   "INTEGER NOT NULL DEFAULT 1"),
    ("cso_brief_items", "analyst_commentary",  "TEXT DEFAULT ''"),
    ("cso_brief_items", "uncertainty_note",    "TEXT DEFAULT ''"),
    ("cso_brief_items", "owner_assignment",    "TEXT DEFAULT ''"),
    ("cso_brief_items", "include_in_summary",  "INTEGER NOT NULL DEFAULT 1"),
    ("cso_brief_items", "frozen_payload",      "TEXT NOT NULL DEFAULT '{}'"),
]


def _ensure_cso_brief_columns(conn: sqlite3.Connection) -> None:
    """Idempotently add all CSO brief columns expected by the pipeline.

    Safe for existing DBs: skips tables/columns that already exist.
    """
    for table, column_name, column_def in _CSO_BRIEF_COLUMNS:
        _safe_add_column(
            conn,
            table,
            column_name,
            f"ALTER TABLE {table} ADD COLUMN {column_name} {column_def}",
        )


def init_db() -> None:
    """Create tables if they don't exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Lazy import to avoid circular dependency (audit imports auth, not db).
    from audit import CREATE_AUDIT_LOG, CREATE_AUDIT_INDEXES

    with get_connection() as conn:
        conn.execute(CREATE_TABLE)
        conn.execute(CREATE_VAR_REPORTS)
        conn.execute(CREATE_HIGHLIGHTS)
        conn.execute(CREATE_COMPETITOR_EVENTS)
        conn.execute(CREATE_INCIDENTS)
        conn.execute(CREATE_PROJECTS)
        conn.execute(CREATE_PROJECT_VENDORS)
        conn.execute(CREATE_SERVICE_REQUESTS)
        conn.execute(CREATE_AUDIT_LOG)
        for idx_sql in CREATE_AUDIT_INDEXES:
            conn.execute(idx_sql)
        for idx_sql in CREATE_SERVICE_REQUESTS_INDEXES:
            conn.execute(idx_sql)

        # Safe migrations — add columns that may be missing from older DBs
        _safe_add_column(
            conn, "projects", "exit_reason",
            "ALTER TABLE projects ADD COLUMN exit_reason TEXT DEFAULT ''",
        )
        _safe_add_column(
            conn, "projects", "apm_entries",
            "ALTER TABLE projects ADD COLUMN apm_entries TEXT DEFAULT '[]'",
        )
        _safe_add_column(
            conn, "projects", "erpa_entries",
            "ALTER TABLE projects ADD COLUMN erpa_entries TEXT DEFAULT '[]'",
        )
        _safe_add_column(
            conn, "projects", "ssp_entries",
            "ALTER TABLE projects ADD COLUMN ssp_entries TEXT DEFAULT '[]'",
        )
        # PR-01: soft-delete column for competitor events
        _safe_add_column(
            conn, "competitor_events", "deleted_at",
            "ALTER TABLE competitor_events ADD COLUMN deleted_at TEXT DEFAULT NULL",
        )

        # Competitor intelligence relevance-scoring fields (single canonical migration).
        _ensure_competitor_scoring_columns(conn)
        _ensure_competitor_triage_columns(conn)

        # Query performance indexes for priority workflows.
        # Guard: only create if competitor_events table exists (it's
        # created by import scripts, not init_db).
        if conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='competitor_events'"
        ).fetchone():
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_comp_event_priority ON competitor_events(priority_tier)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_comp_event_escalate ON competitor_events(escalate_to_cso)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_comp_event_relevance ON competitor_events(walmart_relevance_score)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_comp_event_triage_status ON competitor_events(triage_status)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_comp_event_triage_priority ON competitor_events(priority_tier, triage_status)"
            )

        # VAR linkage metadata (required for SharePoint-based extraction)
        _safe_add_column(
            conn, "var_reports", "item_id",
            "ALTER TABLE var_reports ADD COLUMN item_id TEXT DEFAULT ''",
        )

        # Persisted extraction review workflow fields
        _safe_add_column(
            conn, "var_reports", "extraction_review_status",
            "ALTER TABLE var_reports ADD COLUMN extraction_review_status TEXT DEFAULT 'NOT_EXTRACTED'",
        )
        _safe_add_column(
            conn, "var_reports", "extraction_reviewed_by",
            "ALTER TABLE var_reports ADD COLUMN extraction_reviewed_by TEXT DEFAULT ''",
        )
        _safe_add_column(
            conn, "var_reports", "extraction_reviewed_at",
            "ALTER TABLE var_reports ADD COLUMN extraction_reviewed_at TEXT DEFAULT ''",
        )
        _safe_add_column(
            conn, "var_reports", "extraction_review_note",
            "ALTER TABLE var_reports ADD COLUMN extraction_review_note TEXT DEFAULT ''",
        )
        _safe_add_column(
            conn, "var_reports", "extraction_last_run_at",
            "ALTER TABLE var_reports ADD COLUMN extraction_last_run_at TEXT DEFAULT ''",
        )
        _safe_add_column(
            conn, "var_reports", "extraction_last_status",
            "ALTER TABLE var_reports ADD COLUMN extraction_last_status TEXT DEFAULT 'NOT_EXTRACTED'",
        )

        # Service request triage columns (added after initial table creation)
        _safe_add_column(
            conn, "service_requests", "updated_by",
            "ALTER TABLE service_requests ADD COLUMN updated_by TEXT DEFAULT NULL",
        )
        _safe_add_column(
            conn, "service_requests", "status_note",
            "ALTER TABLE service_requests ADD COLUMN status_note TEXT DEFAULT ''",
        )

        # ── CSO Briefing Pipeline tables ──────────────────────────────────
        conn.execute(CREATE_CSO_BRIEFS)
        conn.execute(CREATE_CSO_BRIEF_ITEMS)
        conn.execute(CREATE_CSO_BRIEF_AUDIT_LOG)
        for idx_sql in CREATE_CSO_BRIEF_INDEXES:
            conn.execute(idx_sql)

        # Idempotent migrations for cso_briefs — ensures columns added after
        # initial table creation are present on older DBs.
        _ensure_cso_brief_columns(conn)

        conn.commit()
