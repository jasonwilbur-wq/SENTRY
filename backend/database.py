"""SENTRY Backend — SQLite database setup.

Single-file DB layer. Vendors table matches the frontend's expected schema.

Performance enhancements:
  - WAL mode for concurrent reads
  - Indexes on frequently queried columns (category, company_name, vendor_id)
  - PRAGMA tuning for read-heavy workloads
"""
import os
import sqlite3

from audit import CREATE_AUDIT_INDEXES, CREATE_AUDIT_LOG
from database_reliability import DB_PATH, assert_database_ready, prepare_database_file
from schema_migrations import apply_schema_migrations

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS vendors (
    id              TEXT PRIMARY KEY,
    company_name    TEXT NOT NULL,
    company_url     TEXT DEFAULT '',
    category        TEXT DEFAULT 'Other',
    technology_product TEXT DEFAULT '',
    report_url      TEXT DEFAULT '',
    overall_rating  REAL DEFAULT 0.0,
    vendor_status   TEXT DEFAULT 'Active',
    risk_level      TEXT DEFAULT 'Medium',
    last_assessed   TEXT DEFAULT '',
    has_var         INTEGER DEFAULT 0
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
    item_id              TEXT DEFAULT '',
    download_url         TEXT DEFAULT '',
    extraction_review_status TEXT DEFAULT '',
    extraction_last_status   TEXT DEFAULT '',
    extraction_reviewed_by   TEXT DEFAULT '',
    extraction_reviewed_at   TEXT DEFAULT '',
    extraction_review_note   TEXT DEFAULT '',
    extraction_confidence    REAL DEFAULT NULL,
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

CREATE_INCIDENTS = """
CREATE TABLE IF NOT EXISTS incidents (
    id                 TEXT PRIMARY KEY,
    incident_date      TEXT DEFAULT '',
    incident_type      TEXT DEFAULT 'Other',
    severity           TEXT DEFAULT 'Medium',
    location           TEXT DEFAULT '',
    region             TEXT DEFAULT 'Other',
    country            TEXT DEFAULT 'USA',
    summary            TEXT DEFAULT '',
    impact             TEXT DEFAULT '',
    recommended_action TEXT DEFAULT '',
    source_url         TEXT DEFAULT '',
    tags               TEXT DEFAULT '',
    source_file        TEXT DEFAULT '',
    created_at         TEXT DEFAULT (datetime('now'))
);
"""

CREATE_COMPETITOR_EVENTS = """
CREATE TABLE IF NOT EXISTS competitor_events (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    event_date           TEXT,
    competitor           TEXT,
    event_title          TEXT,
    event_type           TEXT,
    detailed_description TEXT,
    category             TEXT,
    location             TEXT,
    security_implication TEXT,
    operational_impact   TEXT,
    financial_impact     TEXT,
    reputational_impact  TEXT,
    source_link          TEXT,
    analyst_notes        TEXT,
    source_month         TEXT,
    deleted_at           TEXT DEFAULT NULL,
    walmart_relevance_score REAL DEFAULT NULL,
    priority_tier        TEXT DEFAULT '',
    signal_type          TEXT DEFAULT '',
    recommended_owner    TEXT DEFAULT '',
    why_walmart_cares    TEXT DEFAULT '',
    strategic_score      REAL DEFAULT NULL,
    security_score       REAL DEFAULT NULL,
    operational_score    REAL DEFAULT NULL,
    customer_trust_score REAL DEFAULT NULL,
    novelty_score        REAL DEFAULT NULL,
    urgency_score        REAL DEFAULT NULL,
    confidence_score     REAL DEFAULT NULL,
    escalate_to_cso      INTEGER DEFAULT 0,
    scoring_version      TEXT DEFAULT '',
    confidence_level     TEXT DEFAULT '',
    score_reason         TEXT DEFAULT '',
    confidence_effect    TEXT DEFAULT '',
    source_effect        TEXT DEFAULT '',
    cso_candidate_reason TEXT DEFAULT '',
    scored_at            TEXT DEFAULT '',
    triage_status        TEXT DEFAULT 'UNREVIEWED',
    triaged_by           TEXT DEFAULT '',
    triaged_at           TEXT DEFAULT '',
    triage_note          TEXT DEFAULT '',
    walmart_actionability_context TEXT DEFAULT '',
    correlation_summary  TEXT DEFAULT ''
);
"""

CREATE_COMPETITOR_ENTITIES = """
CREATE TABLE IF NOT EXISTS competitor_entities (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL UNIQUE,
    event_count     INTEGER DEFAULT 0,
    cyber_count     INTEGER DEFAULT 0,
    orc_count       INTEGER DEFAULT 0,
    recall_count    INTEGER DEFAULT 0,
    legal_count     INTEGER DEFAULT 0,
    strategic_count INTEGER DEFAULT 0,
    threat_level    TEXT DEFAULT 'Low',
    top_category    TEXT,
    categories_json TEXT,
    monthly_json    TEXT
);
"""

CREATE_PROJECTS = """
CREATE TABLE IF NOT EXISTS projects (
    project_id       TEXT PRIMARY KEY,
    project_name     TEXT NOT NULL,
    summary          TEXT DEFAULT '',
    managing_unit    TEXT DEFAULT '',
    lifecycle_state  TEXT DEFAULT 'active',
    health           TEXT DEFAULT 'green',
    current_phase    TEXT DEFAULT 'Intake',
    est_phase_index  INTEGER DEFAULT 1,
    risk_score       INTEGER DEFAULT 0,
    sensitivity      TEXT DEFAULT 'internal',
    tags             TEXT DEFAULT '',
    progress_pct     INTEGER DEFAULT 0,
    next_milestone   TEXT DEFAULT '',
    next_due_date    TEXT DEFAULT '',
    blockers_count   INTEGER DEFAULT 0,
    last_update_at   TEXT DEFAULT '',
    last_update_by   TEXT DEFAULT '',
    est_cost         TEXT DEFAULT '',
    business_owner   TEXT DEFAULT '',
    nda_numbers      TEXT DEFAULT '[]',
    apm_entries      TEXT DEFAULT '[]',
    erpa_entries     TEXT DEFAULT '[]',
    ssp_entries      TEXT DEFAULT '[]',
    compliance_notes TEXT DEFAULT '',
    exit_reason      TEXT DEFAULT '',
    phase_history    TEXT DEFAULT '[]',
    created_at       TEXT DEFAULT (datetime('now')),
    updated_at       TEXT DEFAULT (datetime('now'))
);
"""

CREATE_PROJECT_VENDORS = """
CREATE TABLE IF NOT EXISTS project_vendors (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    vendor_name TEXT NOT NULL,
    vendor_id   TEXT DEFAULT '',
    role        TEXT DEFAULT 'Vendor',
    status      TEXT DEFAULT 'active',
    notes       TEXT DEFAULT '',
    added_at    TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
);
"""

CREATE_SERVICE_REQUESTS = """
CREATE TABLE IF NOT EXISTS service_requests (
    id              TEXT PRIMARY KEY,
    ref_id          TEXT NOT NULL UNIQUE,
    request_type    TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'SUBMITTED',
    created_by      TEXT NOT NULL DEFAULT 'anonymous',
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT NULL,
    updated_by      TEXT DEFAULT NULL,
    contact_name    TEXT NOT NULL,
    contact_email   TEXT NOT NULL,
    vendor_name     TEXT DEFAULT NULL,
    assessment_type TEXT DEFAULT NULL,
    category        TEXT DEFAULT NULL,
    urgency         TEXT DEFAULT NULL,
    preferred_date  TEXT DEFAULT NULL,
    preferred_slot  TEXT DEFAULT NULL,
    equipment       TEXT DEFAULT NULL,
    attendees       INTEGER DEFAULT NULL,
    notes           TEXT DEFAULT '',
    status_note     TEXT DEFAULT NULL
);
"""

CREATE_UI_EVENTS = """
CREATE TABLE IF NOT EXISTS ui_events (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL,
    event_name    TEXT NOT NULL,
    occurred_at   TEXT NOT NULL,
    metadata_json TEXT DEFAULT '{}',
    created_at    TEXT DEFAULT (datetime('now'))
);
"""

CREATE_CSO_BRIEFS = """
CREATE TABLE IF NOT EXISTS cso_briefs (
    id                       TEXT PRIMARY KEY,
    title                    TEXT NOT NULL,
    period_start             TEXT NOT NULL,
    period_end               TEXT NOT NULL,
    status                   TEXT NOT NULL DEFAULT 'DRAFT',
    created_by               TEXT NOT NULL,
    created_at               TEXT NOT NULL,
    updated_by               TEXT NOT NULL,
    updated_at               TEXT NOT NULL,
    submitted_at             TEXT DEFAULT NULL,
    submitted_by             TEXT DEFAULT NULL,
    reviewed_at              TEXT DEFAULT NULL,
    reviewed_by              TEXT DEFAULT NULL,
    reviewer_notes           TEXT DEFAULT '',
    reviewer_attestation     TEXT DEFAULT '',
    changes_requested_at     TEXT DEFAULT NULL,
    changes_requested_by     TEXT DEFAULT NULL,
    changes_requested_reason TEXT DEFAULT '',
    approved_at              TEXT DEFAULT NULL,
    approved_by              TEXT DEFAULT NULL,
    published_draft_at       TEXT DEFAULT NULL,
    published_draft_by       TEXT DEFAULT NULL,
    executive_summary        TEXT DEFAULT '',
    review_notes             TEXT DEFAULT '',
    quality_gate_result      TEXT DEFAULT '',
    snapshot_version         INTEGER DEFAULT 1
);
"""

CREATE_CSO_BRIEF_ITEMS = """
CREATE TABLE IF NOT EXISTS cso_brief_items (
    id                       TEXT PRIMARY KEY,
    brief_id                 TEXT NOT NULL REFERENCES cso_briefs(id) ON DELETE CASCADE,
    competitor_event_id      INTEGER NOT NULL REFERENCES competitor_events(id),
    rank                     INTEGER NOT NULL,
    analyst_commentary       TEXT DEFAULT '',
    uncertainty_note         TEXT DEFAULT '',
    owner_assignment         TEXT DEFAULT '',
    include_in_summary       INTEGER DEFAULT 1,
    analyst_status           TEXT DEFAULT 'unreviewed',
    analyst_decision         TEXT DEFAULT '',
    analyst_note             TEXT DEFAULT '',
    analyst_decided_at       TEXT DEFAULT NULL,
    analyst_decision_source  TEXT DEFAULT '',
    frozen_payload           TEXT NOT NULL DEFAULT '{}',
    created_at               TEXT NOT NULL,
    updated_at               TEXT NOT NULL
);
"""

CREATE_CSO_BRIEF_AUDIT_LOG = """
CREATE TABLE IF NOT EXISTS cso_brief_audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    brief_id    TEXT NOT NULL REFERENCES cso_briefs(id) ON DELETE CASCADE,
    action      TEXT NOT NULL,
    actor_id    TEXT NOT NULL,
    old_value   TEXT DEFAULT '',
    new_value   TEXT DEFAULT '',
    created_at  TEXT NOT NULL
);
"""

# ── Performance indexes ──────────────────────────────────────────────────────
# These dramatically speed up the most common query patterns:
#  - Vendor list filtering by category (sidebar pills)
#  - Vendor search by company_name / technology_product (search bar)
#  - VAR report lookups by vendor_id (detail modal, pipeline)
#  - Highlight lookups by vendor_id (history tab)
#  - Vendor sorting by overall_rating (default sort)
#  - Recent assessment queries by last_assessed date
#  - Risk-level aggregation queries (stats endpoint)
#  - Competitor event filtering by competitor + category

CREATE_INDEXES = """
-- Vendors: category filter (most common filter)
CREATE INDEX IF NOT EXISTS idx_vendors_category
    ON vendors(category);

-- Vendors: full-text-like search on company_name (LIKE '%term%' uses this for prefix)
CREATE INDEX IF NOT EXISTS idx_vendors_company_name
    ON vendors(company_name COLLATE NOCASE);

-- Vendors: sort by rating (default ORDER BY)
CREATE INDEX IF NOT EXISTS idx_vendors_rating
    ON vendors(overall_rating DESC);

-- Vendors: risk_level aggregation (stats endpoint, risk filter)
CREATE INDEX IF NOT EXISTS idx_vendors_risk_level
    ON vendors(risk_level);

-- Vendors: recent assessment date queries
CREATE INDEX IF NOT EXISTS idx_vendors_last_assessed
    ON vendors(last_assessed);

-- Vendors: composite index for the most common query pattern
-- (category filter + rating sort)
CREATE INDEX IF NOT EXISTS idx_vendors_category_rating
    ON vendors(category, overall_rating DESC);

-- VAR reports: vendor_id FK lookups (detail modal, pipeline, download)
CREATE INDEX IF NOT EXISTS idx_var_reports_vendor_id
    ON var_reports(vendor_id);

-- VAR reports: vendor_id + report_date for "latest VAR" query
CREATE INDEX IF NOT EXISTS idx_var_reports_vendor_date
    ON var_reports(vendor_id, report_date DESC);

-- VAR reports: decision_band aggregation (stats endpoint)
CREATE INDEX IF NOT EXISTS idx_var_reports_decision_band
    ON var_reports(decision_band);

-- Highlights: vendor_id FK lookups (history tab, pipeline)
CREATE INDEX IF NOT EXISTS idx_highlights_vendor_id
    ON vendor_highlights(vendor_id);

-- Highlights: vendor_id + assessment_date for sorted lookups
CREATE INDEX IF NOT EXISTS idx_highlights_vendor_date
    ON vendor_highlights(vendor_id, assessment_date DESC);

-- Competitor events: composite for filtered queries
CREATE INDEX IF NOT EXISTS idx_competitor_events_competitor
    ON competitor_events(competitor);

CREATE INDEX IF NOT EXISTS idx_competitor_events_category
    ON competitor_events(category);

CREATE INDEX IF NOT EXISTS idx_competitor_events_date
    ON competitor_events(event_date DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_events_source_month
    ON competitor_events(source_month);

-- Projects and service requests: route-level lookup and sorting
CREATE INDEX IF NOT EXISTS idx_project_vendors_project_id
    ON project_vendors(project_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_ref_id
    ON service_requests(ref_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_created_by
    ON service_requests(created_by);

CREATE INDEX IF NOT EXISTS idx_service_requests_status
    ON service_requests(status);

CREATE INDEX IF NOT EXISTS idx_ui_events_created_at
    ON ui_events(created_at);

CREATE INDEX IF NOT EXISTS idx_ui_events_session
    ON ui_events(session_id);

CREATE INDEX IF NOT EXISTS idx_cso_brief_items_brief_rank
    ON cso_brief_items(brief_id, rank);

CREATE INDEX IF NOT EXISTS idx_cso_brief_audit_brief_created
    ON cso_brief_audit_log(brief_id, created_at DESC);
"""


def get_connection() -> sqlite3.Connection:
    """Return a connection with row-factory for dict-like access and perf PRAGMAs."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    if os.environ.get("SENTRY_SQLITE_FOREIGN_KEYS") == "1":
        # Compatibility note: legacy rows/routes still use empty-string foreign keys.
        # Keep opt-in until those columns are nullable or cleaned up.
        conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")     # safe with WAL, faster writes
    conn.execute("PRAGMA cache_size=-8000")        # 8MB page cache (default is 2MB)
    conn.execute("PRAGMA temp_store=MEMORY")       # temp tables in RAM
    conn.execute("PRAGMA mmap_size=268435456")     # 256MB memory-mapped I/O
    return conn


def init_db() -> None:
    """Create tables and indexes if they don't exist."""
    prepare_database_file(DB_PATH)
    with get_connection() as conn:
        conn.execute(CREATE_TABLE)
        conn.execute(CREATE_VAR_REPORTS)
        conn.execute(CREATE_HIGHLIGHTS)
        conn.execute(CREATE_INCIDENTS)
        conn.execute(CREATE_COMPETITOR_EVENTS)
        conn.execute(CREATE_COMPETITOR_ENTITIES)
        conn.execute(CREATE_PROJECTS)
        conn.execute(CREATE_PROJECT_VENDORS)
        conn.execute(CREATE_SERVICE_REQUESTS)
        conn.execute(CREATE_UI_EVENTS)
        conn.execute(CREATE_CSO_BRIEFS)
        conn.execute(CREATE_CSO_BRIEF_ITEMS)
        conn.execute(CREATE_CSO_BRIEF_AUDIT_LOG)
        conn.execute(CREATE_AUDIT_LOG)
        apply_schema_migrations(conn)
        for audit_index in CREATE_AUDIT_INDEXES:
            conn.execute(audit_index)
        # Create performance indexes (IF NOT EXISTS = safe to run repeatedly)
        conn.executescript(CREATE_INDEXES)
        conn.execute("PRAGMA optimize")  # let SQLite optimize query plans
        assert_database_ready(conn)
        conn.commit()
