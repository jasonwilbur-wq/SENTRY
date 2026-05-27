from __future__ import annotations

import pytest

from executive_intel.dedupe import dedupe_signals, signal_fingerprint
from executive_intel.models import (
    ExecutiveProfile,
    ExecutiveSignal,
    SignalCategory,
    SignalCitation,
    SourceQuality,
    VerificationStatus,
)
from executive_intel.normalization import build_profile_id, normalize_person_name, normalize_url
from executive_intel.policy import evaluate_source_url, validate_business_travel


def _citation(url: str, quality: SourceQuality = SourceQuality.HIGH_PRIMARY_SOURCE) -> SignalCitation:
    return SignalCitation(
        citation_id="cite_1",
        source_id="src_1",
        url=url,
        source_title="Public conference page",
        publisher="Conference Org",
        evidence_excerpt="Stephen Schmidt is listed as a speaker at the security conference.",
        source_quality=quality,
    )


def _signal(url: str) -> ExecutiveSignal:
    return ExecutiveSignal(
        signal_id="sig_1",
        profile_id="exec_amazon_stephen_schmidt",
        category=SignalCategory.PUBLIC_APPEARANCE,
        event_date="2026-05-20",
        event_location="New York, NY",
        title="Security conference appearance",
        summary="Public panel appearance about enterprise security operations.",
        business_relevance="Shows public security leadership priorities.",
        walmart_cso_relevance="Useful for CSO awareness of peer security themes.",
        confidence_level=SourceQuality.HIGH_PRIMARY_SOURCE,
        verification_status=VerificationStatus.VERIFIED,
        citations=[_citation(url)],
    )


def test_profile_id_and_name_normalization():
    assert normalize_person_name("  stephen   schmidt ") == "Stephen Schmidt"
    assert build_profile_id("Amazon", "Stephen Schmidt") == "exec_amazon_stephen_schmidt"
    profile = ExecutiveProfile(
        profile_id="EXEC_Amazon_Stephen_Schmidt",
        full_name="Stephen Schmidt",
        organization="Amazon",
    )
    assert profile.profile_id == "exec_amazon_stephen_schmidt"


def test_source_policy_blocks_competitor_commerce_pages():
    decision = evaluate_source_url(
        "https://www.amazon.com/products/security-camera?pricing=true",
        competitor_domains={"amazon.com"},
    )
    assert decision.allowed is False
    assert decision.review_required is True
    assert decision.primary_reason == "PROHIBITED_COMPETITOR_COMMERCE_CONTENT"


def test_source_policy_allows_competitor_public_press_pages():
    decision = evaluate_source_url(
        "https://www.amazon.com/news/company/example-security-leadership",
        competitor_domains={"amazon.com"},
    )
    assert decision.allowed is True
    assert decision.review_required is False
    assert decision.primary_reason == "COMPETITOR_CORPORATE_PUBLIC_PATH"


def test_business_travel_allows_public_event_context():
    decision = validate_business_travel(
        "Executive is scheduled as a speaker on a public conference panel.",
        "Las Vegas, NV",
    )
    assert decision.allowed is True
    assert decision.review_required is False
    assert decision.primary_reason == "PUBLIC_BUSINESS_TRAVEL"


def test_business_travel_blocks_private_tracking_terms():
    decision = validate_business_travel("Find current location near family home", "home address")
    assert decision.allowed is False
    assert decision.review_required is True
    assert decision.primary_reason == "PROHIBITED_PRIVATE_TRAVEL"


def test_signal_rejects_private_location_detail():
    with pytest.raises(ValueError, match="private location"):
        ExecutiveSignal(
            signal_id="sig_private",
            profile_id="exec_amazon_stephen_schmidt",
            category=SignalCategory.BUSINESS_TRAVEL,
            event_location="family home address",
            title="Bad location",
            summary="This should not pass.",
            business_relevance="Not allowed.",
            walmart_cso_relevance="Not allowed.",
        )


def test_cso_readiness_requires_verified_primary_public_business_signal():
    signal = _signal("https://conference.example/event?utm_source=newsletter")
    assert signal.is_ready_for_cso_draft() is True

    weak = signal.model_copy(update={"citations": [_citation("https://example.com", SourceQuality.LOW_SINGLE_SOURCE)]})
    assert weak.is_ready_for_cso_draft() is False


def test_url_normalization_removes_tracking_and_dedupe_keeps_first():
    first = _signal("https://www.example.com/event?utm_source=a&id=1")
    second = _signal("https://example.com/event?id=1&utm_campaign=b")

    assert normalize_url(first.citations[0].url) == "https://example.com/event?id=1"
    assert signal_fingerprint(first) == signal_fingerprint(second)
    assert dedupe_signals([first, second]) == [first]
