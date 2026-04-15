"""Tests for service request persistence, access control, triage queue, and status transitions.

Proves:
  1. Assessment submissions persist and return real ref IDs
  2. Lab visit submissions persist and return real ref IDs
  3. Invalid payloads are rejected (422)
  4. Persisted requests are retrievable by ref ID (with auth)
  5. Created_by identity is captured when authenticated
  6. Audit trail records are created
  7. Request lookup is secured (admin, owner, not strangers)
  8. Admin can list and filter requests
  9. Non-admin cannot access admin queue
  10. Admin can change status through controlled lifecycle
  11. Status changes are audited

Run with:
    cd backend
    python -m pytest tests/test_service_requests.py -v
"""
import pytest
from fastapi.testclient import TestClient


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _temp_db(tmp_path, monkeypatch):
    """Point the database at a temp file so tests don't touch the real DB."""
    db_path = tmp_path / "test_sentry.db"
    monkeypatch.setattr("database.DB_PATH", db_path)
    from database import init_db
    init_db()
    yield db_path


def _make_client(auth_mode: str, admin_users: str = "", allowed_users: str = ""):
    """Create a TestClient with specific auth settings."""
    import auth
    import request_routes
    auth.AUTH_MODE = auth_mode
    request_routes.AUTH_MODE = auth_mode  # module caches at import time
    auth.ADMIN_USERS = {
        u.strip().lower() for u in admin_users.split(",") if u.strip()
    }
    auth.ALLOWED_USERS = (
        {u.strip().lower() for u in allowed_users.split(",") if u.strip()}
        | auth.ADMIN_USERS
    )
    from main import app
    return TestClient(app)


@pytest.fixture()
def client_authed():
    """TestClient with header auth. admin_boss=admin, analyst_alice=user."""
    return _make_client(
        auth_mode="header",
        admin_users="admin_boss",
        allowed_users="admin_boss,analyst_alice,bob_user",
    )


@pytest.fixture()
def client_off():
    """TestClient with AUTH_MODE=off (dev bypass)."""
    return _make_client(auth_mode="off")


# ── Helpers ──────────────────────────────────────────────────────────────────

ADMIN_HDR = {"X-Sentry-User": "admin_boss"}
ALICE_HDR = {"X-Sentry-User": "analyst_alice"}
BOB_HDR = {"X-Sentry-User": "bob_user"}

VALID_ASSESSMENT = {
    "vendor_name": "DroneShield",
    "assessment_type": "vendor_initial",
    "contact_name": "Alice Analyst",
    "contact_email": "alice@walmart.com",
    "category": "Drones & C-UAS",
    "urgency": "normal",
    "notes": "Pilot evaluation for distribution centers.",
}

VALID_LAB_VISIT = {
    "contact_name": "Bob Builder",
    "contact_email": "bob@walmart.com",
    "preferred_date": "2026-05-15",
    "preferred_slot": "9:00 AM – 11:00 AM",
    "equipment": "Skydio X10D",
    "attendees": 3,
    "notes": "Need to test autonomous flight in warehouse.",
}


def _submit_assessment(client, headers=None):
    """Helper: submit a valid assessment, return ref_id."""
    resp = client.post("/api/assessment", json=VALID_ASSESSMENT, headers=headers)
    assert resp.status_code == 200
    return resp.json()["ref_id"]


def _submit_lab_visit(client, headers=None):
    """Helper: submit a valid lab visit, return ref_id."""
    resp = client.post("/api/lab-visit", json=VALID_LAB_VISIT, headers=headers)
    assert resp.status_code == 200
    return resp.json()["ref_id"]


# ── 1. Assessment submissions persist ────────────────────────────────────────

class TestAssessmentPersistence:

    def test_submit_assessment_returns_ref_id(self, client_off):
        resp = client_off.post("/api/assessment", json=VALID_ASSESSMENT)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["ref_id"].startswith("SENTRY-ASM-")
        assert body["status"] == "SUBMITTED"
        assert len(body["ref_id"]) == 19

    def test_submitted_assessment_is_retrievable(self, client_off):
        ref_id = _submit_assessment(client_off)
        lookup = client_off.get(f"/api/requests/{ref_id}")
        assert lookup.status_code == 200
        data = lookup.json()
        assert data["ref_id"] == ref_id
        assert data["request_type"] == "assessment"
        assert data["status"] == "SUBMITTED"
        assert data["vendor_name"] == "DroneShield"
        assert data["assessment_type"] == "vendor_initial"
        assert data["contact_name"] == "Alice Analyst"
        assert data["contact_email"] == "alice@walmart.com"
        assert data["urgency"] == "normal"

    def test_assessment_persists_in_database(self, client_off):
        ref_id = _submit_assessment(client_off)
        from database import get_connection
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM service_requests WHERE ref_id = ?", (ref_id,),
            ).fetchone()
        assert row is not None
        assert dict(row)["vendor_name"] == "DroneShield"
        assert dict(row)["status"] == "SUBMITTED"

    def test_each_submission_gets_unique_ref(self, client_off):
        refs = {_submit_assessment(client_off) for _ in range(5)}
        assert len(refs) == 5


# ── 2. Lab visit submissions persist ─────────────────────────────────────────

class TestLabVisitPersistence:

    def test_submit_lab_visit_returns_ref_id(self, client_off):
        resp = client_off.post("/api/lab-visit", json=VALID_LAB_VISIT)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["ref_id"].startswith("SENTRY-LAB-")
        assert body["status"] == "SUBMITTED"

    def test_submitted_lab_visit_is_retrievable(self, client_off):
        ref_id = _submit_lab_visit(client_off)
        lookup = client_off.get(f"/api/requests/{ref_id}")
        assert lookup.status_code == 200
        data = lookup.json()
        assert data["ref_id"] == ref_id
        assert data["request_type"] == "lab_visit"
        assert data["preferred_date"] == "2026-05-15"
        assert data["equipment"] == "Skydio X10D"
        assert data["attendees"] == 3

    def test_lab_visit_persists_in_database(self, client_off):
        ref_id = _submit_lab_visit(client_off)
        from database import get_connection
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM service_requests WHERE ref_id = ?", (ref_id,),
            ).fetchone()
        assert row is not None
        assert dict(row)["preferred_date"] == "2026-05-15"
        assert dict(row)["attendees"] == 3


# ── 3. Invalid payloads rejected ─────────────────────────────────────────────

class TestValidation:

    def test_missing_required_field_assessment(self, client_off):
        bad = {**VALID_ASSESSMENT}
        del bad["vendor_name"]
        assert client_off.post("/api/assessment", json=bad).status_code == 422

    def test_missing_required_field_lab_visit(self, client_off):
        bad = {**VALID_LAB_VISIT}
        del bad["preferred_date"]
        assert client_off.post("/api/lab-visit", json=bad).status_code == 422

    def test_invalid_assessment_type(self, client_off):
        bad = {**VALID_ASSESSMENT, "assessment_type": "hacking_101"}
        resp = client_off.post("/api/assessment", json=bad)
        assert resp.status_code == 422
        assert "assessment_type" in resp.json()["detail"]

    def test_invalid_urgency(self, client_off):
        bad = {**VALID_ASSESSMENT, "urgency": "yesterday"}
        resp = client_off.post("/api/assessment", json=bad)
        assert resp.status_code == 422
        assert "urgency" in resp.json()["detail"]

    def test_attendees_out_of_range(self, client_off):
        bad = {**VALID_LAB_VISIT, "attendees": 50}
        assert client_off.post("/api/lab-visit", json=bad).status_code == 422


# ── 4. Created_by identity captured ──────────────────────────────────────────

class TestCreatedByCapture:

    def test_authenticated_user_stored(self, client_authed):
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        lookup = client_authed.get(f"/api/requests/{ref_id}", headers=ALICE_HDR)
        assert lookup.json()["created_by"] == "analyst_alice"

    def test_admin_user_stored(self, client_authed):
        ref_id = _submit_lab_visit(client_authed, headers=ADMIN_HDR)
        lookup = client_authed.get(f"/api/requests/{ref_id}", headers=ADMIN_HDR)
        assert lookup.json()["created_by"] == "admin_boss"

    def test_anonymous_when_no_header(self, client_authed):
        """Submission without auth header sets created_by='anonymous'."""
        ref_id = _submit_assessment(client_authed)
        # Need admin to look it up since anonymous can't auth
        lookup = client_authed.get(f"/api/requests/{ref_id}", headers=ADMIN_HDR)
        assert lookup.json()["created_by"] == "anonymous"

    def test_off_mode_stores_anonymous(self, client_off):
        ref_id = _submit_assessment(client_off)
        lookup = client_off.get(f"/api/requests/{ref_id}")
        assert lookup.json()["created_by"] == "anonymous"


# ── 5. Audit trail ───────────────────────────────────────────────────────────

class TestAuditTrail:

    def test_assessment_creates_audit_entry(self, client_off):
        ref_id = _submit_assessment(client_off)
        from database import get_connection
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM audit_log WHERE entity_type = 'service_request' "
                "AND entity_id = ?", (ref_id,),
            ).fetchone()
        assert row is not None
        data = dict(row)
        assert data["action"] == "create"
        assert data["entity_id"] == ref_id

    def test_lab_visit_creates_audit_entry(self, client_off):
        ref_id = _submit_lab_visit(client_off)
        from database import get_connection
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM audit_log WHERE entity_type = 'service_request' "
                "AND entity_id = ?", (ref_id,),
            ).fetchone()
        assert row is not None
        assert dict(row)["action"] == "create"

    def test_audit_captures_user_identity(self, client_authed):
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        from database import get_connection
        with get_connection() as conn:
            row = conn.execute(
                "SELECT user_id FROM audit_log WHERE entity_id = ?", (ref_id,),
            ).fetchone()
        assert dict(row)["user_id"] == "analyst_alice"


# ── 6. Secured request lookup ────────────────────────────────────────────────

class TestRequestLookupAccess:
    """GET /api/requests/{ref_id} access control."""

    def test_admin_can_view_any_request(self, client_authed):
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        lookup = client_authed.get(f"/api/requests/{ref_id}", headers=ADMIN_HDR)
        assert lookup.status_code == 200
        assert lookup.json()["ref_id"] == ref_id

    def test_creator_can_view_own_request(self, client_authed):
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        lookup = client_authed.get(f"/api/requests/{ref_id}", headers=ALICE_HDR)
        assert lookup.status_code == 200
        assert lookup.json()["created_by"] == "analyst_alice"

    def test_non_creator_cannot_view_others_request(self, client_authed):
        """Bob cannot see Alice's request — gets 404 (not 403, to avoid leaking)."""
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        lookup = client_authed.get(f"/api/requests/{ref_id}", headers=BOB_HDR)
        assert lookup.status_code == 404

    def test_unauthenticated_cannot_view_request(self, client_authed):
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        lookup = client_authed.get(f"/api/requests/{ref_id}")
        assert lookup.status_code == 401

    def test_nonexistent_ref_returns_404(self, client_authed):
        lookup = client_authed.get(
            "/api/requests/SENTRY-ASM-NONEXIST", headers=ADMIN_HDR,
        )
        assert lookup.status_code == 404

    def test_off_mode_allows_lookup(self, client_off):
        """AUTH_MODE=off still works for lookup (anonymous admin)."""
        ref_id = _submit_assessment(client_off)
        lookup = client_off.get(f"/api/requests/{ref_id}")
        assert lookup.status_code == 200


# ── 7. Admin triage queue ────────────────────────────────────────────────────

class TestAdminQueue:
    """GET /api/admin/requests — admin-only listing."""

    def test_admin_can_list_all_requests(self, client_authed):
        _submit_assessment(client_authed, headers=ALICE_HDR)
        _submit_lab_visit(client_authed, headers=ADMIN_HDR)
        resp = client_authed.get("/api/admin/requests", headers=ADMIN_HDR)
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 2
        assert len(body["requests"]) == 2
        types = {r["request_type"] for r in body["requests"]}
        assert types == {"assessment", "lab_visit"}

    def test_non_admin_cannot_access_queue(self, client_authed):
        resp = client_authed.get("/api/admin/requests", headers=ALICE_HDR)
        assert resp.status_code == 403

    def test_unauthenticated_cannot_access_queue(self, client_authed):
        resp = client_authed.get("/api/admin/requests")
        assert resp.status_code == 401

    def test_filter_by_status(self, client_authed):
        _submit_assessment(client_authed, headers=ALICE_HDR)
        resp = client_authed.get(
            "/api/admin/requests?status=SUBMITTED", headers=ADMIN_HDR,
        )
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1
        for r in resp.json()["requests"]:
            assert r["status"] == "SUBMITTED"

    def test_filter_by_request_type(self, client_authed):
        _submit_assessment(client_authed, headers=ALICE_HDR)
        _submit_lab_visit(client_authed, headers=ADMIN_HDR)
        resp = client_authed.get(
            "/api/admin/requests?request_type=lab_visit", headers=ADMIN_HDR,
        )
        assert resp.status_code == 200
        for r in resp.json()["requests"]:
            assert r["request_type"] == "lab_visit"

    def test_filter_invalid_status_rejected(self, client_authed):
        resp = client_authed.get(
            "/api/admin/requests?status=BOGUS", headers=ADMIN_HDR,
        )
        assert resp.status_code == 422

    def test_filter_invalid_request_type_rejected(self, client_authed):
        resp = client_authed.get(
            "/api/admin/requests?request_type=pizza", headers=ADMIN_HDR,
        )
        assert resp.status_code == 422

    def test_queue_does_not_expose_email(self, client_authed):
        """Summary listing excludes PII email fields."""
        _submit_assessment(client_authed, headers=ALICE_HDR)
        resp = client_authed.get("/api/admin/requests", headers=ADMIN_HDR)
        body = resp.json()
        for r in body["requests"]:
            assert "contact_email" not in r

    def test_empty_queue_returns_zero(self, client_authed):
        resp = client_authed.get("/api/admin/requests", headers=ADMIN_HDR)
        assert resp.status_code == 200
        assert resp.json()["total"] == 0


# ── 8. Admin status transitions ──────────────────────────────────────────────

class TestStatusTransitions:
    """PATCH /api/admin/requests/{ref_id}/status — controlled lifecycle."""

    def test_admin_can_advance_status(self, client_authed):
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        resp = client_authed.patch(
            f"/api/admin/requests/{ref_id}/status",
            json={"status": "TRIAGE_PENDING", "note": "Reviewing vendor."},
            headers=ADMIN_HDR,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["old_status"] == "SUBMITTED"
        assert body["new_status"] == "TRIAGE_PENDING"
        assert body["updated_by"] == "admin_boss"

    def test_status_persisted_in_db(self, client_authed):
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        client_authed.patch(
            f"/api/admin/requests/{ref_id}/status",
            json={"status": "IN_REVIEW"},
            headers=ADMIN_HDR,
        )
        lookup = client_authed.get(f"/api/requests/{ref_id}", headers=ADMIN_HDR)
        assert lookup.json()["status"] == "IN_REVIEW"
        assert lookup.json()["updated_by"] == "admin_boss"

    def test_full_lifecycle(self, client_authed):
        """SUBMITTED → TRIAGE_PENDING → IN_REVIEW → CLOSED."""
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        for next_status in ["TRIAGE_PENDING", "IN_REVIEW", "CLOSED"]:
            resp = client_authed.patch(
                f"/api/admin/requests/{ref_id}/status",
                json={"status": next_status},
                headers=ADMIN_HDR,
            )
            assert resp.status_code == 200
            assert resp.json()["new_status"] == next_status

    def test_reopen_closed_request(self, client_authed):
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        # Close it
        client_authed.patch(
            f"/api/admin/requests/{ref_id}/status",
            json={"status": "CLOSED"},
            headers=ADMIN_HDR,
        )
        # Re-open it
        resp = client_authed.patch(
            f"/api/admin/requests/{ref_id}/status",
            json={"status": "SUBMITTED", "note": "Re-opened per analyst request."},
            headers=ADMIN_HDR,
        )
        assert resp.status_code == 200
        assert resp.json()["new_status"] == "SUBMITTED"

    def test_invalid_transition_rejected(self, client_authed):
        """SUBMITTED → SUBMITTED is a no-op and rejected."""
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        resp = client_authed.patch(
            f"/api/admin/requests/{ref_id}/status",
            json={"status": "SUBMITTED"},
            headers=ADMIN_HDR,
        )
        assert resp.status_code == 422
        assert "already" in resp.json()["detail"]

    def test_invalid_status_value_rejected(self, client_authed):
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        resp = client_authed.patch(
            f"/api/admin/requests/{ref_id}/status",
            json={"status": "ON_FIRE"},
            headers=ADMIN_HDR,
        )
        assert resp.status_code == 422

    def test_non_admin_cannot_change_status(self, client_authed):
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        resp = client_authed.patch(
            f"/api/admin/requests/{ref_id}/status",
            json={"status": "TRIAGE_PENDING"},
            headers=ALICE_HDR,
        )
        assert resp.status_code == 403

    def test_unauthenticated_cannot_change_status(self, client_authed):
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        resp = client_authed.patch(
            f"/api/admin/requests/{ref_id}/status",
            json={"status": "TRIAGE_PENDING"},
        )
        assert resp.status_code == 401

    def test_nonexistent_ref_returns_404(self, client_authed):
        resp = client_authed.patch(
            "/api/admin/requests/SENTRY-ASM-NOPE/status",
            json={"status": "TRIAGE_PENDING"},
            headers=ADMIN_HDR,
        )
        assert resp.status_code == 404

    def test_status_note_persisted(self, client_authed):
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        client_authed.patch(
            f"/api/admin/requests/{ref_id}/status",
            json={"status": "TRIAGE_PENDING", "note": "Assigned to security team."},
            headers=ADMIN_HDR,
        )
        lookup = client_authed.get(f"/api/requests/{ref_id}", headers=ADMIN_HDR)
        assert lookup.json()["status_note"] == "Assigned to security team."

    def test_disallowed_skip_transition(self, client_authed):
        """Cannot skip from IN_REVIEW back to SUBMITTED (must go through CLOSED)."""
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        client_authed.patch(
            f"/api/admin/requests/{ref_id}/status",
            json={"status": "IN_REVIEW"},
            headers=ADMIN_HDR,
        )
        resp = client_authed.patch(
            f"/api/admin/requests/{ref_id}/status",
            json={"status": "SUBMITTED"},
            headers=ADMIN_HDR,
        )
        assert resp.status_code == 422
        assert "Cannot transition" in resp.json()["detail"]


# ── 9. Status change audit trail ─────────────────────────────────────────────

class TestStatusChangeAudit:

    def test_status_change_creates_audit_entry(self, client_authed):
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        client_authed.patch(
            f"/api/admin/requests/{ref_id}/status",
            json={"status": "TRIAGE_PENDING"},
            headers=ADMIN_HDR,
        )
        from database import get_connection
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM audit_log WHERE entity_id = ? "
                "ORDER BY timestamp DESC", (ref_id,),
            ).fetchall()
        # Should have 2 entries: create + status_change
        assert len(rows) >= 2
        latest = dict(rows[0])
        assert latest["action"] == "status_change"
        assert latest["user_id"] == "admin_boss"

    def test_audit_captures_old_and_new_status(self, client_authed):
        ref_id = _submit_assessment(client_authed, headers=ALICE_HDR)
        client_authed.patch(
            f"/api/admin/requests/{ref_id}/status",
            json={"status": "TRIAGE_PENDING"},
            headers=ADMIN_HDR,
        )
        import json
        from database import get_connection
        with get_connection() as conn:
            row = conn.execute(
                "SELECT old_value, new_value FROM audit_log "
                "WHERE entity_id = ? AND action = 'status_change'", (ref_id,),
            ).fetchone()
        old = json.loads(row["old_value"])
        new = json.loads(row["new_value"])
        assert old["status"] == "SUBMITTED"
        assert new["status"] == "TRIAGE_PENDING"
