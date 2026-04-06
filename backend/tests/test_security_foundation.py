"""Tests for SENTRY auth + audit + approval gates (PR-01).

Run with:
    cd backend
    python -m pytest tests/ -v
"""
import json
import os
import sqlite3
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _temp_db(tmp_path, monkeypatch):
    """Point the database at a temp file so tests don't touch the real DB."""
    db_path = tmp_path / "test_sentry.db"
    monkeypatch.setattr("database.DB_PATH", db_path)
    # Force re-init each test
    from database import init_db
    init_db()
    yield db_path


@pytest.fixture()
def client_off():
    """TestClient with AUTH_MODE=off (default — backward-compat dev mode)."""
    os.environ["SENTRY_AUTH_MODE"] = "off"
    # Reload auth module to pick up env change
    import auth
    auth.AUTH_MODE = "off"
    from main import app
    return TestClient(app)


@pytest.fixture()
def client_header():
    """TestClient with AUTH_MODE=header and a known admin/user."""
    os.environ["SENTRY_AUTH_MODE"] = "header"
    os.environ["SENTRY_ADMIN_USERS"] = "admin_alice"
    os.environ["SENTRY_ALLOWED_USERS"] = "admin_alice,viewer_bob"
    import auth
    auth.AUTH_MODE = "header"
    auth.ADMIN_USERS = {"admin_alice"}
    auth.ALLOWED_USERS = {"admin_alice", "viewer_bob"}
    from main import app
    return TestClient(app)


# ── Auth Tests ───────────────────────────────────────────────────────────────

class TestAuthOff:
    """With AUTH_MODE=off, everything should work without headers."""

    def test_read_endpoint_no_header(self, client_off):
        resp = client_off.get("/api/vendors/categories")
        assert resp.status_code == 200

    def test_admin_endpoint_no_header(self, client_off):
        resp = client_off.get("/api/admin/stats")
        assert resp.status_code == 200


class TestAuthHeader:
    """With AUTH_MODE=header, auth is enforced."""

    def test_missing_header_returns_401(self, client_header):
        resp = client_header.get("/api/admin/stats")
        assert resp.status_code == 401
        assert "Authentication required" in resp.json()["detail"]

    def test_unknown_user_returns_403(self, client_header):
        resp = client_header.get(
            "/api/admin/stats",
            headers={"X-Sentry-User": "hacker_eve"},
        )
        assert resp.status_code == 403
        assert "not authorized" in resp.json()["detail"]

    def test_valid_admin_returns_200(self, client_header):
        resp = client_header.get(
            "/api/admin/stats",
            headers={"X-Sentry-User": "admin_alice"},
        )
        assert resp.status_code == 200

    def test_non_admin_on_admin_route_returns_403(self, client_header):
        resp = client_header.get(
            "/api/admin/stats",
            headers={"X-Sentry-User": "viewer_bob"},
        )
        assert resp.status_code == 403
        assert "Admin privileges" in resp.json()["detail"]


# ── Audit Tests ──────────────────────────────────────────────────────────────

class TestAuditLog:
    """Verify mutations create audit_log rows."""

    def test_audit_table_exists(self, _temp_db):
        from database import get_connection
        conn = get_connection()
        tables = [
            r[0] for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        ]
        conn.close()
        assert "audit_log" in tables

    def test_log_mutation_creates_row(self, _temp_db):
        from database import get_connection
        from auth import SentryUser
        from audit import log_mutation

        user = SentryUser(id="test_user", role="admin")
        conn = get_connection()
        audit_id = log_mutation(
            conn, user, "test_action", "test_entity", "entity_123",
            old_value={"score": 3.0},
            new_value={"score": 4.5},
            metadata={"confirm": True},
        )
        conn.commit()

        row = conn.execute(
            "SELECT * FROM audit_log WHERE id = ?", (audit_id,)
        ).fetchone()
        conn.close()

        assert row is not None
        assert row["user_id"] == "test_user"
        assert row["action"] == "test_action"
        assert row["entity_type"] == "test_entity"
        assert row["entity_id"] == "entity_123"
        assert json.loads(row["old_value"]) == {"score": 3.0}
        assert json.loads(row["new_value"]) == {"score": 4.5}
        assert json.loads(row["metadata"]) == {"confirm": True}


# ── Approval Gate Tests ──────────────────────────────────────────────────────

class TestApprovalGates:
    """Verify destructive ops require confirm=true."""

    def test_delete_project_without_confirm_returns_preview(self, client_off, _temp_db):
        """DELETE /api/projects/{id} without confirm should return dry-run."""
        from database import get_connection
        conn = get_connection()
        conn.execute(
            "INSERT INTO projects (project_id, project_name) VALUES (?, ?)",
            ("test-proj-1", "Test Project"),
        )
        conn.commit()
        conn.close()

        resp = client_off.delete("/api/projects/test-proj-1")
        assert resp.status_code == 200
        body = resp.json()
        assert body["dry_run"] is True
        assert body["project_name"] == "Test Project"

    def test_delete_project_with_confirm_succeeds(self, client_off, _temp_db):
        """DELETE /api/projects/{id}?confirm=true should actually delete."""
        from database import get_connection
        conn = get_connection()
        conn.execute(
            "INSERT INTO projects (project_id, project_name) VALUES (?, ?)",
            ("test-proj-2", "Doomed Project"),
        )
        conn.commit()
        conn.close()

        resp = client_off.delete("/api/projects/test-proj-2?confirm=true")
        assert resp.status_code == 204

        # Verify it's gone
        conn = get_connection()
        row = conn.execute(
            "SELECT 1 FROM projects WHERE project_id = ?", ("test-proj-2",)
        ).fetchone()
        conn.close()
        assert row is None

    def test_unlink_var_without_confirm_returns_preview(self, client_off, _temp_db):
        """DELETE /api/admin/vars/{id}/link without confirm returns dry-run."""
        from database import get_connection
        conn = get_connection()
        conn.execute(
            "INSERT INTO vendors (id, company_name) VALUES (?, ?)",
            ("v1", "Acme Corp"),
        )
        conn.execute(
            "INSERT INTO var_reports (id, vendor_id, filename) VALUES (?, ?, ?)",
            ("var1", "v1", "acme_var.docx"),
        )
        conn.commit()
        conn.close()

        resp = client_off.delete("/api/admin/vars/var1/link")
        assert resp.status_code == 200
        body = resp.json()
        assert body["dry_run"] is True
        assert body["current_vendor_name"] == "Acme Corp"

    def test_unlink_var_with_confirm_succeeds(self, client_off, _temp_db):
        """DELETE /api/admin/vars/{id}/link?confirm=true unlinks the VAR."""
        from database import get_connection
        conn = get_connection()
        conn.execute(
            "INSERT INTO vendors (id, company_name) VALUES (?, ?)",
            ("v2", "Foo Inc"),
        )
        conn.execute(
            "INSERT INTO var_reports (id, vendor_id, filename) VALUES (?, ?, ?)",
            ("var2", "v2", "foo_var.docx"),
        )
        conn.commit()
        conn.close()

        resp = client_off.delete("/api/admin/vars/var2/link?confirm=true")
        assert resp.status_code == 200
        assert resp.json()["success"] is True

        # Check audit log was created
        conn = get_connection()
        audit = conn.execute(
            "SELECT * FROM audit_log WHERE entity_id = 'var2' AND action = 'unlink'"
        ).fetchone()
        conn.close()
        assert audit is not None
        assert audit["user_id"] == "anonymous"  # AUTH_MODE=off


class TestSoftDelete:
    """Verify competitor event soft-delete behavior."""

    def _insert_event(self, _temp_db):
        from database import get_connection
        conn = get_connection()
        # Ensure table exists
        conn.execute("""\
            CREATE TABLE IF NOT EXISTS competitor_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_date TEXT, competitor TEXT, event_title TEXT,
                event_type TEXT, detailed_description TEXT, category TEXT,
                location TEXT, security_implication TEXT, operational_impact TEXT,
                financial_impact TEXT, reputational_impact TEXT, source_link TEXT,
                analyst_notes TEXT, source_month TEXT, deleted_at TEXT DEFAULT NULL
            )
        """)
        conn.execute(
            "INSERT INTO competitor_events "
            "(competitor, event_title, category, event_date) "
            "VALUES (?, ?, ?, ?)",
            ("Amazon", "Test Event", "Cyber", "2026-01-15"),
        )
        conn.commit()
        event_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.close()
        return event_id

    def test_soft_delete_sets_deleted_at(self, client_off, _temp_db):
        event_id = self._insert_event(_temp_db)
        resp = client_off.delete(
            f"/api/admin/competitor-events/{event_id}?confirm=true"
        )
        assert resp.status_code == 200
        assert resp.json()["action"] == "soft_delete"

        # Row should still exist but with deleted_at set
        from database import get_connection
        conn = get_connection()
        row = conn.execute(
            "SELECT deleted_at FROM competitor_events WHERE id = ?", (event_id,)
        ).fetchone()
        conn.close()
        assert row is not None
        assert row["deleted_at"] is not None

    def test_delete_without_confirm_returns_preview(self, client_off, _temp_db):
        event_id = self._insert_event(_temp_db)
        resp = client_off.delete(f"/api/admin/competitor-events/{event_id}")
        assert resp.status_code == 200
        assert resp.json()["dry_run"] is True
