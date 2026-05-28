"""Read-only Executive Signal Scout API routes.

These endpoints expose local JSON artifacts as portfolio/report views. They do
not collect web data, write to SQLite, publish reports, or schedule anything.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from executive_intel.repository import ExecutiveIntelRepository
from executive_intel.review_controls import ALLOWED_REVIEW_ONLY_ACTIVITIES, ReviewControlCode

ROUTER = APIRouter(prefix="/api/executive-intel", tags=["executive-intel"])


def _repository() -> ExecutiveIntelRepository:
    return ExecutiveIntelRepository()


@ROUTER.get("/health")
def executive_intel_health() -> dict[str, object]:
    repo = _repository()
    return {
        "status": "ok" if repo.root.exists() else "missing_data_root",
        "mode": "read_only_local_artifacts",
        "root_available": repo.root.exists(),
        "profiles_available": repo.profiles_dir.exists(),
        "sources_available": repo.sources_dir.exists(),
        "signals_available": repo.signals_dir.exists(),
        "briefs_available": repo.briefs_dir.exists(),
        "writes_enabled": False,
        "scheduler_enabled": False,
        "publication_enabled": False,
        "mandatory_review_controls": [code.value for code in ReviewControlCode],
        "allowed_review_only_activities": list(ALLOWED_REVIEW_ONLY_ACTIVITIES),
    }


@ROUTER.get("/portfolios")
def list_executive_portfolios() -> dict[str, object]:
    """List target portfolios discovered from local executive profile artifacts."""
    return _repository().list_portfolios()


@ROUTER.get("/portfolios/{profile_id}")
def get_executive_portfolio(profile_id: str) -> dict[str, object]:
    """Return one target portfolio with profile, sources, signals, and briefs."""
    try:
        return _repository().get_portfolio(profile_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@ROUTER.get("/portfolios/{profile_id}/report")
def get_executive_report(profile_id: str) -> dict[str, object]:
    """Return latest draft markdown report plus portfolio validation metadata."""
    try:
        return _repository().get_report(profile_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
