"""Agent-first handoff bundle builder for Executive Signal Scout.

The handoff bundle is the clean seam between the standalone intelligence agent
and SENTRY. It is read-only: no artifact mutation, no SQLite writes, no
publication, and no outbound delivery.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from executive_intel.models import AnalystReviewStatus, ExecutiveSignal, VerificationStatus
from executive_intel.repository import ExecutiveIntelRepository
from executive_intel.review_controls import ReviewControlCode

APPROVED_REVIEW_STATUSES = {
    AnalystReviewStatus.APPROVED_FOR_SENTRY,
    AnalystReviewStatus.APPROVED_FOR_CSO_DRAFT,
}


class HandoffError(ValueError):
    """Raised when a handoff bundle cannot be built safely."""


def build_handoff_bundle(
    profile_id: str,
    *,
    repository: ExecutiveIntelRepository | None = None,
    finalized_by: str | None = None,
    include_review_ready: bool = False,
) -> dict[str, Any]:
    """Build a read-only bundle for SENTRY import/consumption.

    Default behavior includes only analyst-approved signals. Use
    include_review_ready=True for draft dry-runs that must remain clearly marked
    as not finalized.
    """
    repo = repository or ExecutiveIntelRepository()
    portfolio = repo.get_portfolio(profile_id)
    report = repo.get_report(profile_id)

    selected_signals = _select_handoff_signals(
        portfolio.get("signals", []),
        include_review_ready=include_review_ready,
    )
    status = _bundle_status(selected_signals, finalized_by, include_review_ready)

    return {
        "bundle_id": f"handoff_{profile_id}_{_utc_compact_timestamp()}",
        "profile_id": profile_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "handoff_status": status,
        "finalized_by": finalized_by,
        "source_system": "exec-signal-scout",
        "destination": "SENTRY_PROGRAM_OPTIONAL_IMPORT",
        "review_only_controls_enforced": [code.value for code in ReviewControlCode],
        "profile": portfolio["profile"],
        "summary": {
            "source_count": portfolio["stats"]["source_count"],
            "all_signal_count": portfolio["stats"]["signal_count"],
            "handoff_signal_count": len(selected_signals),
            "invalid_signal_count": portfolio["stats"]["invalid_signal_count"],
            "latest_brief_name": (portfolio.get("latest_brief") or {}).get("name"),
        },
        "signals": selected_signals,
        "sources": portfolio.get("sources", []),
        "validation": portfolio.get("validation", {}),
        "source_policy": portfolio.get("source_policy", {}),
        "draft_report_markdown": report.get("markdown", ""),
        "import_notes": [
            "Bundle generated read-only from local Executive Signal Scout artifacts.",
            "No SQLite writes, artifact mutation, scheduled collection, publication, or outbound delivery occurred.",
            "SENTRY import/consumption remains a separate downstream program action.",
        ],
    }


def _select_handoff_signals(
    raw_signals: list[dict[str, Any]],
    *,
    include_review_ready: bool,
) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    for raw in raw_signals:
        parsed = ExecutiveSignal.model_validate(raw)
        if parsed.verification_status != VerificationStatus.VERIFIED:
            continue
        if parsed.analyst_review_status in APPROVED_REVIEW_STATUSES:
            selected.append(parsed.model_dump(mode="json"))
            continue
        if include_review_ready and parsed.analyst_review_status == AnalystReviewStatus.READY_FOR_REVIEW:
            selected.append(parsed.model_dump(mode="json"))
    return selected


def _bundle_status(
    signals: list[dict[str, Any]],
    finalized_by: str | None,
    include_review_ready: bool,
) -> str:
    if include_review_ready:
        return "DRAFT_HANDOFF_REVIEW_ONLY"
    if not signals:
        return "EMPTY_NO_APPROVED_SIGNALS"
    if not finalized_by:
        return "APPROVED_SIGNALS_PRESENT_FINALIZER_REQUIRED"
    return "FINALIZED_FOR_SENTRY_PROGRAM_HANDOFF"


def _utc_compact_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
