"""Lightweight SQLite schema migration helpers.

The application still uses SQLite with startup-time idempotent schema setup.
This module keeps additive compatibility migrations out of database.py so table
creation and migration policy can evolve independently.

Only additive column migrations belong here. Destructive changes, data rewrites,
or table rebuilds should be explicit reviewed scripts with backups.
"""
from __future__ import annotations

import sqlite3


ADDITIVE_TABLE_COLUMNS: dict[str, dict[str, str]] = {
    "vendors": {
        "has_var": "INTEGER DEFAULT 0",
    },
    "competitor_events": {
        "deleted_at": "TEXT DEFAULT NULL",
        "confidence_level": "TEXT DEFAULT ''",
        "walmart_relevance_score": "REAL DEFAULT NULL",
        "priority_tier": "TEXT DEFAULT ''",
        "signal_type": "TEXT DEFAULT ''",
        "recommended_owner": "TEXT DEFAULT ''",
        "why_walmart_cares": "TEXT DEFAULT ''",
        "strategic_score": "REAL DEFAULT NULL",
        "security_score": "REAL DEFAULT NULL",
        "operational_score": "REAL DEFAULT NULL",
        "customer_trust_score": "REAL DEFAULT NULL",
        "novelty_score": "REAL DEFAULT NULL",
        "urgency_score": "REAL DEFAULT NULL",
        "confidence_score": "REAL DEFAULT NULL",
        "escalate_to_cso": "INTEGER DEFAULT 0",
        "score_reason": "TEXT DEFAULT ''",
        "confidence_effect": "TEXT DEFAULT ''",
        "source_effect": "TEXT DEFAULT ''",
        "cso_candidate_reason": "TEXT DEFAULT ''",
        "scoring_version": "TEXT DEFAULT ''",
        "scored_at": "TEXT DEFAULT ''",
        "triage_status": "TEXT DEFAULT 'UNREVIEWED'",
        "triaged_by": "TEXT DEFAULT ''",
        "triaged_at": "TEXT DEFAULT ''",
        "triage_note": "TEXT DEFAULT ''",
        "walmart_actionability_context": "TEXT DEFAULT ''",
        "correlation_summary": "TEXT DEFAULT ''",
        "matched_vendor_id": "TEXT DEFAULT ''",
        "matched_vendor_name": "TEXT DEFAULT ''",
        "match_method": "TEXT DEFAULT ''",
        "match_label": "TEXT DEFAULT ''",
        "linked_active_projects_count": "INTEGER DEFAULT 0",
        "linked_projects": "TEXT DEFAULT '[]'",
    },
    "var_reports": {
        "item_id": "TEXT DEFAULT ''",
        "download_url": "TEXT DEFAULT ''",
        "extraction_review_status": "TEXT DEFAULT ''",
        "extraction_last_status": "TEXT DEFAULT ''",
        "extraction_reviewed_by": "TEXT DEFAULT ''",
        "extraction_reviewed_at": "TEXT DEFAULT ''",
        "extraction_review_note": "TEXT DEFAULT ''",
        "extraction_confidence": "REAL DEFAULT NULL",
    },
}


def ensure_columns(conn: sqlite3.Connection, table: str, columns: dict[str, str]) -> None:
    """Add missing columns for lightweight SQLite schema compatibility.

    This intentionally supports additive migrations only. Column names and SQL
    definitions are code-owned constants, not user input.
    """
    existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
    for name, definition in columns.items():
        if name not in existing:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")


def apply_schema_migrations(conn: sqlite3.Connection) -> None:
    """Apply all startup-safe additive schema migrations."""
    for table, columns in ADDITIVE_TABLE_COLUMNS.items():
        ensure_columns(conn, table, columns)
