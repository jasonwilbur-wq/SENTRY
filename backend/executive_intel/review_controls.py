"""Mandatory review-only controls for Executive Signal Scout.

The controls intentionally block prohibited actions while allowing compliant
review, parsing, classification, scoring, dedupe, stale-info detection, source
traceability, and draft-only summarization to continue.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Iterable


class ReviewControlCode(StrEnum):
    SQLITE_WRITE = "NO_SQLITE_WRITES"
    ARTIFACT_MUTATION = "NO_ARTIFACT_MUTATION"
    SCHEDULED_COLLECTION = "NO_SCHEDULED_COLLECTION"
    REPORT_PUBLICATION = "NO_REPORT_PUBLICATION"
    OUTBOUND_DELIVERY = "NO_OUTBOUND_DELIVERY"
    PRIVATE_CURRENT_LOCATION = "NO_PRIVATE_CURRENT_LOCATION_TRACKING"
    ACCESS_BYPASS = "NO_AUTH_PAYWALL_CAPTCHA_BYPASS"
    COMPETITOR_COMMERCE = "NO_COMPETITOR_PRICING_ASSORTMENT_OFFERING_SCRAPING"


@dataclass(frozen=True)
class ReviewControlDecision:
    allowed: bool
    blocked_codes: tuple[ReviewControlCode, ...]
    allowed_review_only_activities: tuple[str, ...]
    explanation: str

    @property
    def blocked(self) -> bool:
        return not self.allowed


PROHIBITED_PATTERNS: tuple[tuple[ReviewControlCode, tuple[str, ...]], ...] = (
    (
        ReviewControlCode.SQLITE_WRITE,
        (
            "sqlite write",
            "write to sqlite",
            "insert into sqlite",
            "update sqlite",
            "delete from sqlite",
            "persist to database",
            "db write",
            "database write",
        ),
    ),
    (
        ReviewControlCode.ARTIFACT_MUTATION,
        (
            "mutate artifact",
            "edit artifact",
            "overwrite artifact",
            "delete artifact",
            "modify collected artifact",
            "change source artifact",
        ),
    ),
    (
        ReviewControlCode.SCHEDULED_COLLECTION,
        (
            "schedule collection",
            "scheduled collection",
            "cron",
            "daily crawler",
            "nightly crawl",
            "automated collection job",
            "windows task scheduler",
        ),
    ),
    (
        ReviewControlCode.REPORT_PUBLICATION,
        (
            "publish report",
            "cso-facing publication",
            "post report",
            "release report",
            "make public report",
            "final report to cso",
        ),
    ),
    (
        ReviewControlCode.OUTBOUND_DELIVERY,
        (
            "send email",
            "send teams",
            "send slack",
            "deliver report",
            "email report",
            "share report",
            "outbound delivery",
        ),
    ),
    (
        ReviewControlCode.PRIVATE_CURRENT_LOCATION,
        (
            "current location",
            "real-time location",
            "where is he now",
            "where is she now",
            "home address",
            "home location",
            "private travel",
            "family vacation",
            "track whereabouts",
        ),
    ),
    (
        ReviewControlCode.ACCESS_BYPASS,
        (
            "bypass login",
            "bypass authentication",
            "bypass paywall",
            "bypass captcha",
            "solve captcha",
            "credential stuffing",
            "use password",
            "login as",
            "evade bot control",
            "ignore robots",
        ),
    ),
    (
        ReviewControlCode.COMPETITOR_COMMERCE,
        (
            "scrape pricing",
            "competitor pricing",
            "scrape assortment",
            "competitor assortment",
            "product availability",
            "offering scraping",
            "scrape offerings",
            "checkout page",
            "cart page",
            "price comparison",
        ),
    ),
)

ALLOWED_REVIEW_ONLY_ACTIVITIES: tuple[str, ...] = (
    "review_approved_inputs",
    "parse_provided_artifacts",
    "extract_relevant_intelligence",
    "classify_findings",
    "assign_confidence_or_risk_scores",
    "detect_duplicates",
    "identify_stale_information",
    "preserve_source_traceability",
    "generate_draft_only_summaries_for_human_review",
)


def evaluate_review_only_controls(request_text: str, *, extra_terms: Iterable[str] = ()) -> ReviewControlDecision:
    """Evaluate a natural-language request against mandatory controls.

    This is a conservative keyword guard for programmatic checks and tests. It is
    not the only policy layer; source policy and analyst review still apply.
    """
    normalized = " ".join([request_text, *extra_terms]).casefold()
    blocked: list[ReviewControlCode] = []
    if "sqlite" in normalized and any(verb in normalized for verb in ("write", "insert", "update", "delete", "persist")):
        blocked.append(ReviewControlCode.SQLITE_WRITE)

    for code, patterns in PROHIBITED_PATTERNS:
        if any(pattern.casefold() in normalized for pattern in patterns):
            blocked.append(code)

    if blocked:
        codes = ", ".join(code.value for code in blocked)
        return ReviewControlDecision(
            allowed=False,
            blocked_codes=tuple(dict.fromkeys(blocked)),
            allowed_review_only_activities=ALLOWED_REVIEW_ONLY_ACTIVITIES,
            explanation=(
                f"Blocked prohibited action(s): {codes}. Continue only with permitted "
                "review-only analysis, classification, scoring, dedupe, traceability, "
                "and draft-generation work."
            ),
        )

    return ReviewControlDecision(
        allowed=True,
        blocked_codes=(),
        allowed_review_only_activities=ALLOWED_REVIEW_ONLY_ACTIVITIES,
        explanation="No mandatory review-only control violations detected.",
    )


def assert_review_only_allowed(request_text: str, *, extra_terms: Iterable[str] = ()) -> None:
    """Raise ValueError when a requested action violates review-only controls."""
    decision = evaluate_review_only_controls(request_text, extra_terms=extra_terms)
    if decision.blocked:
        raise ValueError(decision.explanation)
