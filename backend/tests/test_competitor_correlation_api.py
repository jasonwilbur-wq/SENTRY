from __future__ import annotations

import sqlite3

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _temp_db(tmp_path, monkeypatch):
    db_path = tmp_path / "test_sentry_correlation.db"
    monkeypatch.setattr("database.DB_PATH", db_path)
    from database import init_db

    init_db()
    yield db_path


@pytest.fixture()
def client_off():
    import auth

    auth.AUTH_MODE = "off"
    from main import app

    return TestClient(app)


def _seed_vendor(conn: sqlite3.Connection, vendor_id: str, name: str):
    conn.execute(
        """
        INSERT INTO vendors (
            id, company_name, category, technology_product,
            overall_rating, vendor_status, risk_level, last_assessed, has_var
        ) VALUES (?, ?, 'Cyber', '', 0, 'Active', 'Medium', '', 0)
        """,
        (vendor_id, name),
    )


def _seed_project(conn: sqlite3.Connection, project_id: str, project_name: str):
    conn.execute(
        """
        INSERT INTO projects (
            project_id, project_name, lifecycle_state, current_phase, est_phase_index
        ) VALUES (?, ?, 'active', 'Intake', 1)
        """,
        (project_id, project_name),
    )


def _seed_project_vendor(
    conn: sqlite3.Connection,
    row_id: str,
    project_id: str,
    vendor_id: str,
    vendor_name: str,
):
    conn.execute(
        """
        INSERT INTO project_vendors (
            id, project_id, vendor_name, vendor_id, role, status
        ) VALUES (?, ?, ?, ?, 'Vendor', 'active')
        """,
        (row_id, project_id, vendor_name, vendor_id),
    )


def _seed_competitor_event(
    conn: sqlite3.Connection,
    competitor: str,
    title: str,
    description: str,
    category: str = "Cyber",
):
    conn.execute(
        """
        INSERT INTO competitor_events (
            event_date, competitor, event_title, event_type,
            detailed_description, category, location, source_link
        ) VALUES ('2026-03-01', ?, ?, 'incident', ?, ?, 'US', 'https://example.com')
        """,
        (competitor, title, description, category),
    )


def test_public_events_include_exact_match_with_active_project_count(client_off, _temp_db):
    conn = sqlite3.connect(_temp_db)
    try:
        _seed_vendor(conn, "v_acme", "Acme Security")
        _seed_project(conn, "p1", "Acme In-Store Camera Pilot")
        _seed_project_vendor(conn, "pv1", "p1", "v_acme", "Acme Security")
        _seed_competitor_event(
            conn,
            competitor="Target",
            title="Target discloses Acme Security sensor outage",
            description="Acme Security platform disruption affected store telemetry.",
        )
        conn.commit()
    finally:
        conn.close()

    resp = client_off.get("/api/competitors/events?page=1&page_size=10")
    assert resp.status_code == 200
    event = resp.json()["events"][0]

    assert event["correlation_status"] == "MATCHED"
    assert event["matched_vendor_name"] == "Acme Security"
    assert event["match_method"] == "exact_phrase"
    assert event["linked_active_projects_count"] == 1
    assert len(event["linked_projects"]) == 1
    assert "Matched to tracked vendor" in (event.get("walmart_actionability_context") or "")


def test_public_events_include_normalized_match_when_phrase_not_exact(client_off, _temp_db):
    conn = sqlite3.connect(_temp_db)
    try:
        _seed_vendor(conn, "v_guard", "Blue Shield")
        _seed_competitor_event(
            conn,
            competitor="Amazon",
            title="BlueShield incident under review",
            description="Normalized vendor token appears without exact phrase boundaries.",
        )
        conn.commit()
    finally:
        conn.close()

    resp = client_off.get("/api/competitors/events?page=1&page_size=10")
    assert resp.status_code == 200
    event = resp.json()["events"][0]

    assert event["correlation_status"] == "MATCHED"
    assert event["match_method"] == "normalized_contains"
    assert event["matched_vendor_name"] == "Blue Shield"


def test_public_events_include_no_match_context(client_off, _temp_db):
    conn = sqlite3.connect(_temp_db)
    try:
        _seed_vendor(conn, "v_other", "Orbit Delta")
        _seed_competitor_event(
            conn,
            competitor="Costco",
            title="Warehouse policy update",
            description="No known tracked vendor was referenced in this announcement.",
            category="Strategic",
        )
        conn.commit()
    finally:
        conn.close()

    resp = client_off.get("/api/competitors/events?page=1&page_size=10")
    assert resp.status_code == 200
    event = resp.json()["events"][0]

    assert event["correlation_status"] == "NO_MATCH"
    assert event["match_label"] == "NO_MATCH"
    assert event["linked_active_projects_count"] == 0
    assert "No deterministic tracked-vendor/project linkage" in (event.get("walmart_actionability_context") or "")


def test_cso_candidates_endpoint_includes_correlation_fields(client_off, _temp_db):
    conn = sqlite3.connect(_temp_db)
    try:
        _seed_vendor(conn, "v_acme", "Acme Security")
        _seed_competitor_event(
            conn,
            competitor="Target",
            title="Acme Security breach drives CSO attention",
            description="Critical event involving Acme Security stack.",
        )
        conn.execute(
            "UPDATE competitor_events SET walmart_relevance_score=90, priority_tier='CSO Brief', escalate_to_cso=1"
        )
        conn.commit()
    finally:
        conn.close()

    resp = client_off.get("/api/competitors/cso-candidates?limit=10")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["count"] == 1
    event = payload["events"][0]
    assert event["correlation_status"] == "MATCHED"
    assert "walmart_actionability_context" in event
