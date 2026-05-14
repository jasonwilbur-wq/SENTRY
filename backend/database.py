"""SENTRY Backend — SQLite database setup.

Single-file DB layer. Vendors table matches the frontend's expected schema.

Performance enhancements:
  - WAL mode for concurrent reads
  - Indexes on frequently queried columns (category, company_name, vendor_id)
  - PRAGMA tuning for read-heavy workloads
"""
import sqlite3
from pathlib import Path

from audit import CREATE_AUDIT_INDEXES, CREATE_AUDIT_LOG

DB_PATH = Path(__file__).parent / "data" / "sentry.db"

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
    last_assessed   TEXT DEFAULT ''
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
"""


def get_connection() -> sqlite3.Connection:
    """Return a connection with row-factory for dict-like access and perf PRAGMAs."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")     # safe with WAL, faster writes
    conn.execute("PRAGMA cache_size=-8000")        # 8MB page cache (default is 2MB)
    conn.execute("PRAGMA temp_store=MEMORY")       # temp tables in RAM
    conn.execute("PRAGMA mmap_size=268435456")     # 256MB memory-mapped I/O
    return conn


def init_db() -> None:
    """Create tables and indexes if they don't exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        conn.execute(CREATE_TABLE)
        conn.execute(CREATE_VAR_REPORTS)
        conn.execute(CREATE_HIGHLIGHTS)
        conn.execute(CREATE_INCIDENTS)
        conn.execute(CREATE_COMPETITOR_EVENTS)
        conn.execute(CREATE_COMPETITOR_ENTITIES)
        conn.execute(CREATE_AUDIT_LOG)
        for audit_index in CREATE_AUDIT_INDEXES:
            conn.execute(audit_index)
        # Create performance indexes (IF NOT EXISTS = safe to run repeatedly)
        conn.executescript(CREATE_INDEXES)
        conn.execute("PRAGMA optimize")  # let SQLite optimize query plans
        conn.commit()
