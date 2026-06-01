from __future__ import annotations

import sqlite3

from schema_migrations import apply_schema_migrations, ensure_columns


def _column_names(conn: sqlite3.Connection, table: str) -> set[str]:
    return {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}


def test_ensure_columns_adds_missing_columns_idempotently():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute("CREATE TABLE example (id TEXT PRIMARY KEY)")

    ensure_columns(conn, "example", {"status": "TEXT DEFAULT ''"})
    ensure_columns(conn, "example", {"status": "TEXT DEFAULT ''"})

    assert _column_names(conn, "example") == {"id", "status"}


def test_apply_schema_migrations_adds_startup_compatibility_columns():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute("CREATE TABLE vendors (id TEXT PRIMARY KEY)")
    conn.execute("CREATE TABLE competitor_events (id INTEGER PRIMARY KEY)")
    conn.execute("CREATE TABLE var_reports (id TEXT PRIMARY KEY)")

    apply_schema_migrations(conn)
    apply_schema_migrations(conn)

    assert "has_var" in _column_names(conn, "vendors")
    assert "triage_status" in _column_names(conn, "competitor_events")
    assert "linked_projects" in _column_names(conn, "competitor_events")
    assert "extraction_review_status" in _column_names(conn, "var_reports")
