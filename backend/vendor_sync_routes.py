"""Admin routes for syncing vendor directory against canonical assessment library."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from cache import clear_all
from database import get_connection
from sync_vendor_directory import (
    DB_PATH,
    DEFAULT_ROOT,
    backup_db,
    find_noncanonical_vendors,
    load_canonical_keys,
    fetch_vendors,
    delete_vendors,
)


router = APIRouter(prefix="/api/admin/vendor-sync", tags=["admin", "vendor-sync"])


class VendorSyncRequest(BaseModel):
    apply: bool = False
    backup: bool = True
    sample_limit: int = Field(default=30, ge=1, le=200)
    root_path: str | None = None


class VendorSyncResponse(BaseModel):
    apply: bool
    root_path: str
    db_vendors_total: int
    canonical_vendor_keys: int
    vendors_out_of_sync: int
    sample_removals: list[str]
    backup_path: str = ""
    deleted_vendors: int = 0
    deleted_var_reports: int = 0
    deleted_highlights: int = 0


def _resolve_root(path_override: str | None) -> Path:
    if path_override:
        return Path(path_override)
    return DEFAULT_ROOT


@router.post("", response_model=VendorSyncResponse)
def run_vendor_sync(req: VendorSyncRequest) -> VendorSyncResponse:
    root = _resolve_root(req.root_path)

    try:
        canonical_keys = load_canonical_keys(root)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    conn = get_connection()
    try:
        vendors = fetch_vendors(conn)
        to_remove = find_noncanonical_vendors(vendors, canonical_keys)

        response = VendorSyncResponse(
            apply=req.apply,
            root_path=str(root),
            db_vendors_total=len(vendors),
            canonical_vendor_keys=len(canonical_keys),
            vendors_out_of_sync=len(to_remove),
            sample_removals=[v.company_name for v in to_remove[: req.sample_limit]],
        )

        if not req.apply:
            return response

        if req.backup:
            response.backup_path = str(backup_db(DB_PATH))

        vendor_ids = [v.vendor_id for v in to_remove]
        deleted_vendors, deleted_var, deleted_highlights = delete_vendors(conn, vendor_ids)
        conn.commit()

        response.deleted_vendors = deleted_vendors
        response.deleted_var_reports = deleted_var
        response.deleted_highlights = deleted_highlights

        # Clear cached category/stats/views after mutation.
        clear_all()

        return response
    finally:
        conn.close()
