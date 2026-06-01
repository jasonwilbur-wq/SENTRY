"""Database reliability guardrail tests."""
from __future__ import annotations

import sqlite3

from database_reliability import (
    BUNDLED_DB_PATH,
    assert_database_ready,
    database_operational_warnings,
    prepare_database_file,
    validate_database_schema,
)


def test_prepare_database_file_copies_seed_to_external_path(tmp_path):
    seed = tmp_path / "seed.db"
    target = tmp_path / "persistent" / "sentry.db"
    seed.write_bytes(b"sqlite-seed")

    prepare_database_file(target, seed, seed_if_missing=True)

    assert target.read_bytes() == b"sqlite-seed"


def test_prepare_database_file_does_not_overwrite_existing_external_db(tmp_path):
    seed = tmp_path / "seed.db"
    target = tmp_path / "persistent" / "sentry.db"
    seed.write_bytes(b"seed")
    target.parent.mkdir(parents=True)
    target.write_bytes(b"existing")

    prepare_database_file(target, seed, seed_if_missing=True)

    assert target.read_bytes() == b"existing"


def test_validate_database_schema_reports_missing_tables():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row

    errors = validate_database_schema(conn)

    assert "missing table: vendors" in errors
    assert "missing table: projects" in errors


def test_assert_database_ready_raises_for_incomplete_schema():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row

    try:
        assert_database_ready(conn)
    except RuntimeError as exc:
        assert "SENTRY database schema validation failed" in str(exc)
    else:  # pragma: no cover - defensive
        raise AssertionError("expected schema validation failure")


def test_production_warning_when_using_bundled_sqlite(monkeypatch):
    monkeypatch.setattr("database_reliability.APP_ENV", "production")

    warnings = database_operational_warnings(BUNDLED_DB_PATH)

    assert any("Production is using bundled" in warning for warning in warnings)


def test_production_warning_when_using_tmp_sqlite(monkeypatch):
    monkeypatch.setattr("database_reliability.APP_ENV", "production")

    warnings = database_operational_warnings(__import__("pathlib").Path("/tmp/sentry/sentry.db"))

    assert any("under /tmp" in warning for warning in warnings)
