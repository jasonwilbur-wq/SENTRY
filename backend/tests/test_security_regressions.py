"""Focused regression tests for security hardening guardrails."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from admin_competitor_routes import _build_competitor_event_update_sql
from main import _build_allowed_origins, app


def test_competitor_update_sql_quotes_only_allowlisted_columns():
    assignments, values = _build_competitor_event_update_sql(
        {"event_title": "Signal", "confidence_level": "high"}
    )

    assert assignments == '"event_title" = ?, "confidence_level" = ?'
    assert values == ["Signal", "high"]


def test_competitor_update_sql_rejects_injected_identifier():
    with pytest.raises(ValueError, match="Unsupported competitor_events update column"):
        _build_competitor_event_update_sql({"event_title = ?, deleted_at": "2026-06-23"})


def test_production_cors_requires_explicit_origins():
    with pytest.raises(RuntimeError, match="requires explicit ALLOWED_ORIGINS"):
        _build_allowed_origins(None, "production")


def test_production_cors_rejects_wildcard_and_localhost():
    with pytest.raises(RuntimeError, match="wildcard"):
        _build_allowed_origins("*", "production")

    with pytest.raises(RuntimeError, match="explicit https origins"):
        _build_allowed_origins("http://localhost:3000", "production")


def test_production_cors_accepts_explicit_https_origins():
    assert _build_allowed_origins(
        "https://sentry.example.com, https://sentry.web.app",
        "production",
    ) == ["https://sentry.example.com", "https://sentry.web.app"]


def test_unhandled_api_exception_is_sanitized():
    route_path = "/api/__test__/boom"
    if not any(getattr(route, "path", "") == route_path for route in app.routes):
        def boom():
            raise RuntimeError("sensitive database path C:/Users/j0w16ja/secret.db")

        app.add_api_route(route_path, boom, methods=["GET"], include_in_schema=False)

    response = TestClient(app, raise_server_exceptions=False).get(route_path)

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error. Contact your SENTRY administrator."}
    assert "sensitive database path" not in response.text
