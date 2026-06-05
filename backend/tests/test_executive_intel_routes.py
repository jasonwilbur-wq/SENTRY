from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def _seed_exec_workspace(root: Path) -> None:
    for name in ["profiles", "sources", "signals", "runs", "briefs"]:
        (root / name).mkdir(parents=True, exist_ok=True)

    profile = {
        "profile_id": "exec_example_security_leader",
        "full_name": "Example Security Leader",
        "organization": "Example Retailer",
        "title": "Chief Security Officer",
        "status": "ACTIVE",
        "aliases": ["Example Leader"],
        "focus_topics": ["physical security", "cybersecurity"],
        "collection_notes": "Public business signals only. No home/private tracking.",
    }
    _write_json(root / "profiles" / "example-security-leader.json", profile)

    source = {
        "run_id": "run_test_001",
        "profile_id": "exec_example_security_leader",
        "sources": [
            {
                "source_id": "src_test_001",
                "url": "https://example.com/news/security-leader-keynote",
                "source_title": "Example Security Leader Keynote",
                "publisher": "Example News",
                "published_date": "2026-05-01",
                "source_quality": "HIGH_PRIMARY_SOURCE",
                "extraction_status": "EXTRACTED",
            }
        ],
    }
    _write_json(root / "sources" / "20260501-example-security-leader-sources.json", source)

    signal = {
        "signal_id": "sig_test_001",
        "profile_id": "exec_example_security_leader",
        "category": "PUBLIC_APPEARANCE",
        "event_date": "2026-05-01",
        "event_location": "Public conference",
        "title": "Public keynote on security convergence",
        "summary": "The executive gave a public business keynote about security convergence.",
        "business_relevance": "Shows public security strategy and leadership posture.",
        "walmart_cso_relevance": "Useful benchmark for Walmart CSO awareness.",
        "confidence_level": "HIGH_PRIMARY_SOURCE",
        "verification_status": "VERIFIED",
        "sensitivity_level": "PUBLIC_BUSINESS",
        "analyst_review_status": "READY_FOR_REVIEW",
        "citations": [
            {
                "citation_id": "cite_test_001",
                "source_id": "src_test_001",
                "url": "https://example.com/news/security-leader-keynote",
                "source_title": "Example Security Leader Keynote",
                "publisher": "Example News",
                "published_date": "2026-05-01",
                "evidence_excerpt": "The executive gave a public business keynote about security convergence.",
                "source_quality": "HIGH_PRIMARY_SOURCE",
            }
        ],
    }
    _write_json(
        root / "signals" / "20260501-example-security-leader-signals.json",
        {"run_id": "run_test_001", "profile_id": "exec_example_security_leader", "signals": [signal]},
    )

    _write_json(
        root / "runs" / "20260501-example-security-leader-run.json",
        {"run_id": "run_test_001", "profile_id": "exec_example_security_leader", "mode": "test"},
    )
    (root / "briefs" / "20260501-example-security-leader-brief.md").write_text(
        "# Example Security Leader Draft Brief\n\nPublic business summary only.\n",
        encoding="utf-8",
    )


def _seed_placeholder_person_profile(root: Path) -> None:
    _write_json(
        root / "profiles" / "unnamed-kroger-sustainability-lead.json",
        {
            "profile_id": "exec_kroger_sustainability_lead_retarget",
            "full_name": "Kroger Group VP Communications & Public Affairs (serves as CSO; name not publicly disclosed)",
            "organization": "Kroger",
            "title": "Group Vice President, Communications & Public Affairs / de facto Chief Sustainability Officer",
            "status": "ACTIVE",
            "discovery_result": {
                "status": "ROLE_CONFIRMED_NAME_UNDISCLOSED",
                "finding": "Role confirmed, but named individual not publicly disclosed.",
            },
            "discovery_note": "Discovery placeholder until a named public incumbent is verified.",
            "aliases": [],
            "focus_topics": ["sustainability"],
            "collection_notes": "Public business signals only. No home/private tracking.",
        },
    )


def test_executive_intel_routes_build_portfolio_and_report(tmp_path, monkeypatch):
    root = tmp_path / "executive-intel"
    _seed_exec_workspace(root)
    monkeypatch.setenv("SENTRY_EXECUTIVE_INTEL_ROOT", str(root))

    import auth

    auth.AUTH_MODE = "off"
    from main import app

    client = TestClient(app)

    health = client.get("/api/executive-intel/health")
    assert health.status_code == 200
    health_payload = health.json()
    assert health_payload["writes_enabled"] is False
    assert health_payload["scheduler_enabled"] is False
    assert health_payload["publication_enabled"] is False
    assert "NO_SQLITE_WRITES" in health_payload["mandatory_review_controls"]
    assert "NO_OUTBOUND_DELIVERY" in health_payload["mandatory_review_controls"]
    assert "generate_draft_only_summaries_for_human_review" in health_payload["allowed_review_only_activities"]

    listing = client.get("/api/executive-intel/portfolios")
    assert listing.status_code == 200
    listing_payload = listing.json()
    assert listing_payload["total"] == 1
    assert listing_payload["portfolios"][0]["stats"]["signal_count"] == 1
    assert listing_payload["portfolios"][0]["stats"]["portfolio_ready_for_review"] is True

    portfolio = client.get("/api/executive-intel/portfolios/exec_example_security_leader")
    assert portfolio.status_code == 200
    portfolio_payload = portfolio.json()
    assert portfolio_payload["mode"] == "read_only_local_artifacts"
    assert portfolio_payload["stats"]["source_count"] == 1
    assert portfolio_payload["stats"]["cso_ready_signal_count"] == 1
    assert portfolio_payload["validation"]["invalid_signal_count"] == 0
    assert portfolio_payload["source_policy"]["counts"]["ALLOWED"] == 1

    report = client.get("/api/executive-intel/portfolios/exec_example_security_leader/report")
    assert report.status_code == 200
    report_payload = report.json()
    assert report_payload["publication_status"] == "NOT_PUBLISHED_REVIEW_REQUIRED"
    assert "# Example Security Leader Draft Brief" in report_payload["markdown"]


def test_executive_intel_routes_exclude_unnamed_placeholder_profiles(tmp_path, monkeypatch):
    root = tmp_path / "executive-intel"
    _seed_exec_workspace(root)
    _seed_placeholder_person_profile(root)
    monkeypatch.setenv("SENTRY_EXECUTIVE_INTEL_ROOT", str(root))

    import auth

    auth.AUTH_MODE = "off"
    from main import app

    client = TestClient(app)

    listing = client.get("/api/executive-intel/portfolios")
    assert listing.status_code == 200
    listing_payload = listing.json()
    assert listing_payload["total"] == 1
    assert listing_payload["excluded_quality_count"] == 1
    ids = {item["profile_id"] for item in listing_payload["portfolios"]}
    assert "exec_example_security_leader" in ids
    assert "exec_kroger_sustainability_lead_retarget" not in ids

    excluded = client.get("/api/executive-intel/portfolios/exec_kroger_sustainability_lead_retarget")
    assert excluded.status_code == 404
    assert "excluded by quality gate" in excluded.text


def test_executive_intel_routes_reject_bad_profile_id(tmp_path, monkeypatch):
    root = tmp_path / "executive-intel"
    _seed_exec_workspace(root)
    monkeypatch.setenv("SENTRY_EXECUTIVE_INTEL_ROOT", str(root))

    import auth

    auth.AUTH_MODE = "off"
    from main import app

    client = TestClient(app)
    response = client.get("/api/executive-intel/portfolios/bad!profile")

    assert response.status_code == 400
    assert "Invalid executive profile id" in response.text
