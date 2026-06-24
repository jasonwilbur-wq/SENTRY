"""Admin competitor-intelligence routes.

This module owns competitor event CRUD, deterministic scoring/backfill,
triage, and brief-readiness admin workflows. It is included by
admin_routes.py under /api/admin to keep the broad admin surface modular.
"""
from __future__ import annotations

import math
import re
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from audit import log_mutation
from auth import SentryUser, require_admin
from competitor_correlation import enrich_competitor_event_row, enrich_competitor_event_rows
from competitor_enrichment import build_brief_readiness_enrichment, evaluate_competitor_event_readiness
from competitor_scoring import score_event
from database import get_connection


router = APIRouter(prefix="/competitor-events", tags=["admin-competitor-events"])

# ══════════════════════════════════════════════════════════════════════════════
# COMPETITOR INTEL MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

class CompetitorEventCreate(BaseModel):
    event_date: str
    competitor: str
    event_title: str
    event_type: str = ""
    detailed_description: str = ""
    category: str
    location: str = ""
    security_implication: str = ""
    operational_impact: str = ""
    financial_impact: str = ""
    reputational_impact: str = ""
    source_link: str = ""
    analyst_notes: str = ""
    source_month: str = ""
    confidence_level: str = ""
    why_walmart_cares: str = ""
    recommended_owner: str = ""


class CompetitorTriageRequest(BaseModel):
    triage_status: str
    triage_note: str = ""


class CompetitorEventUpdate(BaseModel):
    event_date: str | None = None
    competitor: str | None = None
    event_title: str | None = None
    event_type: str | None = None
    detailed_description: str | None = None
    category: str | None = None
    location: str | None = None
    security_implication: str | None = None
    operational_impact: str | None = None
    financial_impact: str | None = None
    reputational_impact: str | None = None
    source_link: str | None = None
    analyst_notes: str | None = None
    source_month: str | None = None


class CompetitorEventOut(BaseModel):
    id: int
    event_date: str | None
    competitor: str
    event_title: str | None
    event_type: str | None
    detailed_description: str | None
    category: str
    location: str | None
    security_implication: str | None
    operational_impact: str | None
    financial_impact: str | None
    reputational_impact: str | None
    source_link: str | None
    analyst_notes: str | None
    source_month: str | None
    confidence_level: str | None = ""
    walmart_relevance_score: float | None = None
    priority_tier: str | None = ""
    signal_type: str | None = ""
    recommended_owner: str | None = ""
    why_walmart_cares: str | None = ""
    confidence_score: float | None = None
    escalate_to_cso: int | None = 0
    score_reason: str | None = ""
    cso_candidate_reason: str | None = ""
    triage_status: str | None = "UNREVIEWED"
    triaged_by: str | None = ""
    triaged_at: str | None = ""
    triage_note: str | None = ""
    walmart_actionability_context: str | None = ""
    correlation_summary: str | None = ""
    is_brief_ready: bool = False
    readiness_issues: list[str] = Field(default_factory=list)
    readiness_warnings: list[str] = Field(default_factory=list)
    readiness_required_fields: list[str] = Field(default_factory=list)


class CompetitorEventsListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    events: list[CompetitorEventOut]


COMPETITOR_SCORE_COLUMNS = (
    "walmart_relevance_score",
    "priority_tier",
    "signal_type",
    "recommended_owner",
    "why_walmart_cares",
    "strategic_score",
    "security_score",
    "operational_score",
    "customer_trust_score",
    "novelty_score",
    "urgency_score",
    "confidence_score",
    "escalate_to_cso",
    "score_reason",
    "confidence_effect",
    "source_effect",
    "cso_candidate_reason",
    "scoring_version",
    "scored_at",
)

_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
COMPETITOR_EVENT_UPDATE_COLUMNS = frozenset(
    set(CompetitorEventUpdate.model_fields.keys())
    | set(COMPETITOR_SCORE_COLUMNS)
    | {
        "confidence_level",
        "source_link",
        "walmart_actionability_context",
        "correlation_summary",
        "triage_status",
        "triaged_by",
        "triaged_at",
        "triage_note",
        "deleted_at",
    }
)


def _quote_competitor_event_column(field: str) -> str:
    """Return a quoted competitor_events column after strict allowlist validation."""
    if field not in COMPETITOR_EVENT_UPDATE_COLUMNS or not _IDENTIFIER_RE.fullmatch(field):
        raise ValueError(f"Unsupported competitor_events update column: {field!r}")
    return f'"{field}"'


def _build_competitor_event_update_sql(updates: dict[str, Any]) -> tuple[str, list[Any]]:
    """Build an UPDATE assignment fragment from trusted, allowlisted columns only.

    SQLite cannot parameter-bind identifiers, so every generated column name must
    come from the local schema allowlist. Values remain parameter-bound.
    """
    if not updates:
        raise ValueError("No competitor event fields to update.")
    assignments = ", ".join(f"{_quote_competitor_event_column(field)} = ?" for field in updates)
    return assignments, list(updates.values())


def _score_competitor_event(row: dict[str, Any]) -> dict[str, Any]:
    """Return DB-safe scoring fields for a competitor event.

    The scoring policy lives in competitor_scoring.py; this route module only
    adapts that domain output to columns persisted by competitor_events.
    """
    scoring = score_event(row)
    scoring["scored_at"] = datetime.now(timezone.utc).isoformat()
    return {field: scoring[field] for field in COMPETITOR_SCORE_COLUMNS if field in scoring}


def _event_out_from_row(row: dict[str, Any]) -> CompetitorEventOut:
    readiness = evaluate_competitor_event_readiness(row)
    allowed = set(CompetitorEventOut.model_fields.keys())
    payload = {k: row.get(k) for k in allowed if k in row}
    payload.update(readiness)
    return CompetitorEventOut(**payload)


@router.get("", response_model=CompetitorEventsListResponse)
def list_competitor_events(
    competitor: str | None = Query(None),
    category: str | None = Query(None),
    month: str | None = Query(None),
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> CompetitorEventsListResponse:
    """Admin: List competitor events with filters and pagination."""
    conn = get_connection()
    params: list[Any] = []
    clauses: list[str] = []

    if competitor:
        clauses.append("competitor = ?")
        params.append(competitor)
    if category:
        clauses.append("category = ?")
        params.append(category)
    if month:
        clauses.append("source_month = ?")
        params.append(month)
    if q:
        clauses.append(
            "(LOWER(event_title) LIKE ? OR LOWER(detailed_description) LIKE ? "
            "OR LOWER(competitor) LIKE ?)"
        )
        term = f"%{q.lower()}%"
        params.extend([term, term, term])

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    total = conn.execute(
        f"SELECT COUNT(*) FROM competitor_events {where}", params
    ).fetchone()[0]

    total_pages = max(1, math.ceil(total / page_size))
    page = min(page, total_pages)
    offset = (page - 1) * page_size

    rows = conn.execute(
        f"SELECT * FROM competitor_events {where} "
        f"ORDER BY event_date DESC, id DESC LIMIT ? OFFSET ?",
        params + [page_size, offset],
    ).fetchall()

    events = [_event_out_from_row(row) for row in enrich_competitor_event_rows(conn, rows)]
    conn.close()

    return CompetitorEventsListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        events=events,
    )


@router.get("/scoring-summary")
def competitor_scoring_summary() -> dict[str, Any]:
    with get_connection() as conn:
        total = conn.execute("SELECT COUNT(*) FROM competitor_events WHERE deleted_at IS NULL").fetchone()[0]
        unscored = conn.execute("SELECT COUNT(*) FROM competitor_events WHERE walmart_relevance_score IS NULL").fetchone()[0]
        rows = conn.execute("SELECT priority_tier, COUNT(*) AS c FROM competitor_events GROUP BY priority_tier").fetchall()
    distribution = {"unscored": unscored, "archive_low_signal": 0}
    for row in rows:
        key = (row["priority_tier"] or "unclassified").lower().replace(" / ", "_").replace(" ", "_")
        distribution[key] = row["c"]
        if row["priority_tier"] == "Archive / Low Signal":
            distribution["archive_low_signal"] = row["c"]
    return {"total": total, "distribution": distribution}


@router.post("/rescore")
def rescore_competitor_events(
    limit: int = Query(100, ge=1, le=1000),
    only_unscored: bool = Query(False),
    preserve_manual: bool = Query(True),
) -> dict[str, Any]:
    before = competitor_scoring_summary()["distribution"]
    updated = skipped_manual = 0
    with get_connection() as conn:
        where = "WHERE deleted_at IS NULL"
        if only_unscored:
            where += " AND walmart_relevance_score IS NULL"
        rows = conn.execute(f"SELECT * FROM competitor_events {where} ORDER BY id LIMIT ?", (limit,)).fetchall()
        for row in rows:
            data = dict(row)
            if preserve_manual and "#manual-score" in (data.get("analyst_notes") or ""):
                skipped_manual += 1
                continue
            enriched = enrich_competitor_event_row(conn, data)
            scoring = _score_competitor_event(enriched)
            patch, _warnings = build_brief_readiness_enrichment({**enriched, **scoring})
            updates = {**scoring, **patch}
            assignments, update_values = _build_competitor_event_update_sql(updates)
            conn.execute(f"UPDATE competitor_events SET {assignments} WHERE id=?", [*update_values, data["id"]])
            updated += 1
        conn.commit()
    after = competitor_scoring_summary()["distribution"]
    return {"success": True, "updated": updated, "skipped_manual": skipped_manual, "before": {"unscored": before.get("unscored", 0)}, "after": {"unscored": after.get("unscored", 0)}}


@router.get("/triage-queue")
def competitor_triage_queue(
    triage_status: str | None = Query(None),
    priority_tier: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
) -> dict[str, Any]:
    clauses = ["deleted_at IS NULL"]
    params: list[Any] = []
    if triage_status:
        clauses.append("COALESCE(triage_status, 'UNREVIEWED') = ?")
        params.append(triage_status)
    if priority_tier:
        clauses.append("priority_tier = ?")
        params.append(priority_tier)
    where = "WHERE " + " AND ".join(clauses)
    with get_connection() as conn:
        rows = conn.execute(f"SELECT * FROM competitor_events {where} ORDER BY walmart_relevance_score DESC NULLS LAST, id DESC LIMIT ?", [*params, limit]).fetchall()
        items = [_event_out_from_row(row) for row in enrich_competitor_event_rows(conn, rows)]
    return {"total": len(items), "items": [item.model_dump() for item in items]}


@router.post("/backfill-brief-readiness")
def backfill_brief_readiness(
    limit: int = Query(200, ge=1, le=1000),
    only_missing: bool = Query(True),
) -> dict[str, Any]:
    def coverage(rows: list[dict[str, Any]]) -> dict[str, Any]:
        blocked: dict[str, int] = {}
        valid_source = usable_conf = ready = 0
        for row in rows:
            readiness_row = dict(row)
            source_value = str(readiness_row.get("source_link") or "")
            if source_value.startswith("www."):
                readiness_row["source_link"] = f"https://{source_value}"
            check = evaluate_competitor_event_readiness(readiness_row)
            if check["is_brief_ready"]:
                ready += 1
            source = str(row.get("source_link") or "")
            if source.startswith(("http://", "https://", "www.")):
                valid_source += 1
            if row.get("confidence_level") or row.get("confidence_score"):
                usable_conf += 1
            for issue in check["readiness_issues"]:
                blocked[issue] = blocked.get(issue, 0) + 1
        return {"candidate_rows": len(rows), "valid_source_link": valid_source, "usable_confidence": usable_conf, "brief_ready": ready, "blocked_by_reason": blocked}

    with get_connection() as conn:
        rows = [dict(r) for r in conn.execute("SELECT * FROM competitor_events WHERE deleted_at IS NULL ORDER BY id LIMIT ?", (limit,)).fetchall()]
        before_cov = coverage(rows)
        field_before = {f: sum(1 for r in rows if r.get(f)) for f in ("recommended_owner", "correlation_summary")}
        updated_rows = field_updates = skipped_rows = 0
        skipped_reasons: dict[str, int] = {}
        for row in rows:
            enriched = enrich_competitor_event_row(conn, row)
            patch, _warnings = build_brief_readiness_enrichment(enriched)
            if not (enriched.get("confidence_level") or patch.get("confidence_level")) and enriched.get("walmart_relevance_score") is not None:
                patch["confidence_level"] = "medium"
                patch.setdefault("confidence_score", 64.0)
            if only_missing:
                patch = {k: v for k, v in patch.items() if not row.get(k)}
            if not patch:
                skipped_rows += 1
                skipped_reasons["no_missing_fields"] = skipped_reasons.get("no_missing_fields", 0) + 1
                continue
            assignments, update_values = _build_competitor_event_update_sql(patch)
            conn.execute(f"UPDATE competitor_events SET {assignments} WHERE id=?", [*update_values, row["id"]])
            updated_rows += 1
            field_updates += len(patch)
        conn.commit()
        after_rows = [dict(r) for r in conn.execute("SELECT * FROM competitor_events WHERE deleted_at IS NULL ORDER BY id LIMIT ?", (limit,)).fetchall()]
        for idx, row in enumerate(after_rows):
            after_rows[idx] = {**row, **enrich_competitor_event_row(conn, row)}
    after_cov = coverage(after_rows)
    field_after = {f: sum(1 for r in after_rows if r.get(f)) for f in ("recommended_owner", "correlation_summary")}
    return {"success": True, "processed_rows": len(rows), "updated_rows": updated_rows, "field_updates": field_updates, "skipped_rows": skipped_rows, "skipped_reasons": skipped_reasons, "brief_ready_before": before_cov["brief_ready"], "brief_ready_after": after_cov["brief_ready"], "field_coverage_before": field_before, "field_coverage_after": field_after, "coverage_before": before_cov, "coverage_after": after_cov}


@router.get("/{event_id}", response_model=CompetitorEventOut)
def get_competitor_event(event_id: int) -> CompetitorEventOut:
    """Admin: Get single competitor event by ID."""
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM competitor_events WHERE id = ?", (event_id,)
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Event not found")
    enriched = enrich_competitor_event_row(conn, row)
    conn.close()
    return _event_out_from_row(enriched)


@router.post("", response_model=CompetitorEventOut)
def create_competitor_event(event: CompetitorEventCreate) -> CompetitorEventOut:
    """Admin: Create a new competitor event."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO competitor_events (
            event_date, competitor, event_title, event_type, detailed_description,
            category, location, security_implication, operational_impact,
            financial_impact, reputational_impact, source_link,
            analyst_notes, source_month, confidence_level, why_walmart_cares, recommended_owner
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            event.event_date,
            event.competitor,
            event.event_title,
            event.event_type,
            event.detailed_description,
            event.category,
            event.location,
            event.security_implication,
            event.operational_impact,
            event.financial_impact,
            event.reputational_impact,
            event.source_link,
            event.analyst_notes,
            event.source_month,
            event.confidence_level,
            event.why_walmart_cares,
            event.recommended_owner,
        ),
    )
    event_id = cursor.lastrowid
    conn.commit()

    row = conn.execute(
        "SELECT * FROM competitor_events WHERE id = ?", (event_id,)
    ).fetchone()
    enriched = enrich_competitor_event_row(conn, row)
    scoring = _score_competitor_event(enriched)
    patch, _warnings = build_brief_readiness_enrichment({**enriched, **scoring})
    updates = {**scoring, **patch}
    if not updates.get("confidence_level") and not enriched.get("confidence_level"):
        updates["confidence_level"] = "medium"
    if updates:
        assignments, update_values = _build_competitor_event_update_sql(updates)
        conn.execute(
            f"UPDATE competitor_events SET {assignments} WHERE id=?",
            [*update_values, event_id],
        )
        conn.commit()
        row = conn.execute("SELECT * FROM competitor_events WHERE id = ?", (event_id,)).fetchone()
        enriched = enrich_competitor_event_row(conn, row)
    conn.close()
    return _event_out_from_row(enriched)


@router.patch("/{event_id}/triage")
def triage_competitor_event(
    event_id: int,
    body: CompetitorTriageRequest,
    user: SentryUser = Depends(require_admin),
) -> dict[str, Any]:
    allowed = {"UNREVIEWED", "REVIEWED", "ESCALATED", "DISMISSED"}
    status = body.triage_status.strip().upper()
    if status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid triage_status")
    triaged_at = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM competitor_events WHERE id=?", (event_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Event not found")
        conn.execute(
            "UPDATE competitor_events SET triage_status=?, triaged_by=?, triaged_at=?, triage_note=? WHERE id=?",
            (status, user.id, triaged_at, body.triage_note, event_id),
        )
        new_value = {"triage_status": status, "triaged_by": user.id, "triaged_at": triaged_at, "triage_note": body.triage_note}
        log_mutation(
            conn=conn,
            user=user,
            action="triage",
            entity_type="competitor_event",
            entity_id=str(event_id),
            old_value={"triage_status": row["triage_status"], "triage_note": row["triage_note"]},
            new_value=new_value,
        )
        conn.commit()
    return {"id": event_id, **new_value}


@router.patch("/{event_id}", response_model=CompetitorEventOut)
def update_competitor_event(
    event_id: int, update: CompetitorEventUpdate
) -> CompetitorEventOut:
    """Admin: Update competitor event fields."""
    conn = get_connection()

    # Check if event exists
    existing = conn.execute(
        "SELECT id FROM competitor_events WHERE id = ?", (event_id,)
    ).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Event not found")

    # Build UPDATE query for non-None fields; column identifiers are allowlisted
    # before interpolation because SQL drivers can only bind values.
    updates: dict[str, Any] = {
        field: value
        for field, value in update.model_dump(exclude_unset=True).items()
        if value is not None
    }

    if not updates:
        # No fields to update
        conn.close()
        return get_competitor_event(event_id)

    assignments, update_values = _build_competitor_event_update_sql(updates)
    conn.execute(
        f"UPDATE competitor_events SET {assignments} WHERE id = ?", [*update_values, event_id]
    )
    conn.commit()

    row = conn.execute(
        "SELECT * FROM competitor_events WHERE id = ?", (event_id,)
    ).fetchone()
    conn.close()

    return CompetitorEventOut(
        id=row["id"],
        event_date=row["event_date"],
        competitor=row["competitor"],
        event_title=row["event_title"],
        event_type=row["event_type"],
        detailed_description=row["detailed_description"],
        category=row["category"],
        location=row["location"],
        security_implication=row["security_implication"],
        operational_impact=row["operational_impact"],
        financial_impact=row["financial_impact"],
        reputational_impact=row["reputational_impact"],
        source_link=row["source_link"],
        analyst_notes=row["analyst_notes"],
        source_month=row["source_month"],
    )


@router.delete("/{event_id}")
def delete_competitor_event(
    event_id: int,
    confirm: bool = Query(False, description="Must be true to soft-delete"),
    user: SentryUser = Depends(require_admin),
) -> dict:
    """Admin: Soft-delete a competitor event after an explicit confirmation gate."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, competitor, event_title, deleted_at FROM competitor_events WHERE id = ?",
            (event_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Event not found")

        if not confirm:
            return {
                "dry_run": True,
                "event_id": event_id,
                "competitor": row["competitor"],
                "event_title": row["event_title"],
                "message": "Add confirm=true to soft-delete this competitor event.",
            }

        deleted_at = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "UPDATE competitor_events SET deleted_at = ? WHERE id = ?",
            (deleted_at, event_id),
        )
        log_mutation(
            conn=conn,
            user=user,
            action="soft_delete",
            entity_type="competitor_event",
            entity_id=str(event_id),
            old_value={
                "deleted_at": row["deleted_at"],
                "competitor": row["competitor"],
                "event_title": row["event_title"],
            },
            new_value={"deleted_at": deleted_at},
            metadata={"confirm": True},
        )
        conn.commit()

    return {
        "success": True,
        "action": "soft_delete",
        "deleted_id": event_id,
        "deleted_at": deleted_at,
        "competitor": row["competitor"],
        "event_title": row["event_title"],
    }
