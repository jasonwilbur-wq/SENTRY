"""SENTRY Backend — Service Request Routes.

Handles assessment and lab-visit form submissions with real persistence,
secured request lookup, admin triage queue, and controlled status transitions.

Routes:
    POST  /api/assessment                      — submit an assessment request
    POST  /api/lab-visit                       — submit a lab visit request
    GET   /api/requests/{ref_id}               — look up own request (or any if admin)
    GET   /api/admin/requests                  — admin queue with filtering
    PATCH /api/admin/requests/{ref_id}/status   — admin status transition
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from auth import get_current_user, require_admin, SentryUser, AUTH_MODE
from audit import log_mutation
from database import get_connection
from models import (
    AssessmentRequest,
    FormResponse,
    LabVisitRequest,
    ServiceRequestListResponse,
    ServiceRequestOut,
    ServiceRequestSummary,
    StatusUpdateRequest,
)

router = APIRouter()

# ── Constants ─────────────────────────────────────────────────────────────────

VALID_ASSESSMENT_TYPES = {
    "vendor_initial", "grc_review", "architecture_review", "pen_test",
}

VALID_URGENCY = {"low", "normal", "high", "critical"}

VALID_STATUSES = {"SUBMITTED", "TRIAGE_PENDING", "IN_REVIEW", "CLOSED"}

# Allowed transitions — key is current status, value is set of allowed next statuses.
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "SUBMITTED":       {"TRIAGE_PENDING", "IN_REVIEW", "CLOSED"},
    "TRIAGE_PENDING":  {"IN_REVIEW", "CLOSED"},
    "IN_REVIEW":       {"TRIAGE_PENDING", "CLOSED"},
    "CLOSED":          {"SUBMITTED"},  # re-open
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _resolve_user(request: Request) -> SentryUser | None:
    """Get the current user without raising on missing identity.

    In auth_mode=header with no header, returns None (graceful).
    Submission routes accept unauthenticated users (recorded as 'anonymous').
    """
    if AUTH_MODE == "off":
        return SentryUser(id="anonymous", role="admin")
    try:
        return get_current_user(request)
    except HTTPException:
        return None


def _generate_ref(prefix: str) -> str:
    """Generate a unique, human-readable reference ID."""
    return f"SENTRY-{prefix}-{uuid.uuid4().hex[:8].upper()}"


def _persist_request(
    request_type: str,
    ref_id: str,
    user_id: str,
    contact_name: str,
    contact_email: str,
    notes: str,
    **extra_fields: str | int | None,
) -> dict:
    """Insert a service request row and audit it. Returns the row as dict."""
    row_id = str(uuid.uuid4())

    base_cols = [
        "id", "ref_id", "request_type", "status", "created_by",
        "contact_name", "contact_email", "notes",
    ]
    base_vals: list[str | int | None] = [
        row_id, ref_id, request_type, "SUBMITTED", user_id,
        contact_name, contact_email, notes,
    ]

    for col, val in extra_fields.items():
        if val is not None and val != "":
            base_cols.append(col)
            base_vals.append(val)

    placeholders = ", ".join("?" for _ in base_cols)
    col_list = ", ".join(base_cols)

    with get_connection() as conn:
        conn.execute(
            f"INSERT INTO service_requests ({col_list}) VALUES ({placeholders})",
            base_vals,
        )

        audit_user = SentryUser(id=user_id, role="user")
        log_mutation(
            conn=conn,
            user=audit_user,
            action="create",
            entity_type="service_request",
            entity_id=ref_id,
            new_value={
                "request_type": request_type,
                "contact_name": contact_name,
                "contact_email": contact_email,
                **{k: v for k, v in extra_fields.items() if v},
            },
        )
        conn.commit()

    return {"id": row_id, "ref_id": ref_id, "status": "SUBMITTED"}


# ── POST /api/assessment ──────────────────────────────────────────────────────

@router.post("/api/assessment", response_model=FormResponse)
def submit_assessment(body: AssessmentRequest, request: Request):
    """Persist a security assessment request."""
    if body.assessment_type not in VALID_ASSESSMENT_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid assessment_type '{body.assessment_type}'. "
                   f"Must be one of: {', '.join(sorted(VALID_ASSESSMENT_TYPES))}",
        )

    if body.urgency and body.urgency not in VALID_URGENCY:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid urgency '{body.urgency}'. "
                   f"Must be one of: {', '.join(sorted(VALID_URGENCY))}",
        )

    user = _resolve_user(request)
    user_id = user.id if user else "anonymous"
    ref_id = _generate_ref("ASM")

    result = _persist_request(
        request_type="assessment",
        ref_id=ref_id,
        user_id=user_id,
        contact_name=body.contact_name,
        contact_email=body.contact_email,
        notes=body.notes,
        vendor_name=body.vendor_name,
        assessment_type=body.assessment_type,
        category=body.category or None,
        urgency=body.urgency,
    )

    return FormResponse(
        success=True,
        ref_id=result["ref_id"],
        message="Assessment request submitted and saved.",
        status=result["status"],
    )


# ── POST /api/lab-visit ──────────────────────────────────────────────────────

@router.post("/api/lab-visit", response_model=FormResponse)
def submit_lab_visit(body: LabVisitRequest, request: Request):
    """Persist a lab visit request."""
    if body.attendees < 1 or body.attendees > 20:
        raise HTTPException(
            status_code=422,
            detail="Attendees must be between 1 and 20.",
        )

    user = _resolve_user(request)
    user_id = user.id if user else "anonymous"
    ref_id = _generate_ref("LAB")

    result = _persist_request(
        request_type="lab_visit",
        ref_id=ref_id,
        user_id=user_id,
        contact_name=body.contact_name,
        contact_email=body.contact_email,
        notes=body.notes,
        preferred_date=body.preferred_date,
        preferred_slot=body.preferred_slot,
        equipment=body.equipment or None,
        attendees=body.attendees,
    )

    return FormResponse(
        success=True,
        ref_id=result["ref_id"],
        message="Lab visit request submitted and saved.",
        status=result["status"],
    )


# ── GET /api/requests/{ref_id} — secured lookup ──────────────────────────────

@router.get("/api/requests/{ref_id}", response_model=ServiceRequestOut)
def get_request(ref_id: str, user: SentryUser = Depends(get_current_user)):
    """Look up a service request by reference ID.

    Access rules:
      - Admin users can view any request.
      - Non-admin users can view only requests they created.
      - Returns 404 for unauthorized lookups (avoids leaking existence).
    """
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM service_requests WHERE ref_id = ?",
            (ref_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Request not found.")

    record = dict(row)

    # Non-admin can only see their own requests
    if not user.is_admin and record["created_by"] != user.id:
        # Return 404 to avoid leaking that the ref_id exists
        raise HTTPException(status_code=404, detail="Request not found.")

    return ServiceRequestOut(**record)


# ── GET /api/admin/requests — admin triage queue ─────────────────────────────

@router.get(
    "/api/admin/requests",
    response_model=ServiceRequestListResponse,
)
def list_requests(
    status: str | None = Query(None, description="Filter by status"),
    request_type: str | None = Query(None, description="Filter by request type"),
    user: SentryUser = Depends(require_admin),
):
    """Admin queue: list all service requests with optional filtering.

    Sorted by newest first. Returns summary rows (no PII email fields)
    to keep the listing lightweight.
    """
    clauses: list[str] = []
    params: list[str] = []

    if status:
        status_upper = status.upper()
        if status_upper not in VALID_STATUSES:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid status filter '{status}'. "
                       f"Must be one of: {', '.join(sorted(VALID_STATUSES))}",
            )
        clauses.append("status = ?")
        params.append(status_upper)

    if request_type:
        if request_type not in ("assessment", "lab_visit"):
            raise HTTPException(
                status_code=422,
                detail=f"Invalid request_type filter '{request_type}'. "
                       f"Must be 'assessment' or 'lab_visit'.",
            )
        clauses.append("request_type = ?")
        params.append(request_type)

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    with get_connection() as conn:
        rows = conn.execute(
            f"SELECT ref_id, request_type, status, created_by, created_at, "
            f"updated_at, contact_name, urgency, vendor_name "
            f"FROM service_requests {where} "
            f"ORDER BY created_at DESC",
            params,
        ).fetchall()

    summaries = [ServiceRequestSummary(**dict(r)) for r in rows]
    return ServiceRequestListResponse(total=len(summaries), requests=summaries)


# ── PATCH /api/admin/requests/{ref_id}/status — triage status update ─────────

@router.patch("/api/admin/requests/{ref_id}/status")
def update_request_status(
    ref_id: str,
    body: StatusUpdateRequest,
    user: SentryUser = Depends(require_admin),
):
    """Transition a request's status. Admin-only, audited.

    Valid lifecycle: SUBMITTED → TRIAGE_PENDING → IN_REVIEW → CLOSED.
    CLOSED can be re-opened back to SUBMITTED.
    """
    new_status = body.status.upper()

    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{body.status}'. "
                   f"Must be one of: {', '.join(sorted(VALID_STATUSES))}",
        )

    now = datetime.now(timezone.utc).isoformat()

    with get_connection() as conn:
        row = conn.execute(
            "SELECT ref_id, status FROM service_requests WHERE ref_id = ?",
            (ref_id,),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Request not found.")

        old_status = row["status"]

        if new_status == old_status:
            raise HTTPException(
                status_code=422,
                detail=f"Request is already in status '{old_status}'.",
            )

        allowed_next = ALLOWED_TRANSITIONS.get(old_status, set())
        if new_status not in allowed_next:
            raise HTTPException(
                status_code=422,
                detail=f"Cannot transition from '{old_status}' to '{new_status}'. "
                       f"Allowed: {', '.join(sorted(allowed_next)) or 'none'}.",
            )

        conn.execute(
            "UPDATE service_requests "
            "SET status = ?, updated_at = ?, updated_by = ?, status_note = ? "
            "WHERE ref_id = ?",
            (new_status, now, user.id, body.note, ref_id),
        )

        log_mutation(
            conn=conn,
            user=user,
            action="status_change",
            entity_type="service_request",
            entity_id=ref_id,
            old_value={"status": old_status},
            new_value={"status": new_status, "note": body.note},
        )
        conn.commit()

    return {
        "ref_id": ref_id,
        "old_status": old_status,
        "new_status": new_status,
        "updated_by": user.id,
        "updated_at": now,
    }
