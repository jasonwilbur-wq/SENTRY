from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _auth_off():
    import auth

    auth.AUTH_MODE = "off"


@pytest.fixture()
def client(monkeypatch) -> TestClient:
    import regulatory_routes
    from main import app

    sample = {
        "id": "regulatory-briefing",
        "title": "test",
        "summary": "test",
        "created_at": "2026-04-27T00:00:00Z",
        "data_through": "2026-04-27",
        "stats": {},
        "top_actions": [],
        "jurisdictions": [],
        "assumptions": [],
        "confidence": "Med",
        "obligations": [
            {
                "id": "REG-1",
                "jurisdiction": "California, USA",
                "geo_scope": "US_STATE",
                "state": "California",
                "state_code": "CA",
                "country": None,
                "risk": {"rag": "Red", "score": 20},
                "tech_category": "AI",
                "status": "Enacted",
                "effective_date": "2026-01-15",
                "summary": "California AI obligation",
                "title": "CA AI Act",
            },
            {
                "id": "REG-2",
                "jurisdiction": "United States (Federal)",
                "geo_scope": "US_FEDERAL",
                "state": "United States",
                "state_code": None,
                "country": None,
                "risk": {"rag": "Amber", "score": 15},
                "tech_category": "Biometrics",
                "status": "Proposed",
                "effective_date": "2026-02-20",
                "summary": "Federal biometric obligation",
                "title": "Federal Biometrics Order",
            },
            {
                "id": "REG-3",
                "jurisdiction": "Germany",
                "geo_scope": "COUNTRY",
                "state": None,
                "state_code": None,
                "country": "Germany",
                "risk": {"rag": "Yellow", "score": 8},
                "tech_category": "Data Privacy",
                "status": "Enacted",
                "effective_date": "2026-03-05",
                "summary": "Germany privacy obligation",
                "title": "DE Privacy Rule",
            },
            {
                "id": "REG-4",
                "jurisdiction": "Global",
                "geo_scope": "GLOBAL",
                "state": None,
                "state_code": None,
                "country": "Global",
                "risk": {"rag": "Green", "score": 4},
                "tech_category": "Drones/UAS",
                "status": "Proposed",
                "effective_date": "2026-04-09",
                "summary": "Global UAS obligation",
                "title": "Global UAS Guidance",
            },
        ],
    }

    monkeypatch.setattr(regulatory_routes, "_load", lambda: sample)
    return TestClient(app)


def test_geo_scope_filters(client: TestClient):
    all_resp = client.get("/api/regulatory/geo?scope=all")
    us_resp = client.get("/api/regulatory/geo?scope=us")
    global_resp = client.get("/api/regulatory/geo?scope=global")

    assert all_resp.status_code == 200
    assert us_resp.status_code == 200
    assert global_resp.status_code == 200

    all_payload = all_resp.json()
    us_payload = us_resp.json()
    global_payload = global_resp.json()

    assert all_payload["total"] == 4
    assert us_payload["total"] == 2
    assert global_payload["total"] == 2

    assert all(item["geo_scope"] in {"US_STATE", "US_FEDERAL"} for item in us_payload["jurisdictions"])
    assert all(item["geo_scope"] in {"COUNTRY", "GLOBAL"} for item in global_payload["jurisdictions"])


def test_obligations_scope_filter(client: TestClient):
    us_resp = client.get("/api/regulatory/obligations?scope=us&page=1&page_size=20")
    global_resp = client.get("/api/regulatory/obligations?scope=global&page=1&page_size=20")

    assert us_resp.status_code == 200
    assert global_resp.status_code == 200

    us_items = us_resp.json()["obligations"]
    global_items = global_resp.json()["obligations"]

    assert len(us_items) == 2
    assert len(global_items) == 2

    assert all(item["geo_scope"] in {"US_STATE", "US_FEDERAL"} for item in us_items)
    assert all(item["geo_scope"] in {"COUNTRY", "GLOBAL"} for item in global_items)


def test_insights_include_period_breakdowns_and_exec_blocks(client: TestClient):
    resp = client.get("/api/regulatory/insights?scope=all")
    assert resp.status_code == 200

    payload = resp.json()
    assert payload["scope"] == "all"
    assert payload["total_obligations"] == 4
    assert payload["red_amber_total"] == 2

    assert len(payload["daily_breakdown"]) == 4
    assert len(payload["monthly_breakdown"]) == 4
    assert len(payload["quarterly_breakdown"]) >= 1
    assert len(payload["executive_top"]) == 3
    assert len(payload["executive_bottom"]) == 3

    assert payload["top_hotspots"]
    assert payload["top_hotspots"][0]["jurisdiction"] in {
        "California, USA",
        "United States (Federal)",
        "Germany",
        "Global",
    }
