"""Vendor directory scoring and grouping helpers.

Shared by public vendor API routes. Keeping this logic outside the route module
prevents vendor_routes.py from becoming another monolith while preserving the
existing response mapping behavior.
"""
from __future__ import annotations

import csv
import hashlib
import re

from fastapi import HTTPException

from cache import ttl_cache
from models import VendorOut, VendorProduct
from path_config import VENDOR_CANONICAL_DIRECTORY_CSV, VENDOR_PROFILES_CSV


# ── Vendor directory authority + scoring helpers ───────────────────────

def _normalize_vendor_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())


def _fallback_vendor_id(company_name: str, technology_product: str) -> str:
    slug = f"{company_name}::{technology_product}".lower().strip()
    return hashlib.sha256(slug.encode()).hexdigest()[:12]


def _fallback_category_from_domain(domain: str) -> str:
    clean_domain = str(domain or "").strip()
    if not clean_domain or clean_domain.upper() == "UNKNOWN":
        return "Other"
    return clean_domain.replace("_", " ")


def _fallback_risk_from_rating(rating: float) -> str:
    if rating >= 4.0:
        return "Low"
    if rating >= 3.0:
        return "Medium"
    if rating >= 2.0:
        return "High"
    return "Critical"


def _safe_float(value: object, default: float = 0.0) -> float:
    try:
        return float(str(value or "").strip())
    except (TypeError, ValueError):
        return default


def _safe_int(value: object, default: int = 0) -> int:
    try:
        return int(float(str(value or "").strip()))
    except (TypeError, ValueError):
        return default


@ttl_cache(ttl_seconds=300, key_prefix="vendor_profile_keys")
def _canonical_vendor_keys() -> set[str]:
    keys: set[str] = set()

    if VENDOR_CANONICAL_DIRECTORY_CSV.exists():
        with VENDOR_CANONICAL_DIRECTORY_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
            for row in csv.DictReader(handle):
                key = str(row.get("vendor_key") or "").strip().lower()
                if key:
                    keys.add(key)
        if keys:
            return keys

    if not VENDOR_PROFILES_CSV.exists():
        return set()

    with VENDOR_PROFILES_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            key = str(row.get("vendor_normalized_key") or "").strip().lower()
            if key:
                keys.add(key)
    return keys


def _is_vendor_in_directory(company_name: str, canonical_keys: set[str]) -> bool:
    if not canonical_keys:
        # Fail-open: if source file is unavailable, avoid blanking the directory.
        return True
    return _normalize_vendor_key(company_name) in canonical_keys


def _fallback_vendor_rows_from_canonical_directory() -> list[dict]:
    """Read the app-ready directory built from trackers + VAR report folders."""
    if not VENDOR_CANONICAL_DIRECTORY_CSV.exists():
        return []

    rows: list[dict] = []
    with VENDOR_CANONICAL_DIRECTORY_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            vendor_name = str(row.get("vendor_name") or "").strip()
            product_name = str(row.get("product_name") or "").strip()
            if not vendor_name:
                continue

            rating = _safe_float(row.get("rating"), 3.0)
            report_count = _safe_int(row.get("report_count"))
            selected_report_path = str(row.get("selected_report_path") or "").strip()
            selected_report_filename = str(row.get("selected_report_filename") or "").strip()
            source_evidence = str(row.get("source_evidence") or "").strip()
            latest_tracker_month = str(row.get("latest_tracker_month") or "").strip()
            category = str(row.get("canonical_category") or "Other / Watchlist").strip() or "Other / Watchlist"
            last_assessed = str(row.get("last_assessed") or row.get("selected_report_date") or "").strip()

            rows.append({
                "id": _fallback_vendor_id(vendor_name, product_name or selected_report_filename),
                "company_name": vendor_name,
                "company_url": str(row.get("source_url") or "").strip(),
                "category": category,
                "technology_product": product_name or selected_report_filename,
                "report_url": selected_report_path,
                "overall_rating": rating,
                "vendor_status": str(row.get("vendor_status") or "Assessed").strip() or "Assessed",
                "risk_level": str(row.get("risk_level") or _fallback_risk_from_rating(rating)).strip(),
                "last_assessed": last_assessed,
                "description": str(row.get("notes") or "").strip(),
                "founded_year": "",
                "hq_location": "",
                "business_owner": "",
                "sourcing_manager": "",
                "deployment_status": "Assessed" if selected_report_path else "Tracked",
                "hosting_type": "",
                "data_classification": "Internal",
                "vendor_highlight": (
                    f"{source_evidence or 'source-backed'} · {category}"
                    + (f" · tracker {latest_tracker_month}" if latest_tracker_month else "")
                    + (f" · selected VAR: {selected_report_filename}" if selected_report_filename else "")
                ),
                "pros": "",
                "cons": "",
                "concerns": "Review required" if str(row.get("needs_review") or "").strip() else "",
                "use_cases": str(row.get("use_cases") or "").strip(),
                "value_to_walmart": str(row.get("value_to_walmart") or "").strip(),
                "maturity_level": str(row.get("maturity_level") or "").strip(),
                "report_count": report_count,
                "dominant_domain": category,
                "secondary_domains": str(row.get("raw_tracker_category") or "").strip(),
                "top_semantic_tags": ";".join(
                    part for part in [
                        category,
                        str(row.get("source_evidence") or "").strip(),
                        str(row.get("tracker_status") or "").strip(),
                    ] if part
                ),
                "top_stakeholder_tags": str(row.get("confidence") or "").strip(),
                "sample_report_path": selected_report_path,
            })
    return rows


@ttl_cache(ttl_seconds=300, key_prefix="vendor_profile_rows")
def _fallback_vendor_rows_from_profiles() -> list[dict]:
    canonical_rows = _fallback_vendor_rows_from_canonical_directory()
    if canonical_rows:
        return canonical_rows

    if not VENDOR_PROFILES_CSV.exists():
        return []

    rows: list[dict] = []
    with VENDOR_PROFILES_CSV.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            company_name = str(row.get("vendor_folder") or "").strip()
            if not company_name:
                continue

            top_tags = str(row.get("top_semantic_tags") or "").strip()
            technology_product = top_tags.split(";")[0].strip() if top_tags else ""
            try:
                report_count = int(float(str(row.get("report_count") or "0").strip() or "0"))
            except ValueError:
                report_count = 0

            overall_rating = round(2.5 + min(report_count, 6) * 0.4, 2)
            latest_modified = str(row.get("latest_modified_utc") or "").strip()
            last_assessed = latest_modified.split("T")[0] if "T" in latest_modified else latest_modified

            dominant_domain = str(row.get("dominant_domain") or "").strip()
            sample_report_path = str(row.get("sample_report_path") or "").strip()

            rows.append({
                "id": _fallback_vendor_id(company_name, technology_product),
                "company_name": company_name,
                "company_url": "",
                "category": _fallback_category_from_domain(dominant_domain),
                "technology_product": technology_product,
                "report_url": sample_report_path,
                "overall_rating": overall_rating,
                "vendor_status": "Assessed",
                "risk_level": _fallback_risk_from_rating(overall_rating),
                "last_assessed": last_assessed,
                "description": "",
                "founded_year": "",
                "hq_location": "",
                "business_owner": "",
                "sourcing_manager": "",
                "deployment_status": "Prospect",
                "hosting_type": "",
                "data_classification": "Internal",
                "vendor_highlight": "",
                "pros": "",
                "cons": "",
                "concerns": "",
                "use_cases": "",
                "value_to_walmart": "",
                "maturity_level": "",
                "report_count": report_count,
                "dominant_domain": dominant_domain,
                "secondary_domains": str(row.get("secondary_domains") or "").strip(),
                "top_semantic_tags": top_tags,
                "top_stakeholder_tags": str(row.get("top_stakeholder_tags") or "").strip(),
                "sample_report_path": sample_report_path,
            })
    return rows


def _fallback_vendor_directory(
    category: str | None = None,
    search: str | None = None,
    risk: str | None = None,
) -> list[VendorOut]:
    rows = _fallback_vendor_rows_from_profiles()
    if category and category != "All":
        rows = [row for row in rows if str(row.get("category") or "") == category]
    if search:
        term = search.lower()
        rows = [
            row for row in rows
            if term in str(row.get("company_name") or "").lower()
            or term in str(row.get("technology_product") or "").lower()
            or term in str(row.get("category") or "").lower()
            or term in str(row.get("dominant_domain") or "").lower()
            or term in str(row.get("secondary_domains") or "").lower()
            or term in str(row.get("top_semantic_tags") or "").lower()
            or term in str(row.get("top_stakeholder_tags") or "").lower()
        ]
    if risk:
        rows = [row for row in rows if str(row.get("risk_level") or "") == risk]
    rows.sort(key=lambda row: float(row.get("overall_rating") or 0), reverse=True)
    return _group_products(rows)


def _decision_band_from_score(score: float | None) -> str:
    if score is None:
        return ""
    if score >= 4.0:
        return "Advance"
    if score >= 3.0:
        return "Research Further"
    if score >= 2.0:
        return "Defer"
    return "Reject"


def _decision_path_from_metrics(
    weight_score: float | None,
    decision_band: str,
    risk_score: float | None,
    compliance_score: float | None,
) -> str:
    if weight_score is None:
        return "No VAR weighted score has been extracted yet."

    lower_bound = {
        "Advance": "4.0 - 5.0",
        "Research Further": "3.0 - 3.9",
        "Defer": "2.0 - 2.9",
        "Reject": "0.0 - 1.9",
    }.get(decision_band, "band unavailable")

    notes: list[str] = [f"Weight score {weight_score:.1f}/5 maps to {decision_band} ({lower_bound})."]
    if (risk_score or 0) < 3:
        notes.append("Risk score < 3.0 added mitigation gating.")
    if (compliance_score or 0) < 3.5:
        notes.append("Compliance score < 3.5 added remediation requirements.")

    return " ".join(notes)


def _prefer_var_meta(candidate: dict | None, current: dict | None) -> bool:
    if not candidate:
        return False
    if not current:
        return True

    candidate_has_score = candidate.get("var_weight_score") is not None
    current_has_score = current.get("var_weight_score") is not None
    if candidate_has_score != current_has_score:
        return candidate_has_score

    candidate_date = str(candidate.get("_report_date") or "")
    current_date = str(current.get("_report_date") or "")
    if candidate_date != current_date:
        return candidate_date > current_date

    candidate_created = str(candidate.get("_created_at") or "")
    current_created = str(current.get("_created_at") or "")
    return candidate_created > current_created


def _latest_var_meta_by_vendor(conn, vendor_ids: list[str]) -> dict[str, dict]:
    if not vendor_ids:
        return {}

    placeholders = ",".join(["?"] * len(vendor_ids))
    rows = conn.execute(
        f"""
        SELECT
            vendor_id, id, report_date, created_at, decision_band,
            overall_score, compliance_score, risk_score, maturity_score,
            integration_score, roi_score, viability_score,
            differentiation_score, cloud_dep_score
        FROM var_reports
        WHERE vendor_id IN ({placeholders})
        ORDER BY
            vendor_id,
            CASE WHEN overall_score IS NOT NULL THEN 0 ELSE 1 END,
            report_date DESC,
            created_at DESC
        """,
        vendor_ids,
    ).fetchall()

    meta: dict[str, dict] = {}
    for report in rows:
        vendor_id = str(report["vendor_id"])
        if vendor_id in meta:
            continue

        weight_score = report["overall_score"]
        decision_band = str(report["decision_band"] or "").strip()
        if not decision_band:
            decision_band = _decision_band_from_score(weight_score)

        risk_score = report["risk_score"]
        compliance_score = report["compliance_score"]
        meta[vendor_id] = {
            "latest_var_id": str(report["id"] or ""),
            "var_scores": {
                "Overall": weight_score,
                "Compliance": compliance_score,
                "Risk": risk_score,
                "Maturity": report["maturity_score"],
                "Integration": report["integration_score"],
                "ROI": report["roi_score"],
                "Viability": report["viability_score"],
                "Differentiation": report["differentiation_score"],
                "Cloud Dep": report["cloud_dep_score"],
            },
            "var_weight_score": weight_score,
            "var_decision_band": decision_band,
            "var_decision_path": _decision_path_from_metrics(
                weight_score,
                decision_band,
                risk_score,
                compliance_score,
            ),
            "_report_date": str(report["report_date"] or ""),
            "_created_at": str(report["created_at"] or ""),
        }

    return meta


# ── Vendors ────────────────────────────────────────────────────────────

def _group_products(
    rows: list[dict],
    var_vendor_ids: set[str] | None = None,
    latest_var_ids: dict[str, str] | None = None,
    latest_var_meta: dict[str, dict] | None = None,
) -> list[VendorOut]:
    """Group multiple product rows for the same company into one VendorOut."""
    var_ids = var_vendor_ids or set()
    var_id_map = latest_var_ids or {}
    var_meta_map = latest_var_meta or {}
    companies: dict[str, VendorOut] = {}
    company_var_meta: dict[str, dict] = {}
    for row in rows:
        name = row["company_name"]
        candidate_var_meta = var_meta_map.get(str(row["id"]))
        product = VendorProduct(
            report_url=row["report_url"],
            technology_product=row["technology_product"],
            overall_rating=row["overall_rating"],
            vendor_status=row["vendor_status"],
            last_assessed=row["last_assessed"],
        )
        if name in companies:
            companies[name].all_products.append(product)
            if not companies[name].has_var and (row["id"] in var_ids or bool(row.get("report_url"))):
                companies[name].has_var = True
            if _prefer_var_meta(candidate_var_meta, company_var_meta.get(name)):
                company_var_meta[name] = candidate_var_meta
                companies[name].latest_var_id = str(candidate_var_meta.get("latest_var_id") or companies[name].latest_var_id)
                companies[name].var_scores = candidate_var_meta.get("var_scores")
                companies[name].var_weight_score = candidate_var_meta.get("var_weight_score")
                companies[name].var_decision_band = str(candidate_var_meta.get("var_decision_band") or "")
                companies[name].var_decision_path = str(candidate_var_meta.get("var_decision_path") or "")
        else:
            has_v = row["id"] in var_ids or bool(row.get("report_url"))
            if candidate_var_meta:
                company_var_meta[name] = candidate_var_meta
            companies[name] = VendorOut(
                id=row["id"],
                company_name=name,
                company_url=row.get("company_url", ""),
                category=row["category"],
                technology_product=row["technology_product"],
                report_url=row["report_url"],
                overall_rating=row["overall_rating"],
                vendor_status=row["vendor_status"],
                risk_level=row["risk_level"],
                last_assessed=row["last_assessed"],
                has_var=has_v,
                latest_var_id=str(candidate_var_meta.get("latest_var_id") or var_id_map.get(row["id"], "")) if candidate_var_meta else var_id_map.get(row["id"], ""),
                all_products=[product],
                var_scores=candidate_var_meta.get("var_scores") if candidate_var_meta else None,
                var_weight_score=candidate_var_meta.get("var_weight_score") if candidate_var_meta else None,
                var_decision_band=str(candidate_var_meta.get("var_decision_band") or "") if candidate_var_meta else "",
                var_decision_path=str(candidate_var_meta.get("var_decision_path") or "") if candidate_var_meta else "",
                # Extended fields
                description=row.get("description", ""),
                founded_year=row.get("founded_year", ""),
                hq_location=row.get("hq_location", ""),
                business_owner=row.get("business_owner", ""),
                sourcing_manager=row.get("sourcing_manager", ""),
                deployment_status=row.get("deployment_status", "Prospect"),
                hosting_type=row.get("hosting_type", ""),
                data_classification=row.get("data_classification", "Internal"),
                # Enhanced vendor details (202601/202602 import)
                vendor_highlight=row.get("vendor_highlight", ""),
                pros=row.get("pros", ""),
                cons=row.get("cons", ""),
                concerns=row.get("concerns", ""),
                use_cases=row.get("use_cases", ""),
                value_to_walmart=row.get("value_to_walmart", ""),
                maturity_level=row.get("maturity_level", ""),
                report_count=int(row.get("report_count") or 0),
                dominant_domain=row.get("dominant_domain", ""),
                secondary_domains=row.get("secondary_domains", ""),
                top_semantic_tags=row.get("top_semantic_tags", ""),
                top_stakeholder_tags=row.get("top_stakeholder_tags", ""),
                sample_report_path=row.get("sample_report_path", row.get("report_url", "")),
            )
    return list(companies.values())


def _company_vendor_scope(conn, vendor_id: str) -> tuple[dict, list[str]]:
    row = conn.execute(
        "SELECT * FROM vendors WHERE id = ?",
        (vendor_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Vendor not found")

    row_dict = dict(row)
    company_rows = conn.execute(
        "SELECT id FROM vendors WHERE company_name = ? ORDER BY overall_rating DESC",
        (row_dict["company_name"],),
    ).fetchall()
    company_vendor_ids = [str(company_row["id"]) for company_row in company_rows]
    return row_dict, company_vendor_ids
