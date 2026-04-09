"""SENTRY CSO Briefing Pipeline — Route handlers.

Thin routing layer.  All business logic, models, and DB access live in
cso_brief_helpers.py so this file stays under the 600-line budget.

Endpoints:
  POST   /api/cso-briefs/generate           — create a DRAFT brief
  GET    /api/cso-briefs/{brief_id}         — retrieve brief + items
  PATCH  /api/cso-briefs/{brief_id}         — edit brief metadata
  PATCH  /api/cso-briefs/{brief_id}/items/{item_id} — edit item
  POST   /api/cso-briefs/{brief_id}/validate — run quality gate
"""
from __future__ import annotations

import json
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth import SentryUser, get_current_user
from database import get_connection
from cso_brief_helpers import (
    MAX_ITEMS_CAP,
    MAX_ITEMS_DEFAULT,
    BriefItemOut,
    BriefOut,
    GenerateRequest,
    GenerateResponse,
    PatchBriefRequest,
    PatchItemRequest,
    ValidateResponse,
    Violation,
    confidence_from_score,
    count_candidates,
    create_brief_items,
    create_brief_row,
    fetch_brief,
    fetch_brief_item,
    fetch_brief_items,
    fetch_candidate_events,
    log_brief_audit,
    require_brief_editable,
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

        items = fetch_brief_items(conn, brief_id)
        included = [i for i in items if i.get("include_in_summary") == 1]

        violations: list[Violation] = []

        # ── Brief-level checks ─────────────────────────────────────────
        if not (brief_row.get("executive_summary") or "").strip():
            violations.append(Violation(
                code="MISSING_EXECUTIVE_SUMMARY",
                message="Brief executive_summary is required",
                field="executive_summary",
            ))

        # ── Item-level checks (from frozen_payload + item fields) ──────
        for item in included:
            fp = item.get("frozen_payload", {})
            iid = item["id"]

            # source_link
            src = (fp.get("source_link") or "").strip()
            if not src:
                violations.append(Violation(
                    code="MISSING_SOURCE_LINK",
                    message="Item source_link is required",
                    item_id=iid,
                    field="source_link",
                ))
            elif not (src.startswith("http://") or src.startswith("https://")):
                violations.append(Violation(
                    code="INVALID_SOURCE_LINK",
                    message="source_link must start with http:// or https://",
                    item_id=iid,
                    field="source_link",
                ))

            # rationale: why_walmart_cares OR walmart_actionability_context
            why = (fp.get("why_walmart_cares") or "").strip()
            act = (fp.get("walmart_actionability_context") or "").strip()
            if not why and not act:
                violations.append(Violation(
                    code="MISSING_RATIONALE",
                    message="why_walmart_cares or walmart_actionability_context required",
                    item_id=iid,
                    field="why_walmart_cares",
                ))

            # owner_assignment (item-level analyst field)
            if not (item.get("owner_assignment") or "").strip():
                violations.append(Violation(
                    code="MISSING_OWNER_ASSIGNMENT",
                    message="owner_assignment is required for included items",
                    item_id=iid,
                    field="owner_assignment",
                ))

            # confidence: confidence_level present OR mapped from score
            conf = (fp.get("confidence_level") or "").strip()
            if not conf:
                conf = confidence_from_score(fp.get("confidence_score"))
            if not conf:
                violations.append(Violation(
                    code="MISSING_CONFIDENCE",
                    message="confidence_level or mappable confidence_score required",
                    item_id=iid,
                    field="confidence_level",
                ))

        now = utcnow_iso()
        result = ValidateResponse(
            passed=len(violations) == 0,
            violations=violations,
            checked_at=now,
            included_item_count=len(included),
        )

        result_json = result.model_dump_json()
        conn.execute(
            "UPDATE cso_briefs SET quality_gate_result = ?, updated_at = ?, updated_by = ? WHERE id = ?",
            (result_json, now, user.id, brief_id),
        )

        log_brief_audit(
            conn,
            brief_id=brief_id,
            action="validate",
            actor_id=user.id,
            new_value=result_json,
        )
        conn.commit()
    finally:
        conn.close()

    return result
