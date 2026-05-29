"""Generate a consolidated CSO/ESG benchmarking HTML report (read-only).

Pulls every executive-intel portfolio via the repository loader and renders one
flat Walmart-branded HTML report (Tailwind + Chart.js). Writes only to the given
output path. No SQLite, no publication, no outbound delivery.
"""
from __future__ import annotations

import html
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from executive_intel.repository import ExecutiveIntelRepository

BLUE = "#0053e2"
SPARK = "#ffc220"

INSIGHTS = {
    "exec_amazon_kara_hurst": "Confirmed CSO. Strongest direct retail benchmark: 90% of highest-emitting suppliers have decarbonization plans; 28-pt single-year plastic cut; nuclear/SMR clean-energy strategy.",
    "exec_target_agata_ramallo_garcia": "Active Target ESG lead (replaces departed Nusz). Net-zero 2040 but Scope 3 only 5.6% vs 32.5% target - a visible gap; 1,267 regen-ag farms.",
    "exec_unilever_rebecca_marmot": "Now Chief Sustainability & Corporate Affairs Officer. Pioneer posture: FLAG emissions -14%, 1M-ha regen-ag goal, UN plastics treaty co-chair.",
    "exec_procter_gamble_virginie_helias": "Confirmed CSO. Consumer-facing innovation: VersoVita plastics dissolution (licensed to PureCycle), 50L Home water program, Net Zero 2040.",
    "exec_pepsico_jim_andrew": "EVP & CSO. pep+ embedded in SEC 10-K MD&A; EU CSRD explicitly named in risk factors; net-zero pushed 2040 to 2050; NPV-anchored ESG capital allocation.",
    "exec_microsoft_melanie_nakagawa": "CVP & CSO. Carbon-accounting gold standard. Dropped non-additional RECs; AI/datacenter energy now a disclosed climate risk; SEC rule withdrawn 3/2025 - CSRD + CA SB253 now the real triggers.",
    "exec_fedex_sustainability_lead_retarget": "No dedicated CSO - Priority Earth owned by CEO Raj Subramaniam. SAF (LAX 3M+ gal), full parcel-fleet EV, $100M Yale carbon-capture; key logistics/SAF benchmark.",
    "exec_kroger_sustainability_lead_retarget": "No standalone CSO (embedded in Group VP Comms & Public Affairs, unnamed). NEW: ex-Walmart U.S. CEO Greg Foran is now Kroger CEO (Feb 2026). ESG-backlash disclosed as material risk; TCFD dropped from 10-K.",
    "exec_amazon_stephen_schmidt": "Chief Security Officer - retained from prior program; not a sustainability target.",
}

DOMAIN_KEYWORDS = {
    "Scope 3 / supplier": ["scope 3", "supplier", "decarboniz"],
    "Packaging circularity": ["packag", "plastic", "circular", "compostable", "reusable"],
    "Disclosure / CSRD / SEC": ["csrd", "sec", "disclosure", "tcfd", "issb", "10-k", "proxy"],
    "Regenerative ag": ["regenerat", "agricultur", "farm", "soil", "biodiversit"],
}


def classify_domains(signals):
    counts = {k: 0 for k in DOMAIN_KEYWORDS}
    for sig in signals:
        blob = " ".join(str(sig.get(f, "")) for f in ("title", "summary", "category")).lower()
        for domain, kws in DOMAIN_KEYWORDS.items():
            if any(kw in blob for kw in kws):
                counts[domain] += 1
    return counts


def is_archived(p):
    return str(p["profile"].get("status", "")).upper() == "ARCHIVED"


def badge(profile):
    if str(profile.get("status", "")).upper() == "ARCHIVED":
        return ("ARCHIVED / STALE", "#995213")
    return ("ACTIVE", "#2a8703")


def render_card(p):
    prof = p["profile"]
    s = p["stats"]
    name = html.escape(str(prof.get("full_name", "?")))
    org = html.escape(str(prof.get("organization", "?")))
    title = html.escape(str(prof.get("title", "")))
    btext, bcolor = badge(prof)
    insight = html.escape(INSIGHTS.get(prof["profile_id"], "Analyst review pending."))
    chips = ""
    for d, c in classify_domains(p["signals"]).items():
        chips += (
            '<span class="inline-block text-xs px-2 py-1 mr-1 mb-1 rounded-full" '
            'style="background:#e6eefc;color:' + BLUE + '">' + html.escape(d) + ": " + str(c) + "</span>"
        )
    return (
        '<div class="bg-white rounded-xl shadow p-5 border border-gray-100">'
        '<div class="flex justify-between items-start gap-2">'
        '<div><div class="font-bold text-base leading-tight">' + name + "</div>"
        '<div class="text-sm text-gray-500">' + org + "</div></div>"
        '<span class="text-xs px-2 py-1 rounded-full text-white whitespace-nowrap" style="background:' + bcolor + '">' + btext + "</span>"
        "</div>"
        '<div class="text-xs text-gray-600 mt-1">' + title + "</div>"
        '<div class="flex gap-4 my-3 text-center">'
        '<div><div class="text-xl font-bold" style="color:' + BLUE + '">' + str(s["signal_count"]) + '</div><div class="text-xs text-gray-500">signals</div></div>'
        '<div><div class="text-xl font-bold" style="color:' + SPARK + '">' + str(s["cso_ready_signal_count"]) + '</div><div class="text-xs text-gray-500">CSO-ready</div></div>'
        '<div><div class="text-xl font-bold text-gray-700">' + str(s["source_count"]) + '</div><div class="text-xs text-gray-500">sources</div></div>'
        "</div>"
        '<div class="mb-2">' + chips + "</div>"
        '<p class="text-sm text-gray-800"><b>Insight:</b> ' + insight + "</p>"
        "</div>"
    )


def render_archived_row(p):
    prof = p["profile"]
    name = html.escape(str(prof.get("full_name", "?")))
    org = html.escape(str(prof.get("organization", "?")))
    reason = prof.get("stale_reason", {}) or {}
    sup = html.escape(str(reason.get("superseded_by", "-")))
    finding = html.escape(str(reason.get("finding", ""))[:160])
    return (
        '<tr class="border-t"><td class="p-3 font-semibold">' + name +
        ' <span class="text-gray-500 font-normal">(' + org + ")</span><br>"
        '<span class="text-xs text-gray-500">' + finding + "</span></td>"
        '<td class="p-3 text-xs">' + sup + "</td>"
        '<td class="p-3 text-xs text-amber-700">ARCHIVED</td></tr>'
    )


def build_report(out_path):
    repo = ExecutiveIntelRepository()
    listing = repo.list_portfolios()
    portfolios = [repo.get_portfolio(s["profile_id"]) for s in listing["portfolios"]]
    active = sorted(
        [p for p in portfolios if not is_archived(p)],
        key=lambda p: p["stats"]["signal_count"], reverse=True,
    )
    archived = [p for p in portfolios if is_archived(p)]

    total_signals = sum(p["stats"]["signal_count"] for p in portfolios)
    total_sources = sum(p["stats"]["source_count"] for p in portfolios)
    total_ready = sum(p["stats"]["cso_ready_signal_count"] for p in portfolios)

    labels = [p["profile"].get("full_name", "?").split("(")[0].strip()[:20] for p in active]
    sig_counts = [p["stats"]["signal_count"] for p in active]
    ready_counts = [p["stats"]["cso_ready_signal_count"] for p in active]
    agg = {k: 0 for k in DOMAIN_KEYWORDS}
    for p in active:
        for d, c in classify_domains(p["signals"]).items():
            agg[d] += c

    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    cards = "".join(render_card(p) for p in active)
    arows = "".join(render_archived_row(p) for p in archived) or '<tr><td class="p-3 text-gray-500" colspan="3">None</td></tr>'

    js = (
        "new Chart(document.getElementById('sigChart'),{type:'bar',data:{labels:" + json.dumps(labels) +
        ",datasets:[{label:'Signals',data:" + json.dumps(sig_counts) + ",backgroundColor:'" + BLUE + "'},"
        "{label:'CSO-ready',data:" + json.dumps(ready_counts) + ",backgroundColor:'" + SPARK + "'}]},"
        "options:{responsive:true,maintainAspectRatio:false,scales:{x:{ticks:{autoSkip:false,maxRotation:60,minRotation:45}},y:{beginAtZero:true}}}});"
        "new Chart(document.getElementById('domainChart'),{type:'radar',data:{labels:" + json.dumps(list(agg.keys())) +
        ",datasets:[{label:'Signal coverage',data:" + json.dumps(list(agg.values())) +
        ",backgroundColor:'rgba(0,83,226,0.2)',borderColor:'" + BLUE + "',pointBackgroundColor:'" + BLUE + "'}]},"
        "options:{responsive:true,maintainAspectRatio:false}});"
    )

    def stat(v, color=""):
        style = ' style="color:' + color + '"' if color else ""
        return '<div class="text-3xl font-bold"' + style + ">" + str(v) + "</div>"

    doc = (
        '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>'
        '<meta name="viewport" content="width=device-width, initial-scale=1"/>'
        "<title>CSO Competitor Benchmarking - SENTRY</title>"
        '<script src="https://cdn.tailwindcss.com"></script>'
        '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script></head>'
        '<body class="bg-gray-50 text-gray-900">'
        '<header class="text-white" style="background:' + BLUE + '"><div class="max-w-6xl mx-auto px-6 py-7">'
        '<h1 class="text-2xl md:text-3xl font-bold">Chief Sustainability Officer - Competitor &amp; Supplier ESG Benchmark</h1>'
        '<p class="opacity-90 mt-1">Walmart Enterprise Security - Emerging Technology &middot; Public-source intelligence (review-only) &middot; Generated ' + generated + "</p></div></header>"
        '<main class="max-w-6xl mx-auto px-6 py-8">'
        '<section class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">'
        '<div class="bg-white rounded-xl shadow p-4 text-center">' + stat(len(active), BLUE) + '<div class="text-xs text-gray-500">Active execs</div></div>'
        '<div class="bg-white rounded-xl shadow p-4 text-center">' + stat(total_signals) + '<div class="text-xs text-gray-500">Total signals</div></div>'
        '<div class="bg-white rounded-xl shadow p-4 text-center">' + stat(total_sources) + '<div class="text-xs text-gray-500">Total sources</div></div>'
        '<div class="bg-white rounded-xl shadow p-4 text-center">' + stat(total_ready, BLUE) + '<div class="text-xs text-gray-500">CSO-ready</div></div>'
        '<div class="bg-white rounded-xl shadow p-4 text-center"><div class="text-3xl font-bold text-amber-700">' + str(len(archived)) + '</div><div class="text-xs text-gray-500">Archived/stale</div></div>'
        "</section>"
        '<section class="bg-white rounded-xl shadow p-6 mb-8" style="border-left:6px solid ' + SPARK + '">'
        '<h2 class="text-xl font-bold mb-3">Executive Summary (top)</h2>'
        '<ul class="list-disc pl-5 space-y-2 text-sm text-gray-800">'
        "<li><b>Leadership accuracy matters:</b> 3 of the original 9 targets had stale/incorrect data - Target's Nusz departed, Kroger's named CSO is unverifiable (role embedded in Comms), FedEx has no CSO (CEO owns it). The watchlist was corrected.</li>"
        "<li><b>Biggest competitive flag:</b> ex-<b>Walmart U.S. CEO Greg Foran is now Kroger's CEO</b> (Feb 2026) - deep firsthand knowledge of Walmart's grocery playbook.</li>"
        "<li><b>Regulatory center of gravity shifted:</b> the U.S. SEC climate rule was withdrawn (Mar 2025); <b>EU CSRD and California SB 253/261 are now the real mandatory triggers</b> - surfaced in PepsiCo &amp; Microsoft filings.</li>"
        "<li><b>Strongest direct retail benchmark:</b> Amazon (Kara Hurst) on supplier decarbonization and packaging; Target shows a visible Scope 3 gap (5.6% vs 32.5% target).</li>"
        "<li><b>Tooling angle:</b> Microsoft Cloud for Sustainability is a candidate carbon-accounting platform - but CSRD double-materiality/assurance support needs due diligence.</li>"
        "</ul></section>"
        '<section class="grid md:grid-cols-2 gap-6 mb-8">'
        '<div class="bg-white rounded-xl shadow p-5"><h3 class="font-bold mb-3">Signals vs CSO-ready by executive</h3><div style="height:340px"><canvas id="sigChart"></canvas></div></div>'
        '<div class="bg-white rounded-xl shadow p-5"><h3 class="font-bold mb-3">Coverage by tracking domain (all active)</h3><div style="height:340px"><canvas id="domainChart"></canvas></div></div>'
        "</section>"
        '<h2 class="text-xl font-bold mb-4">Executive portfolios</h2>'
        '<section class="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">' + cards + "</section>"
        '<h2 class="text-xl font-bold mb-3">Archived / stale targets (audit trail)</h2>'
        '<section class="bg-white rounded-xl shadow overflow-hidden mb-10"><table class="w-full text-sm text-left">'
        '<thead class="bg-gray-100 text-gray-600 text-xs uppercase"><tr><th class="p-3">Target &amp; finding</th><th class="p-3">Superseded by</th><th class="p-3">Status</th></tr></thead>'
        "<tbody>" + arows + "</tbody></table></section>"
        '<section class="bg-white rounded-xl shadow p-6 mb-10" style="border-left:6px solid ' + BLUE + '">'
        '<h2 class="text-xl font-bold mb-3">Executive Summary (bottom) - recommended actions</h2>'
        '<ul class="list-disc pl-5 space-y-2 text-sm text-gray-800">'
        "<li><b>Monitor Greg Foran / Kroger</b> for sustainability + grocery strategy signals given his Walmart background.</li>"
        "<li><b>Benchmark Walmart Scope 3 disclosure</b> against the post-SEC-withdrawal baseline (CSRD + CA SB 253) that PepsiCo and Microsoft now plan around.</li>"
        "<li><b>Close the disclosure-domain gap</b> with a proxy/10-K pass for Amazon, Unilever, P&amp;G, Target, and FedEx (this run covered Kroger, PepsiCo, Microsoft).</li>"
        "<li><b>Analyst approval required</b> before any signal is promoted to CSO-facing use. Everything here is review-only draft intelligence.</li>"
        "<li><b>Escalation flag:</b> a possible Walmart-CFO / Microsoft-board overlap was surfaced (MSFT sig_020) - route to Legal/Compliance before downstream use.</li>"
        "</ul></section>"
        '<footer class="text-xs text-gray-500 pb-10">Generated by SENTRY Executive Signal Scout (review-only). Public-source business intelligence only. No SQLite writes, no publication, no outbound delivery. Signals require analyst approval before CSO distribution.</footer>'
        "</main><script>" + js + "</script></body></html>"
    )
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(doc, encoding="utf-8")
    return out_path


def main(argv):
    out = argv[0] if argv else "cso_benchmark_report.html"
    path = build_report(out)
    print("Wrote " + str(Path(path).resolve()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
