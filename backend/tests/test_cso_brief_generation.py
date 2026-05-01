"""Tests for CSO Brief generation + retrieval (Step 2 MVP).

Covers:
 1. generate creates a DRAFT brief
 2. generate includes only allowed priority_tier + triage_status rows
 3. generate ordering: escalate_to_cso DESC, relevance DESC, event_date DESC
 4. generate respects competitor filter
 5. generate respects max_items default and cap
 6. generated items persist frozen_payload
 7. generate writes audit row
 8. get brief returns ordered items
 9. get missing brief returns 404
10. unauthenticated access is rejected (header auth mode)
"""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _temp_db(tmp_path, monkeypatch):
    """Point DB to a temp file so tests are isolated."""
    db_path = tmp_path / "test_cso.db"
    monkeypatch.setattr("database.DB_PATH", db_path)
    from database import init_db
    init_db()
    yield db_path


def _make_client(auth_mode: str, admin_users: str = "", allowed_users: str = ""):
    import auth
    auth.AUTH_MODE = auth_mode
    auth.ADMIN_USERS = {u.strip().lower() for u in admin_users.split(",") if u.strip()}
    auth.ALLOWED_USERS = (
        {u.strip().lower() for u in allowed_users.split(",") if u.strip()}
        | auth.ADMIN_USERS
    )
    from main import app
    return TestClient(app)


@pytest.fixture()
def client():
    """Authenticated client with header auth enabled."""
    return _make_client(
        auth_mode="header",
        admin_users="admin_alice",
        allowed_users="admin_alice,analyst_bob",
    )


ADMIN = {"X-Sentry-User": "admin_alice"}
USER = {"X-Sentry-User": "analyst_bob"}


def _seed_competitor_event(conn, **overrides) -> int:
    """Insert a competitor event row and return its id.

    Defaults produce a row that QUALIFIES for CSO inclusion:
      priority_tier='CSO Brief', triage_status='REVIEWED',
      escalate_to_cso=1, walmart_relevance_score=85.0.
    """
    defaults = {
        "event_date": "2026-04-05",
        "competitor": "Amazon",
        "event_title": "Test event",
        "event_type": "incident",
        "detailed_description": "Details here.",
        "category": "Cyber",
        "location": "US",
        "source_link": "https://example.com/article",
        "confidence_level": "high",
        "priority_tier": "CSO Brief",
        "triage_status": "REVIEWED",
        "escalate_to_cso": 1,
        "walmart_relevance_score": 85.0,
        "signal_type": "competitive",
        "recommended_owner": "CISO",
        "why_walmart_cares": "Relevant to Walmart ops.",
        "score_reason": "High impact event.",
        "source_month": "2026-04",
    }
    defaults.update(overrides)
    cols = ", ".join(defaults.keys())
    placeholders = ", ".join("?" for _ in defaults)
    cur = conn.execute(
        f"INSERT INTO competitor_events ({cols}) VALUES ({placeholders})",
        list(defaults.values()),
    )
    conn.commit()
    return cur.lastrowid


def _seed_events(conn, n: int = 1, **overrides) -> list[int]:
    """Seed N qualifying events with sequential titles."""
    ids = []
    for i in range(n):
        kw = {**overrides, "event_title": f"Event {i+1}"}
        ids.append(_seed_competitor_event(conn, **kw))
    return ids


# ── Test 1: generate creates a DRAFT brief ───────────────────────────────────

class TestGenerateCreatesDraft:
    def test_basic_generation(self, client):
        from database import get_connection
        conn = get_connection()
        _seed_competitor_event(conn)
        conn.close()

        resp = client.post("/api/cso-briefs/generate", json={
            "title": "Weekly Brief",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
        }, headers=ADMIN)

        assert resp.status_code == 200
        body = resp.json()
        assert body["brief"]["status"] == "DRAFT"
        assert body["brief"]["title"] == "Weekly Brief"
        assert body["brief"]["period_start"] == "2026-04-01"
        assert body["brief"]["period_end"] == "2026-04-08"
        assert body["brief"]["snapshot_version"] == 1
        assert body["brief"]["created_by"] == "admin_alice"
        assert body["included_count"] >= 1


# ── Test 2: inclusion logic — priority_tier + triage_status gates ─────────────

class TestInclusionLogic:
    def test_only_allowed_tiers_and_statuses_included(self, client):
        from database import get_connection
        conn = get_connection()

        # Qualifying rows
        _seed_competitor_event(conn, priority_tier="CSO Brief", triage_status="REVIEWED")
        _seed_competitor_event(conn, priority_tier="Leadership Watch", triage_status="ESCALATED")

        # Non-qualifying: wrong tier
        _seed_competitor_event(conn, priority_tier="Monitor", triage_status="REVIEWED")

        # Non-qualifying: wrong triage status
        _seed_competitor_event(conn, priority_tier="CSO Brief", triage_status="UNREVIEWED")

        # Non-qualifying: soft-deleted
        _seed_competitor_event(conn, priority_tier="CSO Brief", triage_status="REVIEWED",
                               deleted_at="2026-04-01T00:00:00")

        conn.close()

        resp = client.post("/api/cso-briefs/generate", json={
            "title": "Filter test",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
        }, headers=ADMIN)

        assert resp.status_code == 200
        body = resp.json()
        assert body["included_count"] == 2
        assert body["excluded_count"] == 0
        assert len(body["brief"]["items"]) == 2


# ── Test 3: ordering — escalate_to_cso DESC, relevance DESC, event_date DESC ─

class TestOrdering:
    def test_items_ordered_correctly(self, client):
        from database import get_connection
        conn = get_connection()

        # Row A: escalate=0, score=50, date=2026-04-01 → should be last
        a = _seed_competitor_event(conn,
            event_title="A-low",
            escalate_to_cso=0,
            walmart_relevance_score=50.0,
            event_date="2026-04-01",
        )
        # Row B: escalate=1, score=90, date=2026-04-05 → should be first
        b = _seed_competitor_event(conn,
            event_title="B-top",
            escalate_to_cso=1,
            walmart_relevance_score=90.0,
            event_date="2026-04-05",
        )
        # Row C: escalate=1, score=70, date=2026-04-03 → second (same escalate, lower score)
        c = _seed_competitor_event(conn,
            event_title="C-mid",
            escalate_to_cso=1,
            walmart_relevance_score=70.0,
            event_date="2026-04-03",
        )
        conn.close()

        resp = client.post("/api/cso-briefs/generate", json={
            "title": "Order test",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
        }, headers=ADMIN)

        assert resp.status_code == 200
        items = resp.json()["brief"]["items"]
        event_ids = [i["competitor_event_id"] for i in items]
        assert event_ids == [b, c, a]

        # Ranks must be sequential starting at 1
        ranks = [i["rank"] for i in items]
        assert ranks == [1, 2, 3]


# ── Test 4: competitor filter ─────────────────────────────────────────────────

class TestCompetitorFilter:
    def test_respects_competitor_filter(self, client):
        from database import get_connection
        conn = get_connection()

        _seed_competitor_event(conn, competitor="Amazon")
        _seed_competitor_event(conn, competitor="Target")
        _seed_competitor_event(conn, competitor="Costco")
        conn.close()

        resp = client.post("/api/cso-briefs/generate", json={
            "title": "Filter test",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
            "filters": {"competitor": ["Amazon", "Target"]},
        }, headers=ADMIN)

        assert resp.status_code == 200
        items = resp.json()["brief"]["items"]
        competitors = {i["frozen_payload"]["competitor"] for i in items}
        assert competitors == {"Amazon", "Target"}
        assert resp.json()["included_count"] == 2
        assert resp.json()["excluded_count"] == 0


# ── Test 5: max_items default + cap ──────────────────────────────────────────

class TestMaxItems:
    def test_default_max_items_is_20(self, client):
        from database import get_connection
        conn = get_connection()
        _seed_events(conn, 25)
        conn.close()

        resp = client.post("/api/cso-briefs/generate", json={
            "title": "Default limit",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
        }, headers=ADMIN)

        assert resp.status_code == 200
        assert len(resp.json()["brief"]["items"]) == 20
        # candidate_count should reflect total qualifying (25)
        assert resp.json()["candidate_count"] == 25

    def test_max_items_capped_at_100(self, client):
        from database import get_connection
        conn = get_connection()
        _seed_events(conn, 5)
        conn.close()

        resp = client.post("/api/cso-briefs/generate", json={
            "title": "Cap test",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
            "filters": {"max_items": 999},
        }, headers=ADMIN)

        # Should not crash — cap silently applied
        assert resp.status_code == 200
        assert len(resp.json()["brief"]["items"]) == 5

    def test_explicit_max_items_respected(self, client):
        from database import get_connection
        conn = get_connection()
        _seed_events(conn, 10)
        conn.close()

        resp = client.post("/api/cso-briefs/generate", json={
            "title": "Explicit limit",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
            "filters": {"max_items": 3},
        }, headers=ADMIN)

        assert resp.status_code == 200
        assert len(resp.json()["brief"]["items"]) == 3


# ── Test 6: frozen_payload persisted correctly ────────────────────────────────

class TestFrozenPayload:
    def test_frozen_payload_captures_source_fields(self, client):
        from database import get_connection
        conn = get_connection()
        eid = _seed_competitor_event(conn,
            event_title="Payload snapshot test",
            competitor="Target",
            source_link="https://example.com/snap",
            confidence_level="high",
            walmart_relevance_score=92.5,
            priority_tier="CSO Brief",
            escalate_to_cso=1,
            why_walmart_cares="Direct threat to supply chain.",
        )
        conn.close()

        resp = client.post("/api/cso-briefs/generate", json={
            "title": "Payload test",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
        }, headers=ADMIN)

        assert resp.status_code == 200
        items = resp.json()["brief"]["items"]
        assert len(items) == 1
        fp = items[0]["frozen_payload"]
        assert fp["id"] == eid
        assert fp["competitor"] == "Target"
        assert fp["event_title"] == "Payload snapshot test"
        assert fp["source_link"] == "https://example.com/snap"
        assert fp["confidence_level"] == "high"
        assert fp["walmart_relevance_score"] == 92.5
        assert fp["priority_tier"] == "CSO Brief"
        assert fp["escalate_to_cso"] == 1
        assert fp["why_walmart_cares"] == "Direct threat to supply chain."

    def test_frozen_payload_persisted_to_db(self, client):
        from database import get_connection
        conn = get_connection()
        _seed_competitor_event(conn, event_title="DB persist test")
        conn.close()

        resp = client.post("/api/cso-briefs/generate", json={
            "title": "DB persist",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
        }, headers=ADMIN)
        brief_id = resp.json()["brief"]["id"]

        # Read back from DB directly
        conn = get_connection()
        row = conn.execute(
            "SELECT frozen_payload FROM cso_brief_items WHERE brief_id = ?",
            (brief_id,),
        ).fetchone()
        conn.close()

        assert row is not None
        payload = json.loads(row[0])
        assert payload["event_title"] == "DB persist test"


# ── Test 7: audit row written ─────────────────────────────────────────────────

class TestAuditLog:
    def test_generate_writes_audit_row(self, client):
        from database import get_connection
        conn = get_connection()
        _seed_competitor_event(conn)
        conn.close()

        resp = client.post("/api/cso-briefs/generate", json={
            "title": "Audit test brief",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
        }, headers=ADMIN)

        brief_id = resp.json()["brief"]["id"]

        conn = get_connection()
        audit = conn.execute(
            "SELECT * FROM cso_brief_audit_log WHERE brief_id = ?",
            (brief_id,),
        ).fetchone()
        conn.close()

        assert audit is not None
        assert audit["action"] == "create"
        assert audit["actor_id"] == "admin_alice"
        payload = json.loads(audit["new_value"])
        assert payload["title"] == "Audit test brief"
        assert payload["included_count"] >= 1


# ── Test 8: GET brief returns ordered items ───────────────────────────────────

class TestGetBrief:
    def test_get_returns_brief_with_ordered_items(self, client):
        from database import get_connection
        conn = get_connection()
        _seed_competitor_event(conn, event_title="E1", escalate_to_cso=0, walmart_relevance_score=50.0)
        _seed_competitor_event(conn, event_title="E2", escalate_to_cso=1, walmart_relevance_score=95.0)
        conn.close()

        gen_resp = client.post("/api/cso-briefs/generate", json={
            "title": "Get test",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
        }, headers=ADMIN)
        brief_id = gen_resp.json()["brief"]["id"]

        get_resp = client.get(f"/api/cso-briefs/{brief_id}", headers=USER)
        assert get_resp.status_code == 200

        body = get_resp.json()
        assert body["id"] == brief_id
        assert body["status"] == "DRAFT"
        assert len(body["items"]) == 2
        # First item should be E2 (escalate=1, higher score)
        assert body["items"][0]["frozen_payload"]["event_title"] == "E2"
        assert body["items"][0]["rank"] == 1
        assert body["items"][1]["frozen_payload"]["event_title"] == "E1"
        assert body["items"][1]["rank"] == 2

    def test_get_returns_quality_gate_result(self, client):
        from database import get_connection
        conn = get_connection()
        _seed_competitor_event(conn)
        conn.close()

        gen_resp = client.post("/api/cso-briefs/generate", json={
            "title": "QG test",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
        }, headers=ADMIN)
        brief_id = gen_resp.json()["brief"]["id"]

        get_resp = client.get(f"/api/cso-briefs/{brief_id}", headers=USER)
        assert get_resp.status_code == 200
        assert "quality_gate_result" in get_resp.json()


# ── Test 9: GET missing brief returns 404 ─────────────────────────────────────

class TestGetMissing:
    def test_missing_brief_returns_404(self, client):
        resp = client.get("/api/cso-briefs/nonexistent-uuid", headers=USER)
        assert resp.status_code == 404


# ── Test 10: unauthenticated access rejected ─────────────────────────────────

class TestAuthRequired:
    def test_generate_requires_auth(self, client):
        resp = client.post("/api/cso-briefs/generate", json={
            "title": "No auth",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
        })
        assert resp.status_code == 401

    def test_get_requires_auth(self, client):
        resp = client.get("/api/cso-briefs/some-id")
        assert resp.status_code == 401

    def test_unknown_user_rejected(self, client):
        resp = client.post("/api/cso-briefs/generate", json={
            "title": "Unknown",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
        }, headers={"X-Sentry-User": "hacker_eve"})
        assert resp.status_code == 403
