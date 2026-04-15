"""SENTRY CSO Briefing Pipeline — Repository helpers.

All database access for CSO briefs flows through these helpers so
route handlers stay thin.  Pure data models live in cso_brief_models.py.
"""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

from competitor_enrichment import (
    build_brief_readiness_enrichment,
    evaluate_competitor_event_readiness,
)
from actionable_intelligence import build_actionable_intelligence

# Re-export models + constants so existing imports from cso_brief_helpers
# continue to work without touching every call-site.
from cso_brief_models import (  # noqa: F401 — re-exports
    ALLOWED_PRIORITY_TIERS,
    ALLOWED_TRANSITIONS,
    ALLOWED_TRIAGE_STATUSES,
    AUDIT_DEFAULT_LIMIT,
    AUDIT_MAX_LIMIT,
    CONFIDENCE_BUCKETS,
    DECISION_MODEL_VERSION,
    EDITABLE_STATES,
    ANALYST_ACTIONS,
    ANALYST_DECISION_SOURCES,
    ANALYST_STATUSES,
    FROZEN_PAYLOAD_FIELDS,
    MAX_ITEMS_CAP,
    MAX_ITEMS_DEFAULT,
    AuditEntryOut,
    AuditListResponse,
    BriefItemOut,
    BriefOut,
    GenerateFilters,
    GenerateRequest,
    GenerateResponse,
    GeneratePreflightSummary,
    ExcludedItemSummary,
    PatchBriefRequest,
    PatchItemRequest,
    SnapshotItemOut,
    SnapshotResponse,
    TransitionRequest,
    TransitionResponse,
    ValidateResponse,
    Violation,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def utcnow_iso() -> str:
    """UTC timestamp as ISO string."""
    return datetime.now(timezone.utc).isoformat()


def build_frozen_payload(row: dict) -> dict[str, Any]:
    """Extract canonical snapshot fields and enrich with actionable metadata."""
    payload = {field: row.get(field) for field in FROZEN_PAYLOAD_FIELDS}
    payload.update(build_actionable_intelligence({**row, **payload}))
    payload["decision_model_version"] = DECISION_MODEL_VERSION
    return payload


def confidence_from_score(score: Any) -> str:
    """Map a numeric confidence_score to a label bucket."""
    try:
        val = float(score)
    except (TypeError, ValueError):
        return ""
    for threshold, label in CONFIDENCE_BUCKETS:
        if val >= threshold:
            return label
    return "low"


# ── Query helpers ─────────────────────────────────────────────────────────────

def _build_candidate_where(
    *,
    date_from: str | None,
    date_to: str | None,
    competitors: list[str] | None,
) -> tuple[str, list[Any]]:
    """Build shared WHERE clause for candidate event queries."""
    clauses = [
        "deleted_at IS NULL",
        "priority_tier IN ({})".format(
            ", ".join("?" for _ in ALLOWED_PRIORITY_TIERS)
        ),
        "COALESCE(triage_status, 'UNREVIEWED') IN ({})".format(
            ", ".join("?" for _ in ALLOWED_TRIAGE_STATUSES)
        ),
    ]
    params: list[Any] = [*ALLOWED_PRIORITY_TIERS, *ALLOWED_TRIAGE_STATUSES]

    if date_from:
        clauses.append("event_date >= ?")
        params.append(date_from)
    if date_to:
        clauses.append("event_date <= ?")
        params.append(date_to)
    if competitors:
        clauses.append(f"competitor IN ({', '.join('?' for _ in competitors)})")
        params.extend(competitors)

    return "WHERE " + " AND ".join(clauses), params


def fetch_candidate_events(
    conn,
    *,
    date_from: str | None = None,
    date_to: str | None = None,
    competitors: list[str] | None = None,
    max_items: int = MAX_ITEMS_DEFAULT,
) -> list[dict]:
    """Query competitor events matching CSO brief inclusion criteria."""
    where, params = _build_candidate_where(
        date_from=date_from, date_to=date_to, competitors=competitors,
    )
    capped = min(max_items, MAX_ITEMS_CAP)
    params.append(capped)
    sql = f"""
        SELECT * FROM competitor_events
        {where}
        ORDER BY
            COALESCE(escalate_to_cso, 0) DESC,
            COALESCE(walmart_relevance_score, 0) DESC,
            event_date DESC
        LIMIT ?
    """
    return [dict(r) for r in conn.execute(sql, params).fetchall()]


def count_candidates(
    conn,
    *,
    date_from: str | None = None,
    date_to: str | None = None,
    competitors: list[str] | None = None,
) -> int:
    """Count total matching candidate events (before LIMIT)."""
    where, params = _build_candidate_where(
        date_from=date_from, date_to=date_to, competitors=competitors,
    )
    return conn.execute(
        f"SELECT COUNT(*) FROM competitor_events {where}", params,
    ).fetchone()[0]


# ── Brief CRUD ────────────────────────────────────────────────────────────────

def create_brief_row(
    conn, *, brief_id: str, title: str, period_start: str,
    period_end: str, user_id: str, now: str,
) -> None:
    conn.execute(
        """
        INSERT INTO cso_briefs (
            id, title, period_start, period_end, status,
            created_by, created_at, updated_by, updated_at,
            snapshot_version
        ) VALUES (?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, 1)
        """,
        (brief_id, title, period_start, period_end, user_id, now, user_id, now),
    )


def _is_http_url(url: str) -> bool:
    return bool(re.match(r"^https?://", url.strip(), flags=re.IGNORECASE))


def evaluate_event_readiness(event_row: dict) -> dict[str, Any]:
    """Deterministic preflight-readiness check shared with competitor-event readiness."""
    fp = build_frozen_payload(event_row)
    patch, _warnings = build_brief_readiness_enrichment(fp)
    enriched = {**fp, **patch}
    readiness = evaluate_competitor_event_readiness(enriched)
    return {
        "is_brief_ready": readiness["is_brief_ready"],
        "readiness_issues": list(readiness["readiness_issues"]),
        "readiness_warnings": list(readiness.get("readiness_warnings") or []),
        "frozen_payload": enriched,
    }


def partition_events_by_readiness(events: list[dict]) -> tuple[list[dict], list[dict]]:
    """Split ordered candidate events into included/excluded by shared readiness logic.

    Contract: generation excludes events with readiness-blocking source/rationale/
    confidence defects before draft creation. Validation then operates on the
    persisted brief/items only; it is not the primary entry point for events
    that never became draft items.
    """
    included: list[dict] = []
    excluded: list[dict] = []
    for event in events:
        readiness = evaluate_event_readiness(event)
        enriched = {
            **event,
            **readiness["frozen_payload"],
            "is_brief_ready": readiness["is_brief_ready"],
            "readiness_issues": readiness["readiness_issues"],
            "readiness_warnings": readiness["readiness_warnings"],
        }
        if readiness["is_brief_ready"]:
            included.append(enriched)
        else:
            excluded.append(enriched)
    return included, excluded


def summarize_exclusions(excluded_events: list[dict], *, cap: int = 20) -> dict[str, Any]:
    counts: dict[str, int] = {}
    summaries: list[dict[str, Any]] = []

    for ev in excluded_events:
        issues = list(ev.get("readiness_issues") or [])
        for code in issues:
            counts[code] = counts.get(code, 0) + 1

    for ev in excluded_events[:max(cap, 0)]:
        summaries.append({
            "competitor_event_id": int(ev.get("id")),
            "competitor": ev.get("competitor"),
            "event_title": ev.get("event_title"),
            "readiness_issues": list(ev.get("readiness_issues") or []),
        })

    return {
        "excluded_count": len(excluded_events),
        "exclusion_reason_counts": counts,
        "excluded_items": summaries,
    }


def _normalize_analyst_decision_for_action(
    *,
    action: str,
    system_recommendation: str,
) -> tuple[str, str]:
    rec = (system_recommendation or "monitor_only").strip() or "monitor_only"
    recommendation_map = {
        "hold_due_to_readiness_issue": "hold",
        "request_additional_evidence": "request_additional_evidence",
        "monitor_only": "monitor_only",
        "escalate_for_review": "escalate_for_review",
        "include_in_brief": "include_in_brief",
    }
    recommended_decision = recommendation_map.get(rec, "monitor_only")

    if action == "accept_recommendation":
        return recommended_decision, "analyst_accept_recommendation"

    source = "analyst_manual"
    if action != recommended_decision:
        source = "analyst_override_recommendation"
    return action, source


def apply_analyst_action_guardrails(
    *,
    frozen_payload: dict[str, Any],
    action: str,
    analyst_status: str,
) -> tuple[str, str, int]:
    if analyst_status not in ANALYST_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid analyst_status: {analyst_status}")
    if action not in ANALYST_ACTIONS:
        raise HTTPException(status_code=422, detail=f"Invalid analyst_decision: {action}")

    recommendation = str(frozen_payload.get("recommended_action") or "monitor_only")
    mapped_decision, source = _normalize_analyst_decision_for_action(
        action=action,
        system_recommendation=recommendation,
    )
    if source not in ANALYST_DECISION_SOURCES:
        raise HTTPException(status_code=422, detail=f"Invalid analyst_decision_source: {source}")

    readiness_blocked = int(frozen_payload.get("readiness_blocked") or 0)
    confidence = str(frozen_payload.get("confidence") or frozen_payload.get("confidence_level") or "").lower()

    if readiness_blocked and mapped_decision == "include_in_brief":
        raise HTTPException(
            status_code=422,
            detail="Cannot include readiness-blocked item in brief. Resolve readiness or choose hold/request evidence.",
        )

    if mapped_decision == "request_additional_evidence":
        # Always allowed; especially for weak/missing evidence.
        pass

    include_in_summary = 1
    if mapped_decision in {"monitor_only", "hold", "dismiss", "request_additional_evidence"}:
        include_in_summary = 0
    elif mapped_decision in {"escalate_for_review", "include_in_brief"}:
        include_in_summary = 1

    # If low/unknown confidence tries to escalate/include, keep allowed but force in_review/decided explicitness by status choice.
    if mapped_decision in {"escalate_for_review", "include_in_brief"} and not confidence:
        # deterministic nudge enforced via status contract
        if analyst_status == "unreviewed":
            raise HTTPException(status_code=422, detail="Set analyst_status to in_review or decided when taking action on low/unknown confidence item")

    return mapped_decision, source, include_in_summary


def create_brief_items(conn, *, brief_id: str, events: list[dict]) -> list[dict]:
    """Insert cso_brief_items rows; return item dicts for serialization."""
    now = utcnow_iso()

    # Deterministic decision-support ordering:
    # 1) actionable-intelligence priority score desc
    # 2) escalate_to_cso desc
    # 3) walmart relevance desc
    # 4) event date desc (lexicographic ISO)
    # 5) id asc for absolute stability
    scored_events: list[tuple[dict, dict[str, Any]]] = []
    for ev in events:
        actionable = build_actionable_intelligence(ev)
        scored_events.append((ev, actionable))

    scored_events.sort(
        key=lambda pair: (
            -float(pair[1].get("priority_score") or 0),
            -int(pair[0].get("escalate_to_cso") or 0),
            -float(pair[0].get("walmart_relevance_score") or 0),
            -(int(str(pair[0].get("event_date") or "").replace("-", "") or 0)),
            int(pair[0].get("id") or 0),
        ),
    )

    items: list[dict] = []
    for rank, (event_row, actionable) in enumerate(scored_events, start=1):
        item_id = str(uuid.uuid4())
        frozen = build_frozen_payload({**event_row, **actionable})
        frozen_json = json.dumps(frozen, default=str, ensure_ascii=False)
        owner_assignment = (frozen.get("recommended_owner") or "").strip()
        conn.execute(
            """
            INSERT INTO cso_brief_items (
                id, brief_id, competitor_event_id, rank,
                analyst_commentary, uncertainty_note, owner_assignment,
                include_in_summary,
                analyst_status, analyst_decision, analyst_note, analyst_decided_at, analyst_decision_source,
                frozen_payload,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, '', '', ?, 1, 'unreviewed', '', '', NULL, '', ?, ?, ?)
            """,
            (item_id, brief_id, event_row["id"], rank, owner_assignment, frozen_json, now, now),
        )
        items.append({
            "id": item_id, "brief_id": brief_id,
            "competitor_event_id": event_row["id"], "rank": rank,
            "analyst_commentary": "", "uncertainty_note": "",
            "owner_assignment": owner_assignment, "include_in_summary": 1,
            "analyst_status": "unreviewed",
            "analyst_decision": "",
            "analyst_note": "",
            "analyst_decided_at": None,
            "analyst_decision_source": "",
            "frozen_payload": frozen, "created_at": now, "updated_at": now,
        })
    return items


# ── Audit ─────────────────────────────────────────────────────────────────────

def log_brief_audit(
    conn, *, brief_id: str, action: str, actor_id: str,
    old_value: str = "", new_value: str = "",
) -> None:
    conn.execute(
        """
        INSERT INTO cso_brief_audit_log
            (brief_id, action, actor_id, old_value, new_value, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (brief_id, action, actor_id, old_value, new_value, utcnow_iso()),
    )


def fetch_audit_entries(
    conn, brief_id: str, *, limit: int = AUDIT_DEFAULT_LIMIT, offset: int = 0,
) -> list[dict]:
    capped = min(max(limit, 1), AUDIT_MAX_LIMIT)
    rows = conn.execute(
        "SELECT * FROM cso_brief_audit_log WHERE brief_id = ? "
        "ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
        (brief_id, capped, max(offset, 0)),
    ).fetchall()
    return [dict(r) for r in rows]


def count_audit_entries(conn, brief_id: str) -> int:
    return conn.execute(
        "SELECT COUNT(*) FROM cso_brief_audit_log WHERE brief_id = ?",
        (brief_id,),
    ).fetchone()[0]


# ── Fetch helpers ─────────────────────────────────────────────────────────────

def _deserialize_frozen(d: dict) -> dict:
    raw = d.get("frozen_payload", "{}")
    try:
        d["frozen_payload"] = json.loads(raw) if isinstance(raw, str) else raw
    except (json.JSONDecodeError, TypeError):
        d["frozen_payload"] = {}
    return d


def fetch_brief(conn, brief_id: str) -> dict | None:
    row = conn.execute(
        "SELECT * FROM cso_briefs WHERE id = ?", (brief_id,),
    ).fetchone()
    return dict(row) if row else None


def fetch_brief_items(conn, brief_id: str) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM cso_brief_items WHERE brief_id = ? ORDER BY rank",
        (brief_id,),
    ).fetchall()
    return [_deserialize_frozen(dict(r)) for r in rows]


def fetch_brief_item(conn, brief_id: str, item_id: str) -> dict | None:
    row = conn.execute(
        "SELECT * FROM cso_brief_items WHERE id = ? AND brief_id = ?",
        (item_id, brief_id),
    ).fetchone()
    return _deserialize_frozen(dict(row)) if row else None


def require_brief_editable(brief_row: dict) -> None:
    if brief_row["status"] not in EDITABLE_STATES:
        raise HTTPException(
            status_code=409,
            detail=f"Brief is in {brief_row['status']} state and cannot be edited",
        )


# ── Validation ────────────────────────────────────────────────────────────────

def run_validation(conn, brief_row: dict) -> ValidateResponse:
    """Run quality-gate checks against persisted draft state.

    Shared by /validate and the approval transition gate.
    Generation has already excluded readiness-blocking candidate events, so this
    gate validates only the brief/items that were actually persisted, with item
    fields read from frozen_payload plus analyst edits. It does NOT query live
    competitor_events rows.
    """
    brief_id = brief_row["id"]
    items = fetch_brief_items(conn, brief_id)
    included = [i for i in items if i.get("include_in_summary") == 1]

    violations: list[Violation] = []

    if not (brief_row.get("executive_summary") or "").strip():
        violations.append(Violation(
            code="MISSING_EXECUTIVE_SUMMARY",
            message="Brief executive_summary is required",
            field="executive_summary",
        ))

    for item in included:
        fp = item.get("frozen_payload", {})
        iid = item["id"]

        src = (fp.get("source_link") or "").strip()
        if not src:
            violations.append(Violation(
                code="MISSING_SOURCE_LINK",
                message="Item source_link is required",
                item_id=iid, field="source_link",
            ))
        elif not (src.startswith("http://") or src.startswith("https://")):
            violations.append(Violation(
                code="INVALID_SOURCE_LINK",
                message="source_link must start with http:// or https://",
                item_id=iid, field="source_link",
            ))

        why = (fp.get("why_walmart_cares") or "").strip()
        act = (fp.get("walmart_actionability_context") or "").strip()
        if not why and not act:
            violations.append(Violation(
                code="MISSING_RATIONALE",
                message="why_walmart_cares or walmart_actionability_context required",
                item_id=iid, field="why_walmart_cares",
            ))

        if not (item.get("owner_assignment") or "").strip():
            violations.append(Violation(
                code="MISSING_OWNER_ASSIGNMENT",
                message="owner_assignment is required for included items",
                item_id=iid, field="owner_assignment",
            ))

        conf = (fp.get("confidence_level") or "").strip()
        if not conf:
            conf = confidence_from_score(fp.get("confidence_score"))
        if not conf:
            violations.append(Violation(
                code="MISSING_CONFIDENCE",
                message="confidence_level or mappable confidence_score required",
                item_id=iid, field="confidence_level",
            ))

    now = utcnow_iso()
    return ValidateResponse(
        passed=len(violations) == 0,
        violations=violations,
        checked_at=now,
        included_item_count=len(included),
    )


# ── Snapshot ──────────────────────────────────────────────────────────────────

def build_snapshot_item(item: dict) -> SnapshotItemOut:
    """Build a read-only snapshot item from an item row + frozen_payload."""
    fp = item.get("frozen_payload", {})
    actionable = build_actionable_intelligence(fp)
    return SnapshotItemOut(
        rank=item["rank"],
        competitor=fp.get("competitor", ""),
        event_title=fp.get("event_title", ""),
        event_date=fp.get("event_date"),
        category=fp.get("category"),
        source_link=fp.get("source_link"),
        priority_tier=fp.get("priority_tier"),
        triage_status=fp.get("triage_status"),
        walmart_relevance_score=fp.get("walmart_relevance_score"),
        confidence_level=fp.get("confidence_level"),
        why_walmart_cares=fp.get("why_walmart_cares"),
        walmart_actionability_context=fp.get("walmart_actionability_context"),
        correlation_summary=(
            fp.get("correlation_summary")
            or fp.get("walmart_actionability_context")
            or fp.get("why_walmart_cares")
        ),
        detailed_description=fp.get("detailed_description"),
        security_implication=fp.get("security_implication"),
        analyst_commentary=item.get("analyst_commentary", ""),
        uncertainty_note=item.get("uncertainty_note", ""),
        owner_assignment=item.get("owner_assignment", ""),
        include_in_summary=item.get("include_in_summary", 1),
        decision_title=fp.get("title") or actionable.get("title"),
        decision_summary=fp.get("summary") or actionable.get("summary"),
        evidence_reference=fp.get("evidence_reference") or actionable.get("evidence_reference"),
        rationale=fp.get("rationale") or actionable.get("rationale"),
        confidence=fp.get("confidence") or actionable.get("confidence"),
        severity=fp.get("severity") or actionable.get("severity"),
        likelihood=fp.get("likelihood") or actionable.get("likelihood"),
        impact_score=(
            fp.get("impact_score")
            if fp.get("impact_score") is not None
            else actionable.get("impact_score")
        ),
        likelihood_score=(
            fp.get("likelihood_score")
            if fp.get("likelihood_score") is not None
            else actionable.get("likelihood_score")
        ),
        priority_score=(
            fp.get("priority_score")
            if fp.get("priority_score") is not None
            else actionable.get("priority_score")
        ),
        recommended_action=fp.get("recommended_action") or actionable.get("recommended_action"),
        reason_codes=list(fp.get("reason_codes") or actionable.get("reason_codes") or []),
        explanation=fp.get("explanation") or actionable.get("explanation"),
        actionable_now=int(fp.get("actionable_now") if fp.get("actionable_now") is not None else actionable.get("actionable_now") or 0),
        readiness_blocked=int(fp.get("readiness_blocked") if fp.get("readiness_blocked") is not None else actionable.get("readiness_blocked") or 0),
        scoring_version=fp.get("scoring_version") or actionable.get("scoring_version"),
        decision_model_version=DECISION_MODEL_VERSION,
        analyst_status=item.get("analyst_status", "unreviewed") or "unreviewed",
        analyst_decision=item.get("analyst_decision", "") or "",
        analyst_note=item.get("analyst_note", "") or "",
        analyst_decided_at=item.get("analyst_decided_at"),
        analyst_decision_source=item.get("analyst_decision_source", "") or "",
    )


# ── Serialization ─────────────────────────────────────────────────────────────

def serialize_brief(brief_row: dict, items: list[dict]) -> BriefOut:
    """Build the BriefOut response from a brief row + item rows."""
    return BriefOut(
        id=brief_row["id"],
        title=brief_row["title"],
        period_start=brief_row["period_start"],
        period_end=brief_row["period_end"],
        status=brief_row["status"],
        created_by=brief_row["created_by"],
        created_at=brief_row["created_at"],
        updated_by=brief_row["updated_by"],
        updated_at=brief_row["updated_at"],
        submitted_at=brief_row.get("submitted_at"),
        submitted_by=brief_row.get("submitted_by"),
        reviewed_at=brief_row.get("reviewed_at"),
        reviewed_by=brief_row.get("reviewed_by"),
        reviewer_notes=brief_row.get("reviewer_notes", ""),
        reviewer_attestation=brief_row.get("reviewer_attestation", ""),
        changes_requested_at=brief_row.get("changes_requested_at"),
        changes_requested_by=brief_row.get("changes_requested_by"),
        changes_requested_reason=brief_row.get("changes_requested_reason", ""),
        approved_at=brief_row.get("approved_at"),
        approved_by=brief_row.get("approved_by"),
        published_draft_at=brief_row.get("published_draft_at"),
        published_draft_by=brief_row.get("published_draft_by"),
        executive_summary=brief_row.get("executive_summary", ""),
        review_notes=brief_row.get("review_notes", ""),
        quality_gate_result=brief_row.get("quality_gate_result", ""),
        snapshot_version=brief_row.get("snapshot_version", 1),
        items=[BriefItemOut(**item) for item in items],
    )
