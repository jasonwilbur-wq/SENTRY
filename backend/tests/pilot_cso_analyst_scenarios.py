"""Controlled analyst-pilot scenarios for CSO Brief workflow using real repo data.

Approach:
- Copy real backend DB to a temp file (do not mutate source DB).
- For each scenario, promote a small set of existing real competitor events
  into qualifying states (priority_tier + triage_status) in temp DB.
- Run full brief workflow via FastAPI TestClient.
- Emit per-scenario metrics and aggregate summary.
"""
from __future__ import annotations

import json
import shutil
import sys
import tempfile
import time
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


SCENARIOS = [
    {
        "name": "amazon_high_signal",
        "competitors": ["Amazon"],
        "target_events": 4,
    },
    {
        "name": "target_focus",
        "competitors": ["Target"],
        "target_events": 4,
    },
    {
        "name": "costco_focus",
        "competitors": ["Costco"],
        "target_events": 4,
    },
    {
        "name": "mixed_top3",
        "competitors": ["Amazon", "Target", "Costco"],
        "target_events": 6,
    },
]


def _prepare_temp_db_from_real() -> Path:
    real_db = BACKEND_ROOT / "data" / "sentry.db"
    if not real_db.exists():
        raise RuntimeError(f"Real DB not found: {real_db}")

    temp_dir = Path(tempfile.mkdtemp(prefix="sentry_cso_pilot_real_"))
    db_path = temp_dir / "pilot_real.db"
    shutil.copy2(real_db, db_path)

    import database

    database.DB_PATH = db_path
    from database import init_db

    init_db()
    return db_path


def _make_client() -> TestClient:
    import auth

    auth.AUTH_MODE = "header"
    auth.ADMIN_USERS = {"admin_alice"}
    auth.ALLOWED_USERS = {"admin_alice", "analyst_bob"}

    from main import app

    return TestClient(app)


def _columns(conn, table: str) -> set[str]:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return {r[1] for r in rows}


def _promote_real_events_for_scenario(conn, competitors: list[str], target_events: int) -> list[int]:
    """Select existing real events and promote them to CSO brief-eligible state."""
    place = ", ".join("?" for _ in competitors)
    rows = conn.execute(
        f"""
        SELECT id
          FROM competitor_events
         WHERE deleted_at IS NULL
           AND competitor IN ({place})
         ORDER BY
           COALESCE(event_date, '') DESC,
           id DESC
         LIMIT ?
        """,
        [*competitors, target_events],
    ).fetchall()

    event_ids = [int(r[0]) for r in rows]
    if not event_ids:
        return []

    # Promote selected rows to qualification gates.
    for idx, eid in enumerate(event_ids):
        conn.execute(
            """
            UPDATE competitor_events
               SET priority_tier = ?,
                   triage_status = ?,
                   escalate_to_cso = ?,
                   walmart_relevance_score = ?,
                   confidence_level = COALESCE(NULLIF(confidence_level, ''), 'medium')
             WHERE id = ?
            """,
            (
                "CSO Brief" if idx % 2 == 0 else "Leadership Watch",
                "REVIEWED",
                1,
                90.0 - idx,
                eid,
            ),
        )

    # Intentionally degrade one event to force validation failures.
    fail_eid = event_ids[-1]
    conn.execute(
        """
        UPDATE competitor_events
           SET source_link = '',
               why_walmart_cares = ''
         WHERE id = ?
        """,
        (fail_eid,),
    )

    # If correlation columns exist, enrich first event for correlation-context checks.
    comp_cols = _columns(conn, "competitor_events")
    corr_updates = []
    corr_values = []
    if "matched_vendor_name" in comp_cols:
        corr_updates.append("matched_vendor_name = ?")
        corr_values.append("PilotVendor")
    if "matched_vendor_id" in comp_cols:
        corr_updates.append("matched_vendor_id = ?")
        corr_values.append("pilot-vendor-1")
    if "linked_active_projects_count" in comp_cols:
        corr_updates.append("linked_active_projects_count = ?")
        corr_values.append(1)
    if "linked_projects" in comp_cols:
        corr_updates.append("linked_projects = ?")
        corr_values.append('[{"id":"p-1","name":"Loss Prevention Pilot"}]')
    if "walmart_actionability_context" in comp_cols:
        corr_updates.append("walmart_actionability_context = ?")
        corr_values.append("Matched to tracked vendor PilotVendor with active Walmart project.")

    if corr_updates:
        conn.execute(
            f"UPDATE competitor_events SET {', '.join(corr_updates)} WHERE id = ?",
            [*corr_values, event_ids[0]],
        )

    conn.commit()
    return event_ids


def _extract_violation_counts(violations: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for v in violations:
        code = v.get("code", "UNKNOWN")
        counts[code] = counts.get(code, 0) + 1
    return counts


def _run_single_scenario(client: TestClient, scenario: dict) -> dict:
    from database import get_connection

    conn = get_connection()
    try:
        event_ids = _promote_real_events_for_scenario(
            conn,
            competitors=scenario["competitors"],
            target_events=scenario["target_events"],
        )
    finally:
        conn.close()

    if len(event_ids) < 2:
        return {
            "scenario": scenario["name"],
            "status": "skipped",
            "reason": "not enough real events for scenario",
            "selected_events": len(event_ids),
        }

    ADMIN = {"X-Sentry-User": "admin_alice"}
    USER = {"X-Sentry-User": "analyst_bob"}

    start = time.monotonic()

    # generate
    gen = client.post(
        "/api/cso-briefs/generate",
        json={
            "title": f"Pilot {scenario['name']}",
            "period_start": "2026-01-01",
            "period_end": "2026-12-31",
            "filters": {
                "competitor": scenario["competitors"],
                "max_items": scenario["target_events"],
            },
        },
        headers=ADMIN,
    )
    if gen.status_code != 200:
        return {
            "scenario": scenario["name"],
            "status": "failed",
            "stage": "generate",
            "http_status": gen.status_code,
            "body": gen.text,
        }

    gen_body = gen.json()
    brief = gen_body["brief"]
    brief_id = brief["id"]
    items = brief["items"]

    # metadata edit
    meta = client.patch(
        f"/api/cso-briefs/{brief_id}",
        json={
            "executive_summary": f"Pilot summary for {scenario['name']}",
            "review_notes": "Analyst pilot review notes",
        },
        headers=USER,
    )
    if meta.status_code != 200:
        return {
            "scenario": scenario["name"],
            "status": "failed",
            "stage": "patch_meta",
            "http_status": meta.status_code,
            "body": meta.text,
        }

    # edit at least 2 items
    item_edits = 0
    for idx, item in enumerate(items[:2], start=1):
        r = client.patch(
            f"/api/cso-briefs/{brief_id}/items/{item['id']}",
            json={
                "rank": idx,
                "owner_assignment": "CISO" if idx == 1 else "SVP AP",
                "analyst_commentary": f"Pilot analyst commentary {idx}",
                "uncertainty_note": "Pilot uncertainty note",
                "include_in_summary": 1,
            },
            headers=USER,
        )
        if r.status_code != 200:
            return {
                "scenario": scenario["name"],
                "status": "failed",
                "stage": "patch_item",
                "http_status": r.status_code,
                "body": r.text,
            }
        item_edits += 1

    # validate fail expected due to intentionally degraded event
    val_fail = client.post(f"/api/cso-briefs/{brief_id}/validate", headers=USER)
    if val_fail.status_code != 200:
        return {
            "scenario": scenario["name"],
            "status": "failed",
            "stage": "validate_fail",
            "http_status": val_fail.status_code,
            "body": val_fail.text,
        }

    val_fail_body = val_fail.json()
    fail_counts = _extract_violation_counts(val_fail_body.get("violations", []))

    # fix via inclusion toggle off for all currently failing items (real-data remediation)
    if not val_fail_body.get("passed", False):
        failing_ids = {
            v.get("item_id")
            for v in val_fail_body.get("violations", [])
            if v.get("item_id")
        }
        for iid in failing_ids:
            fix = client.patch(
                f"/api/cso-briefs/{brief_id}/items/{iid}",
                json={"include_in_summary": 0},
                headers=USER,
            )
            if fix.status_code == 200:
                item_edits += 1

    val_pass = client.post(f"/api/cso-briefs/{brief_id}/validate", headers=USER)
    if val_pass.status_code != 200 or not val_pass.json().get("passed", False):
        return {
            "scenario": scenario["name"],
            "status": "failed",
            "stage": "validate_pass",
            "http_status": val_pass.status_code,
            "body": val_pass.text,
        }

    # transitions + role enforcement checks
    to_review = client.post(
        f"/api/cso-briefs/{brief_id}/transition",
        json={"to_status": "IN_REVIEW", "note": "Pilot submit"},
        headers=USER,
    )
    analyst_approve = client.post(
        f"/api/cso-briefs/{brief_id}/transition",
        json={"to_status": "APPROVED", "note": "Analyst attempt"},
        headers=USER,
    )
    to_approved = client.post(
        f"/api/cso-briefs/{brief_id}/transition",
        json={"to_status": "APPROVED", "note": "Admin approve"},
        headers=ADMIN,
    )
    analyst_publish = client.post(
        f"/api/cso-briefs/{brief_id}/transition",
        json={"to_status": "PUBLISHED_DRAFT", "note": "Analyst attempt"},
        headers=USER,
    )
    to_published = client.post(
        f"/api/cso-briefs/{brief_id}/transition",
        json={"to_status": "PUBLISHED_DRAFT", "note": "Admin publish"},
        headers=ADMIN,
    )

    if not (to_review.status_code == 200 and to_approved.status_code == 200 and to_published.status_code == 200):
        return {
            "scenario": scenario["name"],
            "status": "failed",
            "stage": "transitions",
            "statuses": {
                "to_review": to_review.status_code,
                "to_approved": to_approved.status_code,
                "to_published": to_published.status_code,
            },
        }

    # snapshot + audit
    snap = client.get(f"/api/cso-briefs/{brief_id}/snapshot", headers=USER)
    audit = client.get(f"/api/cso-briefs/{brief_id}/audit?limit=100&offset=0", headers=USER)
    if snap.status_code != 200 or audit.status_code != 200:
        return {
            "scenario": scenario["name"],
            "status": "failed",
            "stage": "snapshot_or_audit",
            "statuses": {"snapshot": snap.status_code, "audit": audit.status_code},
        }

    snap_body = snap.json()
    audit_body = audit.json()

    corr_count = sum(
        1
        for i in snap_body.get("items", [])
        if i.get("include_in_summary") == 1
        and (
            (i.get("correlation_summary") or "").strip()
            or (i.get("walmart_actionability_context") or "").strip()
        )
    )

    elapsed = round(time.monotonic() - start, 3)

    return {
        "scenario": scenario["name"],
        "status": "passed",
        "brief_id": brief_id,
        "brief_count": 1,
        "selected_events": len(event_ids),
        "candidate_count": gen_body["candidate_count"],
        "initial_included_count": gen_body["included_count"],
        "included_item_count_final": val_pass.json()["included_item_count"],
        "validation_failures_by_type": fail_counts,
        "manual_item_edits": item_edits,
        "correlated_vendor_project_item_count": corr_count,
        "seconds_generate_to_published_draft": elapsed,
        "analyst_approve_status": analyst_approve.status_code,
        "analyst_publish_status": analyst_publish.status_code,
        "snapshot_banner": snap_body.get("banner", ""),
        "snapshot_footer": snap_body.get("footer", ""),
        "audit_total": audit_body.get("total", 0),
        "audit_actions": sorted({e["action"] for e in audit_body.get("entries", [])}),
    }


def run_all() -> dict:
    _prepare_temp_db_from_real()
    client = _make_client()

    results = [_run_single_scenario(client, s) for s in SCENARIOS]

    passed = [r for r in results if r.get("status") == "passed"]
    failed = [r for r in results if r.get("status") == "failed"]
    skipped = [r for r in results if r.get("status") == "skipped"]

    agg_fail_types: dict[str, int] = {}
    total_manual_edits = 0
    total_corr_items = 0
    total_briefs = 0
    elapsed_samples: list[float] = []

    for r in passed:
        total_briefs += int(r.get("brief_count", 0))
        total_manual_edits += int(r.get("manual_item_edits", 0))
        total_corr_items += int(r.get("correlated_vendor_project_item_count", 0))
        elapsed_samples.append(float(r.get("seconds_generate_to_published_draft", 0)))
        for k, v in (r.get("validation_failures_by_type") or {}).items():
            agg_fail_types[k] = agg_fail_types.get(k, 0) + int(v)

    return {
        "scenario_count": len(SCENARIOS),
        "passed_count": len(passed),
        "failed_count": len(failed),
        "skipped_count": len(skipped),
        "aggregate_metrics": {
            "brief_count": total_briefs,
            "avg_seconds_generate_to_published_draft": round(sum(elapsed_samples) / len(elapsed_samples), 3) if elapsed_samples else None,
            "validation_failures_by_type": agg_fail_types,
            "manual_item_edits_total": total_manual_edits,
            "correlated_vendor_project_item_count_total": total_corr_items,
        },
        "results": results,
    }


if __name__ == "__main__":
    print(json.dumps(run_all(), indent=2))
