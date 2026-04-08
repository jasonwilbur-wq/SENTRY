"""Tests for real service request persistence (assessment + lab visit).

Proves:
  1. Assessment submissions persist and return real ref IDs
  2. Lab visit submissions persist and return real ref IDs
  3. Invalid payloads are rejected (422)
  4. Persisted requests are retrievable by ref ID
  5. Created_by identity is captured when authenticated
  6. Audit trail records are created
  7. Missing identity still allows submission (recorded as anonymous)

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
    auth.AUTH_MODE = auth_mode
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
    """TestClient with header auth, user 'analyst_alice' is allowed."""
    return _make_client(
        auth_mode="header",
        admin_users="admin_boss",
        allowed_users="admin_boss,analyst_alice",
    )


@pytest.fixture()
def client_off():
    """TestClient with AUTH_MODE=off (dev bypass)."""
    return _make_client(auth_mode="off")


# ── Valid payloads ────────────────────────────────────────────────────────────

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


# ── 1. Assessment submissions persist ────────────────────────────────────────

class TestAssessmentPersistence:
    """Assessment form submissions create real DB rows."""

    def test_submit_assessment_returns_ref_id(self, client_off):
        resp = client_off.post("/api/assessment", json=VALID_ASSESSMENT)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["ref_id"].startswith("SENTRY-ASM-")
        assert body["status"] == "SUBMITTED"
        assert len(body["ref_id"]) == 19  # SENTRY-ASM-XXXXXXXX

    def test_submitted_assessment_is_retrievable(self, client_off):
        resp = client_off.post("/api/assessment", json=VALID_ASSESSMENT)
        ref_id = resp.json()["ref_id"]

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
        resp = client_off.post("/api/assessment", json=VALID_ASSESSMENT)
        ref_id = resp.json()["ref_id"]

        from database import get_connection
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM service_requests WHERE ref_id = ?",
                (ref_id,),
            ).fetchone()

        assert row is not None
        assert dict(row)["vendor_name"] == "DroneShield"
        assert dict(row)["status"] == "SUBMITTED"

    def test_each_submission_gets_unique_ref(self, client_off):
        refs = set()
        for _ in range(5):
            resp = client_off.post("/api/assessment", json=VALID_ASSESSMENT)
            refs.add(resp.json()["ref_id"])
        assert len(refs) == 5


# ── 2. Lab visit submissions persist ─────────────────────────────────────────

class TestLabVisitPersistence:
    """Lab visit form submissions create real DB rows."""

    def test_submit_lab_visit_returns_ref_id(self, client_off):
        resp = client_off.post("/api/lab-visit", json=VALID_LAB_VISIT)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["ref_id"].startswith("SENTRY-LAB-")
        assert body["status"] == "SUBMITTED"

    def test_submitted_lab_visit_is_retrievable(self, client_off):
        resp = client_off.post("/api/lab-visit", json=VALID_LAB_VISIT)
        ref_id = resp.json()["ref_id"]

        lookup = client_off.get(f"/api/requests/{ref_id}")
        assert lookup.status_code == 200
        data = lookup.json()
        assert data["ref_id"] == ref_id
        assert data["request_type"] == "lab_visit"
        assert data["preferred_date"] == "2026-05-15"
        assert data["preferred_slot"] == "9:00 AM – 11:00 AM"
        assert data["equipment"] == "Skydio X10D"
        assert data["attendees"] == 3

    def test_lab_visit_persists_in_database(self, client_off):
        resp = client_off.post("/api/lab-visit", json=VALID_LAB_VISIT)
        ref_id = resp.json()["ref_id"]

        from database import get_connection
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM service_requests WHERE ref_id = ?",
                (ref_id,),
            ).fetchone()

        assert row is not None
        assert dict(row)["preferred_date"] == "2026-05-15"
        assert dict(row)["attendees"] == 3


# ── 3. Invalid payloads rejected ─────────────────────────────────────────────

class TestValidation:
    """Invalid payloads get proper 422 errors, nothing is persisted."""

    def test_missing_required_field_assessment(self, client_off):
        bad = {**VALID_ASSESSMENT}
        del bad["vendor_name"]
        resp = client_off.post("/api/assessment", json=bad)
        assert resp.status_code == 422

    def test_missing_required_field_lab_visit(self, client_off):
        bad = {**VALID_LAB_VISIT}
        del bad["preferred_date"]
        resp = client_off.post("/api/lab-visit", json=bad)
        assert resp.status_code == 422

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
        resp = client_off.post("/api/lab-visit", json=bad)
        assert resp.status_code == 422

    def test_nonexistent_ref_returns_404(self, client_off):
        resp = client_off.get("/api/requests/SENTRY-ASM-NONEXIST")
        assert resp.status_code == 404


# ── 4. Auth identity captured ────────────────────────────────────────────────

class TestCreatedByCapture:
    """Authenticated user identity is stored in created_by."""

    def test_authenticated_user_stored(self, client_authed):
        resp = client_authed.post(
            "/api/assessment",
            json=VALID_ASSESSMENT,
            headers={"X-Sentry-User": "analyst_alice"},
        )
        ref_id = resp.json()["ref_id"]

        lookup = client_authed.get(f"/api/requests/{ref_id}")
        assert lookup.json()["created_by"] == "analyst_alice"

    def test_admin_user_stored(self, client_authed):
        resp = client_authed.post(
            "/api/lab-visit",
            json=VALID_LAB_VISIT,
            headers={"X-Sentry-User": "admin_boss"},
        )
        ref_id = resp.json()["ref_id"]

        lookup = client_authed.get(f"/api/requests/{ref_id}")
        assert lookup.json()["created_by"] == "admin_boss"

    def test_anonymous_when_no_header_in_header_mode(self, client_authed):
        """Without auth header, created_by defaults to anonymous."""
        resp = client_authed.post("/api/assessment", json=VALID_ASSESSMENT)
        assert resp.status_code == 200
        ref_id = resp.json()["ref_id"]

        lookup = client_authed.get(f"/api/requests/{ref_id}")
        assert lookup.json()["created_by"] == "anonymous"

    def test_off_mode_stores_anonymous(self, client_off):
        resp = client_off.post("/api/assessment", json=VALID_ASSESSMENT)
        ref_id = resp.json()["ref_id"]

        lookup = client_off.get(f"/api/requests/{ref_id}")
        assert lookup.json()["created_by"] == "anonymous"


# ── 5. Audit trail ───────────────────────────────────────────────────────────

class TestAuditTrail:
    """Service request creation is logged in the audit_log table."""

    def test_assessment_creates_audit_entry(self, client_off):
        resp = client_off.post("/api/assessment", json=VALID_ASSESSMENT)
        ref_id = resp.json()["ref_id"]

        from database import get_connection
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM audit_log WHERE entity_type = 'service_request' "
                "AND entity_id = ?",
                (ref_id,),
            ).fetchone()

        assert row is not None
        data = dict(row)
        assert data["action"] == "create"
        assert data["entity_type"] == "service_request"
        assert data["entity_id"] == ref_id

    def test_lab_visit_creates_audit_entry(self, client_off):
        resp = client_off.post("/api/lab-visit", json=VALID_LAB_VISIT)
        ref_id = resp.json()["ref_id"]

        from database import get_connection
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM audit_log WHERE entity_type = 'service_request' "
                "AND entity_id = ?",
                (ref_id,),
            ).fetchone()

        assert row is not None
        assert dict(row)["action"] == "create"

    def test_audit_captures_user_identity(self, client_authed):
        resp = client_authed.post(
            "/api/assessment",
            json=VALID_ASSESSMENT,
            headers={"X-Sentry-User": "analyst_alice"},
        )
        ref_id = resp.json()["ref_id"]

        from database import get_connection
        with get_connection() as conn:
            row = conn.execute(
                "SELECT user_id FROM audit_log WHERE entity_id = ?",
                (ref_id,),
            ).fetchone()

        assert dict(row)["user_id"] == "analyst_alice"
