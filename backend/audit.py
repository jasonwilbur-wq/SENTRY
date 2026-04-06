"""SENTRY Backend — Audit Trail.

Records who changed what, when, with before/after snapshots.

Usage:
    from audit import log_mutation

    log_mutation(
        conn=conn,
        user=user,           # SentryUser from auth.py
        action="update",     # create | update | delete | batch_extract | link | unlink
        entity_type="var_report",
        entity_id=var_id,
        old_value={"overall_score": 3.2, "decision_band": "Proceed"},
        new_value={"overall_score": 4.1, "decision_band": "Proceed with Conditions"},
        metadata={"overwrite": True, "confirm": True},
    )
"""
from __future__ import annotations

import json
import logging
import sqlite3
from datetime import datetime, timezone
from typing import Any

from auth import SentryUser

logger = logging.getLogger("sentry.audit")


# ── Table DDL (called from database.init_db) ─────────────────────────────────

CREATE_AUDIT_LOG = """\
CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT    NOT NULL DEFAULT (datetime('now')),
    user_id     TEXT    NOT NULL,
    action      TEXT    NOT NULL,
    entity_type TEXT    NOT NULL,
    entity_id   TEXT    NOT NULL,
    old_value   TEXT    DEFAULT NULL,
    new_value   TEXT    DEFAULT NULL,
    metadata    TEXT    DEFAULT NULL
);
"""

# Index for common queries: "show me everything user X did" and
# "show me all changes to entity Y"
CREATE_AUDIT_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);",
    "CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(timestamp);",
]


def _safe_json(value: Any) -> str | None:
    """Serialize a value to JSON, returning None for None inputs."""
    if value is None:
        return None
    try:
        return json.dumps(value, default=str, ensure_ascii=False)
    except (TypeError, ValueError):
        return json.dumps({"_raw": str(value)})


def log_mutation(
    conn: sqlite3.Connection,
    user: SentryUser,
    action: str,
    entity_type: str,
    entity_id: str,
    old_value: Any = None,
    new_value: Any = None,
    metadata: dict | None = None,
) -> int:
    """Record a mutation in the audit_log table.

    Must be called inside the same transaction as the actual write so the
    audit record and the data change are atomic.

    Returns the audit log row ID.
    """
    now = datetime.now(timezone.utc).isoformat()

    cursor = conn.execute(
        """\
        INSERT INTO audit_log (timestamp, user_id, action, entity_type, entity_id,
                               old_value, new_value, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            now,
            user.id,
            action,
            entity_type,
            entity_id,
            _safe_json(old_value),
            _safe_json(new_value),
            _safe_json(metadata),
        ),
    )
    audit_id = cursor.lastrowid or 0

    # Also emit a structured log line for Cloud Logging / stdout capture.
    logger.info(
        "AUDIT | user=%s action=%s entity=%s/%s",
        user.id, action, entity_type, entity_id,
    )

    return audit_id


def snapshot_row(row: sqlite3.Row | None, fields: list[str] | None = None) -> dict | None:
    """Convert a sqlite3.Row to a dict snapshot for audit logging.

    If `fields` is given, only those columns are included (useful for
    capturing just the fields that changed).
    """
    if row is None:
        return None
    d = dict(row)
    if fields:
        return {k: d[k] for k in fields if k in d}
    return d
