"""Tests for CSO Brief transition, snapshot, and audit (Steps 5-7 MVP).

Covers:
 1.  analyst can transition DRAFT -> IN_REVIEW
 2.  analyst can transition IN_REVIEW -> DRAFT
 3.  analyst cannot transition IN_REVIEW -> APPROVED (403)
 4.  analyst cannot transition APPROVED -> PUBLISHED_DRAFT (403)
 5.  admin can transition IN_REVIEW -> APPROVED when validation passes
 6.  approval blocked with 422 when validation fails
 7.  admin can transition APPROVED -> PUBLISHED_DRAFT
 8.  invalid transition blocked (409)
 9.  missing brief returns 404 for transition
10.  transition writes audit row with status diff and note
11.  approval transition refreshes/persists quality_gate_result
12.  snapshot returns read-only draft payload
13.  snapshot uses frozen payload values, not live competitor row mutations
14.  audit endpoint returns paginated records newest first
15.  unauthenticated transition/snapshot/audit rejected
"""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _temp_db(tmp_path, monkeypatch):
    db_path = tmp_path / "test_cso_trans.db"
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
    return _make_client(
        auth_mode="header",
        admin_users="admin_alice",
        allowed_users="admin_alice,analyst_bob",
    )


ADMIN = {"X-Sentry-User": "admin_alice"}
USER = {"X-Sentry-User": "analyst_bob"}


def _seed_event(conn, **overrides) -> int:
    defaults = {
        "event_date": "2026-04-05",
        "competitor": "Amazon",
        "event_title": "Test event",
        "event_type": "incident",
        "detailed_description": "Details.",
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
        "why_walmart_cares": "Relevant to ops.",
        "score_reason": "High impact.",
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


def _generate_brief(client, headers=ADMIN, **event_overrides):
    """Seed one event + generate a brief; return (brief_json, item_list)."""
    from database import get_connection
    conn = get_connection()
    _seed_event(conn, **event_overrides)
    conn.close()

    resp = client.post("/api/cso-briefs/generate", json={
        "title": "Test Brief",
        "period_start": "2026-04-01",
        "period_end": "2026-04-08",
    }, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    return body["brief"], body["brief"]["items"]


def _make_brief_approval_ready(client, brief, items):
    """Fill all fields needed to pass validation."""
    client.patch(f"/api/cso-briefs/{brief['id']}", json={
        "executive_summary": "Key findings this week.",
    }, headers=USER)
    for item in items:
        client.patch(
            f"/api/cso-briefs/{brief['id']}/items/{item['id']}",
            json={"owner_assignment": "CISO"},
            headers=USER,
        )


def _set_brief_status(brief_id: str, status: str):
    from database import get_connection
    conn = get_connection()
    conn.execute("UPDATE cso_briefs SET status = ? WHERE id = ?", (status, brief_id))
    conn.commit()
    conn.close()


# ── Test 1: analyst can transition DRAFT -> IN_REVIEW ─────────────────────────

class TestAnalystDraftToInReview:
    def test_transition_succeeds(self, client):
        brief, _ = _generate_brief(client)

        resp = client.post(f"/api/cso-briefs/{brief['id']}/transition", json={
            "to_status": "IN_REVIEW",
            "note": "Ready for admin review",
        }, headers=USER)

        assert resp.status_code == 200
        body = resp.json()
        assert body["from_status"] == "DRAFT"
        assert body["to_status"] == "IN_REVIEW"
        assert body["brief"]["status"] == "IN_REVIEW"
        assert body["brief"]["submitted_at"] is not None
        assert body["brief"]["submitted_by"] == "analyst_bob"
        assert body["transitioned_by"] == "analyst_bob"


# ── Test 2: analyst can transition IN_REVIEW -> DRAFT ─────────────────────────

class TestAnalystInReviewToDraft:
    def test_revert_succeeds(self, client):
        brief, _ = _generate_brief(client)
        _set_brief_status(brief["id"], "IN_REVIEW")

        resp = client.post(f"/api/cso-briefs/{brief['id']}/transition", json={
            "to_status": "DRAFT",
            "note": "Needs more work",
        }, headers=USER)

        assert resp.status_code == 200
        body = resp.json()
        assert body["from_status"] == "IN_REVIEW"
        assert body["to_status"] == "DRAFT"
        assert body["brief"]["status"] == "DRAFT"


# ── Test 3: analyst cannot transition IN_REVIEW -> APPROVED ───────────────────

class TestAnalystCannotApprove:
    def test_returns_403(self, client):
        brief, items = _generate_brief(client)
        _make_brief_approval_ready(client, brief, items)
        _set_brief_status(brief["id"], "IN_REVIEW")

        resp = client.post(f"/api/cso-briefs/{brief['id']}/transition", json={
            "to_status": "APPROVED",
        }, headers=USER)

        assert resp.status_code == 403


# ── Test 4: analyst cannot transition APPROVED -> PUBLISHED_DRAFT ─────────────

class TestAnalystCannotPublishDraft:
    def test_returns_403(self, client):
        brief, _ = _generate_brief(client)
        _set_brief_status(brief["id"], "APPROVED")

        resp = client.post(f"/api/cso-briefs/{brief['id']}/transition", json={
            "to_status": "PUBLISHED_DRAFT",
        }, headers=USER)

        assert resp.status_code == 403


# ── Test 5: admin can approve when validation passes ──────────────────────────

class TestAdminApproveValid:
    def test_approval_succeeds(self, client):
        brief, items = _generate_brief(client)
        _make_brief_approval_ready(client, brief, items)
        _set_brief_status(brief["id"], "IN_REVIEW")

        resp = client.post(f"/api/cso-briefs/{brief['id']}/transition", json={
            "to_status": "APPROVED",
            "note": "Looks good",
        }, headers=ADMIN)

        assert resp.status_code == 200
        body = resp.json()
        assert body["brief"]["status"] == "APPROVED"
        assert body["brief"]["approved_at"] is not None
        assert body["brief"]["approved_by"] == "admin_alice"
        # Validation result included
        assert body["validation"] is not None
        assert body["validation"]["passed"] is True


# ── Test 6: approval blocked with 422 when validation fails ──────────────────

class TestAdminApproveInvalid:
    def test_returns_422_with_violations(self, client):
        brief, _ = _generate_brief(client)
        # No executive_summary or owner_assignment → validation fails
        _set_brief_status(brief["id"], "IN_REVIEW")

        resp = client.post(f"/api/cso-briefs/{brief['id']}/transition", json={
            "to_status": "APPROVED",
        }, headers=ADMIN)

        assert resp.status_code == 422
        detail = resp.json()["detail"]
        assert detail["message"] == "Validation failed — approval blocked"
        assert len(detail["violations"]) > 0

        # Brief should still be IN_REVIEW
        get_resp = client.get(f"/api/cso-briefs/{brief['id']}", headers=ADMIN)
        assert get_resp.json()["status"] == "IN_REVIEW"


# ── Test 7: admin can publish draft ───────────────────────────────────────────

class TestAdminPublishDraft:
    def test_publish_succeeds(self, client):
        brief, _ = _generate_brief(client)
        _set_brief_status(brief["id"], "APPROVED")

        resp = client.post(f"/api/cso-briefs/{brief['id']}/transition", json={
            "to_status": "PUBLISHED_DRAFT",
            "note": "Distribute to leadership.",
        }, headers=ADMIN)

        assert resp.status_code == 200
        body = resp.json()
        assert body["brief"]["status"] == "PUBLISHED_DRAFT"
        assert body["brief"]["published_draft_at"] is not None
        assert body["brief"]["published_draft_by"] == "admin_alice"


# ── Test 8: invalid transition blocked ────────────────────────────────────────

class TestInvalidTransition:
    def test_draft_to_approved_blocked(self, client):
        """Cannot skip IN_REVIEW step."""
        brief, _ = _generate_brief(client)

        resp = client.post(f"/api/cso-briefs/{brief['id']}/transition", json={
            "to_status": "APPROVED",
        }, headers=ADMIN)

        assert resp.status_code == 409

    def test_approved_to_draft_blocked(self, client):
        brief, _ = _generate_brief(client)
        _set_brief_status(brief["id"], "APPROVED")

        resp = client.post(f"/api/cso-briefs/{brief['id']}/transition", json={
            "to_status": "DRAFT",
        }, headers=ADMIN)

        assert resp.status_code == 409

    def test_published_draft_to_anything_blocked(self, client):
        brief, _ = _generate_brief(client)
        _set_brief_status(brief["id"], "PUBLISHED_DRAFT")

        resp = client.post(f"/api/cso-briefs/{brief['id']}/transition", json={
            "to_status": "DRAFT",
        }, headers=ADMIN)

        assert resp.status_code == 409

    def test_bogus_status_blocked(self, client):
        brief, _ = _generate_brief(client)

        resp = client.post(f"/api/cso-briefs/{brief['id']}/transition", json={
            "to_status": "SUBMITTED",
        }, headers=ADMIN)

        assert resp.status_code == 409


# ── Test 9: missing brief returns 404 ─────────────────────────────────────────

class TestTransitionNotFound:
    def test_returns_404(self, client):
        resp = client.post("/api/cso-briefs/no-such-brief/transition", json={
            "to_status": "IN_REVIEW",
        }, headers=ADMIN)
        assert resp.status_code == 404


# ── Test 10: transition writes audit row ──────────────────────────────────────

class TestTransitionAudit:
    def test_audit_row_written(self, client):
        brief, _ = _generate_brief(client)

        client.post(f"/api/cso-briefs/{brief['id']}/transition", json={
            "to_status": "IN_REVIEW",
            "note": "Submitting for review",
        }, headers=USER)

        from database import get_connection
        conn = get_connection()
        audit = conn.execute(
            "SELECT * FROM cso_brief_audit_log WHERE brief_id = ? AND action = 'transition'",
            (brief["id"],),
        ).fetchone()
        conn.close()

        assert audit is not None
        assert audit["actor_id"] == "analyst_bob"
        old = json.loads(audit["old_value"])
        new = json.loads(audit["new_value"])
        assert old["status"] == "DRAFT"
        assert new["status"] == "IN_REVIEW"
        assert new["note"] == "Submitting for review"


# ── Test 11: approval refreshes/persists quality_gate_result ──────────────────

class TestApprovalPersistsValidation:
    def test_fresh_quality_gate_result_on_approval(self, client):
        brief, items = _generate_brief(client)
        _make_brief_approval_ready(client, brief, items)
        _set_brief_status(brief["id"], "IN_REVIEW")

        client.post(f"/api/cso-briefs/{brief['id']}/transition", json={
            "to_status": "APPROVED",
        }, headers=ADMIN)

        get_resp = client.get(f"/api/cso-briefs/{brief['id']}", headers=ADMIN)
        qgr_raw = get_resp.json()["quality_gate_result"]
        assert qgr_raw
        qgr = json.loads(qgr_raw)
        assert qgr["passed"] is True
        assert "checked_at" in qgr


# ── Test 12: snapshot returns read-only draft payload ─────────────────────────

class TestSnapshot:
    def test_snapshot_returns_rendering_payload(self, client):
        brief, items = _generate_brief(client)
        _make_brief_approval_ready(client, brief, items)

        resp = client.get(f"/api/cso-briefs/{brief['id']}/snapshot", headers=USER)

        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == brief["id"]
        assert body["title"] == "Test Brief"
        assert body["banner"] == "Draft only — Human Review Required"
        assert body["footer"] == "Draft artifact. Not final leadership directive."
        assert body["status"] == "DRAFT"
        assert body["executive_summary"] == "Key findings this week."
        assert body["snapshot_version"] == 1
        assert body["generated_at"]  # non-empty timestamp

        # Items present with frozen_payload fields
        assert len(body["items"]) == 1
        item = body["items"][0]
        assert item["competitor"] == "Amazon"
        assert item["event_title"] == "Test event"
        assert item["source_link"] == "https://example.com/article"
        assert item["priority_tier"] == "CSO Brief"
        assert item["confidence_level"] == "high"
        assert item["why_walmart_cares"] == "Relevant to ops."
        assert item["owner_assignment"] == "CISO"
        assert item["rank"] == 1

    def test_snapshot_not_found(self, client):
        resp = client.get("/api/cso-briefs/no-such/snapshot", headers=USER)
        assert resp.status_code == 404


# ── Test 13: snapshot uses frozen payload, not live mutations ─────────────────

class TestSnapshotFrozenPayload:
    def test_snapshot_ignores_live_event_mutations(self, client):
        brief, items = _generate_brief(client)

        # Mutate the live competitor_events row
        from database import get_connection
        conn = get_connection()
        conn.execute(
            "UPDATE competitor_events SET event_title = 'MUTATED TITLE' WHERE id = ?",
            (items[0]["competitor_event_id"],),
        )
        conn.commit()
        conn.close()

        resp = client.get(f"/api/cso-briefs/{brief['id']}/snapshot", headers=USER)
        assert resp.status_code == 200
        # Snapshot reads from frozen_payload, not the live row
        assert resp.json()["items"][0]["event_title"] == "Test event"


# ── Test 14: audit endpoint with pagination ──────────────────────────────────

class TestAuditEndpoint:
    def test_returns_paginated_records_newest_first(self, client):
        brief, items = _generate_brief(client)

        # Perform some actions to create audit entries
        _make_brief_approval_ready(client, brief, items)
        client.post(f"/api/cso-briefs/{brief['id']}/validate", headers=USER)
        client.post(f"/api/cso-briefs/{brief['id']}/transition", json={
            "to_status": "IN_REVIEW",
        }, headers=USER)

        resp = client.get(
            f"/api/cso-briefs/{brief['id']}/audit?limit=2&offset=0",
            headers=USER,
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["limit"] == 2
        assert body["offset"] == 0
        assert body["total"] >= 3  # create + edits + validate + transition
        assert len(body["entries"]) == 2

        # Newest first
        e0, e1 = body["entries"]
        assert e0["created_at"] >= e1["created_at"]

        # Each entry has required fields
        for entry in body["entries"]:
            assert "id" in entry
            assert "brief_id" in entry
            assert "action" in entry
            assert "actor_id" in entry
            assert "old_value" in entry
            assert "new_value" in entry
            assert "created_at" in entry

    def test_pagination_offset(self, client):
        brief, items = _generate_brief(client)
        _make_brief_approval_ready(client, brief, items)

        # Get total
        resp1 = client.get(
            f"/api/cso-briefs/{brief['id']}/audit?limit=1&offset=0",
            headers=USER,
        )
        total = resp1.json()["total"]

        # Offset past end
        resp2 = client.get(
            f"/api/cso-briefs/{brief['id']}/audit?limit=10&offset={total}",
            headers=USER,
        )
        assert resp2.status_code == 200
        assert len(resp2.json()["entries"]) == 0

    def test_audit_not_found(self, client):
        resp = client.get("/api/cso-briefs/no-such/audit", headers=USER)
        assert resp.status_code == 404

    def test_audit_limit_capped(self, client):
        brief, _ = _generate_brief(client)

        resp = client.get(
            f"/api/cso-briefs/{brief['id']}/audit?limit=999",
            headers=USER,
        )
        assert resp.status_code == 200
        assert resp.json()["limit"] == 200  # AUDIT_MAX_LIMIT


# ── Test 15: unauthenticated transition/snapshot/audit rejected ───────────────

class TestUnauthenticatedReject:
    def test_transition_requires_auth(self, client):
        resp = client.post("/api/cso-briefs/some-id/transition", json={
            "to_status": "IN_REVIEW",
        })
        assert resp.status_code == 401

    def test_snapshot_requires_auth(self, client):
        resp = client.get("/api/cso-briefs/some-id/snapshot")
        assert resp.status_code == 401

    def test_audit_requires_auth(self, client):
        resp = client.get("/api/cso-briefs/some-id/audit")
        assert resp.status_code == 401
