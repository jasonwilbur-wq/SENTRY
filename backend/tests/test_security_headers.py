"""Security-header regression coverage for the FastAPI surface."""
from __future__ import annotations

from fastapi.testclient import TestClient

from main import app


def test_api_health_sets_defensive_security_headers():
    response = TestClient(app).get("/api/health")

    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in response.headers["permissions-policy"]
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]
    assert "default-src 'none'" in response.headers["content-security-policy"]
