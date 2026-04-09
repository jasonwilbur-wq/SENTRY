"""SENTRY CSO Briefing Pipeline — Repository helpers.

All database access for CSO briefs flows through these helpers so
route handlers stay thin.  Pure data models live in cso_brief_models.py.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

# Re-export models + constants so existing imports from cso_brief_helpers
# continue to work without touching every call-site.
from cso_brief_models import (  # noqa: F401 — re-exports
    ALLOWED_PRIORITY_TIERS,
    ALLOWED_TRANSITIONS,
    ALLOWED_TRIAGE_STATUSES,
    AUDIT_DEFAULT_LIMIT,
    AUDIT_MAX_LIMIT,
    CONFIDENCE_BUCKETS,
    EDITABLE_STATES,
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
    """Extract the canonical snapshot fields from a competitor event row."""
    return {field: row.get(field) for field in FROZEN_PAYLOAD_FIELDS}


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


def create_brief_items(conn, *, brief_id: str, events: list[dict]) -> list[dict]:
    """Insert cso_brief_items rows; return item dicts for serialization."""
    now = utcnow_iso()
    items: list[dict] = []
    for rank, event_row in enumerate(events, start=1):
        item_id = str(uuid.uuid4())
        frozen = build_frozen_payload(event_row)
        frozen_json = json.dumps(frozen, default=str, ensure_ascii=False)
        conn.execute(
            """
            INSERT INTO cso_brief_items (
                id, brief_id, competitor_event_id, rank,
                analyst_commentary, uncertainty_note, owner_assignment,
                include_in_summary, frozen_payload,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, '', '', '', 1, ?, ?, ?)
            """,
            (item_id, brief_id, event_row["id"], rank, frozen_json, now, now),
        )
        items.append({
            "id": item_id, "brief_id": brief_id,
            "competitor_event_id": event_row["id"], "rank": rank,
            "analyst_commentary": "", "uncertainty_note": "",
            "owner_assignment": "", "include_in_summary": 1,
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
    """Run quality-gate checks against frozen_payload + item analyst fields.

    Shared by /validate and the approval transition gate.
    Does NOT query live competitor_events rows.
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
        detailed_description=fp.get("detailed_description"),
        security_implication=fp.get("security_implication"),
        analyst_commentary=item.get("analyst_commentary", ""),
        uncertainty_note=item.get("uncertainty_note", ""),
        owner_assignment=item.get("owner_assignment", ""),
        include_in_summary=item.get("include_in_summary", 1),
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
