from __future__ import annotations

from executive_intel.search_plan import build_search_plan


def test_search_plan_generates_public_queries_and_controls():
    plan = build_search_plan({
        "profile_id": "exec_amazon_stephen_schmidt",
        "full_name": "Stephen Schmidt",
        "organization": "Amazon",
        "title": "Chief Security Officer",
        "aliases": ["Steve Schmidt"],
        "focus_topics": ["global security", "investigations"],
    })

    assert plan["mode"] == "public_read_only_search_plan"
    assert plan["profile_id"] == "exec_amazon_stephen_schmidt"
    assert "NO_PRIVATE_CURRENT_LOCATION_TRACKING" in plan["review_only_controls_enforced"]
    assert any("paywall" in item for item in plan["blocked_collection_patterns"])
    identity_queries = plan["query_groups"]["identity_corroboration"]
    assert '"Stephen Schmidt" "Amazon"' in identity_queries
    assert '"Stephen Schmidt" "Amazon" "Chief Security Officer"' in identity_queries
    assert any('"Steve Schmidt"' in query for query in identity_queries)


def test_search_plan_deduplicates_alias_and_focus_terms():
    plan = build_search_plan({
        "profile_id": "exec_example_leader",
        "full_name": "Example Leader",
        "organization": "Example Retailer",
        "title": "Chief Security Officer",
        "aliases": ["Example Leader"],
        "focus_topics": ["security", "security"],
    })

    queries = plan["query_groups"]["risk_or_incident_context"]
    assert len(queries) == len(set(query.lower() for query in queries))
