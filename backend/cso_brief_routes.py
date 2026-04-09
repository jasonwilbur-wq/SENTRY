"""SENTRY CSO Briefing Pipeline — Route handlers.

Thin routing layer.  All business logic, models, and DB access live in
cso_brief_helpers.py so this file stays under the 600-line budget.

Endpoints:
  POST   /api/cso-briefs/generate                   — create a DRAFT brief
  GET    /api/cso-briefs/{brief_id}                  — retrieve brief + items
  PATCH  /api/cso-briefs/{brief_id}                  — edit brief metadata
  PATCH  /api/cso-briefs/{brief_id}/items/{item_id}  — edit item
  POST   /api/cso-briefs/{brief_id}/validate         — run quality gate
  POST   /api/cso-briefs/{brief_id}/transition       — state machine transition
  GET    /api/cso-briefs/{brief_id}/snapshot          — read-only draft payload
  GET    /api/cso-briefs/{brief_id}/audit             — paginated audit trail
"""
from __future__ import annotations

import json
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth import SentryUser, get_current_user
from database import get_connection
from cso_brief_helpers import (
    ALLOWED_TRANSITIONS,
    AUDIT_DEFAULT_LIMIT,
    AUDIT_MAX_LIMIT,
    MAX_ITEMS_CAP,
    MAX_ITEMS_DEFAULT,
    AuditEntryOut,
    AuditListResponse,
    BriefItemOut,
    BriefOut,
    GenerateRequest,
    GenerateResponse,
    PatchBriefRequest,
    PatchItemRequest,
    SnapshotResponse,
    TransitionRequest,
    TransitionResponse,
    ValidateResponse,
    Violation,
    build_snapshot_item,
    confidence_from_score,
    count_audit_entries,
    count_candidates,
    create_brief_items,
    create_brief_row,
    fetch_audit_entries,
    fetch_brief,
    fetch_brief_item,
    fetch_brief_items,
    fetch_candidate_events,
    log_brief_audit,
    require_brief_editable,
    run_validation,
    serialize_brief,
    utcnow_iso,
)

ROUTER = APIRouter(prefix="/api/cso-briefs", tags=["cso-briefs"])


# ── Generate ──────────────────────────────────────────────────────────────────

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
        events = fetch_candidate_events(
            conn,
            date_from=filters.date_from,
            date_to=filters.date_to,
            competitors=filters.competitor,
            max_items=max_items,
        )
        candidate_count = count_candidates(
            conn,
            date_from=filters.date_from,
            date_to=filters.date_to,
            competitors=filters.competitor,
        )

        brief_id = str(uuid.uuid4())
        now = utcnow_iso()

        create_brief_row(
            conn,
            brief_id=brief_id,
            title=body.title,
            period_start=body.period_start,
            period_end=body.period_end,
            user_id=user.id,
            now=now,
        )

        items = create_brief_items(conn, brief_id=brief_id, events=events)

        log_brief_audit(
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
        brief_row = fetch_brief(conn, brief_id)
    finally:
        conn.close()

    assert brief_row is not None
    return GenerateResponse(
        brief=serialize_brief(brief_row, items),
        included_count=len(events),
        candidate_count=candidate_count,
    )


# ── Get ───────────────────────────────────────────────────────────────────────

@ROUTER.get("/{brief_id}", response_model=BriefOut)
def get_brief(
    brief_id: str,
    user: SentryUser = Depends(get_current_user),
) -> BriefOut:
    """Retrieve a CSO brief with ordered items."""
    conn = get_connection()
    try:
        brief_row = fetch_brief(conn, brief_id)
        if not brief_row:
            raise HTTPException(status_code=404, detail="Brief not found")
        items = fetch_brief_items(conn, brief_id)
    finally:
        conn.close()

    return serialize_brief(brief_row, items)


# ── Patch brief metadata ─────────────────────────────────────────────────────

@ROUTER.patch("/{brief_id}", response_model=BriefOut)
def patch_brief(
    brief_id: str,
    body: PatchBriefRequest,
    user: SentryUser = Depends(get_current_user),
) -> BriefOut:
    """Edit brief metadata (executive_summary, review_notes).

    Only allowed in DRAFT or IN_REVIEW states.
    """
    conn = get_connection()
    try:
        brief_row = fetch_brief(conn, brief_id)
        if not brief_row:
            raise HTTPException(status_code=404, detail="Brief not found")
        require_brief_editable(brief_row)

        old_vals: dict[str, str] = {}
        updates: dict[str, str] = {}

        if body.executive_summary is not None:
            old_vals["executive_summary"] = brief_row.get("executive_summary", "")
            updates["executive_summary"] = body.executive_summary
        if body.review_notes is not None:
            old_vals["review_notes"] = brief_row.get("review_notes", "")
            updates["review_notes"] = body.review_notes

        if not updates:
            items = fetch_brief_items(conn, brief_id)
            return serialize_brief(brief_row, items)

        now = utcnow_iso()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        params = list(updates.values()) + [now, user.id, brief_id]
        conn.execute(
            f"UPDATE cso_briefs SET {set_clause}, updated_at = ?, updated_by = ? WHERE id = ?",
            params,
        )

        log_brief_audit(
            conn,
            brief_id=brief_id,
            action="edit_brief",
            actor_id=user.id,
            old_value=json.dumps(old_vals),
            new_value=json.dumps(updates),
        )
        conn.commit()

        brief_row = fetch_brief(conn, brief_id)
        items = fetch_brief_items(conn, brief_id)
    finally:
        conn.close()

    assert brief_row is not None
    return serialize_brief(brief_row, items)


# ── Patch item ────────────────────────────────────────────────────────────────

@ROUTER.patch("/{brief_id}/items/{item_id}", response_model=BriefItemOut)
def patch_item(
    brief_id: str,
    item_id: str,
    body: PatchItemRequest,
    user: SentryUser = Depends(get_current_user),
) -> BriefItemOut:
    """Edit a brief item's analyst fields.

    Only allowed in DRAFT or IN_REVIEW states.
    frozen_payload is never mutated.
    """
    conn = get_connection()
    try:
        brief_row = fetch_brief(conn, brief_id)
        if not brief_row:
            raise HTTPException(status_code=404, detail="Brief not found")
        require_brief_editable(brief_row)

        item_row = fetch_brief_item(conn, brief_id, item_id)
        if not item_row:
            raise HTTPException(status_code=404, detail="Item not found")

        old_vals: dict[str, Any] = {}
        updates: dict[str, Any] = {}

        for field in ("rank", "analyst_commentary", "uncertainty_note",
                      "owner_assignment", "include_in_summary"):
            val = getattr(body, field)
            if val is not None:
                old_vals[field] = item_row.get(field)
                updates[field] = val

        if not updates:
            return BriefItemOut(**item_row)

        now = utcnow_iso()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        params = list(updates.values()) + [now, item_id, brief_id]
        conn.execute(
            f"UPDATE cso_brief_items SET {set_clause}, updated_at = ? "
            f"WHERE id = ? AND brief_id = ?",
            params,
        )

        log_brief_audit(
            conn,
            brief_id=brief_id,
            action="edit_item",
            actor_id=user.id,
            old_value=json.dumps(old_vals, default=str),
            new_value=json.dumps(updates, default=str),
        )
        conn.commit()

        updated = fetch_brief_item(conn, brief_id, item_id)
    finally:
        conn.close()

    assert updated is not None
    return BriefItemOut(**updated)


# ── Validate ──────────────────────────────────────────────────────────────────

@ROUTER.post("/{brief_id}/validate", response_model=ValidateResponse)
def validate_brief(
    brief_id: str,
    user: SentryUser = Depends(get_current_user),
) -> ValidateResponse:
    """Run quality-gate checks and persist the result.

    Validates against frozen_payload (the trust anchor) and item-level
    analyst fields.  Does NOT query live competitor_events rows.
    """
    conn = get_connection()
    try:
        brief_row = fetch_brief(conn, brief_id)
        if not brief_row:
            raise HTTPException(status_code=404, detail="Brief not found")

        result = run_validation(conn, brief_row)
        result_json = result.model_dump_json()
        now = utcnow_iso()

        conn.execute(
            "UPDATE cso_briefs SET quality_gate_result = ?, updated_at = ?, updated_by = ? WHERE id = ?",
            (result_json, now, user.id, brief_id),
        )
        log_brief_audit(
            conn, brief_id=brief_id, action="validate",
            actor_id=user.id, new_value=result_json,
        )
        conn.commit()
    finally:
        conn.close()

    return result


# ── Transition ────────────────────────────────────────────────────────────────

@ROUTER.post("/{brief_id}/transition", response_model=TransitionResponse)
def transition_brief(
    brief_id: str,
    body: TransitionRequest,
    user: SentryUser = Depends(get_current_user),
) -> TransitionResponse:
    """Advance or revert a brief through the state machine.

    Allowed transitions (role):
      DRAFT → IN_REVIEW        (analyst/admin)
      IN_REVIEW → DRAFT        (analyst/admin)
      IN_REVIEW → APPROVED     (admin only — re-runs validation gate)
      APPROVED → PUBLISHED_DRAFT (admin only)
    """
    conn = get_connection()
    try:
        brief_row = fetch_brief(conn, brief_id)
        if not brief_row:
            raise HTTPException(status_code=404, detail="Brief not found")

        from_status = brief_row["status"]
        to_status = body.to_status
        key = (from_status, to_status)

        # ── Transition validity ────────────────────────────────────────
        required_role = ALLOWED_TRANSITIONS.get(key)
        if required_role is None:
            raise HTTPException(
                status_code=409,
                detail=f"Transition {from_status} → {to_status} is not allowed",
            )

        # ── Role enforcement ───────────────────────────────────────────
        if required_role == "admin" and not user.is_admin:
            raise HTTPException(
                status_code=403,
                detail=f"Admin privileges required for {from_status} → {to_status}",
            )

        # ── Approval gate: re-run validation server-side ───────────────
        validation_result: ValidateResponse | None = None
        if to_status == "APPROVED":
            validation_result = run_validation(conn, brief_row)
            if not validation_result.passed:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "message": "Validation failed — approval blocked",
                        "violations": [
                            v.model_dump() for v in validation_result.violations
                        ],
                    },
                )
            # Persist fresh quality_gate_result
            conn.execute(
                "UPDATE cso_briefs SET quality_gate_result = ? WHERE id = ?",
                (validation_result.model_dump_json(), brief_id),
            )

        # ── Apply transition ───────────────────────────────────────────
        now = utcnow_iso()
        stamp_cols: list[str] = ["status = ?", "updated_at = ?", "updated_by = ?"]
        stamp_vals: list[Any] = [to_status, now, user.id]

        if to_status == "IN_REVIEW":
            stamp_cols += ["submitted_at = ?", "submitted_by = ?"]
            stamp_vals += [now, user.id]
        elif to_status == "APPROVED":
            stamp_cols += ["approved_at = ?", "approved_by = ?"]
            stamp_vals += [now, user.id]
        elif to_status == "PUBLISHED_DRAFT":
            stamp_cols += ["published_draft_at = ?", "published_draft_by = ?"]
            stamp_vals += [now, user.id]

        stamp_vals.append(brief_id)
        conn.execute(
            f"UPDATE cso_briefs SET {', '.join(stamp_cols)} WHERE id = ?",
            stamp_vals,
        )

        log_brief_audit(
            conn, brief_id=brief_id, action="transition",
            actor_id=user.id,
            old_value=json.dumps({"status": from_status}),
            new_value=json.dumps({"status": to_status, "note": body.note}),
        )
        conn.commit()

        brief_row = fetch_brief(conn, brief_id)
        items = fetch_brief_items(conn, brief_id)
    finally:
        conn.close()

    assert brief_row is not None
    return TransitionResponse(
        brief=serialize_brief(brief_row, items),
        from_status=from_status,
        to_status=to_status,
        transitioned_by=user.id,
        validation=validation_result,
    )


# ── Snapshot ──────────────────────────────────────────────────────────────────

@ROUTER.get("/{brief_id}/snapshot", response_model=SnapshotResponse)
def get_snapshot(
    brief_id: str,
    user: SentryUser = Depends(get_current_user),
) -> SnapshotResponse:
    """Read-only draft rendering payload for CSO view.

    Renders from frozen_payload + analyst item edits.
    Does NOT mutate DB state.
    """
    conn = get_connection()
    try:
        brief_row = fetch_brief(conn, brief_id)
        if not brief_row:
            raise HTTPException(status_code=404, detail="Brief not found")
        items = fetch_brief_items(conn, brief_id)
    finally:
        conn.close()

    return SnapshotResponse(
        id=brief_row["id"],
        title=brief_row["title"],
        period_start=brief_row["period_start"],
        period_end=brief_row["period_end"],
        status=brief_row["status"],
        executive_summary=brief_row.get("executive_summary", ""),
        review_notes=brief_row.get("review_notes", ""),
        items=[build_snapshot_item(i) for i in items],
        snapshot_version=brief_row.get("snapshot_version", 1),
        generated_at=utcnow_iso(),
    )


# ── Audit trail ───────────────────────────────────────────────────────────────

@ROUTER.get("/{brief_id}/audit", response_model=AuditListResponse)
def get_audit(
    brief_id: str,
    limit: int = AUDIT_DEFAULT_LIMIT,
    offset: int = 0,
    user: SentryUser = Depends(get_current_user),
) -> AuditListResponse:
    """Paginated audit trail for a brief, newest first."""
    conn = get_connection()
    try:
        brief_row = fetch_brief(conn, brief_id)
        if not brief_row:
            raise HTTPException(status_code=404, detail="Brief not found")

        capped = min(max(limit, 1), AUDIT_MAX_LIMIT)
        entries = fetch_audit_entries(conn, brief_id, limit=capped, offset=offset)
        total = count_audit_entries(conn, brief_id)
    finally:
        conn.close()

    return AuditListResponse(
        entries=[AuditEntryOut(**e) for e in entries],
        total=total,
        limit=capped,
        offset=offset,
    )
