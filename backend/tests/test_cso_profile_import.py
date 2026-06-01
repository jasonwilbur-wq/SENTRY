"""Tests for the governed CSO profile importer (handoff bundle -> findings).

Pure mapping logic is tested directly; the store-touching merge path is covered
via a temp DB monkeypatch so we never write the real database.
"""
from __future__ import annotations

import cso_profile_import as imp
import cso_profile_store as store


def _finalized_bundle(profile_id="new-leader", signals=None):
    return {
        "bundle_id": "handoff_test_1",
        "profile_id": profile_id,
        "handoff_status": imp.FINALIZED_STATUS,
        "profile": {
            "profile_id": profile_id,
            "full_name": "Jane Doe",
            "organization": "Acme Retail",
            "title": "CISO",
        },
        "signals": signals if signals is not None else [
            {
                "signal_id": "sig-1",
                "category": "ORG_CHANGE",
                "event_date": "2026-05-10",
                "title": "Named CISO at Acme Retail",
                "summary": "Public announcement of CISO appointment.",
                "walmart_cso_relevance": "New peer CISO worth tracking for posture shifts.",
                "confidence_level": "HIGH_PRIMARY_SOURCE",
                "citations": [
                    {
                        "publisher": "Acme Newsroom",
                        "url": "https://acme.example/news",
                        "published_date": "2026-05-10",
                    }
                ],
            }
        ],
    }


def test_signal_maps_to_finding_shape():
    finding = imp._signal_to_finding(_finalized_bundle()["signals"][0])
    assert finding["id"] == "sig-1"
    assert finding["type"] == "org_change"
    assert finding["riskColor"] == "ORANGE"
    assert finding["date"] == "2026-05-10"
    assert finding["whyItMatters"].startswith("New peer")
    assert finding["sources"][0]["publisher"] == "Acme Newsroom"


def test_unknown_event_date_becomes_blank():
    sig = _finalized_bundle()["signals"][0] | {"event_date": "UNKNOWN"}
    assert imp._signal_to_finding(sig)["date"] == ""


def test_refuses_unfinalized_bundle():
    bundle = _finalized_bundle()
    bundle["handoff_status"] = "DRAFT_HANDOFF_REVIEW_ONLY"
    try:
        imp.import_handoff_bundle(bundle, updated_by="tester")
        assert False, "expected ImportError_"
    except imp.ImportError_ as exc:
        assert "refusing import" in str(exc)


def test_empty_signals_is_noop(monkeypatch):
    bundle = _finalized_bundle(signals=[])
    result = imp.import_handoff_bundle(bundle, updated_by="tester")
    assert result["imported"] is False
    assert result["reason"] == "no_signals_in_bundle"


def test_new_profile_import_writes_store(monkeypatch):
    saved = {}

    def fake_get_profile(pid):
        return saved.get(pid)

    def fake_upsert(profile, *, source, updated_by):
        saved[profile["id"]] = profile

    monkeypatch.setattr(imp, "get_profile", fake_get_profile)
    monkeypatch.setattr(imp, "upsert_profile", fake_upsert)

    result = imp.import_handoff_bundle(_finalized_bundle(), updated_by="tester")
    assert result["imported"] is True
    assert result["is_new_profile"] is True
    assert result["findings_added"] == 1
    assert saved["new-leader"]["company"] == "Acme Retail"
    assert "(Unverified)" in saved["new-leader"]["title"]


def test_merge_appends_only_new_findings(monkeypatch):
    existing = {
        "id": "new-leader",
        "name": "Jane Doe",
        "title": "CISO",
        "company": "Acme Retail",
        "threatLevel": "MEDIUM",
        "profileImage": "",
        "bio": "x",
        "keyFindings": [{"id": "sig-1", "headline": "old"}],
        "recentActivity": [],
        "strategicThreats": [],
        "recommendations": [],
    }
    saved = {"new-leader": existing}
    monkeypatch.setattr(imp, "get_profile", lambda pid: saved.get(pid))
    monkeypatch.setattr(imp, "upsert_profile",
                        lambda profile, *, source, updated_by: saved.update({profile["id"]: profile}))

    # Bundle re-sends sig-1 plus a new sig-2 -> only sig-2 should be appended.
    bundle = _finalized_bundle()
    bundle["signals"].append(bundle["signals"][0] | {"signal_id": "sig-2", "title": "new one"})
    result = imp.import_handoff_bundle(bundle, updated_by="tester")
    assert result["findings_added"] == 1
    assert result["total_findings"] == 2
