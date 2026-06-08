"""Vendor Intelligence public API routes.

Owns vendor directory, vendor-scoped VAR report reads, public stats, and vendor
technology-pipeline endpoints previously embedded in main.py. Endpoint paths and
response shapes are preserved for frontend compatibility.
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Query

from cache import ttl_cache
from database import get_connection
from models import (
    CategoriesResponse,
    HighlightsResponse,
    HighlightOut,
    VarReportOut,
    VarReportsResponse,
    VendorOut,
    VendorsResponse,
)
from vendor_directory import (
    _canonical_vendor_keys,
    _company_vendor_scope,
    _fallback_vendor_directory,
    _group_products,
    _is_vendor_in_directory,
    _latest_var_meta_by_vendor,
    _decision_band_from_score,
    _decision_path_from_metrics,
)
from vendor_pipeline_utils import _has_structured_var_score, _pipeline_stage

ROUTER = APIRouter(tags=["vendors"])


@ROUTER.get("/api/vendors", response_model=VendorsResponse)
def list_vendors(
    category: str | None = Query(None),
    search:   str | None = Query(None),
    risk:     str | None = Query(None),
    page:      int = Query(1,  ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Return vendors paginated, optionally filtered by category or search term.

    Grouping (multiple products per company) happens in Python after the DB
    fetch — SQLite has ~1,931 rows so this is sub-millisecond.
    """
    params: list[str] = []
    clauses: list[str] = []

    if category and category != "All":
        clauses.append("category = ?")
        params.append(category)
    if search:
        clauses.append(
            "(LOWER(company_name) LIKE ? OR LOWER(technology_product) LIKE ?)"
        )
        term = f"%{search.lower()}%"
        params.extend([term, term])
    if risk:
        clauses.append("risk_level = ?")
        params.append(risk)

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    query = f"SELECT * FROM vendors {where} ORDER BY overall_rating DESC"

    conn = get_connection()
    try:
        rows = [dict(r) for r in conn.execute(query, params).fetchall()]
        # Fetch vendor IDs that have VAR reports
        var_ids = {
            r[0] for r in conn.execute("SELECT DISTINCT vendor_id FROM var_reports").fetchall()
        }
        # Latest VAR id per vendor (for download proxy)
        latest_var_ids = {
            r[0]: r[1]
            for r in conn.execute(
                "SELECT vendor_id, id FROM var_reports "
                "GROUP BY vendor_id HAVING report_date = MAX(report_date)"
            ).fetchall()
        }
        latest_var_meta = _latest_var_meta_by_vendor(conn, [str(r["id"]) for r in rows])
    finally:
        conn.close()

    # Group multiple-product rows into logical vendors
    db_vendors = _group_products(rows, var_ids, latest_var_ids, latest_var_meta)
    source_vendors = _fallback_vendor_directory(category=category, search=search, risk=risk)
    all_vendors = source_vendors or db_vendors

    total       = len(all_vendors)
    total_pages = max(1, math.ceil(total / page_size))
    page        = min(page, total_pages)          # clamp to valid range
    offset      = (page - 1) * page_size
    page_vendors = all_vendors[offset : offset + page_size]

    return VendorsResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        vendors=page_vendors,
    )


# NOTE: /categories MUST be registered before /{vendor_id} to avoid shadowing
@ROUTER.get("/api/vendors/categories", response_model=CategoriesResponse)
def list_categories():
    """Return distinct vendor categories (cached 5 min)."""
    return CategoriesResponse(categories=_cached_categories())


@ttl_cache(ttl_seconds=300, key_prefix="categories")
def _cached_categories() -> list[str]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT category, company_name FROM vendors"
        ).fetchall()
    finally:
        conn.close()
    categories = [str(r["category"] or "").strip() for r in rows if str(r["category"] or "").strip()]
    source_categories = [vendor.category for vendor in _fallback_vendor_directory() if vendor.category]
    preferred = source_categories or categories
    return list(dict.fromkeys(preferred))


@ROUTER.get("/api/vendors/{vendor_id}", response_model=VendorOut)
def get_vendor(vendor_id: str):
    """Return a vendor by ID, grouped at company level with latest VAR context."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM vendors WHERE id = ?", (vendor_id,)
        ).fetchone()
        if not row:
            fallback_vendor = next((vendor for vendor in _fallback_vendor_directory() if vendor.id == vendor_id), None)
            if fallback_vendor:
                return fallback_vendor
            raise HTTPException(status_code=404, detail="Vendor not found")

        company_name = row["company_name"]
        company_rows = [
            dict(r)
            for r in conn.execute(
                "SELECT * FROM vendors WHERE company_name = ? ORDER BY overall_rating DESC",
                (company_name,),
            ).fetchall()
        ]

        company_vendor_ids = [r["id"] for r in company_rows]
        placeholders = ",".join(["?"] * len(company_vendor_ids))

        var_ids: set[str] = set()
        latest_var_id_map: dict[str, str] = {}
        latest_var_row = None

        if company_vendor_ids:
            var_rows = conn.execute(
                f"SELECT DISTINCT vendor_id FROM var_reports WHERE vendor_id IN ({placeholders})",
                company_vendor_ids,
            ).fetchall()
            var_ids = {r[0] for r in var_rows}

            latest_rows = conn.execute(
                f"""
                SELECT vr.vendor_id, vr.id
                FROM var_reports vr
                JOIN (
                    SELECT vendor_id, MAX(report_date) AS max_date
                    FROM var_reports
                    WHERE vendor_id IN ({placeholders})
                    GROUP BY vendor_id
                ) latest
                  ON latest.vendor_id = vr.vendor_id
                 AND latest.max_date = vr.report_date
                """,
                company_vendor_ids,
            ).fetchall()
            latest_var_id_map = {r[0]: r[1] for r in latest_rows}

            latest_var_row = conn.execute(
                f"""
                SELECT
                    id, vendor_id, decision_band,
                    overall_score, compliance_score, risk_score, maturity_score,
                    integration_score, roi_score, viability_score,
                    differentiation_score, cloud_dep_score
                FROM var_reports
                WHERE vendor_id IN ({placeholders})
                ORDER BY
                    CASE WHEN overall_score IS NOT NULL THEN 0 ELSE 1 END,
                    report_date DESC,
                    created_at DESC
                LIMIT 1
                """,
                company_vendor_ids,
            ).fetchone()
    finally:
        conn.close()

    base_vendor = _group_products(company_rows, var_ids, latest_var_id_map)[0]
    primary_row = company_rows[0] if company_rows else dict(row)

    var_scores = None
    var_weight_score: float | None = None
    var_decision_band = ""
    var_decision_path = ""
    var_concern_notes: list[str] = []
    if latest_var_row:
        var_scores = {
            "Overall": latest_var_row[3],
            "Compliance": latest_var_row[4],
            "Risk": latest_var_row[5],
            "Maturity": latest_var_row[6],
            "Integration": latest_var_row[7],
            "ROI": latest_var_row[8],
            "Viability": latest_var_row[9],
            "Differentiation": latest_var_row[10],
            "Cloud Dep": latest_var_row[11],
        }

        var_weight_score = latest_var_row[3]
        var_decision_band = str(latest_var_row[2] or "").strip()
        if not var_decision_band:
            var_decision_band = _decision_band_from_score(var_weight_score)

        risk_score = latest_var_row[5]
        compliance_score = latest_var_row[4]

        var_decision_path = _decision_path_from_metrics(
            var_weight_score,
            var_decision_band,
            risk_score,
            compliance_score,
        )

        if var_decision_band:
            var_concern_notes.append(f"VAR decision band: {var_decision_band}.")
        if (risk_score or 0) < 3:
            var_concern_notes.append("VAR risk score is below 3.0; enhanced controls recommended.")
        if (compliance_score or 0) < 3.5:
            var_concern_notes.append("VAR compliance score is below 3.5; remediation plan should be tracked.")

    concerns_base = str(primary_row.get("concerns") or "").strip()
    concern_parts = [c.strip() for c in concerns_base.split("|") if c.strip()]
    for note in var_concern_notes:
        if note not in concern_parts:
            concern_parts.append(note)
    concerns_annotated = " | ".join(concern_parts)

    enriched_data = base_vendor.dict()
    enriched_data.update({
        "var_scores": var_scores,
        "var_weight_score": var_weight_score,
        "var_decision_band": var_decision_band,
        "var_decision_path": var_decision_path,
        "description": str(primary_row.get("description") or ""),
        "founded_year": str(primary_row.get("founded_year") or ""),
        "hq_location": str(primary_row.get("hq_location") or ""),
        "business_owner": str(primary_row.get("business_owner") or ""),
        "sourcing_manager": str(primary_row.get("sourcing_manager") or ""),
        "deployment_status": str(primary_row.get("deployment_status") or "Prospect"),
        "hosting_type": str(primary_row.get("hosting_type") or ""),
        "data_classification": str(primary_row.get("data_classification") or "Internal"),
        "concerns": concerns_annotated,
    })

    return VendorOut(**enriched_data)


@ROUTER.get("/api/vendors/{vendor_id}/highlights", response_model=HighlightsResponse)
def get_vendor_highlights(vendor_id: str):
    """Return monthly assessment highlights across all rows for the grouped vendor company."""
    conn = get_connection()
    try:
        _, company_vendor_ids = _company_vendor_scope(conn, vendor_id)
        placeholders = ",".join(["?"] * len(company_vendor_ids))
        rows = conn.execute(
            f"SELECT * FROM vendor_highlights WHERE vendor_id IN ({placeholders}) "
            "ORDER BY assessment_date DESC, source_file DESC",
            company_vendor_ids,
        ).fetchall()
    finally:
        conn.close()
    highlights = [HighlightOut(**dict(r)) for r in rows]
    return HighlightsResponse(total=len(highlights), highlights=highlights)


@ROUTER.get("/api/vendors/{vendor_id}/var-reports", response_model=VarReportsResponse)
def get_vendor_var_reports(vendor_id: str):
    """Return VAR reports across all rows for the grouped vendor company."""
    conn = get_connection()
    try:
        _, company_vendor_ids = _company_vendor_scope(conn, vendor_id)
        placeholders = ",".join(["?"] * len(company_vendor_ids))
        rows = conn.execute(
            f"SELECT * FROM var_reports WHERE vendor_id IN ({placeholders}) ORDER BY report_date DESC, created_at DESC",
            company_vendor_ids,
        ).fetchall()
    finally:
        conn.close()
    reports = [VarReportOut(**dict(r)) for r in rows]
    return VarReportsResponse(total=len(reports), reports=reports)

# ── Public stats (used by Vendor Directory dashboard) ────────────────────

@ROUTER.get("/api/stats")
def public_stats():
    """Aggregate stats — delegates to cached computation."""
    return _compute_public_stats()


@ttl_cache(ttl_seconds=60, key_prefix="public_stats")
def _compute_public_stats():
    """Cached: aggregate stats computation (expensive — multiple GROUP BY queries)."""
    conn = get_connection()
    try:
        vendor_rows = [
            dict(r)
            for r in conn.execute(
                "SELECT id, company_name, overall_rating, risk_level, category, last_assessed FROM vendors"
            ).fetchall()
        ]

        canonical_keys = _canonical_vendor_keys()
        allowed_rows = [
            r for r in vendor_rows if _is_vendor_in_directory(str(r.get("company_name") or ""), canonical_keys)
        ]
        allowed_ids = {str(r["id"]) for r in allowed_rows}

        var_rows = [
            dict(r)
            for r in conn.execute(
                "SELECT vendor_id, decision_band FROM var_reports"
            ).fetchall()
            if str(r["vendor_id"]) in allowed_ids
        ]
    finally:
        conn.close()

    source_vendors = _fallback_vendor_directory()
    if source_vendors:
        allowed_rows = [
            {
                "id": vendor.id,
                "company_name": vendor.company_name,
                "overall_rating": vendor.overall_rating,
                "risk_level": vendor.risk_level,
                "category": vendor.category,
                "last_assessed": vendor.last_assessed,
            }
            for vendor in source_vendors
        ]
        allowed_ids = {str(vendor.id) for vendor in source_vendors}
        var_rows = [row for row in var_rows if str(row.get("vendor_id") or "") in allowed_ids]

    total_vendors = len(allowed_rows)
    total_vars = len(var_rows)
    vendors_with_var = len({str(r["vendor_id"]) for r in var_rows})

    avg_rating_raw = [float(r["overall_rating"] or 0) for r in allowed_rows]
    avg_rating = (sum(avg_rating_raw) / len(avg_rating_raw)) if avg_rating_raw else 0

    risk_distribution: dict[str, int] = {}
    for row in allowed_rows:
        risk = str(row.get("risk_level") or "").strip()
        if risk:
            risk_distribution[risk] = risk_distribution.get(risk, 0) + 1

    cat_counts: dict[str, int] = {}
    cat_scores: dict[str, list[float]] = {}
    for row in allowed_rows:
        category = str(row.get("category") or "Other")
        cat_counts[category] = cat_counts.get(category, 0) + 1
        cat_scores.setdefault(category, []).append(float(row.get("overall_rating") or 0))

    top_categories = sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)[:12]
    top_category_rows = [
        {
            "category": category,
            "count": count,
            "avg_rating": round(sum(cat_scores[category]) / len(cat_scores[category]), 2),
        }
        for category, count in top_categories
    ]

    band_counts: dict[str, int] = {}
    for row in var_rows:
        band = str(row.get("decision_band") or "").strip()
        if band:
            band_counts[band] = band_counts.get(band, 0) + 1

    cutoff = datetime.utcnow() - timedelta(days=90)
    recent_company_names: set[str] = set()
    for row in allowed_rows:
        assessed = str(row.get("last_assessed") or "").strip()
        if not assessed:
            continue
        try:
            assessed_dt = datetime.fromisoformat(assessed[:10])
        except ValueError:
            continue
        if assessed_dt >= cutoff:
            recent_company_names.add(str(row.get("company_name") or ""))
    recent_rows = len(recent_company_names)

    return {
        "total_vendors": total_vendors,
        "total_vars": total_vars,
        "vendors_with_var": vendors_with_var,
        "var_coverage_pct": round(vendors_with_var / total_vendors * 100, 1) if total_vendors else 0,
        "avg_rating": round(avg_rating, 2),
        "recently_assessed": recent_rows,
        "risk_distribution": risk_distribution,
        "top_categories": top_category_rows,
        "decision_bands": band_counts,
    }


@ROUTER.get("/api/vendors/{vendor_id}/tech-pipeline")
def vendor_tech_pipeline(vendor_id: str):
    """Return assessment pipeline summary across all product rows for the grouped vendor company.

    Returns per-product pipeline stage progress:
    pre_assessment -> initial_assessment -> technical_assessment -> var_report
    """
    conn = get_connection()
    try:
        try:
            _, company_vendor_ids = _company_vendor_scope(conn, vendor_id)
        except HTTPException as exc:
            fallback_vendor = next((vendor for vendor in _fallback_vendor_directory() if vendor.id == vendor_id), None)
            if not fallback_vendor:
                raise exc

            fallback_has_var_scored = _has_structured_var_score(
                fallback_vendor.var_weight_score,
                fallback_vendor.var_scores,
            )
            fallback_products = [
                {
                    "product_name": product.technology_product or fallback_vendor.technology_product or fallback_vendor.company_name,
                    "assessment_date": product.last_assessed or fallback_vendor.last_assessed,
                    "source_file": product.report_url or fallback_vendor.sample_report_path or "source-backed vendor directory",
                    "pre_assessment_score": product.overall_rating or fallback_vendor.overall_rating,
                    "pre_assessment_decision": fallback_vendor.vendor_status or fallback_vendor.deployment_status,
                    "maturity_level": fallback_vendor.maturity_level,
                    "initial_assessment": "Tracked",
                    "technical_assessment": "Documented" if (product.report_url or fallback_vendor.sample_report_path) else "",
                    "has_var": fallback_vendor.has_var,
                    "has_var_scored": fallback_has_var_scored,
                    "pipeline_stage": _pipeline_stage(
                        fallback_vendor.vendor_status or fallback_vendor.deployment_status,
                        "Tracked",
                        "Documented" if (product.report_url or fallback_vendor.sample_report_path) else "",
                        fallback_has_var_scored,
                    ),
                }
                for product in (fallback_vendor.all_products or [])
            ]
            if not fallback_products:
                fallback_products = [{
                    "product_name": fallback_vendor.technology_product or fallback_vendor.company_name,
                    "assessment_date": fallback_vendor.last_assessed,
                    "source_file": fallback_vendor.sample_report_path or fallback_vendor.report_url or "source-backed vendor directory",
                    "pre_assessment_score": fallback_vendor.overall_rating,
                    "pre_assessment_decision": fallback_vendor.vendor_status or fallback_vendor.deployment_status,
                    "maturity_level": fallback_vendor.maturity_level,
                    "initial_assessment": "Tracked",
                    "technical_assessment": "Documented" if (fallback_vendor.sample_report_path or fallback_vendor.report_url) else "",
                    "has_var": fallback_vendor.has_var,
                    "has_var_scored": fallback_has_var_scored,
                    "pipeline_stage": _pipeline_stage(
                        fallback_vendor.vendor_status or fallback_vendor.deployment_status,
                        "Tracked",
                        "Documented" if (fallback_vendor.sample_report_path or fallback_vendor.report_url) else "",
                        fallback_has_var_scored,
                    ),
                }]

            stages = [int(product["pipeline_stage"]) for product in fallback_products]
            return {
                "vendor_id": vendor_id,
                "has_pipeline_data": bool(fallback_products),
                "has_var": fallback_vendor.has_var,
                "has_var_scored": fallback_has_var_scored,
                "summary": {
                    "total_products": len(fallback_products),
                    "technically_assessed": sum(1 for product in fallback_products if product["technical_assessment"]),
                    "initial_pass": 0,
                    "initial_fail": 0,
                    "initial_pending": len(fallback_products),
                    "max_pipeline_stage": max(stages) if stages else 0,
                },
                "products": fallback_products,
            }

        placeholders = ",".join(["?"] * len(company_vendor_ids))

        rows = conn.execute(
            f"SELECT product_name, assessment_date, source_file, "
            "pre_assessment_decision, pre_assessment_score, maturity_level, "
            f"initial_assessment, technical_assessment FROM vendor_highlights WHERE vendor_id IN ({placeholders}) "
            "ORDER BY source_file DESC, assessment_date DESC",
            company_vendor_ids,
        ).fetchall()

        has_var = conn.execute(
            f"SELECT COUNT(*) FROM var_reports WHERE vendor_id IN ({placeholders})",
            company_vendor_ids,
        ).fetchone()[0] > 0
        has_var_scored = conn.execute(
            f"SELECT COUNT(*) FROM var_reports WHERE vendor_id IN ({placeholders}) AND overall_score IS NOT NULL",
            company_vendor_ids,
        ).fetchone()[0] > 0
    finally:
        conn.close()

    if not rows:
        return {
            "vendor_id": vendor_id,
            "has_pipeline_data": False,
            "has_var": has_var,
            "has_var_scored": has_var_scored,
            "summary": {
                "total_products": 0,
                "technically_assessed": 0,
                "initial_pass": 0,
                "initial_fail": 0,
                "initial_pending": 0,
                "max_pipeline_stage": 0,
            },
            "products": [],
        }

    # Aggregate per product (take latest record per product)
    products: dict[str, dict] = {}
    for row in rows:
        name = (row["product_name"] or "Unknown").strip() or "Unknown"
        if name not in products:
            products[name] = {
                "product_name": name,
                "assessment_date": row["assessment_date"],
                "source_file": row["source_file"],
                "pre_assessment_score": row["pre_assessment_score"],
                "pre_assessment_decision": row["pre_assessment_decision"] or "",
                "maturity_level": row["maturity_level"] or "",
                "initial_assessment": row["initial_assessment"] or "",
                "technical_assessment": row["technical_assessment"] or "",
                "has_var": has_var,
                "has_var_scored": has_var_scored,
                # Computed pipeline stage (0-4)
                "pipeline_stage": _pipeline_stage(
                    row["pre_assessment_decision"],
                    row["initial_assessment"],
                    row["technical_assessment"],
                    has_var_scored,
                ),
            }

    # Summary stats
    stages = [p["pipeline_stage"] for p in products.values()]
    ia_vals = [p["initial_assessment"] for p in products.values() if p["initial_assessment"]]
    ta_vals = [p["technical_assessment"] for p in products.values() if p["technical_assessment"]]

    ia_pass  = sum(1 for v in ia_vals if v.lower() in ("pass", "yes"))
    ia_fail  = sum(1 for v in ia_vals if v.lower() in ("fail", "no"))
    ia_pend  = len(ia_vals) - ia_pass - ia_fail

    return {
        "vendor_id": vendor_id,
        "has_pipeline_data": True,
        "has_var": has_var,
        "has_var_scored": has_var_scored,
        "summary": {
            "total_products": len(products),
            "technically_assessed": len(ta_vals),
            "initial_pass": ia_pass,
            "initial_fail": ia_fail,
            "initial_pending": ia_pend,
            "max_pipeline_stage": max(stages) if stages else 0,
        },
        "products": list(products.values()),
    }
