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
    """Return a connection with row-factory for dict-like access."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    """Create tables if they don't exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        conn.execute(CREATE_TABLE)
        conn.execute(CREATE_VAR_REPORTS)
        conn.execute(CREATE_HIGHLIGHTS)
        conn.commit()
