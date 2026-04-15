from __future__ import annotations

from competitor_scoring import score_event


def test_high_signal_lift_applies_only_when_gates_met():
    high_signal = {
        "category": "Cyber",
        "event_title": "Major ransomware breach impacts stores",
        "detailed_description": "Critical outage and regulator investigation after breach.",
        "source_link": "https://example.com/breach",
        "confidence_level": "high",
        "event_type": "incident",
        "analyst_notes": "",
        "security_implication": "",
        "operational_impact": "",
        "financial_impact": "",
        "reputational_impact": "",
        "competitor": "Amazon",
    }
    low_signal = {
        "category": "Other",
        "event_title": "Routine roadmap refresh",
        "detailed_description": "General planning update with no incident details.",
        "source_link": "",
        "confidence_level": "low",
        "event_type": "update",
        "analyst_notes": "",
        "security_implication": "",
        "operational_impact": "",
        "financial_impact": "",
        "reputational_impact": "",
        "competitor": "Amazon",
    }

    high = score_event(high_signal)
    low = score_event(low_signal)

    assert "high-signal lift:" in high["score_reason"]
    assert "high-signal lift:" not in low["score_reason"]
    assert high["walmart_relevance_score"] >= 82
    assert low["walmart_relevance_score"] < 68
