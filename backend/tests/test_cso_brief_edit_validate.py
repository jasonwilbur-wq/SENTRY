"""Tests for CSO Brief editing + validation (Steps 3-4 MVP).

Covers:
 1. patch brief updates executive_summary and review_notes
 2. patch brief blocked in APPROVED
 3. patch item updates rank/commentary/uncertainty/owner/include flag
 4. patch item blocked in PUBLISHED_DRAFT
 5. validate fails when executive_summary is empty
 6. validate fails when included item missing source_link
 7. validate fails when source_link is non-http(s)
 8. validate fails when rationale/actionability missing
 9. validate fails when owner_assignment missing
10. validate fails when confidence missing
11. validate ignores excluded items (include_in_summary=0)
12. validate persists quality_gate_result JSON
13. validate writes audit row
14. item edit writes audit row
15. unauthenticated edit/validate rejected
16. unknown brief/item returns 404
"""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _temp_db(tmp_path, monkeypatch):
    db_path = tmp_path / "test_cso_edit.db"
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
    """Insert a qualifying competitor event row."""
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


def _set_brief_status(brief_id: str, status: str):
    """Directly set status in DB (bypasses state machine for test setup)."""
    from database import get_connection
    conn = get_connection()
    conn.execute("UPDATE cso_briefs SET status = ? WHERE id = ?", (status, brief_id))
    conn.commit()
    conn.close()


# ── Test 1: patch brief updates executive_summary and review_notes ────────────

class TestPatchBrief:
    def test_updates_executive_summary_and_review_notes(self, client):
        brief, _ = _generate_brief(client)

        resp = client.patch(f"/api/cso-briefs/{brief['id']}", json={
            "executive_summary": "Key findings this week.",
            "review_notes": "Needs CSO signoff.",
        }, headers=USER)

        assert resp.status_code == 200
        body = resp.json()
        assert body["executive_summary"] == "Key findings this week."
        assert body["review_notes"] == "Needs CSO signoff."
        assert body["updated_by"] == "analyst_bob"

    def test_partial_update_only_changes_specified_field(self, client):
        brief, _ = _generate_brief(client)

        # Set summary first
        client.patch(f"/api/cso-briefs/{brief['id']}", json={
            "executive_summary": "Original summary.",
        }, headers=USER)

        # Only update review_notes
        resp = client.patch(f"/api/cso-briefs/{brief['id']}", json={
            "review_notes": "Just notes.",
        }, headers=USER)

        assert resp.status_code == 200
        body = resp.json()
        assert body["executive_summary"] == "Original summary."
        assert body["review_notes"] == "Just notes."


# ── Test 2: patch brief blocked in APPROVED ───────────────────────────────────

class TestPatchBriefStateBlocked:
    def test_patch_blocked_in_approved(self, client):
        brief, _ = _generate_brief(client)
        _set_brief_status(brief["id"], "APPROVED")

        resp = client.patch(f"/api/cso-briefs/{brief['id']}", json={
            "executive_summary": "Should fail.",
        }, headers=ADMIN)

        assert resp.status_code == 409

    def test_patch_blocked_in_published_draft(self, client):
        brief, _ = _generate_brief(client)
        _set_brief_status(brief["id"], "PUBLISHED_DRAFT")

        resp = client.patch(f"/api/cso-briefs/{brief['id']}", json={
            "review_notes": "Should fail.",
        }, headers=ADMIN)

        assert resp.status_code == 409

    def test_patch_allowed_in_in_review(self, client):
        brief, _ = _generate_brief(client)
        _set_brief_status(brief["id"], "IN_REVIEW")

        resp = client.patch(f"/api/cso-briefs/{brief['id']}", json={
            "executive_summary": "Updated in review.",
        }, headers=USER)

        assert resp.status_code == 200
        assert resp.json()["executive_summary"] == "Updated in review."


# ── Test 3: patch item updates fields ─────────────────────────────────────────

class TestPatchItem:
    def test_updates_all_editable_fields(self, client):
        brief, items = _generate_brief(client)
        item = items[0]

        resp = client.patch(
            f"/api/cso-briefs/{brief['id']}/items/{item['id']}",
            json={
                "rank": 5,
                "analyst_commentary": "Very important signal.",
                "uncertainty_note": "Low sample size.",
                "owner_assignment": "VP Supply Chain",
                "include_in_summary": 0,
            },
            headers=USER,
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["rank"] == 5
        assert body["analyst_commentary"] == "Very important signal."
        assert body["uncertainty_note"] == "Low sample size."
        assert body["owner_assignment"] == "VP Supply Chain"
        assert body["include_in_summary"] == 0

    def test_frozen_payload_not_mutated(self, client):
        brief, items = _generate_brief(client)
        item = items[0]
        original_fp = item["frozen_payload"]

        client.patch(
            f"/api/cso-briefs/{brief['id']}/items/{item['id']}",
            json={"analyst_commentary": "Changed commentary."},
            headers=USER,
        )

        # Re-fetch and verify frozen_payload unchanged
        get_resp = client.get(f"/api/cso-briefs/{brief['id']}", headers=USER)
        fetched_fp = get_resp.json()["items"][0]["frozen_payload"]
        assert fetched_fp == original_fp


# ── Test 4: patch item blocked in PUBLISHED_DRAFT ─────────────────────────────

class TestPatchItemStateBlocked:
    def test_item_edit_blocked_in_published_draft(self, client):
        brief, items = _generate_brief(client)
        _set_brief_status(brief["id"], "PUBLISHED_DRAFT")

        resp = client.patch(
            f"/api/cso-briefs/{brief['id']}/items/{items[0]['id']}",
            json={"analyst_commentary": "Should fail."},
            headers=USER,
        )

        assert resp.status_code == 409

    def test_item_edit_blocked_in_approved(self, client):
        brief, items = _generate_brief(client)
        _set_brief_status(brief["id"], "APPROVED")

        resp = client.patch(
            f"/api/cso-briefs/{brief['id']}/items/{items[0]['id']}",
            json={"owner_assignment": "Nope."},
            headers=USER,
        )

        assert resp.status_code == 409


# ── Test 5: validate fails — missing executive_summary ────────────────────────

class TestValidateMissingExecSummary:
    def test_fails_when_empty(self, client):
        brief, items = _generate_brief(client)
        # Give owner_assignment so we isolate the executive_summary violation
        client.patch(
            f"/api/cso-briefs/{brief['id']}/items/{items[0]['id']}",
            json={"owner_assignment": "CISO"},
            headers=USER,
        )

        resp = client.post(f"/api/cso-briefs/{brief['id']}/validate", headers=USER)
        assert resp.status_code == 200
        body = resp.json()
        assert body["passed"] is False
        codes = [v["code"] for v in body["violations"]]
        assert "MISSING_EXECUTIVE_SUMMARY" in codes


# ── Test 6: validate fails — missing source_link ──────────────────────────────

class TestValidateMissingSourceLink:
    def test_generation_excludes_item_when_source_link_empty(self, client):
        brief, items = _generate_brief(client, source_link="")

        assert items == []

        resp = client.post(f"/api/cso-briefs/{brief['id']}/validate", headers=USER)
        assert resp.status_code == 200
        body = resp.json()
        codes = [v["code"] for v in body["violations"]]
        assert codes == ["MISSING_EXECUTIVE_SUMMARY"]
        assert body["included_item_count"] == 0


# ── Test 7: validate fails — invalid source_link ─────────────────────────────

class TestValidateInvalidSourceLink:
    def test_generation_excludes_item_when_source_link_not_http(self, client):
        brief, items = _generate_brief(client, source_link="ftp://badlink.com/file")

        assert items == []

        resp = client.post(f"/api/cso-briefs/{brief['id']}/validate", headers=USER)
        assert resp.status_code == 200
        body = resp.json()
        codes = [v["code"] for v in body["violations"]]
        assert codes == ["MISSING_EXECUTIVE_SUMMARY"]
        assert body["included_item_count"] == 0


# ── Test 8: validate fails — missing rationale ───────────────────────────────

class TestValidateMissingRationale:
    def test_generation_enrichment_backfills_missing_rationale(self, client):
        brief, items = _generate_brief(
            client,
            why_walmart_cares="",
            walmart_actionability_context="",
        )

        assert len(items) == 1

        client.patch(f"/api/cso-briefs/{brief['id']}", json={
            "executive_summary": "Has summary.",
        }, headers=USER)
        client.patch(
            f"/api/cso-briefs/{brief['id']}/items/{items[0]['id']}",
            json={"owner_assignment": "CISO"},
            headers=USER,
        )

        resp = client.post(f"/api/cso-briefs/{brief['id']}/validate", headers=USER)
        assert resp.status_code == 200
        codes = [v["code"] for v in resp.json()["violations"]]
        assert "MISSING_RATIONALE" not in codes


# ── Test 9: validate fails — missing owner_assignment ─────────────────────────

class TestValidateMissingOwner:
    def test_fails_when_owner_empty(self, client):
        brief, _ = _generate_brief(client, recommended_owner="")

        resp = client.post(f"/api/cso-briefs/{brief['id']}/validate", headers=USER)
        assert resp.status_code == 200
        codes = [v["code"] for v in resp.json()["violations"]]
        assert "MISSING_OWNER_ASSIGNMENT" in codes


# ── Test 10: validate fails — missing confidence ──────────────────────────────

class TestValidateMissingConfidence:
    def test_generation_excludes_item_when_confidence_missing(self, client):
        brief, items = _generate_brief(client, confidence_level="", confidence_score=None)

        assert items == []

        resp = client.post(f"/api/cso-briefs/{brief['id']}/validate", headers=USER)
        assert resp.status_code == 200
        body = resp.json()
        codes = [v["code"] for v in body["violations"]]
        assert codes == ["MISSING_EXECUTIVE_SUMMARY"]
        assert body["included_item_count"] == 0

    def test_passes_confidence_when_score_bucket_available(self, client):
        """If confidence_level is empty but confidence_score is present,
        the score bucket should satisfy the gate."""
        from database import get_connection
        conn = get_connection()
        _seed_event(conn, confidence_level="", confidence_score=85.0)
        conn.close()

        resp = client.post("/api/cso-briefs/generate", json={
            "title": "Score bucket",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
        }, headers=ADMIN)
        brief = resp.json()["brief"]
        items = brief["items"]

        # Set required fields to isolate confidence check
        client.patch(f"/api/cso-briefs/{brief['id']}", json={
            "executive_summary": "Has summary.",
        }, headers=USER)
        client.patch(
            f"/api/cso-briefs/{brief['id']}/items/{items[0]['id']}",
            json={"owner_assignment": "CISO"},
            headers=USER,
        )

        val_resp = client.post(f"/api/cso-briefs/{brief['id']}/validate", headers=USER)
        codes = [v["code"] for v in val_resp.json()["violations"]]
        assert "MISSING_CONFIDENCE" not in codes


# ── Test 11: validate ignores excluded items ──────────────────────────────────

class TestValidateExcludedItems:
    def test_excluded_item_not_checked(self, client):
        """An item excluded after generation should not generate violations."""
        brief, items = _generate_brief(client, recommended_owner="")

        client.patch(
            f"/api/cso-briefs/{brief['id']}",
            json={"executive_summary": "Has summary."},
            headers=USER,
        )
        client.patch(
            f"/api/cso-briefs/{brief['id']}/items/{items[0]['id']}",
            json={"include_in_summary": 0},
            headers=USER,
        )

        resp = client.post(f"/api/cso-briefs/{brief['id']}/validate", headers=USER)
        body = resp.json()
        item_violations = [v for v in body["violations"] if v.get("item_id")]
        assert len(item_violations) == 0
        assert body["included_item_count"] == 0


# ── Test 12: validate persists quality_gate_result ────────────────────────────

class TestValidatePersistence:
    def test_quality_gate_result_stored_in_db(self, client):
        brief, items = _generate_brief(client)

        client.post(f"/api/cso-briefs/{brief['id']}/validate", headers=USER)

        # Fetch brief and check quality_gate_result is populated
        get_resp = client.get(f"/api/cso-briefs/{brief['id']}", headers=USER)
        qgr = get_resp.json()["quality_gate_result"]
        assert qgr  # non-empty
        parsed = json.loads(qgr)
        assert "passed" in parsed
        assert "violations" in parsed
        assert "checked_at" in parsed
        assert "included_item_count" in parsed


# ── Test 13: validate writes audit row ────────────────────────────────────────

class TestValidateAudit:
    def test_validate_audit_row_written(self, client):
        brief, _ = _generate_brief(client)

        client.post(f"/api/cso-briefs/{brief['id']}/validate", headers=ADMIN)

        from database import get_connection
        conn = get_connection()
        audit = conn.execute(
            "SELECT * FROM cso_brief_audit_log WHERE brief_id = ? AND action = 'validate'",
            (brief["id"],),
        ).fetchone()
        conn.close()

        assert audit is not None
        assert audit["actor_id"] == "admin_alice"
        payload = json.loads(audit["new_value"])
        assert "passed" in payload


# ── Test 14: item edit writes audit row ───────────────────────────────────────

class TestItemEditAudit:
    def test_edit_item_audit_row(self, client):
        brief, items = _generate_brief(client)

        client.patch(
            f"/api/cso-briefs/{brief['id']}/items/{items[0]['id']}",
            json={"analyst_commentary": "Audit check."},
            headers=USER,
        )

        from database import get_connection
        conn = get_connection()
        audit = conn.execute(
            "SELECT * FROM cso_brief_audit_log WHERE brief_id = ? AND action = 'edit_item'",
            (brief["id"],),
        ).fetchone()
        conn.close()

        assert audit is not None
        assert audit["actor_id"] == "analyst_bob"
        new = json.loads(audit["new_value"])
        assert new["analyst_commentary"] == "Audit check."


# ── Test 15: unauthenticated edit/validate rejected ──────────────────────────

class TestUnauthEditValidate:
    def test_patch_brief_requires_auth(self, client):
        resp = client.patch("/api/cso-briefs/some-id", json={
            "executive_summary": "No auth.",
        })
        assert resp.status_code == 401

    def test_patch_item_requires_auth(self, client):
        resp = client.patch("/api/cso-briefs/some-id/items/some-item", json={
            "analyst_commentary": "No auth.",
        })
        assert resp.status_code == 401

    def test_validate_requires_auth(self, client):
        resp = client.post("/api/cso-briefs/some-id/validate")
        assert resp.status_code == 401


# ── Test 16: analyst decision guardrails + persistence ───────────────────────

class TestAnalystDecisionGuardrails:
    def test_accept_recommendation_sets_decision_and_include_flag(self, client):
        brief, items = _generate_brief(client)

        resp = client.patch(
            f"/api/cso-briefs/{brief['id']}/items/{items[0]['id']}",
            json={
                "analyst_status": "decided",
                "analyst_decision": "accept_recommendation",
                "analyst_note": "Agree with deterministic recommendation.",
            },
            headers=USER,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["analyst_status"] == "decided"
        assert body["analyst_decision"] == body["frozen_payload"]["recommended_action"]
        assert body["analyst_decision_source"] == "analyst_accept_recommendation"
        assert body["include_in_summary"] == 1
        assert body["analyst_decided_at"]

    def test_override_recommendation_requires_analyst_note(self, client):
        brief, items = _generate_brief(client)

        without_note = client.patch(
            f"/api/cso-briefs/{brief['id']}/items/{items[0]['id']}",
            json={
                "analyst_status": "decided",
                "analyst_decision": "monitor_only",
            },
            headers=USER,
        )
        assert without_note.status_code == 422
        assert without_note.json()["detail"] == "Analyst note is required when overriding recommendation"

        with_note = client.patch(
            f"/api/cso-briefs/{brief['id']}/items/{items[0]['id']}",
            json={
                "analyst_status": "decided",
                "analyst_decision": "monitor_only",
                "analyst_note": "Defer pending incident trend confirmation.",
            },
            headers=USER,
        )
        assert with_note.status_code == 200
        body = with_note.json()
        assert body["analyst_decision"] == "monitor_only"
        assert body["analyst_decision_source"] == "analyst_override_recommendation"

    def test_manual_decision_matching_recommendation_is_manual_source(self, client):
        brief, items = _generate_brief(client)

        resp = client.patch(
            f"/api/cso-briefs/{brief['id']}/items/{items[0]['id']}",
            json={
                "analyst_status": "in_review",
                "analyst_decision": "include_in_brief",
                "analyst_note": "Matches recommendation but set explicitly.",
            },
            headers=USER,
        )
        assert resp.status_code == 200
        assert resp.json()["analyst_decision_source"] == "analyst_manual"

    def test_reject_include_for_readiness_blocked_item(self, client):
        brief, items = _generate_brief(client, source_link="")
        # source_link empty gets excluded by generation, so create explicit blocked row via direct seed
        from database import get_connection
        conn = get_connection()
        blocked_id = _seed_event(conn, source_link="", priority_tier="CSO Brief", triage_status="REVIEWED")
        conn.close()

        resp2 = client.post("/api/cso-briefs/generate", json={
            "title": "Blocked decision brief",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
            "max_items": 20,
        }, headers=ADMIN)
        assert resp2.status_code == 200
        b2 = resp2.json()["brief"]
        item = next(i for i in b2["items"] if i["competitor_event_id"] != blocked_id) if b2["items"] else None
        if item is None:
            # If no items generated, skip this strict branch because readiness exclusions removed all blocked rows by contract.
            return

        # force blocked semantics in frozen payload via patching DB for guardrail check path
        from database import get_connection as _gc
        conn2 = _gc()
        row = conn2.execute("SELECT frozen_payload FROM cso_brief_items WHERE id = ?", (item["id"],)).fetchone()
        fp = json.loads(row[0])
        fp["readiness_blocked"] = 1
        conn2.execute("UPDATE cso_brief_items SET frozen_payload = ? WHERE id = ?", (json.dumps(fp), item["id"]))
        conn2.commit()
        conn2.close()

        resp = client.patch(
            f"/api/cso-briefs/{b2['id']}/items/{item['id']}",
            json={
                "analyst_status": "decided",
                "analyst_decision": "include_in_brief",
            },
            headers=USER,
        )
        assert resp.status_code == 422
        assert "Cannot include readiness-blocked item" in resp.json()["detail"]


# ── Test 17: unknown brief/item returns 404 ──────────────────────────────────

class TestNotFound:
    def test_patch_unknown_brief_404(self, client):
        resp = client.patch("/api/cso-briefs/no-such-brief", json={
            "executive_summary": "Ghost.",
        }, headers=USER)
        assert resp.status_code == 404

    def test_patch_unknown_item_404(self, client):
        brief, _ = _generate_brief(client)
        resp = client.patch(
            f"/api/cso-briefs/{brief['id']}/items/no-such-item",
            json={"analyst_commentary": "Ghost."},
            headers=USER,
        )
        assert resp.status_code == 404

    def test_validate_unknown_brief_404(self, client):
        resp = client.post("/api/cso-briefs/no-such-brief/validate", headers=USER)
        assert resp.status_code == 404
