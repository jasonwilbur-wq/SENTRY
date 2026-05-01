"""Competitor relevance scoring utilities.

Deterministic, explainable rules-based scoring tuned for actionable signal.
No autonomous publishing behavior is introduced here.
"""

from __future__ import annotations

from typing import Any


PRIORITY_TIERS = [
    (82, "CSO Brief"),
    (68, "Leadership Watch"),
    (48, "Analyst Follow-up"),
    (0, "Archive / Low Signal"),
]


CATEGORY_BASE: dict[str, int] = {
    "major incident": 80,
    "data breach": 78,
    "cyber": 74,
    "recall": 70,
    "legal": 66,
    "fraud": 64,
    "orc/theft": 62,
    "violence": 62,
    "operational": 58,
    "compliance": 57,
    "strategic": 54,
    "technology": 50,
    "expansion": 46,
    "other": 38,
}


DOMAIN_HINTS: dict[str, list[str]] = {
    "security": [
        "cyber", "breach", "ransom", "malware", "vulnerability", "zero-day",
        "attack", "security", "phishing", "ddos", "credential",
    ],
    "fraud": [
        "fraud", "scam", "chargeback", "account takeover", "identity theft", "orc",
        "shoplifting", "theft", "shrink", "organized retail crime",
    ],
    "privacy": [
        "privacy", "biometric", "face", "facial", "gdpr", "ccpa", "consent",
        "surveillance", "alpr", "lpr", "data retention",
    ],
    "operations": [
        "supply chain", "logistics", "outage", "disruption", "warehouse", "store ops",
        "fulfillment", "labor", "strike", "distribution center",
    ],
    "customer_trust": [
        "lawsuit", "recall", "boycott", "brand", "reputation", "safety",
        "consumer", "trust", "regulator", "settlement", "fine",
    ],
}


TEAM_MAP: dict[str, str] = {
    "security": "Global Security",
    "fraud": "Fraud Strategy",
    "privacy": "Privacy & Legal",
    "operations": "Operations / Supply Chain",
    "customer_trust": "Corporate Affairs / Trust",
}


CRITICAL_TERMS = [
    "breach", "ransomware", "critical vulnerability", "zero-day", "major incident",
    "recall", "fatal", "lawsuit", "regulator", "fine", "settlement", "outage",
]


def _to_text(*vals: Any) -> str:
    return " ".join(str(v or "") for v in vals).lower()


def _hit_count(text: str, words: list[str]) -> int:
    return sum(1 for w in words if w in text)


def _normalize_category(category: str | None) -> str:
    return (category or "other").strip().lower()


def _score_confidence(confidence_level: str | None, source_link: str | None) -> tuple[int, str]:
    conf = (confidence_level or "").strip().lower()
    if conf in {"high", "h"}:
        base = 80
        why = "high analyst confidence"
    elif conf in {"medium", "med", "m"}:
        base = 66
        why = "medium analyst confidence"
    elif conf in {"low", "l"}:
        base = 52
        why = "low analyst confidence"
    else:
        base = 60
        why = "default confidence (missing/unspecified)"

    if source_link:
        base += 8
        why += " + source link present"
    else:
        base -= 4
        why += " - no source link"

    return max(35, min(92, base)), why


def _score_domain(event: dict[str, Any]) -> tuple[dict[str, int], dict[str, int], str]:
    text = _to_text(
        event.get("event_title"),
        event.get("detailed_description"),
        event.get("event_type"),
        event.get("security_implication"),
        event.get("operational_impact"),
        event.get("financial_impact"),
        event.get("reputational_impact"),
    )
    hits = {domain: _hit_count(text, hints) for domain, hints in DOMAIN_HINTS.items()}
    scores = {
        "strategic": max(30, min(92, 44 + hits["operations"] * 6 + (10 if "strateg" in text else 0))),
        "security": max(30, min(96, 40 + hits["security"] * 10 + hits["fraud"] * 4)),
        "operational": max(28, min(90, 38 + hits["operations"] * 9)),
        "customer_trust": max(28, min(94, 36 + hits["customer_trust"] * 9 + hits["privacy"] * 6)),
    }
    top_domain = max(hits, key=hits.get)
    return scores, hits, top_domain


def _score_urgency(event: dict[str, Any]) -> tuple[int, str]:
    text = _to_text(event.get("category"), event.get("event_title"), event.get("detailed_description"))
    urgent_hits = _hit_count(text, [
        "breach", "recall", "lawsuit", "fine", "outage", "attack", "critical", "incident",
        "regulator", "investigation", "emergency",
    ])
    watch_hits = _hit_count(text, ["pilot", "roadmap", "investment", "expansion", "partnership"])
    score = 40 + urgent_hits * 10 + watch_hits * 3
    if urgent_hits >= 2:
        why = f"multiple urgent indicators ({urgent_hits})"
    elif urgent_hits == 1:
        why = "one urgent indicator"
    else:
        why = "non-urgent language"
    return max(26, min(95, score)), why


def _score_novelty(event: dict[str, Any]) -> tuple[int, str]:
    text = _to_text(event.get("event_type"), event.get("event_title"), event.get("analyst_notes"))
    novelty_hits = _hit_count(text, ["new", "launch", "pilot", "acquire", "partnership", "first", "expands"])
    repeat_hits = _hit_count(text, ["ongoing", "repeat", "update", "routine"])
    score = 44 + novelty_hits * 8 - repeat_hits * 5
    if novelty_hits:
        why = f"novelty indicators ({novelty_hits})"
    else:
        why = "no novelty indicators"
    return max(30, min(88, score)), why


def _category_score(category: str | None) -> tuple[int, str]:
    normalized = _normalize_category(category)
    score = CATEGORY_BASE.get(normalized, CATEGORY_BASE["other"])
    return score, f"category baseline {normalized}={score}"


def _high_signal_bonus(
    *,
    category_score: int,
    security_score: int,
    urgency: int,
    confidence: int,
    critical_hits: int,
) -> tuple[float, str]:
    """Bounded additive lift for truly severe, evidenced incident signals.

    Guardrails to prevent alert inflation:
    - requires elevated category + urgency
    - requires at least moderate confidence
    - scales with concrete critical indicators
    """
    if category_score < 70 or urgency < 84 or confidence < 62:
        return 0.0, ""

    bonus = 0.0
    reasons: list[str] = []

    if security_score >= 58:
        bonus += 4.0
        reasons.append("security-domain intensity")

    if critical_hits >= 2:
        critical_bonus = min(8.0, critical_hits * 2.0)
        bonus += critical_bonus
        reasons.append(f"critical indicators x{critical_hits}")

    if urgency >= 88:
        bonus += 2.0
        reasons.append("extreme urgency")

    return min(14.0, bonus), ", ".join(reasons)


def _compute_relevance(
    category_score: int,
    domain_scores: dict[str, int],
    urgency: int,
    novelty: int,
    confidence: int,
    critical_hits: int,
) -> tuple[float, str]:
    relevance = (
        category_score * 0.30
        + domain_scores["security"] * 0.20
        + domain_scores["customer_trust"] * 0.15
        + domain_scores["operational"] * 0.12
        + domain_scores["strategic"] * 0.10
        + urgency * 0.08
        + novelty * 0.03
        + confidence * 0.02
    )
    if critical_hits:
        relevance += min(7, critical_hits * 2)

    bonus, bonus_reason = _high_signal_bonus(
        category_score=category_score,
        security_score=domain_scores["security"],
        urgency=urgency,
        confidence=confidence,
        critical_hits=critical_hits,
    )
    relevance += bonus

    return round(max(0, min(100, relevance)), 1), bonus_reason


def _priority_for(relevance: float) -> str:
    return next(label for floor, label in PRIORITY_TIERS if relevance >= floor)


def score_event(event: dict[str, Any]) -> dict[str, Any]:
    """Score a competitor event and return normalized additive fields."""
    category = event.get("category")
    source_link = event.get("source_link")
    confidence_level = event.get("confidence_level")

    category_score, category_why = _category_score(category)
    domain_scores, domain_hits, top_domain = _score_domain(event)
    urgency, urgency_why = _score_urgency(event)
    novelty, novelty_why = _score_novelty(event)
    confidence, confidence_why = _score_confidence(confidence_level, source_link)

    full_text = _to_text(
        event.get("event_title"), event.get("detailed_description"), category, event.get("event_type")
    )
    critical_hits = _hit_count(full_text, CRITICAL_TERMS)

    relevance, bonus_reason = _compute_relevance(
        category_score=category_score,
        domain_scores=domain_scores,
        urgency=urgency,
        novelty=novelty,
        confidence=confidence,
        critical_hits=critical_hits,
    )
    priority = _priority_for(relevance)

    signal_type = "Watch"
    if domain_scores["security"] >= 76 or domain_scores["customer_trust"] >= 76 or urgency >= 78:
        signal_type = "Threat"
    elif domain_scores["strategic"] >= 72 and urgency < 62:
        signal_type = "Opportunity"

    team = TEAM_MAP[top_domain]
    cso_threshold = relevance >= 82
    cso_gate = confidence >= 62
    escalate = 1 if (cso_threshold and cso_gate) else 0

    cso_reason = (
        "Eligible: score in CSO band with sufficient confidence"
        if escalate
        else "Not CSO candidate: below score/confidence gate"
    )

    reason_parts = [
        f"{category_why}",
        f"security={domain_scores['security']}, trust={domain_scores['customer_trust']}, ops={domain_scores['operational']}",
        f"urgency={urgency} ({urgency_why})",
        f"novelty={novelty} ({novelty_why})",
        f"confidence={confidence} ({confidence_why})",
    ]
    if critical_hits:
        reason_parts.append(f"critical indicators matched={critical_hits}")
    if bonus_reason:
        reason_parts.append(f"high-signal lift: {bonus_reason}")

    why = (
        f"{signal_type} signal for Walmart: {event.get('competitor', 'Competitor')} event in "
        f"{category or 'Other'} scored {relevance} → {priority}. "
        f"Top domain: {top_domain.replace('_', ' ')}."
    )

    return {
        "walmart_relevance_score": relevance,
        "priority_tier": priority,
        "signal_type": signal_type,
        "recommended_owner": team,
        "why_walmart_cares": why,
        "strategic_score": domain_scores["strategic"],
        "security_score": domain_scores["security"],
        "operational_score": domain_scores["operational"],
        "customer_trust_score": domain_scores["customer_trust"],
        "novelty_score": novelty,
        "urgency_score": urgency,
        "confidence_score": confidence,
        "escalate_to_cso": escalate,
        "score_reason": " | ".join(reason_parts),
        "confidence_effect": confidence_why,
        "source_effect": "source_link_present" if source_link else "source_link_missing",
        "cso_candidate_reason": cso_reason,
        "top_domain": top_domain,
        "domain_hits": domain_hits,
        "scoring_version": "v2_rules_2026_04_calibrated",
    }
