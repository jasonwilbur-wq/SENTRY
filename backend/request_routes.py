"""SENTRY Backend — Service Request Routes.

Handles assessment and lab-visit form submissions with real persistence.

Routes:
    POST /api/assessment       — submit an assessment request
    POST /api/lab-visit        — submit a lab visit request
    GET  /api/requests/{ref_id} — look up a request by reference ID
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request

from auth import get_current_user, SentryUser, AUTH_MODE
from audit import log_mutation
from database import get_connection
from models import (
    AssessmentRequest,
    FormResponse,
    LabVisitRequest,
    ServiceRequestOut,
)

router = APIRouter()

# ── Valid values for validation ────────────────────────────────────────────────

VALID_ASSESSMENT_TYPES = {
    "vendor_initial", "grc_review", "architecture_review", "pen_test",
}

VALID_URGENCY = {"low", "normal", "high", "critical"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _resolve_user(request: Request) -> SentryUser | None:
    """Get the current user without raising on missing identity.

    In auth_mode=header with no header, returns None (graceful).
    Routes can still accept submissions from unauthenticated users
    (recorded as 'anonymous') — matching the current app posture where
    public read endpoints don't require auth.
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

    # Build columns and values dynamically from extra_fields
    base_cols = [
        "id", "ref_id", "request_type", "status", "created_by",
        "contact_name", "contact_email", "notes",
    ]
    base_vals = [
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

        # Audit the creation
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
    # Validate assessment_type
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


# ── GET /api/requests/{ref_id} ────────────────────────────────────────────────

@router.get("/api/requests/{ref_id}", response_model=ServiceRequestOut)
def get_request(ref_id: str):
    """Look up a service request by reference ID."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM service_requests WHERE ref_id = ?",
            (ref_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"Request '{ref_id}' not found.")

    return ServiceRequestOut(**dict(row))
