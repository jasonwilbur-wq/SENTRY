from __future__ import annotations

import sqlite3

import pytest
from fastapi.testclient import TestClient

from competitor_enrichment import (
    build_brief_readiness_enrichment,
    evaluate_competitor_event_readiness,
)


@pytest.fixture(autouse=True)
def _temp_db(tmp_path, monkeypatch):
    db_path = tmp_path / "test_sentry_brief_readiness.db"
    monkeypatch.setattr("database.DB_PATH", db_path)
    from database import init_db

    init_db()
    yield db_path


@pytest.fixture()
def client_authed():
    import auth

    auth.AUTH_MODE = "header"
    auth.ADMIN_USERS = {"admin_alice"}
    auth.ALLOWED_USERS = {"admin_alice", "analyst_bob"}

    from main import app

    return TestClient(app)


ADMIN = {"X-Sentry-User": "admin_alice"}


def _create_event(client: TestClient, **overrides) -> dict:
    payload = {
        "event_date": "2026-03-02",
        "competitor": "Target",
        "event_title": "Target cyber outage references Acme Security",
        "event_type": "incident",
        "detailed_description": "Service outage and exposure review.",
        "category": "Cyber",
        "location": "US",
        "source_link": "www.example.com/advisory",
        "analyst_notes": "",
        "source_month": "Mar 2026",
    }
    payload.update(overrides)

    resp = client.post("/api/admin/competitor-events", json=payload, headers=ADMIN)
    assert resp.status_code == 200
    return resp.json()


def test_create_event_exposes_readiness_fields(client_authed):
    event = _create_event(client_authed)

    assert event["source_link"].startswith("https://")
    assert isinstance(event["is_brief_ready"], bool)
    assert isinstance(event["readiness_issues"], list)
    assert isinstance(event["readiness_warnings"], list)
    assert isinstance(event["readiness_required_fields"], list)
    assert event["correlation_summary"]


def test_create_event_persists_normalized_source_and_derived_confidence_level(client_authed):
    event = _create_event(client_authed, confidence_level="", source_link="www.example.com/advisory")

    assert event["source_link"] == "https://www.example.com/advisory"
    assert event["confidence_score"] is not None
    assert event["confidence_level"] == "medium"


def test_deterministic_enrichment_populates_brief_fields_from_available_data():
    patch, warnings = build_brief_readiness_enrichment({
        "competitor": "Target",
        "category": "Cyber",
        "priority_tier": "CSO Brief",
        "walmart_relevance_score": 88,
        "signal_type": "Threat",
        "source_link": "www.example.com/advisory",
        "matched_vendor_name": "Acme Security",
        "correlation_status": "MATCHED",
        "linked_active_projects_count": 2,
        "match_label": "HIGH_CONFIDENCE",
    })

    assert patch["source_link"] == "https://www.example.com/advisory"
    assert patch["recommended_owner"] == "Global Security"
    assert "Acme Security" in patch["why_walmart_cares"]
    assert patch["walmart_actionability_context"]
    assert "active linked project" in patch["correlation_summary"]
    assert warnings == []


def test_readiness_flags_consistently_match_validation_model():
    not_ready = evaluate_competitor_event_readiness({
        "source_link": "",
        "why_walmart_cares": "",
        "walmart_actionability_context": "",
        "confidence_level": "",
        "confidence_score": None,
        "recommended_owner": "",
        "correlation_summary": "",
        "correlation_status": "NO_MATCH",
    })
    assert not_ready["is_brief_ready"] is False
    assert not_ready["readiness_issues"] == [
        "MISSING_SOURCE_LINK",
        "MISSING_RATIONALE",
        "MISSING_CONFIDENCE",
    ]
    assert "MISSING_OWNER_SUGGESTION" in not_ready["readiness_warnings"]
    assert "MISSING_CORRELATION_SUMMARY" in not_ready["readiness_warnings"]

    ready = evaluate_competitor_event_readiness({
        "source_link": "https://example.com/evidence",
        "why_walmart_cares": "Walmart should evaluate exposure.",
        "walmart_actionability_context": "Review sourcing posture.",
        "confidence_level": "high",
        "recommended_owner": "Global Security",
        "correlation_summary": "Tracked vendor correlation present.",
        "correlation_status": "MATCHED",
    })
    assert ready["is_brief_ready"] is True
    assert ready["readiness_issues"] == []


def test_backfill_brief_readiness_updates_missing_fields_without_changing_triage(client_authed, _temp_db):
    created = _create_event(
        client_authed,
        source_link="www.example.com/repairable",
        why_walmart_cares="",
        recommended_owner="",
        confidence_level="",
    )
    event_id = created["id"]

    conn = sqlite3.connect(_temp_db)
    try:
        conn.execute(
            """
            UPDATE competitor_events
            SET
              triage_status='ESCALATED',
              triaged_by='admin_alice',
              triage_note='keep',
              why_walmart_cares='',
              recommended_owner='',
              walmart_actionability_context='',
              correlation_summary='',
              confidence_level=''
            WHERE id=?
            """,
            (event_id,),
        )
        conn.commit()
    finally:
        conn.close()

    resp = client_authed.post(
        "/api/admin/competitor-events/backfill-brief-readiness?limit=200&only_missing=true",
        headers=ADMIN,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["processed_rows"] >= 1
    assert body["updated_rows"] >= 1
    assert body["field_updates"] >= 1
    assert body["brief_ready_after"] >= body["brief_ready_before"]
    assert body["field_coverage_after"]["recommended_owner"] >= body["field_coverage_before"]["recommended_owner"]
    assert body["field_coverage_after"]["correlation_summary"] >= body["field_coverage_before"]["correlation_summary"]
    assert body["coverage_after"]["valid_source_link"] >= body["coverage_before"]["valid_source_link"]
    assert body["coverage_after"]["usable_confidence"] >= body["coverage_before"]["usable_confidence"]
    assert isinstance(body["coverage_after"]["blocked_by_reason"], dict)

    get_resp = client_authed.get(f"/api/admin/competitor-events/{event_id}", headers=ADMIN)
    assert get_resp.status_code == 200
    row = get_resp.json()

    assert row["triage_status"] == "ESCALATED"
    assert row["triaged_by"] == "admin_alice"
    assert row["triage_note"] == "keep"
    assert row["source_link"] == "https://www.example.com/repairable"
    assert row["why_walmart_cares"]
    assert row["recommended_owner"]
    assert row["correlation_summary"]
    assert row["walmart_actionability_context"]
    assert row["confidence_level"] == "medium"
    assert row["confidence_score"] is not None
    assert isinstance(row["is_brief_ready"], bool)


def test_backfill_reports_skipped_rows_for_already_covered_records(client_authed):
    _create_event(client_authed)

    resp = client_authed.post(
        "/api/admin/competitor-events/backfill-brief-readiness?limit=50&only_missing=false",
        headers=ADMIN,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["processed_rows"] >= 1
    assert body["skipped_rows"] >= 1
    assert body["skipped_reasons"]
    assert set(body["coverage_before"].keys()) == {"candidate_rows", "valid_source_link", "usable_confidence", "brief_ready", "blocked_by_reason"}
    assert set(body["coverage_after"].keys()) == {"candidate_rows", "valid_source_link", "usable_confidence", "brief_ready", "blocked_by_reason"}
    assert body["coverage_after"]["brief_ready"] >= body["coverage_before"]["brief_ready"]


def test_backfill_improves_candidate_coverage_for_repairable_rows(client_authed, _temp_db):
    conn = sqlite3.connect(_temp_db)
    try:
        conn.executemany(
            """
            INSERT INTO competitor_events (
                event_date, competitor, event_title, event_type, detailed_description,
                category, location, source_link, analyst_notes, source_month,
                confidence_level, walmart_relevance_score, priority_tier, triage_status,
                escalate_to_cso, why_walmart_cares, recommended_owner,
                walmart_actionability_context, correlation_summary
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    "2026-04-06", "Amazon", "Amazon cyber breach disrupts stores", "incident",
                    "Critical breach investigation with ransomware and regulator scrutiny.",
                    "Cyber", "US", "www.example.com/a", "", "Apr 2026", "",
                    90.0, "CSO Brief", "REVIEWED", 1, "", "", "", "",
                ),
                (
                    "2026-04-06", "Target", "Target cyber breach disrupts payments", "incident",
                    "Critical breach investigation with ransomware and regulator scrutiny.",
                    "Cyber", "US", "https://example.com/b", "", "Apr 2026", "",
                    88.0, "CSO Brief", "REVIEWED", 1, "", "", "", "",
                ),
                (
                    "2026-04-06", "Costco", "Costco cyber breach disrupts operations", "incident",
                    "Critical breach investigation with ransomware and regulator scrutiny.",
                    "Cyber", "US", "", "", "Apr 2026", "",
                    87.0, "CSO Brief", "REVIEWED", 1, "", "", "", "",
                ),
            ],
        )
        conn.commit()
    finally:
        conn.close()

    resp = client_authed.post(
        "/api/admin/competitor-events/backfill-brief-readiness?limit=50&only_missing=true",
        headers=ADMIN,
    )
    assert resp.status_code == 200
    body = resp.json()

    assert body["processed_rows"] == 3
    assert body["coverage_before"]["candidate_rows"] == 3
    assert body["coverage_before"]["valid_source_link"] == 2
    assert body["coverage_before"]["usable_confidence"] == 0
    assert body["coverage_before"]["brief_ready"] == 0
    assert body["coverage_before"]["blocked_by_reason"]["MISSING_CONFIDENCE"] == 3
    assert body["coverage_before"]["blocked_by_reason"]["MISSING_SOURCE_LINK"] == 1

    assert body["coverage_after"]["candidate_rows"] == 3
    assert body["coverage_after"]["valid_source_link"] == 2
    assert body["coverage_after"]["usable_confidence"] == 3
    assert body["coverage_after"]["brief_ready"] == 2
    assert body["coverage_after"]["blocked_by_reason"]["MISSING_SOURCE_LINK"] == 1


def test_backfill_endpoint_requires_admin(client_authed):
    event = _create_event(client_authed)
    assert event["id"] > 0

    denied = client_authed.post(
        "/api/admin/competitor-events/backfill-brief-readiness",
        headers={"X-Sentry-User": "analyst_bob"},
    )
    assert denied.status_code == 403
