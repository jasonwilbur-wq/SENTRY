"""Read-only vendor assessment operations routes backed by Desktop SENTRY 00_System."""

from __future__ import annotations

import csv
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Query

from cache import ttl_cache


router = APIRouter(prefix="/api/vendor-assessment", tags=["vendor-assessment"])

VENDOR_ASSESSMENTS_ROOT = Path(
    os.environ.get(
        "SENTRY_VENDOR_ASSESSMENTS_ROOT",
        r"C:\Users\j0w16ja\OneDrive - Walmart Inc\Desktop\SENTRY\Vendor Assessments",
    )
)
SYSTEM_ROOT = VENDOR_ASSESSMENTS_ROOT / "00_System"
EXECUTIVE_VIEWS_ROOT = SYSTEM_ROOT / "executive_views"
INCOMING_ROOT = VENDOR_ASSESSMENTS_ROOT / "01_Incoming_To_Organize"

VENDOR_PROFILES_CSV = SYSTEM_ROOT / "vendor_assessment_vendor_profiles.csv"
INTAKE_QUEUE_CSV = SYSTEM_ROOT / "vendor_assessment_intake_queue.csv"
INTAKE_RECOMMENDATIONS_CSV = SYSTEM_ROOT / "vendor_assessment_intake_recommendations.csv"
INTAKE_ACTION_PLAN_CSV = SYSTEM_ROOT / "vendor_assessment_intake_action_plan.csv"
RECENT_ADDITIONS_CSV = EXECUTIVE_VIEWS_ROOT / "recent_report_additions.csv"
MULTI_DOMAIN_VENDORS_CSV = EXECUTIVE_VIEWS_ROOT / "multi_domain_vendors.csv"
TOP_CYBERSECURITY_CSV = EXECUTIVE_VIEWS_ROOT / "top_cybersecurity_vendors.csv"
TOP_DRONE_CUAS_CSV = EXECUTIVE_VIEWS_ROOT / "top_drone_cuas_vendors.csv"
TOP_ROBOTICS_CSV = EXECUTIVE_VIEWS_ROOT / "top_robotics_vendors.csv"
TOP_IDENTITY_CSV = EXECUTIVE_VIEWS_ROOT / "top_identity_vendors.csv"


def _read_csv_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return [
            {str(k or "").strip(): str(v or "").strip() for k, v in row.items()}
            for row in csv.DictReader(handle)
        ]


def _safe_int(value: str | None) -> int:
    try:
        return int(float(str(value or "0").strip() or "0"))
    except (TypeError, ValueError):
        return 0


@ttl_cache(ttl_seconds=300, key_prefix="vendor_assessment_overview")
def _load_overview() -> dict[str, Any]:
    profiles = _read_csv_rows(VENDOR_PROFILES_CSV)
    intake_queue = _read_csv_rows(INTAKE_QUEUE_CSV)
    intake_recommendations = _read_csv_rows(INTAKE_RECOMMENDATIONS_CSV)
    intake_action_plan = _read_csv_rows(INTAKE_ACTION_PLAN_CSV)
    recent_additions = _read_csv_rows(RECENT_ADDITIONS_CSV)
    multi_domain = _read_csv_rows(MULTI_DOMAIN_VENDORS_CSV)

    top_domain_files = {
        "cybersecurity": _read_csv_rows(TOP_CYBERSECURITY_CSV),
        "drone_cuas": _read_csv_rows(TOP_DRONE_CUAS_CSV),
        "robotics": _read_csv_rows(TOP_ROBOTICS_CSV),
        "identity": _read_csv_rows(TOP_IDENTITY_CSV),
    }

    domain_counts: dict[str, int] = {}
    unknown_domain_profiles = 0
    for row in profiles:
        domain = str(row.get("dominant_domain") or "UNKNOWN").strip() or "UNKNOWN"
        domain_counts[domain] = domain_counts.get(domain, 0) + 1
        if domain.upper() == "UNKNOWN":
            unknown_domain_profiles += 1

    approval_bucket_counts = {
        "READY_FOR_APPROVAL": 0,
        "REVIEW_THEN_APPROVAL": 0,
        "HOLD_IN_INTAKE": 0,
    }
    for row in intake_action_plan:
        bucket = str(row.get("approval_bucket") or "").strip().upper()
        if bucket in approval_bucket_counts:
            approval_bucket_counts[bucket] += 1

    return {
        "source": {
            "operational_mode": "read_only_csv_and_sqlite",
            "operational_source": str(SYSTEM_ROOT),
            "vendor_assessments_root": str(VENDOR_ASSESSMENTS_ROOT),
            "intake_root": str(INCOMING_ROOT),
            "sqlite_memory": str(SYSTEM_ROOT / "vendor_assessment_memory.sqlite"),
            "vendor_profiles_csv": str(VENDOR_PROFILES_CSV),
            "executive_views_root": str(EXECUTIVE_VIEWS_ROOT),
            "available": {
                "system_root": SYSTEM_ROOT.exists(),
                "vendor_profiles_csv": VENDOR_PROFILES_CSV.exists(),
                "executive_views_root": EXECUTIVE_VIEWS_ROOT.exists(),
                "sqlite_memory": (SYSTEM_ROOT / "vendor_assessment_memory.sqlite").exists(),
                "incoming_root": INCOMING_ROOT.exists(),
            },
        },
        "stats": {
            "vendor_profiles_total": len(profiles),
            "domain_counts": domain_counts,
            "unknown_domain_profiles": unknown_domain_profiles,
            "active_intake_items": len(intake_queue),
            "ready_for_approval": approval_bucket_counts["READY_FOR_APPROVAL"],
            "review_then_approval": approval_bucket_counts["REVIEW_THEN_APPROVAL"],
            "hold_in_intake": approval_bucket_counts["HOLD_IN_INTAKE"],
            "recent_additions_count": len(recent_additions),
            "multi_domain_watchlist_count": len(multi_domain),
        },
        "process": {
            "intake_rule": "All new files enter through 01_Incoming_To_Organize.",
            "routing_rule": "Trackers route to Emerging Tech Trackers; report artifacts route to Vendor Assessment Reports.",
            "persistence_rule": "Update SQLite first, then CSV audit artifacts.",
            "safety_rule": "Never delete during intake; archive or hold instead.",
        },
        "recent_additions": [
            {
                "vendor_folder": row.get("vendor_folder", ""),
                "dominant_domain": row.get("dominant_domain", ""),
                "latest_modified_utc": row.get("latest_modified_utc", ""),
                "report_count": _safe_int(row.get("report_count")),
                "top_semantic_tags": row.get("top_semantic_tags", ""),
                "sample_report_path": row.get("sample_report_path", ""),
            }
            for row in recent_additions
        ],
        "multi_domain_watchlist": [
            {
                "vendor_folder": row.get("vendor_folder", ""),
                "dominant_domain": row.get("dominant_domain", ""),
                "secondary_domains": row.get("secondary_domains", ""),
                "report_count": _safe_int(row.get("report_count")),
                "top_semantic_tags": row.get("top_semantic_tags", ""),
                "top_stakeholder_tags": row.get("top_stakeholder_tags", ""),
                "sample_report_path": row.get("sample_report_path", ""),
            }
            for row in multi_domain
        ],
        "domain_leaders": {
            domain: [
                {
                    "vendor_folder": row.get("vendor_folder", ""),
                    "report_count": _safe_int(row.get("report_count")),
                    "dominant_domain": row.get("dominant_domain", ""),
                    "secondary_domains": row.get("secondary_domains", ""),
                    "top_semantic_tags": row.get("top_semantic_tags", ""),
                }
                for row in rows
            ]
            for domain, rows in top_domain_files.items()
        },
        "raw_counts": {
            "intake_recommendations": len(intake_recommendations),
            "intake_action_plan_rows": len(intake_action_plan),
        },
    }


@router.get("/overview")
def get_vendor_assessment_overview(
    recent_limit: int = Query(8, ge=1, le=20),
    watchlist_limit: int = Query(8, ge=1, le=20),
    leaders_limit: int = Query(6, ge=1, le=12),
) -> dict[str, Any]:
    data = _load_overview()
    return {
        **data,
        "recent_additions": data["recent_additions"][:recent_limit],
        "multi_domain_watchlist": data["multi_domain_watchlist"][:watchlist_limit],
        "domain_leaders": {
            domain: rows[:leaders_limit]
            for domain, rows in data["domain_leaders"].items()
        },
    }
