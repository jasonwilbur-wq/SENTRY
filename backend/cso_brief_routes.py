"""SENTRY CSO Briefing Pipeline — Routes (Step 2: generate + get).

Endpoints for creating review-gated CSO briefs from scored competitor
events and retrieving them with ordered items.

All routes live under /api/cso-briefs/.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import SentryUser, get_current_user
from database import get_connection

ROUTER = APIRouter(prefix="/api/cso-briefs", tags=["cso-briefs"])


# ── Constants ─────────────────────────────────────────────────────────────────

MAX_ITEMS_DEFAULT = 20
MAX_ITEMS_CAP = 100

# Inclusion gates — only these values qualify for a CSO brief.
ALLOWED_PRIORITY_TIERS = {"Leadership Watch", "CSO Brief"}
ALLOWED_TRIAGE_STATUSES = {"REVIEWED", "ESCALATED"}

# Fields captured in frozen_payload from the source competitor event row.
FROZEN_PAYLOAD_FIELDS: list[str] = [
    "id",
    "competitor",
    "event_title",
    "event_date",
    "source_link",
    "confidence_level",
    "walmart_relevance_score",
    "priority_tier",
    "triage_status",
    "escalate_to_cso",
    "why_walmart_cares",
    "walmart_actionability_context",
    "matched_vendor_id",
    "matched_vendor_name",
    "match_method",
    "match_label",
    "linked_active_projects_count",
    "linked_projects",
    "score_reason",
    "category",
    "detailed_description",
    "security_implication",
    "operational_impact",
    "financial_impact",
    "reputational_impact",
    "analyst_notes",
    "cso_candidate_reason",
    "signal_type",
    "recommended_owner",
    "strategic_score",
    "security_score",
    "operational_score",
    "customer_trust_score",
    "novelty_score",
    "urgency_score",
    "confidence_score",
    "confidence_effect",
    "source_effect",
    "location",
    "source_month",
]


# ── Pydantic models ──────────────────────────────────────────────────────────

class GenerateFilters(BaseModel):
    date_from: str | None = None
    date_to: str | None = None
    competitor: list[str] | None = None
    max_items: int = MAX_ITEMS_DEFAULT


class GenerateRequest(BaseModel):
    title: str
    period_start: str
    period_end: str
    filters: GenerateFilters = Field(default_factory=GenerateFilters)


class BriefItemOut(BaseModel):
    id: str
    brief_id: str
    competitor_event_id: int
    rank: int
    analyst_commentary: str
    uncertainty_note: str
    owner_assignment: str
    include_in_summary: int
    frozen_payload: dict[str, Any]
    created_at: str
    updated_at: str


class BriefOut(BaseModel):
    id: str
    title: str
    period_start: str
    period_end: str
    status: str
    created_by: str
    created_at: str
    updated_by: str
    updated_at: str
    submitted_at: str | None
    submitted_by: str | None
    approved_at: str | None
    approved_by: str | None
    published_draft_at: str | None
    published_draft_by: str | None
    executive_summary: str
    review_notes: str
    quality_gate_result: str
    snapshot_version: int
    items: list[BriefItemOut]


class GenerateResponse(BaseModel):
    brief: BriefOut
    included_count: int
    candidate_count: int


# ── Repository / helpers ──────────────────────────────────────────────────────

def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _build_frozen_payload(row: dict) -> dict[str, Any]:
    """Extract the canonical snapshot fields from a competitor event row."""
    payload: dict[str, Any] = {}
    for field in FROZEN_PAYLOAD_FIELDS:
        val = row.get(field)
        # sqlite3.Row doesn't support .get — already converted to dict upstream
        payload[field] = val
    return payload


def _fetch_candidate_events(
    conn,
    *,
    date_from: str | None = None,
    date_to: str | None = None,
    competitors: list[str] | None = None,
    max_items: int = MAX_ITEMS_DEFAULT,
) -> list[dict]:
    """Query competitor events matching CSO brief inclusion criteria.

    Returns rows as dicts, ordered by the approved ranking:
      1. escalate_to_cso DESC
      2. walmart_relevance_score DESC
      3. event_date DESC
    """
    clauses = [
        "deleted_at IS NULL",
        "priority_tier IN ({})".format(
            ", ".join("?" for _ in ALLOWED_PRIORITY_TIERS)
        ),
        "COALESCE(triage_status, 'UNREVIEWED') IN ({})".format(
            ", ".join("?" for _ in ALLOWED_TRIAGE_STATUSES)
        ),
    ]
    params: list[Any] = [
        *ALLOWED_PRIORITY_TIERS,
        *ALLOWED_TRIAGE_STATUSES,
    ]

    if date_from:
        clauses.append("event_date >= ?")
        params.append(date_from)
    if date_to:
        clauses.append("event_date <= ?")
        params.append(date_to)
    if competitors:
        placeholders = ", ".join("?" for _ in competitors)
        clauses.append(f"competitor IN ({placeholders})")
        params.extend(competitors)

    where = "WHERE " + " AND ".join(clauses)

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
    rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


def _count_candidates(
    conn,
    *,
    date_from: str | None = None,
    date_to: str | None = None,
    competitors: list[str] | None = None,
) -> int:
    """Count total matching candidate events (before LIMIT)."""
    clauses = [
        "deleted_at IS NULL",
        "priority_tier IN ({})".format(
            ", ".join("?" for _ in ALLOWED_PRIORITY_TIERS)
        ),
        "COALESCE(triage_status, 'UNREVIEWED') IN ({})".format(
            ", ".join("?" for _ in ALLOWED_TRIAGE_STATUSES)
        ),
    ]
    params: list[Any] = [
        *ALLOWED_PRIORITY_TIERS,
        *ALLOWED_TRIAGE_STATUSES,
    ]

    if date_from:
        clauses.append("event_date >= ?")
        params.append(date_from)
    if date_to:
        clauses.append("event_date <= ?")
        params.append(date_to)
    if competitors:
        placeholders = ", ".join("?" for _ in competitors)
        clauses.append(f"competitor IN ({placeholders})")
        params.extend(competitors)

    where = "WHERE " + " AND ".join(clauses)
    row = conn.execute(
        f"SELECT COUNT(*) FROM competitor_events {where}", params
    ).fetchone()
    return row[0]


def _create_brief_row(
    conn,
    *,
    brief_id: str,
    title: str,
    period_start: str,
    period_end: str,
    user_id: str,
    now: str,
) -> None:
    """Insert the cso_briefs header row."""
    conn.execute(
        """
        INSERT INTO cso_briefs (
            id, title, period_start, period_end, status,
            created_by, created_at, updated_by, updated_at,
            snapshot_version
        ) VALUES (?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, 1)
        """,
        (brief_id, title, period_start, period_end,
         user_id, now, user_id, now),
    )


def _create_brief_items(
    conn,
    *,
    brief_id: str,
    events: list[dict],
) -> list[dict]:
    """Insert cso_brief_items rows for each included event.

    Returns the item dicts (for response serialization).
    """
    now = _utcnow_iso()
    items: list[dict] = []
    for rank, event_row in enumerate(events, start=1):
        item_id = str(uuid.uuid4())
        frozen = _build_frozen_payload(event_row)
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
            (item_id, brief_id, event_row["id"], rank,
             frozen_json, now, now),
        )
        items.append({
            "id": item_id,
            "brief_id": brief_id,
            "competitor_event_id": event_row["id"],
            "rank": rank,
            "analyst_commentary": "",
            "uncertainty_note": "",
            "owner_assignment": "",
            "include_in_summary": 1,
            "frozen_payload": frozen,
            "created_at": now,
            "updated_at": now,
        })
    return items


def _log_brief_audit(
    conn,
    *,
    brief_id: str,
    action: str,
    actor_id: str,
    old_value: str = "",
    new_value: str = "",
) -> None:
    """Write a row to cso_brief_audit_log."""
    conn.execute(
        """
        INSERT INTO cso_brief_audit_log
            (brief_id, action, actor_id, old_value, new_value, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (brief_id, action, actor_id, old_value, new_value, _utcnow_iso()),
    )


def _fetch_brief(conn, brief_id: str) -> dict | None:
    """Fetch a single cso_briefs row as dict, or None."""
    row = conn.execute(
        "SELECT * FROM cso_briefs WHERE id = ?", (brief_id,)
    ).fetchone()
    return dict(row) if row else None


def _fetch_brief_items(conn, brief_id: str) -> list[dict]:
    """Fetch ordered cso_brief_items for a brief."""
    rows = conn.execute(
        "SELECT * FROM cso_brief_items WHERE brief_id = ? ORDER BY rank",
        (brief_id,),
    ).fetchall()
    items: list[dict] = []
    for r in rows:
        d = dict(r)
        # Deserialize frozen_payload from JSON string → dict
        raw = d.get("frozen_payload", "{}")
        try:
            d["frozen_payload"] = json.loads(raw) if isinstance(raw, str) else raw
        except (json.JSONDecodeError, TypeError):
            d["frozen_payload"] = {}
        items.append(d)
    return items


def _serialize_brief(brief_row: dict, items: list[dict]) -> BriefOut:
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


# ── Route handlers ────────────────────────────────────────────────────────────

@ROUTER.post("/generate", response_model=GenerateResponse)
def generate_brief(
    body: GenerateRequest,
    user: SentryUser = Depends(get_current_user),
) -> GenerateResponse:
    """Create a DRAFT CSO brief from scored competitor events."""
    filters = body.filters
    max_items = min(filters.max_items, MAX_ITEMS_CAP)
    if max_items < 1:
        max_items = MAX_ITEMS_DEFAULT

    conn = get_connection()
    try:
        # Fetch candidate events matching inclusion criteria
        events = _fetch_candidate_events(
            conn,
            date_from=filters.date_from,
            date_to=filters.date_to,
            competitors=filters.competitor,
            max_items=max_items,
        )
        candidate_count = _count_candidates(
            conn,
            date_from=filters.date_from,
            date_to=filters.date_to,
            competitors=filters.competitor,
        )

        brief_id = str(uuid.uuid4())
        now = _utcnow_iso()

        # Single transaction: brief row + all item rows + audit
        _create_brief_row(
            conn,
            brief_id=brief_id,
            title=body.title,
            period_start=body.period_start,
            period_end=body.period_end,
            user_id=user.id,
            now=now,
        )

        items = _create_brief_items(
            conn, brief_id=brief_id, events=events,
        )

        _log_brief_audit(
            conn,
            brief_id=brief_id,
            action="create",
            actor_id=user.id,
            new_value=json.dumps({
                "title": body.title,
                "period_start": body.period_start,
                "period_end": body.period_end,
                "included_count": len(events),
                "candidate_count": candidate_count,
                "max_items": max_items,
            }),
        )

        conn.commit()

        brief_row = _fetch_brief(conn, brief_id)
    finally:
        conn.close()

    assert brief_row is not None  # just created it

    return GenerateResponse(
        brief=_serialize_brief(brief_row, items),
        included_count=len(events),
        candidate_count=candidate_count,
    )


@ROUTER.get("/{brief_id}", response_model=BriefOut)
def get_brief(
    brief_id: str,
    user: SentryUser = Depends(get_current_user),
) -> BriefOut:
    """Retrieve a CSO brief with ordered items."""
    conn = get_connection()
    try:
        brief_row = _fetch_brief(conn, brief_id)
        if not brief_row:
            raise HTTPException(status_code=404, detail="Brief not found")
        items = _fetch_brief_items(conn, brief_id)
    finally:
        conn.close()

    return _serialize_brief(brief_row, items)
