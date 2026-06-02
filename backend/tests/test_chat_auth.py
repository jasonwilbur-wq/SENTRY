"""Regression tests for the authenticated chat surface."""

from __future__ import annotations

from fastapi.testclient import TestClient


def _client(monkeypatch, auth_mode: str = "header") -> TestClient:
    import auth

    monkeypatch.setattr(auth, "AUTH_MODE", auth_mode)
    monkeypatch.setattr(auth, "ADMIN_USERS", {"admin_alice"})
    monkeypatch.setattr(auth, "ALLOWED_USERS", {"admin_alice", "viewer_bob"})

    from main import app

    return TestClient(app)


def test_chat_requires_authenticated_user(monkeypatch):
    client = _client(monkeypatch)

    resp = client.post("/api/chat", json={"message": "summarize risk"})

    assert resp.status_code == 401
    assert "Authentication required" in resp.json()["detail"]


def test_chat_accepts_allowed_non_admin_user(monkeypatch):
    client = _client(monkeypatch)

    resp = client.post(
        "/api/chat",
        json={"message": "summarize risk"},
        headers={"X-Sentry-User": "viewer_bob"},
    )

    assert resp.status_code == 200
    assert "SENTRY-AI is not yet configured" in resp.json()["response"]


def test_chat_rejects_unknown_user(monkeypatch):
    client = _client(monkeypatch)

    resp = client.post(
        "/api/chat",
        json={"message": "summarize risk"},
        headers={"X-Sentry-User": "hacker_eve"},
    )

    assert resp.status_code == 403
    assert "not authorized" in resp.json()["detail"]


def test_chat_dev_bypass_still_works_when_auth_off(monkeypatch):
    client = _client(monkeypatch, auth_mode="off")

    resp = client.post("/api/chat", json={"message": "summarize risk"})

    assert resp.status_code == 200
    assert "SENTRY-AI is not yet configured" in resp.json()["response"]
