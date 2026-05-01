"""Readiness-gating tests for CSO brief generation."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _temp_db(tmp_path, monkeypatch):
    db_path = tmp_path / "test_cso_readiness.db"
    monkeypatch.setattr("database.DB_PATH", db_path)
    from database import init_db
    init_db()
    yield db_path


def _make_client():
    import auth

    auth.AUTH_MODE = "header"
    auth.ADMIN_USERS = {"admin_alice"}
    auth.ALLOWED_USERS = {"admin_alice", "analyst_bob"}

    from main import app

    return TestClient(app)


ADMIN = {"X-Sentry-User": "admin_alice"}


def _seed(conn, **overrides) -> int:
    defaults = {
        "event_date": "2026-04-06",
        "competitor": "Amazon",
        "event_title": "Ready event",
        "event_type": "incident",
        "detailed_description": "Details",
        "category": "Cyber",
        "location": "US",
        "source_link": "https://example.com/ready",
        "confidence_level": "high",
        "priority_tier": "CSO Brief",
        "triage_status": "REVIEWED",
        "escalate_to_cso": 1,
        "walmart_relevance_score": 90.0,
        "recommended_owner": "CISO",
        "why_walmart_cares": "Material competitive threat.",
    }
    defaults.update(overrides)

    available = {r[1] for r in conn.execute("PRAGMA table_info(competitor_events)").fetchall()}
    payload = {k: v for k, v in defaults.items() if k in available}

    cols = ", ".join(payload.keys())
    placeholders = ", ".join("?" for _ in payload)
    cur = conn.execute(
        f"INSERT INTO competitor_events ({cols}) VALUES ({placeholders})",
        list(payload.values()),
    )
    conn.commit()
    return cur.lastrowid


def _generate(client: TestClient):
    return client.post(
        "/api/cso-briefs/generate",
        json={"title": "Readiness", "period_start": "2026-04-01", "period_end": "2026-04-08"},
        headers=ADMIN,
    )


def test_non_ready_events_excluded_and_ready_included():
    from database import get_connection

    client = _make_client()
    conn = get_connection()

    ready_id = _seed(conn, event_title="ready")
    _seed(conn, event_title="missing-source", source_link="")
    _seed(conn, event_title="invalid-source", source_link="ftp://bad")
    _seed(conn, event_title="missing-rationale", why_walmart_cares="", walmart_actionability_context="")
    _seed(conn, event_title="missing-confidence", confidence_level="", confidence_score=None)
    conn.close()

    resp = _generate(client)
    assert resp.status_code == 200
    body = resp.json()

    assert body["candidate_count"] == 5
    assert body["included_count"] == 2
    assert body["excluded_count"] == 3
    assert len(body["brief"]["items"]) == 2
    assert body["brief"]["items"][0]["competitor_event_id"] == ready_id


def test_owner_assignment_auto_seeds_from_recommended_owner():
    from database import get_connection

    client = _make_client()
    conn = get_connection()
    _seed(conn, recommended_owner="SVP AP")
    conn.close()

    resp = _generate(client)
    assert resp.status_code == 200
    item = resp.json()["brief"]["items"][0]
    assert item["owner_assignment"] == "SVP AP"


def test_missing_owner_suggestion_warns_but_does_not_exclude():
    from database import get_connection

    client = _make_client()
    conn = get_connection()
    _seed(conn, event_title="no-owner", recommended_owner="")
    conn.close()

    resp = _generate(client)
    assert resp.status_code == 200
    body = resp.json()

    assert body["included_count"] == 1
    assert body["excluded_count"] == 0
    assert body["brief"]["items"][0]["owner_assignment"] == ""


def test_generation_reuses_shared_enrichment_to_make_candidate_brief_ready():
    from database import get_connection

    client = _make_client()
    conn = get_connection()
    _seed(
        conn,
        competitor="Target",
        event_title="Target cyber outage references Acme Security",
        detailed_description="Acme Security outage impacted retail telemetry.",
        source_link="www.example.com/advisory",
        confidence_level="",
        confidence_score=81,
        recommended_owner="",
        why_walmart_cares="",
        walmart_actionability_context="",
        correlation_summary="",
        match_label="HIGH_CONFIDENCE",
        correlation_status="MATCHED",
        matched_vendor_name="Acme Security",
        linked_active_projects_count=2,
    )
    conn.close()

    resp = _generate(client)
    assert resp.status_code == 200
    body = resp.json()

    assert body["included_count"] == 1
    assert body["excluded_count"] == 0

    item = body["brief"]["items"][0]
    frozen = item["frozen_payload"]
    assert item["owner_assignment"] == "Global Security"
    assert frozen["source_link"] == "https://www.example.com/advisory"
    assert frozen["confidence_level"] == "high"
    assert frozen["why_walmart_cares"]
    assert frozen["walmart_actionability_context"]
    assert frozen["correlation_summary"]


def test_exclusion_reason_counts_returned_correctly():
    from database import get_connection

    client = _make_client()
    conn = get_connection()

    _seed(conn, event_title="bad1", source_link="")
    _seed(conn, event_title="bad2", source_link="")
    _seed(conn, event_title="bad3", source_link="ftp://nope")
    _seed(conn, event_title="ready", source_link="https://example.com/ok")
    conn.close()

    resp = _generate(client)
    body = resp.json()

    counts = body["exclusion_reason_counts"]
    assert counts["MISSING_SOURCE_LINK"] == 2
    assert counts["INVALID_SOURCE_LINK"] == 1
    assert body["excluded_count"] == 3
    assert len(body["excluded_items"]) == 3


def test_ordering_preserved_among_included_items():
    from database import get_connection

    client = _make_client()
    conn = get_connection()

    # Included and high rank by sorting
    top = _seed(
        conn,
        event_title="top",
        escalate_to_cso=1,
        walmart_relevance_score=95,
        event_date="2026-04-08",
        source_link="https://example.com/top",
    )

    # Would sort second but excluded due to missing source
    _seed(
        conn,
        event_title="excluded-mid",
        escalate_to_cso=1,
        walmart_relevance_score=90,
        event_date="2026-04-07",
        source_link="",
    )

    low = _seed(
        conn,
        event_title="low",
        escalate_to_cso=0,
        walmart_relevance_score=70,
        event_date="2026-04-06",
        source_link="https://example.com/low",
    )

    conn.close()

    resp = _generate(client)
    items = resp.json()["brief"]["items"]

    assert [i["competitor_event_id"] for i in items] == [top, low]
    assert [i["rank"] for i in items] == [1, 2]
