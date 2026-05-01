"""Controlled pilot validation for CSO Brief workflow MVP.

Runs end-to-end behavior using FastAPI TestClient (no localhost/browser):
- generate brief
- analyst edits brief + two items
- validate fail -> fix -> validate pass
- role-gated transitions (analyst/admin)
- snapshot checks
- audit checks
- metrics capture
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import time
from pathlib import Path

from fastapi.testclient import TestClient

# Ensure backend package root is importable when executing this script directly.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _configure_temp_db() -> Path:
    temp_dir = Path(tempfile.mkdtemp(prefix="sentry_cso_pilot_"))
    db_path = temp_dir / "pilot_cso.db"
    import database
    database.DB_PATH = db_path
    return db_path


def _make_client() -> TestClient:
    import auth

    auth.AUTH_MODE = "header"
    auth.ADMIN_USERS = {"admin_alice"}
    auth.ALLOWED_USERS = {"admin_alice", "analyst_bob"}

    from database import init_db
    init_db()

    from main import app
    return TestClient(app)


def _get_competitor_event_columns(conn) -> set[str]:
    rows = conn.execute("PRAGMA table_info(competitor_events)").fetchall()
    return {r[1] for r in rows}


def _seed_event(conn, **overrides) -> int:
    base = {
        "event_date": "2026-04-05",
        "competitor": "Amazon",
        "event_title": "Amazon launches frictionless checkout pilot",
        "event_type": "initiative",
        "detailed_description": "Pilot deployment across urban stores.",
        "category": "Store Tech",
        "location": "US",
        "source_link": "https://example.com/amazon-pilot",
        "confidence_level": "high",
        "priority_tier": "CSO Brief",
        "triage_status": "REVIEWED",
        "escalate_to_cso": 1,
        "walmart_relevance_score": 91.0,
        "signal_type": "competitive",
        "recommended_owner": "CISO",
        "why_walmart_cares": "Could shift customer expectation for checkout speed.",
        "walmart_actionability_context": "Matched to tracked vendor with active project link.",
        "score_reason": "Direct impact to AP and CX workflows.",
        "source_month": "2026-04",
        "matched_vendor_id": "v-100",
        "matched_vendor_name": "FastCheckout AI",
        "match_method": "NAME_FUZZY",
        "match_label": "high_confidence",
        "linked_active_projects_count": 1,
        "linked_projects": "[{\"id\":\"p1\",\"name\":\"Checkout Intelligence\"}]",
    }
    base.update(overrides)

    available = _get_competitor_event_columns(conn)
    payload = {k: v for k, v in base.items() if k in available}

    cols = ", ".join(payload.keys())
    placeholders = ", ".join("?" for _ in payload)
    cur = conn.execute(
        f"INSERT INTO competitor_events ({cols}) VALUES ({placeholders})",
        list(payload.values()),
    )
    conn.commit()
    return cur.lastrowid


def _seed_data() -> None:
    from database import get_connection

    conn = get_connection()
    try:
        _seed_event(conn)
        # second item intentionally missing source_link + rationale to force validation failures
        _seed_event(
            conn,
            competitor="Target",
            event_title="Target expands in-store camera analytics",
            source_link="",
            why_walmart_cares="",
            walmart_actionability_context="",
            confidence_level="medium",
            walmart_relevance_score=84.0,
            matched_vendor_id="",
            matched_vendor_name="",
            linked_active_projects_count=0,
            linked_projects="[]",
        )
    finally:
        conn.close()


def run_pilot() -> dict:
    _configure_temp_db()
    client = _make_client()
    _seed_data()

    ADMIN = {"X-Sentry-User": "admin_alice"}
    USER = {"X-Sentry-User": "analyst_bob"}

    start = time.monotonic()

    # 1) Generate
    gen = client.post(
        "/api/cso-briefs/generate",
        json={
            "title": "Weekly CSO Competitive Brief",
            "period_start": "2026-04-01",
            "period_end": "2026-04-08",
            "filters": {
                "date_from": "2026-04-01",
                "date_to": "2026-04-08",
                "max_items": 10,
            },
        },
        headers=ADMIN,
    )
    assert gen.status_code == 200, gen.text
    gen_body = gen.json()
    brief = gen_body["brief"]
    brief_id = brief["id"]
    items = brief["items"]
    assert len(items) >= 2

    # 2) Analyst edit flow: brief metadata + at least 2 item rows
    meta_patch = client.patch(
        f"/api/cso-briefs/{brief_id}",
        json={
            "executive_summary": "Top competitive moves suggest checkout and CV acceleration.",
            "review_notes": "Need legal and AP review before final publish.",
        },
        headers=USER,
    )
    assert meta_patch.status_code == 200, meta_patch.text

    item_a, item_b = items[0], items[1]

    patch_a = client.patch(
        f"/api/cso-briefs/{brief_id}/items/{item_a['id']}",
        json={
            "rank": 1,
            "owner_assignment": "CISO",
            "analyst_commentary": "Pilot appears operationally mature.",
            "uncertainty_note": "Scale readiness unknown.",
            "include_in_summary": 1,
        },
        headers=USER,
    )
    assert patch_a.status_code == 200, patch_a.text

    patch_b = client.patch(
        f"/api/cso-briefs/{brief_id}/items/{item_b['id']}",
        json={
            "rank": 2,
            "owner_assignment": "SVP AP",
            "analyst_commentary": "High surveillance expansion signal.",
            "uncertainty_note": "Regulatory risk varies by state.",
            "include_in_summary": 1,
        },
        headers=USER,
    )
    assert patch_b.status_code == 200, patch_b.text

    # 3) Validate failure case
    validate_fail = client.post(f"/api/cso-briefs/{brief_id}/validate", headers=USER)
    assert validate_fail.status_code == 200, validate_fail.text
    fail_payload = validate_fail.json()
    assert fail_payload["passed"] is False

    violations = fail_payload["violations"]
    violation_counts: dict[str, int] = {}
    for v in violations:
        code = v.get("code", "UNKNOWN")
        violation_counts[code] = violation_counts.get(code, 0) + 1

    # 4) Fix failure(s) by patching frozen source event fields for item_b
    from database import get_connection

    conn = get_connection()
    try:
        event_id = item_b["competitor_event_id"]
        available = _get_competitor_event_columns(conn)

        updates = {
            "source_link": "https://example.com/target-cv",
            "why_walmart_cares": "Potential impact on shrink prevention posture.",
            "walmart_actionability_context": "No direct vendor match; requires internal assessment.",
        }
        filtered = {k: v for k, v in updates.items() if k in available}
        if filtered:
            set_clause = ", ".join(f"{k} = ?" for k in filtered)
            conn.execute(
                f"UPDATE competitor_events SET {set_clause} WHERE id = ?",
                [*filtered.values(), event_id],
            )
            conn.commit()
    finally:
        conn.close()

    # Re-run validate: should still fail because frozen_payload is source-of-truth.
    validate_after_live_patch = client.post(f"/api/cso-briefs/{brief_id}/validate", headers=USER)
    assert validate_after_live_patch.status_code == 200
    assert validate_after_live_patch.json()["passed"] is False

    # Exclude bad item from summary to pass gate without mutating frozen payload.
    drop_item = client.patch(
        f"/api/cso-briefs/{brief_id}/items/{item_b['id']}",
        json={"include_in_summary": 0},
        headers=USER,
    )
    assert drop_item.status_code == 200

    validate_pass = client.post(f"/api/cso-briefs/{brief_id}/validate", headers=USER)
    assert validate_pass.status_code == 200
    assert validate_pass.json()["passed"] is True

    # 5) Transition flow + role checks
    to_review = client.post(
        f"/api/cso-briefs/{brief_id}/transition",
        json={"to_status": "IN_REVIEW", "note": "Ready for leadership review"},
        headers=USER,
    )
    assert to_review.status_code == 200, to_review.text

    analyst_approve_block = client.post(
        f"/api/cso-briefs/{brief_id}/transition",
        json={"to_status": "APPROVED", "note": "analyst tries approve"},
        headers=USER,
    )
    assert analyst_approve_block.status_code == 403

    to_approved = client.post(
        f"/api/cso-briefs/{brief_id}/transition",
        json={"to_status": "APPROVED", "note": "Validated and approved"},
        headers=ADMIN,
    )
    assert to_approved.status_code == 200, to_approved.text

    # edits blocked in APPROVED
    edit_block_approved = client.patch(
        f"/api/cso-briefs/{brief_id}",
        json={"review_notes": "should not write"},
        headers=USER,
    )
    assert edit_block_approved.status_code == 409

    analyst_publish_block = client.post(
        f"/api/cso-briefs/{brief_id}/transition",
        json={"to_status": "PUBLISHED_DRAFT", "note": "analyst tries publish"},
        headers=USER,
    )
    assert analyst_publish_block.status_code == 403

    to_published = client.post(
        f"/api/cso-briefs/{brief_id}/transition",
        json={"to_status": "PUBLISHED_DRAFT", "note": "Draft distributed"},
        headers=ADMIN,
    )
    assert to_published.status_code == 200, to_published.text

    # edits blocked in PUBLISHED_DRAFT
    edit_block_published = client.patch(
        f"/api/cso-briefs/{brief_id}/items/{item_a['id']}",
        json={"owner_assignment": "Nope"},
        headers=USER,
    )
    assert edit_block_published.status_code == 409

    # 6) Snapshot and read-only language
    snapshot = client.get(f"/api/cso-briefs/{brief_id}/snapshot", headers=USER)
    assert snapshot.status_code == 200
    snap = snapshot.json()
    assert snap["banner"] == "Draft only — Human Review Required"
    assert snap["footer"] == "Draft artifact. Not final leadership directive."

    # 7) Audit trail inspection
    audit = client.get(f"/api/cso-briefs/{brief_id}/audit?limit=100&offset=0", headers=USER)
    assert audit.status_code == 200
    audit_body = audit.json()
    entries = audit_body["entries"]
    assert len(entries) > 0

    action_set = {e["action"] for e in entries}
    required_actions = {"create", "edit_brief", "edit_item", "validate", "transition"}
    assert required_actions.issubset(action_set)

    # ensure newest-first ordering
    timestamps = [e["created_at"] for e in entries]
    assert timestamps == sorted(timestamps, reverse=True)

    # Metrics
    included_item_count = validate_pass.json()["included_item_count"]
    correlated_vendor_project_item_count = sum(
        1
        for i in snap["items"]
        if (i.get("include_in_summary") == 1)
        and (
            (i.get("correlation_summary") or "").strip() != ""
            or int((i.get("walmart_actionability_context") and 1) or 0) == 1
        )
    )

    manual_item_edits = 3  # patch_a + patch_b + include toggle off
    elapsed = time.monotonic() - start

    return {
        "brief_id": brief_id,
        "candidate_count": gen_body["candidate_count"],
        "initial_included_count": gen_body["included_count"],
        "included_item_count_final": included_item_count,
        "correlated_vendor_project_item_count": correlated_vendor_project_item_count,
        "validation_failures_by_type": violation_counts,
        "manual_item_edits": manual_item_edits,
        "seconds_generate_to_publish_draft": round(elapsed, 3),
        "analyst_approve_status": analyst_approve_block.status_code,
        "analyst_publish_status": analyst_publish_block.status_code,
        "edit_block_approved_status": edit_block_approved.status_code,
        "edit_block_published_status": edit_block_published.status_code,
        "audit_total": audit_body["total"],
        "audit_actions_present": sorted(list(action_set)),
    }


if __name__ == "__main__":
    result = run_pilot()
    print(json.dumps(result, indent=2))
