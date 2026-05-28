from __future__ import annotations

import pytest

from executive_intel.review_controls import (
    ReviewControlCode,
    assert_review_only_allowed,
    evaluate_review_only_controls,
)


def test_review_controls_allow_compliant_analysis_and_draft_generation():
    decision = evaluate_review_only_controls(
        "Review approved source artifacts, classify findings, assign confidence scores, "
        "detect duplicates, preserve citations, and generate a draft-only summary."
    )

    assert decision.allowed is True
    assert decision.blocked_codes == ()
    assert "generate_draft_only_summaries_for_human_review" in decision.allowed_review_only_activities


@pytest.mark.parametrize(
    ("requested_action", "code"),
    [
        ("Write these findings to SQLite", ReviewControlCode.SQLITE_WRITE),
        ("Edit artifact JSON to normalize the collected source", ReviewControlCode.ARTIFACT_MUTATION),
        ("Create a daily crawler with Windows Task Scheduler", ReviewControlCode.SCHEDULED_COLLECTION),
        ("Publish report to the CSO portal", ReviewControlCode.REPORT_PUBLICATION),
        ("Send email with the executive brief", ReviewControlCode.OUTBOUND_DELIVERY),
        ("Track whereabouts and current location from social posts", ReviewControlCode.PRIVATE_CURRENT_LOCATION),
        ("Bypass paywall and solve captcha for the article", ReviewControlCode.ACCESS_BYPASS),
        ("Scrape competitor pricing and product availability", ReviewControlCode.COMPETITOR_COMMERCE),
    ],
)

def test_review_controls_block_each_prohibited_action(requested_action: str, code: ReviewControlCode):
    decision = evaluate_review_only_controls(requested_action)

    assert decision.allowed is False
    assert code in decision.blocked_codes
    assert "Continue only with permitted review-only" in decision.explanation


def test_review_controls_block_only_prohibited_parts_and_preserve_allowed_work():
    decision = evaluate_review_only_controls(
        "Parse approved artifacts, classify findings, detect duplicates, then send Slack report."
    )

    assert decision.allowed is False
    assert decision.blocked_codes == (ReviewControlCode.OUTBOUND_DELIVERY,)
    assert "parse_provided_artifacts" in decision.allowed_review_only_activities
    assert "classify_findings" in decision.allowed_review_only_activities
    assert "detect_duplicates" in decision.allowed_review_only_activities


def test_assert_review_only_allowed_raises_on_blocked_action():
    with pytest.raises(ValueError, match="NO_SQLITE_WRITES"):
        assert_review_only_allowed("Persist to database after review")
