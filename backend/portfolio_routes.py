"""Portfolio posture analytics (CSO Executive Risk Posture).

Aggregates the *entire* vendor portfolio (not a single page) into the numbers a
CSO asks for: overall grade, A-F band distribution, risk concentration,
decision-band mix, and assessment coverage. Read-only; safe to call often.
"""
from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter

from database import get_connection

ROUTER = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


def _grade(score: float | None) -> str:
    """Map a 0-5 score to an A-F letter (mirrors utils/grade.ts)."""
    if score is None:
        return "F"
    s = max(0.0, min(5.0, score))
    if s >= 4.5:
        return "A"
    if s >= 3.5:
        return "B"
    if s >= 2.5:
        return "C"
    if s >= 1.5:
        return "D"
    return "F"


@ROUTER.get("/posture")
def get_posture():
    """Return a portfolio-wide risk posture summary for the CSO view."""
    conn = get_connection()

    # Best available score per vendor: latest VAR overall_score, else
    # the vendor's own overall_rating.
    rows = conn.execute(
        """
        SELECT
            v.id              AS id,
            v.company_name    AS company_name,
            v.category        AS category,
            v.risk_level      AS risk_level,
            v.overall_rating  AS overall_rating,
            (
                SELECT vr.overall_score
                FROM var_reports vr
                WHERE vr.vendor_id = v.id AND vr.overall_score IS NOT NULL
                ORDER BY vr.report_date DESC
                LIMIT 1
            ) AS var_score,
            (
                SELECT vr.decision_band
                FROM var_reports vr
                WHERE vr.vendor_id = v.id AND vr.decision_band IS NOT NULL
                ORDER BY vr.report_date DESC
                LIMIT 1
            ) AS decision_band
        FROM vendors v
        """
    ).fetchall()
    conn.close()
    # AGG_BELOW
    total = len(rows)
    grade_bands: dict[str, int] = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
    risk_levels: dict[str, int] = defaultdict(int)
    decision_bands: dict[str, int] = defaultdict(int)
    scored = 0
    score_sum = 0.0
    elevated = 0
    worst: list[dict] = []

    for r in rows:
        score = r["var_score"]
        if score is None:
            score = r["overall_rating"]
        if score is not None:
            scored += 1
            score_sum += float(score)
            grade_bands[_grade(float(score))] += 1

        risk = (r["risk_level"] or "Unknown").strip() or "Unknown"
        risk_levels[risk] += 1
        if risk in ("High", "Critical"):
            elevated += 1

        band = (r["decision_band"] or "").strip()
        if band:
            decision_bands[band] += 1

        worst.append(
            {
                "id": r["id"],
                "company_name": r["company_name"],
                "category": r["category"],
                "risk_level": risk,
                "score": float(score) if score is not None else None,
            }
        )

    mean_score = round(score_sum / scored, 2) if scored else None
    coverage_pct = round((scored / total) * 100) if total else 0

    # Top-5 worst: lowest score first, unscored treated as bottom.
    worst.sort(key=lambda x: (x["score"] is not None, x["score"] if x["score"] is not None else 0.0))
    top_risks = [w for w in worst if w["score"] is not None][:5]

    return {
        "total": total,
        "scored": scored,
        "coverage_pct": coverage_pct,
        "mean_score": mean_score,
        "portfolio_grade": _grade(mean_score),
        "grade_bands": grade_bands,
        "risk_levels": dict(risk_levels),
        "elevated_risk": elevated,
        "decision_bands": dict(decision_bands),
        "top_risks": top_risks,
    }
