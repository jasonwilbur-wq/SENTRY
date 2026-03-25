"""SENTRY Backend — Project Portfolio API routes.

GET    /api/projects                             → list all projects (includes vendors)
GET    /api/projects/{id}                        → single project detail
PATCH  /api/projects/{id}                        → update fields / phase / health
GET    /api/projects/{id}/vendors                → list vendors on a project
POST   /api/projects/{id}/vendors                → add a vendor to a project
PATCH  /api/projects/{id}/vendors/{vendor_id}    → update a vendor entry
DELETE /api/projects/{id}/vendors/{vendor_id}    → remove a vendor entry
"""
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from database import get_connection
from models import (
    ComplianceEntry, NdaEntry,
    ProjectOut, ProjectsResponse, ProjectUpdate,
    ProjectVendor, ProjectVendorCreate, ProjectVendorUpdate,
)

ROUTER = APIRouter(prefix="/api/projects", tags=["projects"])

# ── Phase index look-up ───────────────────────────────────────────────────────
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
    if key in _PHASE_MAP:
        return _PHASE_MAP[key]
    for token, idx in _PHASE_MAP.items():
        if token in key:
            return idx
    return 1


def _parse_compliance_list(raw: str | None) -> list[ComplianceEntry]:
    """Parse a JSON column into a list of ComplianceEntry objects."""
    try:
        entries = json.loads(raw or "[]")
        return [
            ComplianceEntry(**e) if isinstance(e, dict) else ComplianceEntry(number=str(e))
            for e in entries
        ]
    except Exception:
        return []


def _fetch_vendors(conn, project_id: str) -> list[ProjectVendor]:
    """Fetch all vendor entries for a project, ordered by status then name."""
    rows = conn.execute(
        """
        SELECT id, project_id, vendor_name, vendor_id, role, status, notes, added_at, updated_at
        FROM project_vendors
        WHERE project_id = ?
        ORDER BY
            CASE status
                WHEN 'active'     THEN 0
                WHEN 'evaluating' THEN 1
                WHEN 'inactive'   THEN 2
                WHEN 'removed'    THEN 3
                ELSE 4
            END,
            vendor_name
        """,
        (project_id,),
    ).fetchall()
    return [
        ProjectVendor(
            id=r["id"],
            project_id=r["project_id"],
            vendor_name=r["vendor_name"],
            vendor_id=r["vendor_id"] or "",
            role=r["role"] or "Vendor",
            status=r["status"] or "active",
            notes=r["notes"] or "",
            added_at=r["added_at"] or "",
            updated_at=r["updated_at"] or "",
        )
        for r in rows
    ]


def _row_to_project(row, vendors: list[ProjectVendor] | None = None) -> ProjectOut:
    """Convert a sqlite3.Row to ProjectOut, parsing JSON columns."""
    d = dict(row)
    try:
        nda_raw = json.loads(d.get("nda_numbers") or "[]")
        nda_entries = [
            NdaEntry(**n) if isinstance(n, dict) else NdaEntry(nda_number=str(n), vendor="")
            for n in nda_raw
        ]
    except Exception:
        nda_entries = []

    apm_entries  = _parse_compliance_list(d.get("apm_entries"))
    erpa_entries = _parse_compliance_list(d.get("erpa_entries"))
    ssp_entries  = _parse_compliance_list(d.get("ssp_entries"))

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
        apm_entries=apm_entries,
        erpa_entries=erpa_entries,
        ssp_entries=ssp_entries,
        compliance_notes=d.get("compliance_notes") or "",
        exit_reason=d.get("exit_reason") or "",
        phase_history=phase_history,
        vendors=vendors or [],
    )


# ── GET /api/projects ─────────────────────────────────────────────────────────

@ROUTER.get("", response_model=ProjectsResponse)
def list_projects():
    """Return all projects sorted by est_phase_index desc, then project_id."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM projects ORDER BY est_phase_index DESC, project_id"
        ).fetchall()
        # Fetch all vendor entries in one query and group by project_id
        vendor_rows = conn.execute(
            """
            SELECT id, project_id, vendor_name, vendor_id, role, status, notes, added_at, updated_at
            FROM project_vendors
            ORDER BY project_id,
                CASE status
                    WHEN 'active'     THEN 0
                    WHEN 'evaluating' THEN 1
                    WHEN 'inactive'   THEN 2
                    WHEN 'removed'    THEN 3
                    ELSE 4
                END,
                vendor_name
            """
        ).fetchall()

    # Group vendors by project_id
    vendor_map: dict[str, list[ProjectVendor]] = {}
    for vr in vendor_rows:
        pid = vr["project_id"]
        if pid not in vendor_map:
            vendor_map[pid] = []
        vendor_map[pid].append(ProjectVendor(
            id=vr["id"],
            project_id=vr["project_id"],
            vendor_name=vr["vendor_name"],
            vendor_id=vr["vendor_id"] or "",
            role=vr["role"] or "Vendor",
            status=vr["status"] or "active",
            notes=vr["notes"] or "",
            added_at=vr["added_at"] or "",
            updated_at=vr["updated_at"] or "",
        ))

    projects = [_row_to_project(r, vendor_map.get(dict(r)["project_id"], [])) for r in rows]
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
        vendors = _fetch_vendors(conn, project_id)
    return _row_to_project(row, vendors)


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

        if "nda_numbers" in data:
            updates["nda_numbers"] = json.dumps(
                [n.model_dump() for n in data["nda_numbers"]]
            )
        for list_field in ("apm_entries", "erpa_entries", "ssp_entries"):
            if list_field in data:
                updates[list_field] = json.dumps(
                    [e.model_dump() for e in data[list_field]]
                )
        for field in (
            "project_name", "compliance_notes", "exit_reason", "health",
            "lifecycle_state", "current_phase", "est_phase_index",
            "progress_pct", "next_milestone", "next_due_date",
            "blockers_count", "last_update_by",
        ):
            if field in data:
                updates[field] = data[field]

        if updates:
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
        vendors = _fetch_vendors(conn, project_id)
    return _row_to_project(updated, vendors)


# ── DELETE /api/projects/{project_id} ───────────────────────────────────────

@ROUTER.delete("/{project_id}", status_code=204)
def delete_project(project_id: str):
    """Permanently delete a project and all its vendor entries (CASCADE)."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT 1 FROM projects WHERE project_id = ?", (project_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
        conn.execute("DELETE FROM projects WHERE project_id = ?", (project_id,))
        conn.commit()


# ── GET /api/projects/{project_id}/vendors ────────────────────────────────────

@ROUTER.get("/{project_id}/vendors", response_model=list[ProjectVendor])
def list_project_vendors(project_id: str):
    """Return all vendor entries for a project."""
    with get_connection() as conn:
        exists = conn.execute(
            "SELECT 1 FROM projects WHERE project_id = ?", (project_id,)
        ).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
        return _fetch_vendors(conn, project_id)


# ── POST /api/projects/{project_id}/vendors ───────────────────────────────────

@ROUTER.post("/{project_id}/vendors", response_model=ProjectVendor, status_code=201)
def add_project_vendor(project_id: str, body: ProjectVendorCreate):
    """Add a vendor to a project."""
    with get_connection() as conn:
        exists = conn.execute(
            "SELECT 1 FROM projects WHERE project_id = ?", (project_id,)
        ).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

        entry_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """
            INSERT INTO project_vendors
                (id, project_id, vendor_name, vendor_id, role, status, notes, added_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (entry_id, project_id, body.vendor_name, body.vendor_id,
             body.role, body.status, body.notes, now, now),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM project_vendors WHERE id = ?", (entry_id,)
        ).fetchone()

    return ProjectVendor(
        id=row["id"], project_id=row["project_id"],
        vendor_name=row["vendor_name"], vendor_id=row["vendor_id"] or "",
        role=row["role"] or "Vendor", status=row["status"] or "active",
        notes=row["notes"] or "", added_at=row["added_at"] or "",
        updated_at=row["updated_at"] or "",
    )


# ── PATCH /api/projects/{project_id}/vendors/{entry_id} ──────────────────────

@ROUTER.patch("/{project_id}/vendors/{entry_id}", response_model=ProjectVendor)
def update_project_vendor(project_id: str, entry_id: str, body: ProjectVendorUpdate):
    """Update a vendor entry on a project."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM project_vendors WHERE id = ? AND project_id = ?",
            (entry_id, project_id),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Vendor entry not found")

        data = body.model_dump(exclude_none=True)
        if not data:
            return ProjectVendor(**dict(row))

        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in data)
        conn.execute(
            f"UPDATE project_vendors SET {set_clause} WHERE id = ?",
            (*data.values(), entry_id),
        )
        conn.commit()
        updated = conn.execute(
            "SELECT * FROM project_vendors WHERE id = ?", (entry_id,)
        ).fetchone()

    return ProjectVendor(
        id=updated["id"], project_id=updated["project_id"],
        vendor_name=updated["vendor_name"], vendor_id=updated["vendor_id"] or "",
        role=updated["role"] or "Vendor", status=updated["status"] or "active",
        notes=updated["notes"] or "", added_at=updated["added_at"] or "",
        updated_at=updated["updated_at"] or "",
    )


# ── DELETE /api/projects/{project_id}/vendors/{entry_id} ─────────────────────

@ROUTER.delete("/{project_id}/vendors/{entry_id}", status_code=204)
def remove_project_vendor(project_id: str, entry_id: str):
    """Remove a vendor from a project."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT 1 FROM project_vendors WHERE id = ? AND project_id = ?",
            (entry_id, project_id),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Vendor entry not found")
        conn.execute("DELETE FROM project_vendors WHERE id = ?", (entry_id,))
        conn.commit()