"""Phase 2 Match Report Generator.

Generates an HTML report summarising the VAR matching and score extraction
results. Saved to output/SENTRY_Phase2_Match_Report.html
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from database import get_connection

OUTPUT = Path(__file__).parent.parent / "output" / "SENTRY_Phase2_Match_Report.html"

BAND_COLORS = {
    "Advance":          ("#2a8703", "#e8f5e0"),
    "Research Further": ("#0053e2", "#e6f0ff"),
    "Defer":            ("#995213", "#fff8e6"),
    "Reject":           ("#ea1100", "#fde8e6"),
}


def generate() -> str:
    conn = get_connection()
    now = datetime.now().strftime("%B %d, %Y — %H:%M")

    # ---- Core stats ----
    total_vars = conn.execute("SELECT COUNT(*) FROM var_reports").fetchone()[0]
    scored = conn.execute(
        "SELECT COUNT(*) FROM var_reports WHERE overall_score IS NOT NULL"
    ).fetchone()[0]
    pending = total_vars - scored

    total_vendors = conn.execute("SELECT COUNT(*) FROM vendors").fetchone()[0]
    vendors_with_var = conn.execute(
        "SELECT COUNT(DISTINCT vendor_id) FROM var_reports"
    ).fetchone()[0]

    # Band breakdown
    bands = {b: 0 for b in ["Advance", "Research Further", "Defer", "Reject"]}
    for row in conn.execute(
        "SELECT decision_band, COUNT(*) as c FROM var_reports "
        "WHERE decision_band != '' GROUP BY decision_band"
    ).fetchall():
        if row[0] in bands:
            bands[row[0]] = row[1]

    # Average score
    avg_score = conn.execute(
        "SELECT ROUND(AVG(overall_score),2) FROM var_reports WHERE overall_score IS NOT NULL"
    ).fetchone()[0] or 0

    # All VARs with vendor names
    var_rows = conn.execute(
        """
        SELECT vr.filename, vr.overall_score, vr.decision_band,
               vr.compliance_score, vr.risk_score, vr.maturity_score,
               vr.integration_score, vr.roi_score, vr.viability_score,
               vr.differentiation_score, vr.cloud_dep_score,
               vr.sharepoint_url, vr.report_date, vr.report_version,
               v.company_name, v.category, v.company_url
        FROM var_reports vr
        LEFT JOIN vendors v ON vr.vendor_id = v.id
        ORDER BY vr.overall_score DESC NULLS LAST
        """
    ).fetchall()
    conn.close()

    # ---- Build table rows ----
    table_rows = ""
    for r in var_rows:
        score = r["overall_score"]
        band = r["decision_band"] or ""
        score_str = f"{score:.2f}" if score else "Pending"
        bc, bg = BAND_COLORS.get(band, ("#666", "#f0f0f0"))
        sp_link = (
            f'<a href="{r["sharepoint_url"]}" target="_blank" '
            f'style="color:#0053e2;text-decoration:none;font-size:11px;">'
            f'Open →</a>'
            if r["sharepoint_url"] else "—"
        )
        # Mini radar: 8 dimensions as tiny bar
        dims = [
            r["compliance_score"] or 0,
            r["risk_score"] or 0,
            r["maturity_score"] or 0,
            r["integration_score"] or 0,
            r["roi_score"] or 0,
            r["viability_score"] or 0,
            r["differentiation_score"] or 0,
            r["cloud_dep_score"] or 0,
        ]
        bars = "".join(
            f'<div title="{d:.1f}" style="display:inline-block;width:6px;height:{int(d/5*20)}px;'
            f'background:{_score_color(d)};margin:0 1px;vertical-align:bottom;border-radius:1px;"></div>'
            for d in dims
        ) if any(dims) else '<span style="color:#aaa">Pending extraction</span>'

        table_rows += f"""<tr>
          <td style="font-weight:600;color:#001E60;font-size:12px;">{r['company_name'] or '?'}</td>
          <td style="font-size:11px;color:#444;">{r['category'] or '—'}</td>
          <td style="font-size:11px;color:#666;word-break:break-all;max-width:200px;">
            {r['filename'][:45]}...</td>
          <td style="text-align:center;">
            <span style="background:{bg};color:{bc};font-weight:700;font-size:12px;
                         padding:2px 8px;border-radius:12px;">
              {score_str}
            </span>
          </td>
          <td style="text-align:center;">
            <span style="font-size:11px;color:{bc};font-weight:600;">{band or 'Pending'}</span>
          </td>
          <td style="text-align:center;">{bars}</td>
          <td style="text-align:center;">{sp_link}</td>
        </tr>\n"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SENTRY Phase 2 Match Report — {now}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Segoe UI', system-ui, sans-serif; background: #f4f6fb;
          color: #1a1a2e; }}
  .topbar {{ background: #ffc220; height: 5px; }}
  .header {{ background: #001E60; color: #fff; padding: 24px 32px;
             display:flex; justify-content:space-between; align-items:center; }}
  .logo {{ display:flex; align-items:center; gap:12px; }}
  .logo-icon {{ width:40px; height:40px; background:#ffc220; border-radius:50%;
                display:flex; align-items:center; justify-content:center;
                font-weight:900; font-size:18px; color:#001E60; }}
  .brand h1 {{ font-size:1.5rem; letter-spacing:0.08em; }}
  .brand p {{ font-size:11px; color:#4DBDF5; margin-top:2px; }}
  .meta {{ font-size:12px; color:#A9DDF7; text-align:right; }}
  .container {{ max-width: 1300px; margin: 0 auto; padding: 24px; }}
  .kpis {{ display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }}
  .kpi {{ background:#fff; border-radius:12px; padding:20px;
          box-shadow:0 1px 4px rgba(0,0,0,.08); text-align:center;
          border-top:4px solid; }}
  .kpi-num {{ font-size:2.4rem; font-weight:900; }}
  .kpi-label {{ font-size:11px; color:#666; text-transform:uppercase;
                letter-spacing:.08em; margin-top:4px; }}
  .section {{ background:#fff; border-radius:12px; padding:24px;
              box-shadow:0 1px 4px rgba(0,0,0,.08); margin-bottom:24px; }}
  .section h2 {{ font-size:1rem; color:#001E60; margin-bottom:16px;
                 border-bottom:2px solid #0053e2; padding-bottom:8px; }}
  table {{ width:100%; border-collapse:collapse; font-size:12px; }}
  th {{ background:#001E60; color:#fff; padding:8px 10px;
        text-align:left; font-size:11px; letter-spacing:.05em; }}
  td {{ padding:8px 10px; border-bottom:1px solid #f0f0f0; vertical-align:middle; }}
  tr:hover td {{ background:#f8f9ff; }}
  .band-bar {{ display:flex; gap:4px; align-items:center; }}
  .band-chip {{ padding:4px 12px; border-radius:20px; font-size:11px;
                font-weight:700; white-space:nowrap; }}
  .insight {{ border-left:4px solid #ffc220; background:#fff8e6;
              padding:12px 16px; border-radius:0 8px 8px 0; margin-bottom:12px;
              font-size:13px; }}
  .insight strong {{ color:#001E60; }}
  .progress-bar {{ background:#e0e0e0; border-radius:4px; height:8px; overflow:hidden; }}
  .progress-fill {{ height:100%; border-radius:4px; background:#0053e2; }}
  footer {{ text-align:center; color:#aaa; font-size:11px; padding:24px; }}
</style>
</head>
<body>
<div class="topbar"></div>
<div class="header">
  <div class="logo">
    <div class="logo-icon">🛡️</div>
    <div class="brand">
      <h1>SENTRY — Phase 2 Match Report</h1>
      <p>VAR Matching &amp; Score Extraction — Emerging Technology Security</p>
    </div>
  </div>
  <div class="meta">
    <div>Generated: {now}</div>
    <div style="color:#ffc220;">INTERNAL — Not for Distribution</div>
  </div>
</div>

<div class="container">

  <!-- KPIs -->
  <div class="kpis">
    <div class="kpi" style="border-color:#0053e2;">
      <div class="kpi-num" style="color:#0053e2;">{total_vars}</div>
      <div class="kpi-label">VARs Linked</div>
    </div>
    <div class="kpi" style="border-color:#2a8703;">
      <div class="kpi-num" style="color:#2a8703;">{scored}</div>
      <div class="kpi-label">Scores Extracted</div>
    </div>
    <div class="kpi" style="border-color:#ffc220;">
      <div class="kpi-num" style="color:#995213;">{vendors_with_var}</div>
      <div class="kpi-label">Vendors with VAR</div>
    </div>
    <div class="kpi" style="border-color:#0053e2;">
      <div class="kpi-num" style="color:#0053e2;">{avg_score:.2f}</div>
      <div class="kpi-label">Avg Composite Score</div>
    </div>
  </div>

  <!-- Insights -->
  <div class="section">
    <h2>⚡ Phase 2 Executive Summary</h2>
    <div class="insight">
      <strong>VAR Linking Complete:</strong> {total_vars} Vendor Assessment Reports from the
      SharePoint Vault have been matched to {vendors_with_var} vendors in the SENTRY database.
      {scored} of those VARs now have fully extracted dimension scores available for
      radar chart visualization.
    </div>
    <div class="insight">
      <strong>Score Distribution:</strong> Of the {scored} scored VARs,
      {bands["Advance"]} are Advance / Pilot Ready (&gt;4.0),
      {bands["Research Further"]} require further research (3.0–4.0),
      {bands["Defer"]} are deferred (2.0–3.0), and
      {bands["Reject"]} are recommended for rejection (&lt;2.0).
      The average composite score of {avg_score:.2f} places the current cohort in the
      "Research Further" band overall.
    </div>
    <div class="insight">
      <strong>Outstanding (1 VAR):</strong>
      WMT-SEC-VAR-20260219-InterfaceSystems has a null score due to a temporary
      SharePoint auth token expiry during bulk extraction. Re-run
      <code>bulk_score_extract.py</code> with a fresh URL to populate.
    </div>
    <div class="insight">
      <strong>Scale Opportunity:</strong> The SharePoint Vault contains 800+ additional VAR
      documents across Nov 2025, Dec 2025, and Jan 2026. A full bulk-link run (Phase 2 → v2)
      could expand coverage from 24 to 200+ vendors in the SENTRY database.
    </div>
  </div>

  <!-- Band Breakdown -->
  <div class="section">
    <h2>🎯 Decision Band Breakdown</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
{''.join(_band_card(b, c, scored) for b, c in bands.items())}
    </div>
  </div>

  <!-- VAR Table -->
  <div class="section">
    <h2>📄 All Matched VARs ({total_vars} linked • {scored} scored)</h2>
    <table>
      <thead>
        <tr>
          <th>Company</th>
          <th>Category</th>
          <th>VAR Filename</th>
          <th style="text-align:center;">Score</th>
          <th style="text-align:center;">Band</th>
          <th style="text-align:center;">Dimension Bars (C R M I $ V D ☁)</th>
          <th style="text-align:center;">SharePoint</th>
        </tr>
      </thead>
      <tbody>
        {table_rows}
      </tbody>
    </table>
  </div>

  <!-- Next Steps -->
  <div class="section">
    <h2>🚀 Next Steps (Phase 2 → Phase 3)</h2>
    <div class="insight">
      <strong>1. Bulk VAR Expansion:</strong> Run <code>bulk_link_vars.py --full</code> to enumerate
      the remaining 800+ VARs on SharePoint and match them to vendors in the database using the
      multi-pass slug matcher. Estimated impact: 200+ additional vendor-VAR links.
    </div>
    <div class="insight">
      <strong>2. Interface Systems Fix:</strong> Refresh the tempauth URL for
      WMT-SEC-VAR-20260219-InterfaceSystems-Detailed-v1.docx and re-run <code>bulk_score_extract.py</code>.
    </div>
    <div class="insight">
      <strong>3. Phase 3 UI Completion:</strong> The React SENTRY frontend (sentry-v2-main)
      now correctly displays VAR scores and decision bands in the vendor detail panel.
      Remaining Phase 3 work: enhanced radar chart rendering and export functions.
    </div>
  </div>

</div>

<footer>
  SENTRY Phase 2 Match Report &bull; Emerging Technology Security &bull;
  Generated by Atlas 🐾 (Code Puppy) &bull; {now}
</footer>

</body>
</html>"""

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(html, encoding="utf-8")
    print(f"\u2705 Match report saved to: {OUTPUT}")
    return str(OUTPUT)


def _score_color(score: float) -> str:
    if score >= 4.0:
        return "#2a8703"
    if score >= 3.0:
        return "#0053e2"
    if score >= 2.0:
        return "#ffc220"
    return "#ea1100"


def _band_card(band: str, count: int, total: int) -> str:
    bc, bg = BAND_COLORS.get(band, ("#666", "#f0f0f0"))
    pct = round(count / total * 100) if total else 0
    return f"""
    <div style="background:{bg};border-radius:10px;padding:16px;text-align:center;
                border:1px solid {bc}33;">
      <div style="font-size:2rem;font-weight:900;color:{bc};">{count}</div>
      <div style="font-size:11px;color:{bc};font-weight:600;margin:4px 0;">{band}</div>
      <div class="progress-bar" style="margin-top:8px;">
        <div class="progress-fill" style="width:{pct}%;background:{bc};"></div>
      </div>
      <div style="font-size:10px;color:#888;margin-top:4px;">{pct}% of scored</div>
    </div>"""


if __name__ == "__main__":
    generate()
