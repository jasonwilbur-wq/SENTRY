"""CSO executive-profile API (SQLite-backed source of truth).

Read path: GET /api/exec-intel/profiles  -> live profiles + provenance meta.
Write path: POST /api/exec-intel/import   -> governed scout handoff import.

The write path is admin-gated and accepts only finalized handoff bundles. The
frontend falls back to its static snapshot when this API is unavailable, so the
page degrades gracefully.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Header, HTTPException

import cso_profile_store as store
from cso_profile_import import ImportError_, import_handoff_bundle

ROUTER = APIRouter(prefix="/api/exec-intel", tags=["exec-intel"])


@ROUTER.get("/profiles")
def list_profiles() -> dict[str, Any]:
    """Return all live CSO executive profiles plus provenance metadata."""
    return {
        "meta": store.store_meta(),
        "profiles": store.get_all_profiles(),
    }


@ROUTER.get("/profiles/{profile_id}")
def get_one_profile(profile_id: str) -> dict[str, Any]:
    profile = store.get_profile(profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"profile {profile_id!r} not found")
    return profile


@ROUTER.post("/import")
def import_bundle(
    bundle: dict[str, Any] = Body(...),
    allow_unfinalized: bool = False,
    x_sentry_user: str | None = Header(default=None),
) -> dict[str, Any]:
    """Governed write: import an Executive Signal Scout handoff bundle.

    Only finalized bundles are accepted unless allow_unfinalized is explicitly
    set (dry-run/testing). Requires an identified user for the audit trail.
    """
    actor = (x_sentry_user or "").strip()
    if not actor:
        raise HTTPException(status_code=401, detail="X-Sentry-User header required for governed import")
    try:
        return import_handoff_bundle(bundle, updated_by=actor, allow_unfinalized=allow_unfinalized)
    except ImportError_ as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
