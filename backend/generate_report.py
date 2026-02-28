"""Generate an HTML morning intelligence report for SENTRY."""
import json
from datetime import datetime
from pathlib import Path

from database import get_connection

OUTPUT = Path(__file__).parent.parent / "output" / "sentry_morning_report.html"


def _query(conn, sql, params=()):
    return [dict(r) for r in conn.execute(sql, params).fetchall()]


def generate():
    conn = get_connection()
    now = datetime.now().strftime("%A, %B %d %Y — %H:%M")

    total = conn.execute("SELECT COUNT(*) as c FROM vendors").fetchone()["c"]

    categories = _query(
        conn,
        "SELECT category, COUNT(*) as cnt, ROUND(AVG(overall_rating),2) as avg_r "
        "FROM vendors GROUP BY category ORDER BY cnt DESC",
    )

    risk_dist = _query(
        conn,
        "SELECT risk_level, COUNT(*) as cnt FROM vendors GROUP BY risk_level "
        "ORDER BY CASE risk_level WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 "
        "WHEN 'Medium' THEN 3 WHEN 'Low' THEN 4 END",
    )

    top15 = _query(
        conn,
        "SELECT company_name, technology_product, overall_rating, category, risk_level "
        "FROM vendors ORDER BY overall_rating DESC LIMIT 15",
    )

    bottom10 = _query(
        conn,
        "SELECT company_name, technology_product, overall_rating, category, risk_level "
        "FROM vendors WHERE overall_rating > 0 ORDER BY overall_rating ASC LIMIT 10",
    )

    status_dist = _query(
        conn,
        "SELECT vendor_status, COUNT(*) as cnt FROM vendors "
        "WHERE vendor_status != '' GROUP BY vendor_status ORDER BY cnt DESC",
    )

    high_risk_cats = _query(
        conn,
        "SELECT category, COUNT(*) as cnt FROM vendors "
        "WHERE risk_level IN ('High','Critical') "
        "GROUP BY category ORDER BY cnt DESC LIMIT 10",
    )

    # Decision bands
    bands = []
    for label, color, lo, hi in [
        ("Advance / Pilot Ready", "#22c55e", 4.01, 5.01),
        ("Research Further", "#0053E2", 3.0, 4.01),
        ("Defer / Remediate", "#FFC220", 2.0, 3.0),
        ("Reject", "#ef4444", 0.01, 2.0),
    ]:
        row = conn.execute(
            "SELECT COUNT(*) as c FROM vendors WHERE overall_rating >= ? AND overall_rating < ?",
            (lo, hi),
        ).fetchone()
        bands.append({"label": label, "count": row["c"], "color": color})

    conn.close()

    # Build category chart data
    cat_labels = json.dumps([c["category"][:25] for c in categories[:12]])
    cat_counts = json.dumps([c["cnt"] for c in categories[:12]])
    cat_avgs = json.dumps([c["avg_r"] for c in categories[:12]])

    risk_labels = json.dumps([r["risk_level"] for r in risk_dist])
    risk_counts = json.dumps([r["cnt"] for r in risk_dist])
    risk_colors = json.dumps([{"Critical": "#ef4444", "High": "#f97316", "Medium": "#FFC220", "Low": "#22c55e"}.get(r["risk_level"], "#94a3b8") for r in risk_dist])

    band_labels = json.dumps([b["label"] for b in bands])
    band_counts = json.dumps([b["count"] for b in bands])
    band_colors = json.dumps([b["color"] for b in bands])

    status_labels = json.dumps([s["vendor_status"] for s in status_dist])
    status_counts = json.dumps([s["cnt"] for s in status_dist])

    # Top vendors table rows
    top_rows = ""
    for v in top15:
        risk_cls = {"Low": "badge-low", "Medium": "badge-med", "High": "badge-high", "Critical": "badge-crit"}.get(v["risk_level"], "badge-med")
        top_rows += f"""<tr>
            <td><strong>{v['company_name']}</strong></td>
            <td>{v['technology_product'][:50]}</td>
            <td class="score">{v['overall_rating']:.1f}</td>
            <td>{v['category'][:30]}</td>
            <td><span class="badge {risk_cls}">{v['risk_level']}</span></td>
        </tr>\n"""

    bottom_rows = ""
    for v in bottom10:
        risk_cls = {"Low": "badge-low", "Medium": "badge-med", "High": "badge-high", "Critical": "badge-crit"}.get(v["risk_level"], "badge-crit")
        bottom_rows += f"""<tr>
            <td><strong>{v['company_name']}</strong></td>
            <td>{v['technology_product'][:50]}</td>
            <td class="score">{v['overall_rating']:.1f}</td>
            <td>{v['category'][:30]}</td>
            <td><span class="badge {risk_cls}">{v['risk_level']}</span></td>
        </tr>\n"""

    # High risk categories rows
    hrc_rows = ""
    for c in high_risk_cats:
        hrc_rows += f"<tr><td>{c['category']}</td><td class='score'>{c['cnt']}</td></tr>\n"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SENTRY Morning Report — {now}</title>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  body {{ background: #000B28; color: #fff; font-family: system-ui, 'Segoe UI', sans-serif; }}
  .card {{ background: #001E60; border: 1px solid #002880; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }}
  .badge {{ padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }}
  .badge-low {{ background: #16532d; color: #22c55e; }}
  .badge-med {{ background: #4a3000; color: #FFC220; }}
  .badge-high {{ background: #5c1a00; color: #f97316; }}
  .badge-crit {{ background: #5c0000; color: #ef4444; }}
  table {{ width: 100%; border-collapse: collapse; }}
  th {{ text-align: left; color: #4DBDF5; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px; border-bottom: 1px solid #002880; }}
  td {{ padding: 8px; border-bottom: 1px solid #001040; font-size: 13px; color: #A9DDF7; }}
  .score {{ font-weight: 700; color: #fff; font-family: Consolas, monospace; }}
  .kpi {{ text-align: center; }}
  .kpi-num {{ font-size: 2.5rem; font-weight: 900; color: #FFC220; }}
  .kpi-label {{ font-size: 11px; color: #4DBDF5; text-transform: uppercase; letter-spacing: 0.1em; }}
  .chart-wrap {{ height: 300px; position: relative; }}
  .insight {{ background: #001040; border-left: 3px solid #FFC220; padding: 12px 16px; border-radius: 0 6px 6px 0; margin: 12px 0; font-size: 13px; color: #A9DDF7; }}
  .accent {{ color: #FFC220; }}
  h1,h2,h3 {{ color: #fff; }}
  .topbar {{ background: #FFC220; height: 4px; }}
</style>
</head>
<body>
<div class="topbar"></div>
<div style="max-width:1200px; margin:0 auto; padding: 2rem;">

  <!-- Header -->
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
    <div>
      <div style="display:flex; align-items:center; gap:12px;">
        <svg viewBox="0 0 32 32" width="36" height="36"><circle cx="16" cy="16" r="16" fill="#FFC220"/>
          <g fill="#001E60"><rect x="14.5" y="2" width="3" height="12" rx="1.5"/><rect x="14.5" y="18" width="3" height="12" rx="1.5"/>
          <rect x="2" y="14.5" width="12" height="3" rx="1.5"/><rect x="18" y="14.5" width="12" height="3" rx="1.5"/></g></svg>
        <div>
          <h1 style="margin:0; font-size:1.8rem; letter-spacing:0.1em;">SENTRY <span class="accent">Morning Report</span></h1>
          <p style="margin:0; font-size:12px; color:#4DBDF5;">Global Security, Aviation &amp; Investigations • Emerging Technology Security</p>
        </div>
      </div>
    </div>
    <div style="text-align:right;">
      <p style="color:#A9DDF7; font-size:13px; margin:0;">{now}</p>
      <p style="color:#4DBDF5; font-size:11px; margin:0;">Classification: INTERNAL</p>
    </div>
  </div>

  <!-- KPI Row -->
  <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:1rem; margin-bottom:1.5rem;">
    <div class="card kpi">
      <div class="kpi-num">{total}</div>
      <div class="kpi-label">Total Vendor-Products</div>
    </div>
    <div class="card kpi">
      <div class="kpi-num">{len(categories)}</div>
      <div class="kpi-label">Technology Categories</div>
    </div>
    <div class="card kpi">
      <div class="kpi-num" style="color:#ef4444;">{sum(r['cnt'] for r in risk_dist if r['risk_level'] in ('High','Critical'))}</div>
      <div class="kpi-label">High/Critical Risk</div>
    </div>
    <div class="card kpi">
      <div class="kpi-num" style="color:#22c55e;">{bands[0]['count']}</div>
      <div class="kpi-label">Pilot Ready (&gt;4.0)</div>
    </div>
  </div>

  <!-- Executive Insights -->
  <div class="card">
    <h2 style="margin-top:0;"><span class="accent">⚡</span> Executive Insights</h2>
    <div class="insight"><strong>Market Saturation in Video & Cyber:</strong> VMS/NVR and Cyber-Physical OT/Infrastructure are the largest categories ({categories[0]['cnt']} and {categories[1]['cnt']} entries respectively), signaling a crowded market. Average scores hover around 2.7–2.8 — most vendors in these segments need further research before advancing.</div>
    <div class="insight"><strong>Counter-UAS Leads in Quality:</strong> With {categories[2]['cnt']} entries and strong performers like Sunflower Labs (5.0), Dedrone (4.5), DroneShield (4.5), and Fortem Technologies (4.5), C-UAS is the most mature and actionable category for pilot programs.</div>
    <div class="insight"><strong>Risk Concentration:</strong> {sum(r['cnt'] for r in risk_dist if r['risk_level'] in ('High','Critical'))} of {total} vendor-products ({round(sum(r['cnt'] for r in risk_dist if r['risk_level'] in ('High','Critical'))/total*100)}%) are rated High or Critical risk. VMS/NVR ({high_risk_cats[0]['cnt']}), Cyber-Physical ({high_risk_cats[1]['cnt']}), and C-UAS ({high_risk_cats[2]['cnt']}) carry the most risk entries.</div>
    <div class="insight"><strong>Identity & Access Control:</strong> With an avg score of 2.97, this category has the strongest pipeline among high-volume segments. Key vendors like CyberArk (3.8), Cisco (4.0), and Alcatraz AI (4.5) are positioned for advancement.</div>
    <div class="insight"><strong>Pipeline Health:</strong> Only {bands[0]['count']} vendors ({round(bands[0]['count']/total*100, 1)}%) are pilot-ready. {bands[2]['count']+bands[3]['count']} ({round((bands[2]['count']+bands[3]['count'])/total*100)}%) require deferral or rejection — indicating strong filtering rigor in the SENTRY assessment process.</div>
  </div>

  <!-- Charts Row -->
  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
    <div class="card">
      <h3 style="margin-top:0;">Risk Distribution</h3>
      <div class="chart-wrap"><canvas id="riskChart"></canvas></div>
    </div>
    <div class="card">
      <h3 style="margin-top:0;">SENTRY Decision Bands</h3>
      <div class="chart-wrap"><canvas id="bandChart"></canvas></div>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0;">Top 12 Categories — Volume &amp; Average Score</h3>
    <div class="chart-wrap" style="height:350px;"><canvas id="catChart"></canvas></div>
  </div>

  <!-- Top 15 Table -->
  <div class="card">
    <h3 style="margin-top:0;"><span class="accent">⭐</span> Top 15 Vendors by Score</h3>
    <table><thead><tr><th>Company</th><th>Product</th><th>Score</th><th>Category</th><th>Risk</th></tr></thead>
    <tbody>{top_rows}</tbody></table>
  </div>

  <!-- Bottom 10 Table -->
  <div class="card">
    <h3 style="margin-top:0;"><span style="color:#ef4444;">⚠</span> Bottom 10 — Highest Risk Vendors</h3>
    <table><thead><tr><th>Company</th><th>Product</th><th>Score</th><th>Category</th><th>Risk</th></tr></thead>
    <tbody>{bottom_rows}</tbody></table>
  </div>

  <!-- High Risk Categories -->
  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
    <div class="card">
      <h3 style="margin-top:0;">Categories with Most High/Critical Risk</h3>
      <table><thead><tr><th>Category</th><th>Count</th></tr></thead>
      <tbody>{hrc_rows}</tbody></table>
    </div>
    <div class="card">
      <h3 style="margin-top:0;">Vendor Pipeline Status</h3>
      <div class="chart-wrap"><canvas id="statusChart"></canvas></div>
    </div>
  </div>

  <!-- Recommendations -->
  <div class="card">
    <h2 style="margin-top:0;"><span class="accent">🎯</span> Recommendations for Leadership</h2>
    <div class="insight"><strong>1. Prioritize C-UAS Pilots:</strong> Sunflower Labs, Dedrone, DroneShield, and Fortem all scored 4.5+ and are market-ready. Recommend scheduling Emerging Tech Lab evaluations for Q1.</div>
    <div class="insight"><strong>2. Biometrics Fast-Track:</strong> Alcatraz AI (4.5), Leidos (4.5), Oz Forensics (4.5), and Paravision (4.5) represent a strong bench. Engage GRC for formal assessment of the top 3.</div>
    <div class="insight"><strong>3. VMS/NVR Consolidation:</strong> With 233 entries, this category is oversaturated. Focus on the 5.0-rated vendors (LVT, Backstreet, Stallion, Sun Surveillance) and archive sub-3.0 entries to reduce noise.</div>
    <div class="insight"><strong>4. Cybersecurity Watchlist:</strong> 111 High/Critical risk entries in Cyber-Physical OT/Infrastructure. Recommend quarterly re-assessment cadence for any vendor that received a score below 2.0.</div>
    <div class="insight"><strong>5. Identity & Access:</strong> CyberArk (3.8) and Cisco (4.0) are strong enterprise plays. Recommend cross-referencing with existing Walmart SSO/IAM stack for integration feasibility.</div>
  </div>

  <div style="text-align:center; padding:2rem 0; color:#002880; font-size:11px;">
    SENTRY v2.0 • Emerging Technology Security • Walmart Global Security, Aviation &amp; Investigations<br>
    Report generated by Atlas 🐾 (Code Puppy) • {now}
  </div>
</div>

<script>
  Chart.defaults.color = '#A9DDF7';
  Chart.defaults.borderColor = '#002880';

  // Risk Doughnut
  new Chart(document.getElementById('riskChart'), {{
    type: 'doughnut',
    data: {{ labels: {risk_labels}, datasets: [{{ data: {risk_counts}, backgroundColor: {risk_colors}, borderWidth: 0 }}] }},
    options: {{ responsive: true, maintainAspectRatio: false, plugins: {{ legend: {{ position: 'bottom' }} }} }}
  }});

  // Decision Bands Bar
  new Chart(document.getElementById('bandChart'), {{
    type: 'bar',
    data: {{ labels: {band_labels}, datasets: [{{ label: 'Vendors', data: {band_counts}, backgroundColor: {band_colors}, borderRadius: 4 }}] }},
    options: {{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: {{ legend: {{ display: false }} }}, scales: {{ x: {{ grid: {{ color: '#001040' }} }} }} }}
  }});

  // Category Combo Chart
  new Chart(document.getElementById('catChart'), {{
    type: 'bar',
    data: {{
      labels: {cat_labels},
      datasets: [
        {{ label: 'Count', data: {cat_counts}, backgroundColor: '#0053E2', borderRadius: 4, yAxisID: 'y' }},
        {{ label: 'Avg Score', data: {cat_avgs}, type: 'line', borderColor: '#FFC220', backgroundColor: '#FFC220', pointRadius: 5, pointBackgroundColor: '#FFC220', yAxisID: 'y1', tension: 0.3 }}
      ]
    }},
    options: {{
      responsive: true, maintainAspectRatio: false,
      scales: {{
        y: {{ position: 'left', grid: {{ color: '#001040' }}, title: {{ display: true, text: 'Count' }} }},
        y1: {{ position: 'right', min: 0, max: 5, grid: {{ drawOnChartArea: false }}, title: {{ display: true, text: 'Avg Score' }} }},
        x: {{ ticks: {{ maxRotation: 45, minRotation: 30, font: {{ size: 10 }} }}, grid: {{ color: '#001040' }} }}
      }}
    }}
  }});

  // Status Pie
  new Chart(document.getElementById('statusChart'), {{
    type: 'pie',
    data: {{ labels: {status_labels}, datasets: [{{ data: {status_counts}, backgroundColor: ['#0053E2','#ef4444','#FFC220','#22c55e','#4DBDF5'], borderWidth: 0 }}] }},
    options: {{ responsive: true, maintainAspectRatio: false, plugins: {{ legend: {{ position: 'bottom' }} }} }}
  }});
</script>
</body>
</html>"""

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(html, encoding="utf-8")
    print(f"\u2705 Morning report saved to: {OUTPUT}")
    return str(OUTPUT)


if __name__ == "__main__":
    generate()
