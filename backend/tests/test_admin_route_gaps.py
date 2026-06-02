"""Regression tests for admin-path write endpoints that must not trust raw headers."""

from __future__ import annotations

from fastapi.testclient import TestClient


def _client_with_admin(monkeypatch) -> TestClient:
    import auth

    monkeypatch.setattr(auth, "AUTH_MODE", "header")
    monkeypatch.setattr(auth, "ADMIN_USERS", {"admin_alice"})
    monkeypatch.setattr(auth, "ALLOWED_USERS", {"admin_alice", "viewer_bob"})

    from main import app

    return TestClient(app)


def test_vendor_sync_requires_authenticated_admin(monkeypatch):
    client = _client_with_admin(monkeypatch)

    resp = client.post("/api/admin/vendor-sync", json={"apply": False})

    assert resp.status_code == 401
    assert "Authentication required" in resp.json()["detail"]


def test_vendor_sync_rejects_non_admin_user(monkeypatch):
    client = _client_with_admin(monkeypatch)

    resp = client.post(
        "/api/admin/vendor-sync",
        json={"apply": False},
        headers={"X-Sentry-User": "viewer_bob"},
    )

    assert resp.status_code == 403
    assert "Admin privileges" in resp.json()["detail"]


def test_exec_intel_import_requires_authenticated_admin(monkeypatch):
    client = _client_with_admin(monkeypatch)

    resp = client.post("/api/exec-intel/import", json={})

    assert resp.status_code == 401
    assert "Authentication required" in resp.json()["detail"]


def test_exec_intel_import_rejects_non_admin_user(monkeypatch):
    client = _client_with_admin(monkeypatch)

    resp = client.post(
        "/api/exec-intel/import",
        json={},
        headers={"X-Sentry-User": "viewer_bob"},
    )

    assert resp.status_code == 403
    assert "Admin privileges" in resp.json()["detail"]


def test_exec_intel_import_allows_admin_to_reach_import_validation(monkeypatch):
    client = _client_with_admin(monkeypatch)

    resp = client.post(
        "/api/exec-intel/import",
        json={},
        headers={"X-Sentry-User": "admin_alice"},
    )

    assert resp.status_code == 422
    assert "refusing import" in resp.json()["detail"]
