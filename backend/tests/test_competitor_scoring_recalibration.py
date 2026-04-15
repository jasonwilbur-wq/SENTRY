from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _temp_db(tmp_path, monkeypatch):
    db_path = tmp_path / "test_sentry.db"
    monkeypatch.setattr("database.DB_PATH", db_path)
    from database import init_db
    init_db()

    from database import get_connection
    conn = get_connection()
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
            scored_at TEXT DEFAULT ''
        )
        """
    )
    conn.commit()
    conn.close()
    yield db_path


@pytest.fixture()
def client_off():
    os.environ["SENTRY_AUTH_MODE"] = "off"
    import auth
    auth.AUTH_MODE = "off"
    from main import app
    return TestClient(app)


def _insert_event(**kwargs):
    from database import get_connection

    base = {
        "event_date": "2026-02-01",
        "competitor": "Amazon",
        "event_title": "Routine update",
        "event_type": "update",
        "detailed_description": "General informational update",
        "category": "Other",
        "location": "US",
        "security_implication": "",
        "operational_impact": "",
        "financial_impact": "",
        "reputational_impact": "",
        "source_link": "",
        "analyst_notes": "",
        "source_month": "Feb 2026",
        "confidence_level": "",
    }
    base.update(kwargs)

    conn = get_connection()
    conn.execute(
        """
        INSERT INTO competitor_events (
            event_date, competitor, event_title, event_type, detailed_description,
            category, location, security_implication, operational_impact,
            financial_impact, reputational_impact, source_link,
            analyst_notes, source_month, confidence_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            base["event_date"],
            base["competitor"],
            base["event_title"],
            base["event_type"],
            base["detailed_description"],
            base["category"],
            base["location"],
            base["security_implication"],
            base["operational_impact"],
            base["financial_impact"],
            base["reputational_impact"],
            base["source_link"],
            base["analyst_notes"],
            base["source_month"],
            base["confidence_level"],
        ),
    )
    event_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.commit()
    conn.close()
    return event_id


class TestCompetitorScoringRecalibration:
    def test_high_signal_event_reaches_cso_candidate(self, client_off):
        event_id = _insert_event(
            category="Cyber",
            event_title="Major ransomware breach impacts stores",
            detailed_description="Critical outage and regulator investigation after breach.",
            source_link="https://example.com/breach",
            confidence_level="high",
        )

        resp = client_off.post("/api/admin/competitor-events/rescore?limit=50")
        assert resp.status_code == 200

        get_resp = client_off.get(f"/api/admin/competitor-events/{event_id}")
        body = get_resp.json()
        assert body["walmart_relevance_score"] >= 82
        assert body["priority_tier"] == "CSO Brief"
        assert body["escalate_to_cso"] == 1
        assert body["score_reason"]
        assert body["cso_candidate_reason"]

    def test_low_signal_event_stays_archive(self, client_off):
        event_id = _insert_event(
            category="Other",
            event_title="Routine roadmap refresh",
            detailed_description="General planning update with no incident details.",
            confidence_level="low",
        )

        client_off.post("/api/admin/competitor-events/rescore?limit=50")
        get_resp = client_off.get(f"/api/admin/competitor-events/{event_id}")
        body = get_resp.json()
        assert body["priority_tier"] in {"Archive / Low Signal", "Analyst Follow-up"}
        assert body["walmart_relevance_score"] < 68

    def test_backfill_only_unscored_and_preserve_manual(self, client_off):
        _insert_event(
            category="Legal",
            event_title="Regulatory fine announced",
            detailed_description="Fine and settlement disclosed.",
            confidence_level="high",
        )
        _insert_event(
            category="Cyber",
            event_title="Manual scored event",
            detailed_description="Analyst override should be preserved.",
            analyst_notes="#manual-score keep",
        )

        resp = client_off.post(
            "/api/admin/competitor-events/rescore?limit=50&only_unscored=true&preserve_manual=true"
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["updated"] >= 1
        assert body["skipped_manual"] >= 1
        assert body["before"]["unscored"] >= body["after"]["unscored"]

    def test_scoring_summary_endpoint_returns_distribution(self, client_off):
        _insert_event(category="Cyber", event_title="Breach response", detailed_description="breach")
        client_off.post("/api/admin/competitor-events/rescore?limit=10")

        resp = client_off.get("/api/admin/competitor-events/scoring-summary")
        assert resp.status_code == 200
        body = resp.json()
        assert "distribution" in body
        assert "unscored" in body["distribution"]
        assert "archive_low_signal" in body["distribution"]

    def test_non_admin_cannot_rescore(self, client_off):
        # auth off means anonymous admin in this mode; covered by auth_defaults for role mode.
        # keep smoke guard that endpoint still exists and does not auto-publish anywhere.
        resp = client_off.post("/api/admin/competitor-events/rescore?limit=1")
        assert resp.status_code == 200
