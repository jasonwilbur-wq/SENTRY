"""SQLite reliability helpers for SENTRY.

This module keeps database operational checks separate from table DDL. The app
still uses SQLite today, but these helpers make the current posture explicit:
configurable DB location, bundled seed copy, startup schema validation, and
health metadata that surfaces production persistence risks.
"""
from __future__ import annotations

import os
import shutil
import sqlite3
from pathlib import Path
from typing import Iterable

APP_ENV = os.environ.get("SENTRY_ENV", os.environ.get("ENVIRONMENT", "development")).lower()
BUNDLED_DB_PATH = Path(__file__).parent / "data" / "sentry.db"
DB_PATH = Path(os.environ.get("SENTRY_DB_PATH", str(BUNDLED_DB_PATH))).expanduser()

REQUIRED_TABLE_COLUMNS: dict[str, set[str]] = {
    "vendors": {"id", "company_name", "category", "overall_rating", "risk_level", "has_var"},
    "var_reports": {"id", "vendor_id", "filename", "overall_score", "decision_band"},
    "vendor_highlights": {"id", "vendor_id", "source_file"},
    "incidents": {"id", "incident_date", "incident_type", "severity", "summary"},
    "competitor_events": {"id", "event_date", "competitor", "event_title", "deleted_at", "triage_status"},
    "competitor_entities": {"id", "name", "event_count", "threat_level"},
    "projects": {"project_id", "project_name", "lifecycle_state", "updated_at"},
    "project_vendors": {"id", "project_id", "vendor_name", "status"},
    "service_requests": {"id", "ref_id", "request_type", "status", "created_by"},
    "ui_events": {"id", "session_id", "event_name", "occurred_at"},
    "audit_log": {"id", "timestamp", "user_id", "action", "entity_type", "entity_id"},
    "cso_briefs": {"id", "title", "status", "created_by", "updated_at"},
    "cso_brief_items": {"id", "brief_id", "competitor_event_id", "rank", "frozen_payload"},
    "cso_brief_audit_log": {"id", "brief_id", "action", "actor_id", "created_at"},
}


def configured_db_path() -> Path:
    """Return the active DB path from env, defaulting to the bundled seed DB."""
    return DB_PATH


def is_using_bundled_db(db_path: Path = DB_PATH) -> bool:
    """True when runtime writes target backend/data/sentry.db inside the app tree."""
    try:
        return db_path.resolve() == BUNDLED_DB_PATH.resolve()
    except OSError:
        return db_path == BUNDLED_DB_PATH


def prepare_database_file(
    db_path: Path = DB_PATH,
    seed_path: Path = BUNDLED_DB_PATH,
    *,
    seed_if_missing: bool | None = None,
) -> None:
    """Create the DB directory and optionally seed non-bundled DBs once.

    If SENTRY_DB_PATH points at an external persistent location and the file does
    not exist yet, copy the bundled SQLite DB as a starting snapshot before
    migrations run. Empty/missing bundled seeds are ignored; init_db will create
    an empty schema.

    Seeding defaults to explicit runtime configuration only. This prevents unit
    tests that monkeypatch ``database.DB_PATH`` from accidentally copying the
    repository's real bundled data into isolated test databases.
    """
    db_path.parent.mkdir(parents=True, exist_ok=True)
    should_seed = ("SENTRY_DB_PATH" in os.environ) if seed_if_missing is None else seed_if_missing
    if not should_seed or is_using_bundled_db(db_path) or db_path.exists():
        return
    if seed_path.exists() and seed_path.stat().st_size > 0:
        shutil.copy2(seed_path, db_path)


def _existing_columns(conn: sqlite3.Connection, table: str) -> set[str]:
    return {str(row["name"]) for row in conn.execute(f"PRAGMA table_info({table})")}


def validate_database_schema(conn: sqlite3.Connection) -> list[str]:
    """Return schema validation errors for required app tables/columns."""
    errors: list[str] = []
    table_rows = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    tables = {str(row["name"]) for row in table_rows}

    for table, required_columns in REQUIRED_TABLE_COLUMNS.items():
        if table not in tables:
            errors.append(f"missing table: {table}")
            continue
        columns = _existing_columns(conn, table)
        missing = sorted(required_columns - columns)
        if missing:
            errors.append(f"{table} missing columns: {', '.join(missing)}")

    return errors


def assert_database_ready(conn: sqlite3.Connection) -> None:
    """Raise RuntimeError if the initialized database is missing required schema."""
    errors = validate_database_schema(conn)
    if errors:
        joined = "; ".join(errors)
        raise RuntimeError(f"SENTRY database schema validation failed: {joined}")


def database_operational_warnings(db_path: Path = DB_PATH) -> list[str]:
    """Return non-fatal warnings about the current database operating model."""
    warnings: list[str] = []
    if APP_ENV in {"prod", "production"} and is_using_bundled_db(db_path):
        warnings.append(
            "Production is using bundled backend/data/sentry.db. Writes on Cloud Run are container-local; "
            "set SENTRY_DB_PATH to a persistent mount or migrate to Cloud SQL/Postgres before relying on mutations."
        )
    db_path_posix = db_path.as_posix()
    if APP_ENV in {"prod", "production"} and (db_path_posix.startswith("/tmp") or db_path_posix.startswith("tmp/")):
        warnings.append(
            "Production SENTRY_DB_PATH is under /tmp. This is writable but ephemeral; use only as a bridge to persistent storage."
        )
    return warnings


def database_status(conn: sqlite3.Connection | None = None, db_path: Path = DB_PATH) -> dict[str, object]:
    """Return safe DB health metadata for /api/health."""
    owns_connection = conn is None
    if conn is None:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row

    try:
        schema_errors = validate_database_schema(conn)
        journal_mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
        foreign_keys = conn.execute("PRAGMA foreign_keys").fetchone()[0]
    finally:
        if owns_connection:
            conn.close()

    return {
        "database_ready": not schema_errors,
        "database_schema_errors": schema_errors,
        "database_path_configured": "SENTRY_DB_PATH" in os.environ,
        "database_using_bundled_seed": is_using_bundled_db(db_path),
        "database_exists": db_path.exists(),
        "database_size_bytes": db_path.stat().st_size if db_path.exists() else 0,
        "database_journal_mode": str(journal_mode),
        "database_foreign_keys": bool(foreign_keys),
        "database_warnings": database_operational_warnings(db_path),
    }


def write_surface_summary() -> dict[str, Iterable[str]]:
    """Document tables currently mutated by app routes/import scripts."""
    return {
        "runtime_mutable_tables": [
            "audit_log",
            "competitor_events",
            "cso_briefs",
            "cso_brief_items",
            "cso_brief_audit_log",
            "project_vendors",
            "projects",
            "service_requests",
            "ui_events",
            "var_reports",
            "vendors",
        ],
        "recommended_persistent_store": [
            "Cloud SQL Postgres for production mutations",
            "SQLite only for local/dev or read-mostly demo deployments",
        ],
    }
