"""Regression tests for low-risk stabilization hardening."""
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
    yield db_path


@pytest.fixture()
def client_off(monkeypatch):
    monkeypatch.setenv("SENTRY_AUTH_MODE", "off")
    import auth
    auth.AUTH_MODE = "off"
    from main import app
    return TestClient(app)


def test_token_diagnostics_never_exposes_bearer_token(monkeypatch):
    import admin_var_routes

    monkeypatch.setattr(admin_var_routes, "get_token", lambda: "secret-token-value")

    diagnostics = admin_var_routes.get_token_diagnostics()

    assert diagnostics["available"] is True
    assert diagnostics["reason_code"] == "OK"
    assert "token" not in diagnostics
    assert "secret-token-value" not in str(diagnostics)


def test_health_omits_workspace_details_by_default(client_off, monkeypatch):
    monkeypatch.delenv("SENTRY_HEALTH_DETAILS", raising=False)

    response = client_off.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "workspace" not in body
    assert "workspace_available" not in body
    assert "allowed_origins" not in body


def test_health_details_are_explicitly_opt_in(client_off, monkeypatch):
    monkeypatch.setenv("SENTRY_HEALTH_DETAILS", "1")

    response = client_off.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert "workspace" in body
    assert "workspace_available" in body
    assert "allowed_origins" in body


def test_ttl_cache_prunes_expired_entries_and_respects_size_bound(monkeypatch):
    import cache

    cache.clear_all()
    monkeypatch.setattr(cache, "_MAX_ENTRIES", 3)

    @cache.ttl_cache(ttl_seconds=60, key_prefix="bounded-test")
    def identity(value: int) -> int:
        return value

    for value in range(6):
        assert identity(value) == value

    info = identity.cache_info()
    assert info["size"] <= 3
    assert info["max_entries"] == 3

    cache.clear_all()
