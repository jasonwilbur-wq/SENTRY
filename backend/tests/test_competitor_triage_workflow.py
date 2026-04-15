from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _temp_db(tmp_path, monkeypatch):
    db_path = tmp_path / "test_sentry.db"
    monkeypatch.setattr("database.DB_PATH", db_path)
    from database import init_db
    init_db()
    yield db_path


def _make_client(auth_mode: str, admin_users: str = "", allowed_users: str = ""):
    import auth

    auth.AUTH_MODE = auth_mode
    auth.ADMIN_USERS = {u.strip().lower() for u in admin_users.split(",") if u.strip()}
    auth.ALLOWED_USERS = ({u.strip().lower() for u in allowed_users.split(",") if u.strip()} | auth.ADMIN_USERS)

    from main import app

    return TestClient(app)


@pytest.fixture()
def client_authed():
    return _make_client(
        auth_mode="header",
        admin_users="admin_alice",
        allowed_users="admin_alice,analyst_bob",
    )


def _create_event(client: TestClient, headers: dict[str, str], **overrides) -> int:
    payload = {
        "event_date": "2026-02-20",
        "competitor": "Amazon",
        "event_title": "Ransomware outage impacts stores",
        "event_type": "incident",
        "detailed_description": "Critical outage, regulator investigation, and breach details.",
        "category": "Cyber",
        "location": "US",
        "source_link": "https://example.com/inc",
        "confidence_level": "high",
    }
    payload.update(overrides)
    resp = client.post("/api/admin/competitor-events", json=payload, headers=headers)
    assert resp.status_code == 200
    return resp.json()["id"]


class TestCompetitorTriageWorkflow:
    ADMIN = {"X-Sentry-User": "admin_alice"}
    USER = {"X-Sentry-User": "analyst_bob"}

    def test_triage_queue_returns_expected_rows_and_default_status(self, client_authed):
        event_id = _create_event(client_authed, self.ADMIN)

        resp = client_authed.get("/api/admin/competitor-events/triage-queue", headers=self.ADMIN)
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] >= 1
        hit = next((i for i in body["items"] if i["id"] == event_id), None)
        assert hit is not None
        assert hit["triage_status"] == "UNREVIEWED"

    def test_admin_can_triage_event_and_persist_fields(self, client_authed):
        event_id = _create_event(client_authed, self.ADMIN)

        patch_resp = client_authed.patch(
            f"/api/admin/competitor-events/{event_id}/triage",
            json={"triage_status": "ESCALATED", "triage_note": "Needs leadership validation"},
            headers=self.ADMIN,
        )
        assert patch_resp.status_code == 200
        body = patch_resp.json()
        assert body["triage_status"] == "ESCALATED"
        assert body["triaged_by"] == "admin_alice"
        assert body["triaged_at"]
        assert body["triage_note"] == "Needs leadership validation"

        get_resp = client_authed.get(f"/api/admin/competitor-events/{event_id}", headers=self.ADMIN)
        assert get_resp.status_code == 200
        stored = get_resp.json()
        assert stored["triage_status"] == "ESCALATED"

    def test_non_admin_cannot_triage_event(self, client_authed):
        event_id = _create_event(client_authed, self.ADMIN)

        resp = client_authed.patch(
            f"/api/admin/competitor-events/{event_id}/triage",
            json={"triage_status": "REVIEWED", "triage_note": "checked"},
            headers=self.USER,
        )
        assert resp.status_code == 403

    def test_triage_actions_are_audited(self, client_authed):
        event_id = _create_event(client_authed, self.ADMIN)

        client_authed.patch(
            f"/api/admin/competitor-events/{event_id}/triage",
            json={"triage_status": "DISMISSED", "triage_note": "low confidence duplicate"},
            headers=self.ADMIN,
        )

        from database import get_connection

        with get_connection() as conn:
            row = conn.execute(
                "SELECT action, entity_type, user_id, new_value FROM audit_log "
                "WHERE entity_type='competitor_event' AND entity_id=? "
                "ORDER BY id DESC LIMIT 1",
                (str(event_id),),
            ).fetchone()

        assert row is not None
        assert row["action"] == "triage"
        assert row["entity_type"] == "competitor_event"
        assert row["user_id"] == "admin_alice"
        payload = json.loads(row["new_value"])
        assert payload["triage_status"] == "DISMISSED"

    def test_triage_queue_filtering_works(self, client_authed):
        e1 = _create_event(client_authed, self.ADMIN)
        e2 = _create_event(
            client_authed,
            self.ADMIN,
            event_title="Leadership watch event",
            detailed_description="Operational disruption and legal warning.",
            category="Legal",
        )

        client_authed.patch(
            f"/api/admin/competitor-events/{e1}/triage",
            json={"triage_status": "ESCALATED", "triage_note": "Esc path"},
            headers=self.ADMIN,
        )
        client_authed.patch(
            f"/api/admin/competitor-events/{e2}/triage",
            json={"triage_status": "DISMISSED", "triage_note": "Noise"},
            headers=self.ADMIN,
        )

        escalated = client_authed.get(
            "/api/admin/competitor-events/triage-queue?triage_status=ESCALATED",
            headers=self.ADMIN,
        )
        assert escalated.status_code == 200
        ids = {row["id"] for row in escalated.json()["items"]}
        assert e1 in ids
        assert e2 not in ids

        cso_only = client_authed.get(
            "/api/admin/competitor-events/triage-queue?priority_tier=CSO%20Brief",
            headers=self.ADMIN,
        )
        assert cso_only.status_code == 200
        for row in cso_only.json()["items"]:
            assert row["priority_tier"] == "CSO Brief"
