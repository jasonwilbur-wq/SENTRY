from __future__ import annotations

import os
import sqlite3

import pytest
from fastapi.testclient import TestClient


REQUIRED_SCORING_COLUMNS = {
    "confidence_level",
    "walmart_relevance_score",
    "priority_tier",
    "signal_type",
    "recommended_owner",
    "why_walmart_cares",
    "strategic_score",
    "security_score",
    "operational_score",
    "customer_trust_score",
    "novelty_score",
    "urgency_score",
    "confidence_score",
    "escalate_to_cso",
    "score_reason",
    "confidence_effect",
    "source_effect",
    "cso_candidate_reason",
    "scoring_version",
    "scored_at",
    "walmart_actionability_context",
    "correlation_summary",
}


@pytest.fixture(autouse=True)
def _temp_db(tmp_path, monkeypatch):
    db_path = tmp_path / "test_sentry_schema.db"
    monkeypatch.setattr("database.DB_PATH", db_path)
    yield db_path


@pytest.fixture()
def client_off():
    os.environ["SENTRY_AUTH_MODE"] = "off"
    import auth

    auth.AUTH_MODE = "off"
    from main import app

    return TestClient(app)


def _table_columns(db_path, table: str) -> set[str]:
    conn = sqlite3.connect(db_path)
    try:
        rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    finally:
        conn.close()
    return {r[1] for r in rows}


def _seed_minimal_competitor_table(db_path):
    conn = sqlite3.connect(db_path)
    conn.execute(
        """
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
            source_month TEXT
        )
        """
    )
    conn.execute(
        """
        INSERT INTO competitor_events (
            event_date, competitor, event_title, event_type, detailed_description,
            category, location, security_implication, operational_impact,
            financial_impact, reputational_impact, source_link, analyst_notes, source_month
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "2026-03-10",
            "Target",
            "Cyber incident disclosed",
            "incident",
            "Security event under investigation",
            "Cyber",
            "US",
            "",
            "",
            "",
            "",
            "https://example.com",
            "",
            "Mar 2026",
        ),
    )
    conn.commit()
    conn.close()


def test_fresh_init_includes_required_competitor_scoring_columns(_temp_db):
    from database import init_db

    init_db()

    _seed_minimal_competitor_table(_temp_db)
    init_db()  # ensure migration hook runs after table exists

    cols = _table_columns(_temp_db, "competitor_events")
    assert REQUIRED_SCORING_COLUMNS.issubset(cols)


def test_migration_adds_missing_columns_to_legacy_competitor_table(_temp_db):
    _seed_minimal_competitor_table(_temp_db)

    from database import init_db

    init_db()

    cols = _table_columns(_temp_db, "competitor_events")
    assert REQUIRED_SCORING_COLUMNS.issubset(cols)


def test_migration_preserves_existing_data(_temp_db):
    _seed_minimal_competitor_table(_temp_db)

    from database import init_db

    init_db()

    conn = sqlite3.connect(_temp_db)
    try:
        row = conn.execute(
            "SELECT competitor, event_title FROM competitor_events LIMIT 1"
        ).fetchone()
    finally:
        conn.close()

    assert row is not None
    assert row[0] == "Target"
    assert row[1] == "Cyber incident disclosed"


def test_scoring_summary_and_rescore_do_not_crash_on_migrated_db(client_off, _temp_db):
    _seed_minimal_competitor_table(_temp_db)

    from database import init_db

    init_db()

    summary = client_off.get("/api/admin/competitor-events/scoring-summary")
    assert summary.status_code == 200

    rescore = client_off.post("/api/admin/competitor-events/rescore?limit=10")
    assert rescore.status_code == 200

    payload = rescore.json()
    assert payload["success"] is True
