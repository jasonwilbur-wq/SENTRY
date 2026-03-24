"""SENTRY Backend — Project Portfolio API routes.

GET  /api/projects          → list all projects with compliance metadata
GET  /api/projects/{id}     → single project detail
PATCH /api/projects/{id}   → update compliance fields / phase / health
"""
import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from database import get_connection
from models import ProjectOut, ProjectsResponse, ProjectUpdate, NdaEntry

ROUTER = APIRouter(prefix="/api/projects", tags=["projects"])

# ── Phase index look-up (normalized phase label → EST phase 1-8) ──────────────
_PHASE_MAP: dict[str, int] = {
    "intake":               1,
    "var":                  1,
    "vendor assessment":    1,
    "vendor engagement":    2,
    "nda":                  3,
    "nda & legal":          3,
    "legal":                3,
    "rom":                  4,
    "technical assessment": 4,
    "rom & technical":      4,
    "lab testing":          5,
    "lab":                  5,
    "apm":                  6,
    "erpa":                 6,
    "ssp":                  6,
    "apm / erpa / ssp":     6,
    "pilot":                7,
    "lao":                  7,
    "bau":                  8,
    "program":              8,
    "completed":            8,
    "ended":                8,
}


def _phase_index(label: str) -> int:
    """Map a free-text phase label to EST phase number 1-8."""
    key = label.strip().lower()
    # exact match first
    if key in _PHASE_MAP:
        return _PHASE_MAP[key]
    # substring scan
    for token, idx in _PHASE_MAP.items():
        if token in key:
            return idx
    return 1


def _row_to_project(row) -> ProjectOut:
    """Convert a sqlite3.Row to ProjectOut, parsing JSON columns."""
    d = dict(row)
    # Parse JSON-stored arrays
    try:
        nda_raw = json.loads(d.get("nda_numbers") or "[]")
        nda_entries = [NdaEntry(**n) if isinstance(n, dict) else NdaEntry(nda_number=str(n), vendor="") for n in nda_raw]
    except Exception:
        nda_entries = []

    try:
        phase_history = json.loads(d.get("phase_history") or "[]")
    except Exception:
        phase_history = []

    return ProjectOut(
        project_id=d["project_id"],
        project_name=d["project_name"],
        summary=d.get("summary") or "",
        managing_unit=d.get("managing_unit") or "",
        lifecycle_state=d.get("lifecycle_state") or "active",
        health=d.get("health") or "green",
        current_phase=d.get("current_phase") or "Intake",
        est_phase_index=d.get("est_phase_index") or _phase_index(d.get("current_phase") or ""),
        risk_score=d.get("risk_score") or 0,
        sensitivity=d.get("sensitivity") or "internal",
        tags=d.get("tags") or "",
        progress_pct=d.get("progress_pct") or 0,
        next_milestone=d.get("next_milestone") or "",
        next_due_date=d.get("next_due_date") or "",
        blockers_count=d.get("blockers_count") or 0,
        last_update_at=d.get("last_update_at") or "",
        last_update_by=d.get("last_update_by") or "",
        est_cost=d.get("est_cost") or "",
        business_owner=d.get("business_owner") or "",
        nda_numbers=nda_entries,
        erpa_number=d.get("erpa_number") or "",
        erpa_status=d.get("erpa_status") or "not_started",
        apm_number=d.get("apm_number") or "",
        apm_status=d.get("apm_status") or "not_started",
        ssp_number=d.get("ssp_number") or "",
        ssp_status=d.get("ssp_status") or "not_started",
        compliance_notes=d.get("compliance_notes") or "",
        phase_history=phase_history,
    )


# ── GET /api/projects ─────────────────────────────────────────────────────────

@ROUTER.get("", response_model=ProjectsResponse)
def list_projects():
    """Return all projects sorted by est_phase_index desc, then project_id."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM projects ORDER BY est_phase_index DESC, project_id"
        ).fetchall()
    projects = [_row_to_project(r) for r in rows]
    return ProjectsResponse(total=len(projects), projects=projects)


# ── GET /api/projects/{project_id} ───────────────────────────────────────────

@ROUTER.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM projects WHERE project_id = ?", (project_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    return _row_to_project(row)


# ── PATCH /api/projects/{project_id} ─────────────────────────────────────────

@ROUTER.patch("/{project_id}", response_model=ProjectOut)
def update_project(project_id: str, body: ProjectUpdate):
    """Partial update — only supplied fields are written."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM projects WHERE project_id = ?", (project_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

        updates: dict[str, object] = {}
        data = body.model_dump(exclude_none=True)

        # Serialize list/complex fields to JSON
        if "nda_numbers" in data:
            updates["nda_numbers"] = json.dumps(
                [n.model_dump() for n in data["nda_numbers"]]
            )
        for field in ("erpa_number", "erpa_status", "apm_number", "apm_status",
                      "ssp_number", "ssp_status", "compliance_notes",
                      "health", "lifecycle_state", "current_phase",
                      "est_phase_index", "progress_pct", "next_milestone",
                      "next_due_date", "blockers_count", "last_update_by"):
            if field in data:
                updates[field] = data[field]

        if not updates:
            return _row_to_project(row)

        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        conn.execute(
            f"UPDATE projects SET {set_clause} WHERE project_id = ?",
            (*updates.values(), project_id),
        )
        conn.commit()

        updated = conn.execute(
            "SELECT * FROM projects WHERE project_id = ?", (project_id,)
        ).fetchone()
    return _row_to_project(updated)
