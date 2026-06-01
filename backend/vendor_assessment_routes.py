"""Read-only vendor assessment operations routes backed by Desktop SENTRY 00_System."""

from __future__ import annotations

import csv
import hashlib
import re
from collections import Counter
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from cache import ttl_cache
from database import get_connection
from path_config import (
    SENTRY_DATA_ROOT,
    VENDOR_ASSESSMENTS_ROOT,
    VENDOR_SYSTEM_ROOT as SYSTEM_ROOT,
    VENDOR_EXECUTIVE_VIEWS_ROOT as EXECUTIVE_VIEWS_ROOT,
    VENDOR_INCOMING_ROOT as INCOMING_ROOT,
    VENDOR_PROFILES_CSV,
    VENDOR_ENRICHED_INVENTORY_CSV,
)


router = APIRouter(prefix="/api/vendor-assessment", tags=["vendor-assessment"])

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


def _normalize_vendor_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())


def _fallback_vendor_id(company_name: str, technology_product: str) -> str:
    slug = f"{company_name}::{technology_product}".lower().strip()
    return hashlib.sha256(slug.encode()).hexdigest()[:12]


def _domain_label(value: str) -> str:
    return str(value or "").replace("_", " ").strip() or "Unclassified"


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
            "sentry_data_root": str(SENTRY_DATA_ROOT),
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


def _profile_for_vendor_id(vendor_id: str) -> dict[str, str] | None:
    profiles = _read_csv_rows(VENDOR_PROFILES_CSV)
    for row in profiles:
        company_name = str(row.get("vendor_folder") or "").strip()
        top_tags = str(row.get("top_semantic_tags") or "").strip()
        technology_product = top_tags.split(";")[0].strip() if top_tags else ""
        if _fallback_vendor_id(company_name, technology_product) == vendor_id:
            return row

    conn = get_connection()
    try:
        row = conn.execute("SELECT company_name FROM vendors WHERE id = ?", (vendor_id,)).fetchone()
    finally:
        conn.close()
    if not row:
        return None

    normalized = _normalize_vendor_key(str(row["company_name"] or ""))
    return next((profile for profile in profiles if _normalize_vendor_key(profile.get("vendor_folder", "")) == normalized), None)


@ttl_cache(ttl_seconds=300, key_prefix="vendor_assessment_evidence")
def _load_vendor_evidence(vendor_id: str) -> dict[str, Any]:
    profile = _profile_for_vendor_id(vendor_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Vendor assessment profile not found")

    vendor_key = str(profile.get("vendor_normalized_key") or _normalize_vendor_key(profile.get("vendor_folder", ""))).strip()
    inventory_rows = [
        row for row in _read_csv_rows(VENDOR_ENRICHED_INVENTORY_CSV)
        if str(row.get("vendor_normalized_key") or "").strip() == vendor_key
    ]

    artifact_role_counts = Counter(row.get("artifact_role", "Unclassified") or "Unclassified" for row in inventory_rows)
    extension_counts = Counter(row.get("extension", "") or "unknown" for row in inventory_rows)
    priority_counts = Counter(row.get("ai_access_priority", "") or "Unprioritized" for row in inventory_rows)
    total_bytes = sum(_safe_int(row.get("size_bytes")) for row in inventory_rows)

    artifacts = sorted(
        inventory_rows,
        key=lambda row: (str(row.get("modified_utc") or ""), str(row.get("filename") or "")),
        reverse=True,
    )

    return {
        "vendor_id": vendor_id,
        "vendor_folder": profile.get("vendor_folder", ""),
        "vendor_normalized_key": vendor_key,
        "source": {
            "operational_mode": "read_only_csv_inventory",
            "vendor_assessments_root": str(VENDOR_ASSESSMENTS_ROOT),
            "vendor_profiles_csv": str(VENDOR_PROFILES_CSV),
            "enriched_inventory_csv": str(VENDOR_ENRICHED_INVENTORY_CSV),
            "system_root": str(SYSTEM_ROOT),
            "source_run_label": profile.get("run_label", ""),
            "source_run_timestamp_utc": profile.get("run_timestamp_utc", ""),
            "source_actor_id": profile.get("actor_id", ""),
        },
        "profile": {
            "report_count": _safe_int(profile.get("report_count")),
            "dominant_domain": profile.get("dominant_domain", ""),
            "dominant_domain_label": _domain_label(profile.get("dominant_domain", "")),
            "secondary_domains": profile.get("secondary_domains", ""),
            "top_semantic_tags": profile.get("top_semantic_tags", ""),
            "top_stakeholder_tags": profile.get("top_stakeholder_tags", ""),
            "latest_modified_utc": profile.get("latest_modified_utc", ""),
            "sample_report_path": profile.get("sample_report_path", ""),
        },
        "summary": {
            "artifact_count": len(inventory_rows),
            "total_size_bytes": total_bytes,
            "artifact_role_counts": dict(artifact_role_counts.most_common()),
            "extension_counts": dict(extension_counts.most_common()),
            "priority_counts": dict(priority_counts.most_common()),
        },
        "artifacts": [
            {
                "filename": row.get("filename", ""),
                "current_path": row.get("current_path", ""),
                "subfolder": row.get("subfolder", ""),
                "extension": row.get("extension", ""),
                "artifact_role": row.get("artifact_role", ""),
                "primary_domain": row.get("primary_domain", ""),
                "technology_tags": row.get("technology_tags", ""),
                "human_browse_group": row.get("human_browse_group", ""),
                "ai_access_priority": row.get("ai_access_priority", ""),
                "enrichment_confidence": row.get("enrichment_confidence", ""),
                "status_label": row.get("status_label", ""),
                "size_bytes": _safe_int(row.get("size_bytes")),
                "modified_utc": row.get("modified_utc", ""),
                "sha256": row.get("sha256", ""),
            }
            for row in artifacts[:75]
        ],
    }


@router.get("/vendors/{vendor_id}/evidence")
def get_vendor_assessment_evidence(
    vendor_id: str,
    artifact_limit: int = Query(25, ge=1, le=75),
) -> dict[str, Any]:
    data = _load_vendor_evidence(vendor_id)
    return {
        **data,
        "artifacts": data["artifacts"][:artifact_limit],
    }
