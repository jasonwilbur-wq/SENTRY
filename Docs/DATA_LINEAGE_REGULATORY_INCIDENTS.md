# SENTRY Data Lineage — Regulatory & Incident Intelligence

**Date:** 2026-05-29
**Author:** Atlas (Code Puppy 🐶)
**Scope:** End-to-end data flow (raw source → what renders in SENTRY) for the
**Regulatory** and **Incident** intelligence domains, plus trend-analysis
capabilities and user-value recommendations.
**Status:** Reference (verified against live code, not stale docs)

---

## 1. Executive Summary

SENTRY runs **two structurally different pipelines** for these domains:

| | Regulatory | Incidents |
|---|---|---|
| Raw source | Excel workbook (`Regulatory Data - 2026.xlsx`) | Incident CSVs / `Incident Tracker*.xlsx` |
| Transform | `build_regulatory_report.py` (batch build) | `import_incidents.py` (batch import) |
| Storage | **Static JSON file** (`regulatory-briefing.json`) | **SQLite table** (`incidents`) |
| Serving | `regulatory_routes.py` (reads JSON in memory) | `incident_routes.py` (live SQL queries) |
| UI | `RegulatoryIntelligence.tsx` + map explorer | `IncidentIntelligence.tsx` |
| Refresh model | Re-run build script → overwrite JSON | Re-run importer → `DELETE` + reinsert |

**The big asymmetry:** Regulatory is a *pre-computed file* (rich risk scoring,
NIST mapping, dedup, provenance — all baked at build time). Incidents is a *live
DB* (queried on demand, but with thinner enrichment — severity/region are
keyword-inferred, no risk scoring, no dedup-with-provenance).

**Trend analysis today is shallow** in both: Regulatory exposes monthly/quarterly
*counts* via `/insights`; Incidents exposes a 12-month *count* trend via `/stats`.
Neither does **period-over-period deltas, momentum, severity-weighted trends, or
forecasting** — which is exactly where the user value gap is.

---

## 2. Where the Data Lives

All local paths resolve through `backend/path_config.py` (env-overridable):

```
SENTRY_DATA_ROOT = %ONEDRIVE%\Desktop\SENTRY            (default)
  ├── Regulatory\        → REGULATORY_ROOT   (Regulatory Data - 2026.xlsx)
  ├── Incidents\         → INCIDENTS_ROOT    (*.csv)
  └── Incident Tracker*.xlsx → INCIDENT_WORKBOOK_GLOB (fallback)
```

Committed/cached copies inside the repo:

```
backend/data/
  ├── source/
  │   ├── Regulatory Data - 2026.xlsx          ← raw workbook (local copy)
  │   ├── regulatory_cleaned_master.json/.csv  ← cleaned, normalized export
  ├── json_reports/
  │   └── regulatory-briefing.json             ← SERVED artifact (source of truth for API)
  ├── regulatory_rows.json                     ← deduped intermediate (debug/raw)
  └── sentry.db                                ← SQLite (incidents table lives here)
```

> ⚠️ `sentry.db` and all `*.xlsx`/`*.db` are gitignored (PII guard). The
> regulatory **JSON** outputs are tracked; the DB is not.

---

## 3. Regulatory Pipeline (raw → SENTRY)

### 3.1 Flow diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 0 — RAW                                                        │
│ Regulatory Data - 2026.xlsx (multi-tab: 202601, 202602, … monthly)   │
│ Columns: Location · Type of Technology · Name of Law/Bill · Status · │
│          Detailed Description · Date Enacted or Proposed · Source(s)  │
│ Optional download: download_regulatory_workbook.py (from SharePoint)  │
└──────────────────────────────────┬──────────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 1 — BUILD  (build_regulatory_report.py — run from backend/)     │
│ 1. load_source_rows(): read every tab matching REQUIRED_COLS schema   │
│ 2. normalize: norm_juris() · norm_tech() · norm_status()             │
│ 3. dedup: key = slug(jurisdiction|law|tech); merge richer row,        │
│    preserve provenance from all merged source rows                    │
│ 4. score_risk(): Impact(tech sensitivity + jurisdiction + penalty     │
│    language) × Likelihood(enacted=4/proposed=3/failed=1) → RAG band    │
│ 5. NIST_MAP: attach NIST CSF / AI RMF control + GS internal tag       │
│ 6. build_obligation(): geo_scope, criticality, evidence_status,       │
│    controls, 30-word summary, parsed effective_date                    │
│ 7. assemble exec summary + top_actions + stats + assumptions          │
└───────────────────────────────┬──────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 2 — STORE (static artifacts)                                    │
│ data/json_reports/regulatory-briefing.json  ← SERVED                  │
│ data/regulatory_rows.json                    ← deduped raw            │
│ data/source/regulatory_cleaned_master.json/.csv ← analyst export      │
└───────────────────────────────┬──────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 3 — SERVE (regulatory_routes.py · /api/regulatory/*)            │
│ _load() reads JSON each request (no DB). Endpoints:                    │
│ /summary · /obligations(filter+page+sort) · /obligations/{id} ·       │
│ /filters · /geo(scope) · /insights(scope) · /download                 │
└────────────────────┬──────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 4 — RENDER (services/api.ts → RegulatoryIntelligence.tsx +      │
│ RegulatoryMapExplorer / Globe3D / Map2D)                              │
│ KPIs · RAG bands · jurisdiction map markers · tech breakdown ·        │
│ obligation table · executive top/bottom callouts                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Key transformation logic (the "intelligence")

- **Risk scoring** (`score_risk`): `Impact × Likelihood`, banded
  `≤6 Green · ≤12 Yellow · ≤18 Amber · >18 Red`. Impact boosted by penalty/
  enforcement language + Federal/EU/UK scope. **Heuristic — flagged for Legal
  validation in `assumptions`.**
- **Dedup with provenance**: composite key merges duplicate laws across monthly
  tabs and retains every source row reference (`_provenance`). This is the
  strongest part of the pipeline.
- **NIST/GS control mapping**: each tech category → a control id + owner, giving
  obligations a compliance hook.

### 3.3 Trend capability today

`/insights` returns `daily_breakdown`, `monthly_breakdown`, `quarterly_breakdown`
— but these are **pure counts of `effective_date`**, no deltas, no momentum, no
RAG-weighting. The executive callouts are **templated strings**, not computed
trends.

---

## 4. Incident Pipeline (raw → SENTRY)

### 4.1 Flow diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 0 — RAW                                                         │
│ Incident CSVs in INCIDENTS_ROOT  (preferred)                          │
│   ── fallback ──▶ Incident Tracker*.xlsx (multi-sheet)               │
│   ── fallback ──▶ legacy OneDrive\ET\SENTRY_Data\Incidents\*.csv      │
│ Columns (fuzzy-matched): date · incident type · location · summary · │
│   impact · recommended action · source url · tags                     │
└───────────────────────────────┬──────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 1 — IMPORT (import_incidents.py — run once / monthly)          │
│ 1. _load_sources(): discover CSVs or workbook sheets                  │
│ 2. _pick(): map fuzzy column aliases → canonical fields               │
│ 3. _normalise_date(): coerce many formats → YYYY-MM-DD                │
│ 4. _infer_severity(): keyword match → Critical/High/Low/Medium       │
│ 5. _infer_location_meta(): keyword → region + country                 │
│ 6. _row_id(): sha1(source|type|date|summary) stable id (dedup)       │
│ 7. DELETE existing → INSERT OR IGNORE (idempotent full refresh)      │
└───────────────────────────────┬──────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 2 — STORE (SQLite)                                              │
│ incidents table: id, incident_date, incident_type, severity,         │
│   location, region, country, summary, impact, recommended_action,    │
│   source_url, tags, source_file, created_at                          │
└───────────────────────────────┬──────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 3 — SERVE (incident_routes.py · /api/incidents/*)              │
│ Live SQL each request:                                                │
│ /stats (totals, by_severity, by_type, by_region, monthly_trend,      │
│   recent) · "" list(filter+page+sort) · /filters · /recent           │
└───────────────────────────────┬──────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 4 — RENDER (services/api.ts → IncidentIntelligence.tsx)        │
│ Hero KPIs · severity bars · top types · region heatmap ·             │
│ monthly trend sparkline · searchable/filterable expandable rows      │
│ (also feeds Morning Brief via /recent)                                │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Key transformation logic

- **Severity inference** (`_infer_severity`): keyword lists
  (cyber/ransomware/violence → Critical; cargo theft/ORC/robbery → High;
  arrest/court/fine → Low; else Medium). **Heuristic — not analyst-set.**
- **Region/country inference** (`_infer_location_meta`): US state abbreviations
  + city keywords → Northeast/Southeast/Midwest/Southwest/West; international
  country keyword tables.
- **Idempotent refresh**: `DELETE FROM incidents` then `INSERT OR IGNORE` with a
  content-hash id. Safe to re-run, but **destructive** (no history retained
  across refreshes — see gaps).

### 4.3 Trend capability today

`/stats.monthly_trend` = last 12 months of **raw counts**, reversed. No severity
weighting, no deltas, no region/type trend over time, no anomaly flags.

---

## 5. Side-by-Side: Pipeline Maturity

| Capability | Regulatory | Incidents |
|---|---|---|
| Source normalization | ✅ Strong (juris/tech/status) | ⚠️ Fuzzy column + keyword infer |
| Dedup | ✅ Composite key + merge | ⚠️ Hash id only (no merge) |
| Provenance | ✅ Per-obligation source list | ⚠️ Single `source_file` |
| Risk scoring | ✅ Impact×Likelihood RAG | ❌ None (severity keyword only) |
| Control mapping | ✅ NIST/GS | ❌ None |
| Live queryable | ❌ Static JSON (rebuild needed) | ✅ SQL on demand |
| History across refreshes | ⚠️ JSON overwrite | ❌ DELETE wipes prior |
| Trend = counts only | ✅ d/m/q counts | ✅ 12-mo counts |
| Deltas / momentum / forecast | ❌ | ❌ |

---

## 6. Trend Analysis — Gaps & Proposals

The user explicitly wants **trend analysis** for both domains. Today both stop at
raw counts. Concrete value-adds:

### 6.1 Shared trend primitives (build once, use both)
1. **Period-over-period deltas** — "+18% MoM, −5% QoQ" with direction arrows.
2. **Severity/RAG-weighted trend** — not just *how many* but *how bad*
   (e.g., Critical incidents weighted 4×, Red obligations weighted highest).
3. **Momentum / rolling average** — 3-month rolling mean to smooth noise + flag
   acceleration.
4. **Anomaly flags** — month exceeds mean + 2σ → "⚠️ spike" badge.
5. **Top movers** — which incident *type* / regulatory *tech category* /
   *jurisdiction* grew or shrank most this period.
6. **Simple forecast** — linear/Holt projection for next period with a
   clearly-labeled "projection" band (draft-only, per SENTRY model).

### 6.2 Regulatory-specific
- **Enacted-vs-proposed velocity** — are proposals converting to enacted faster?
- **Jurisdiction heat shift** — which states/countries are *newly* active.
- **Tech-category emergence** — first appearance + growth of a tech area.

### 6.3 Incident-specific
- **Severity migration** — is the Critical share of total rising?
- **Regional surge detection** — region with abnormal MoM growth.
- **Type co-occurrence** — ORC + cargo theft clustering by region/time.
- **Recurrence** — repeat incident types at same location.

---

## 7. User-Value Recommendations (prioritized)

> Goal stated by user: *"most of all we need to provide / add value to the
> users."* These map trend mechanics → decisions a CSO/analyst actually makes.

| # | Value-add | Domain | Effort | Why it matters |
|---|---|---|---|---|
| V1 | **"What changed since last month" strip** (deltas + top movers) at top of each page | Both | S | First thing a CSO wants: "what's new/worse?" |
| V2 | **Severity/RAG-weighted trend line** alongside raw counts | Both | S | Volume ≠ risk; weighting shows true exposure |
| V3 | **Anomaly/spike badges** on trend charts | Both | S | Directs attention without reading every row |
| V4 | **Incident risk score** (not just keyword severity) mirroring regulatory Impact×Likelihood | Incidents | M | Closes the biggest maturity gap; enables ranking |
| V5 | **Historical snapshots** so trends survive refresh (don't DELETE history) | Both | M | Real trend analysis needs retained periods |
| V6 | **Cross-domain correlation** — regulatory obligation ↔ related incident type (e.g., ALPR law ↔ ALPR incidents) | Both | M | The unique SENTRY insight competitors can't match |
| V7 | **Forecast/projection band** (draft-only) | Both | M | Forward-looking → staffing & control-audit planning |
| V8 | **Analyst override** of inferred severity/RAG with audit trail | Both | M | Heuristics flagged for validation; make it real |
| V9 | **Export trend brief** (DOCX/PDF/clipboard) for exec consumption | Both | S | Analysts currently copy/paste manually |

**Recommended first slice (highest value / lowest risk):** V1 + V2 + V3 — a
shared **trend-analytics module** computing deltas, weighted trends, and anomaly
flags, surfaced as a "What Changed" strip + enriched charts on both pages. All
read-only, additive, no schema/auth risk.

---

## 8. How to Refresh the Data (operator runbook)

**Regulatory:**
```bash
# (optional) pull latest workbook from SharePoint
cd backend && python download_regulatory_workbook.py
# rebuild the served JSON
cd backend && python build_regulatory_report.py
# → overwrites data/json_reports/regulatory-briefing.json; API picks up next request
```

**Incidents:**
```bash
# drop CSVs into INCIDENTS_ROOT (or update Incident Tracker*.xlsx)
cd backend && python import_incidents.py
# → DELETE + reinsert into incidents table (idempotent)
```

> Both are **manual / human-initiated** (aligns with SENTRY draft-first,
> human-controlled model). No autonomous background refresh.

---

## 9. Risks & Caveats (for whoever builds on this)

1. **Heuristic scoring** (regulatory risk, incident severity) is explicitly
   flagged for Legal/analyst validation — surface confidence, don't imply final.
2. **Incident refresh is destructive** — `DELETE FROM incidents` wipes prior
   state; any trend history must be snapshotted *before* this lands (V5).
3. **Regulatory is a static artifact** — stale until `build_regulatory_report.py`
   re-runs; add a "data_through / last built" freshness indicator on the page.
4. **Provenance asymmetry** — incidents keep only `source_file`; consider
   matching regulatory's richer provenance for auditability.
5. **No PII** in incident summaries should reach exec outputs — keep the guard.

---

*Living document — update as the trend-analytics module lands.*
