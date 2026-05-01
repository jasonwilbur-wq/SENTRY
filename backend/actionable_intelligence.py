"""Deterministic actionable-intelligence scoring and explainability helpers.

Operational intent:
- Convert competitor-event/frozen payload into decision-friendly factors.
- Produce stable, transparent priority score and reason codes.
- Emit recommendation aligned to readiness and risk posture.

No AI ranking dependency. Pure rules + explicit constants.
"""
from __future__ import annotations

from typing import Any

# Reason codes (explicit constants, no magic strings scattered everywhere)
HIGH_IMPACT = "HIGH_IMPACT"
HIGH_LIKELIHOOD = "HIGH_LIKELIHOOD"
LOW_CONFIDENCE = "LOW_CONFIDENCE"
MULTIPLE_SOURCES = "MULTIPLE_SOURCES"
READINESS_BLOCKED = "READINESS_BLOCKED"
MISSING_EVIDENCE = "MISSING_EVIDENCE"

# Deterministic recommendation labels
RECOMMEND_ESCALATE = "escalate_for_review"
RECOMMEND_REQUEST_EVIDENCE = "request_additional_evidence"
RECOMMEND_MONITOR = "monitor_only"
RECOMMEND_INCLUDE = "include_in_brief"
RECOMMEND_HOLD = "hold_due_to_readiness_issue"
SCORING_VERSION = "actionable_intel_v1"

# Severity tiers derived from impact score
SEVERITY_LOW = "LOW"
SEVERITY_MEDIUM = "MEDIUM"
SEVERITY_HIGH = "HIGH"
SEVERITY_CRITICAL = "CRITICAL"

# Likelihood tiers derived from likelihood score
LIKELIHOOD_UNLIKELY = "UNLIKELY"
LIKELIHOOD_POSSIBLE = "POSSIBLE"
LIKELIHOOD_LIKELY = "LIKELY"
LIKELIHOOD_HIGHLY_LIKELY = "HIGHLY_LIKELY"


def _to_float(val: Any, default: float = 0.0) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _clean_text(val: Any) -> str:
    return " ".join(str(val or "").strip().split())


def _confidence_label(event: dict[str, Any]) -> str:
    raw = _clean_text(event.get("confidence_level")).lower()
    if raw in {"h", "high"}:
        return "high"
    if raw in {"m", "med", "medium"}:
        return "medium"
    if raw in {"l", "low"}:
        return "low"

    score = _to_float(event.get("confidence_score"), default=0.0)
    if score >= 76:
        return "high"
    if score >= 61:
        return "medium"
    if score > 0:
        return "low"
    return ""


def _impact_score(event: dict[str, Any]) -> float:
    # Weighted deterministic impact using existing scoring dimensions.
    strategic = _to_float(event.get("strategic_score"), 0.0)
    security = _to_float(event.get("security_score"), 0.0)
    operational = _to_float(event.get("operational_score"), 0.0)
    trust = _to_float(event.get("customer_trust_score"), 0.0)

    if any(v > 0 for v in (strategic, security, operational, trust)):
        return round(
            strategic * 0.25 + security * 0.35 + operational * 0.25 + trust * 0.15,
            1,
        )

    # Fallback to relevance if sub-scores absent.
    return round(_to_float(event.get("walmart_relevance_score"), 0.0), 1)


def _likelihood_score(event: dict[str, Any]) -> float:
    urgency = _to_float(event.get("urgency_score"), 0.0)
    confidence_score = _to_float(event.get("confidence_score"), 0.0)
    novelty = _to_float(event.get("novelty_score"), 0.0)

    if any(v > 0 for v in (urgency, confidence_score, novelty)):
        return round(urgency * 0.55 + confidence_score * 0.35 + novelty * 0.10, 1)

    # Fallback to relevance if no likelihood proxies exist.
    return round(_to_float(event.get("walmart_relevance_score"), 0.0), 1)


def _severity_label(impact: float) -> str:
    if impact >= 85:
        return SEVERITY_CRITICAL
    if impact >= 70:
        return SEVERITY_HIGH
    if impact >= 50:
        return SEVERITY_MEDIUM
    return SEVERITY_LOW


def _likelihood_label(likelihood: float) -> str:
    if likelihood >= 80:
        return LIKELIHOOD_HIGHLY_LIKELY
    if likelihood >= 65:
        return LIKELIHOOD_LIKELY
    if likelihood >= 45:
        return LIKELIHOOD_POSSIBLE
    return LIKELIHOOD_UNLIKELY


def _evidence_quality_modifier(event: dict[str, Any]) -> float:
    source_link = _clean_text(event.get("source_link"))
    source_effect = _clean_text(event.get("source_effect")).lower()

    if not source_link or source_effect == "source_link_missing":
        return -0.15

    score_reason = _clean_text(event.get("score_reason")).lower()
    # Deterministic heuristic: explicit multiple indicators acts as multi-source proxy.
    if "critical indicators matched=" in score_reason or "|" in score_reason:
        return 0.08

    return 0.0


def _confidence_modifier(event: dict[str, Any]) -> float:
    label = _confidence_label(event)
    if label == "high":
        return 0.10
    if label == "medium":
        return 0.0
    if label == "low":
        return -0.10
    return -0.15


def _is_readiness_blocked(event: dict[str, Any]) -> bool:
    issues = event.get("readiness_issues") or []
    if isinstance(issues, list) and len(issues) > 0:
        return True
    # generation path may omit readiness_issues for included items
    if event.get("is_brief_ready") is False:
        return True
    return False


def _recommendation(
    *,
    priority_score: float,
    confidence_label: str,
    readiness_blocked: bool,
) -> str:
    if readiness_blocked:
        return RECOMMEND_HOLD
    if not confidence_label:
        return RECOMMEND_REQUEST_EVIDENCE
    if confidence_label == "low":
        return RECOMMEND_REQUEST_EVIDENCE
    if priority_score >= 82:
        return RECOMMEND_ESCALATE
    if priority_score >= 65:
        return RECOMMEND_INCLUDE
    return RECOMMEND_MONITOR


def _reason_codes(
    *,
    impact: float,
    likelihood: float,
    confidence_label: str,
    evidence_modifier: float,
    readiness_blocked: bool,
    source_link: str,
) -> list[str]:
    codes: list[str] = []

    if impact >= 70:
        codes.append(HIGH_IMPACT)
    if likelihood >= 65:
        codes.append(HIGH_LIKELIHOOD)
    if confidence_label == "low" or confidence_label == "":
        codes.append(LOW_CONFIDENCE)
    if evidence_modifier > 0:
        codes.append(MULTIPLE_SOURCES)
    if readiness_blocked:
        codes.append(READINESS_BLOCKED)
    if not source_link:
        codes.append(MISSING_EVIDENCE)

    return codes


def _explanation_text(
    *,
    priority_score: float,
    impact: float,
    likelihood: float,
    severity: str,
    likelihood_band: str,
    confidence_label: str,
    readiness_blocked: bool,
    recommendation: str,
    reason_codes: list[str],
) -> str:
    confidence_txt = confidence_label or "unknown"
    blocked_txt = "blocked" if readiness_blocked else "ready"
    codes_txt = ", ".join(reason_codes) if reason_codes else "NONE"
    return (
        f"Priority {priority_score} based on impact {impact} x likelihood {likelihood} "
        f"with confidence '{confidence_txt}'. Severity={severity}, "
        f"likelihood_band={likelihood_band}, readiness={blocked_txt}. "
        f"Reason codes: {codes_txt}. Recommended action: {recommendation}."
    )


def build_actionable_intelligence(event: dict[str, Any]) -> dict[str, Any]:
    """Build deterministic actionable-intelligence fields for one item payload."""
    impact = _impact_score(event)
    likelihood = _likelihood_score(event)
    severity = _severity_label(impact)
    likelihood_band = _likelihood_label(likelihood)

    confidence_label = _confidence_label(event)
    confidence_mod = _confidence_modifier(event)
    evidence_mod = _evidence_quality_modifier(event)
    readiness_blocked = _is_readiness_blocked(event)

    base = (impact * likelihood) / 100.0
    adjusted = base * (1.0 + confidence_mod + evidence_mod)
    priority_score = round(max(0.0, min(100.0, adjusted)), 1)

    source_link = _clean_text(event.get("source_link"))
    reason_codes = _reason_codes(
        impact=impact,
        likelihood=likelihood,
        confidence_label=confidence_label,
        evidence_modifier=evidence_mod,
        readiness_blocked=readiness_blocked,
        source_link=source_link,
    )

    recommendation = _recommendation(
        priority_score=priority_score,
        confidence_label=confidence_label,
        readiness_blocked=readiness_blocked,
    )

    explanation = _explanation_text(
        priority_score=priority_score,
        impact=impact,
        likelihood=likelihood,
        severity=severity,
        likelihood_band=likelihood_band,
        confidence_label=confidence_label,
        readiness_blocked=readiness_blocked,
        recommendation=recommendation,
        reason_codes=reason_codes,
    )

    return {
        "title": _clean_text(event.get("event_title")),
        "summary": _clean_text(event.get("detailed_description"))
        or _clean_text(event.get("why_walmart_cares"))
        or _clean_text(event.get("walmart_actionability_context")),
        "evidence_reference": source_link,
        "rationale": _clean_text(event.get("why_walmart_cares"))
        or _clean_text(event.get("walmart_actionability_context")),
        "confidence": confidence_label,
        "severity": severity,
        "likelihood": likelihood_band,
        "impact_score": impact,
        "likelihood_score": likelihood,
        "priority_score": priority_score,
        "recommended_action": recommendation,
        "reason_codes": reason_codes,
        "explanation": explanation,
        "actionable_now": int(not readiness_blocked and recommendation in {RECOMMEND_ESCALATE, RECOMMEND_INCLUDE}),
        "readiness_blocked": int(readiness_blocked),
        "scoring_version": SCORING_VERSION,
    }
