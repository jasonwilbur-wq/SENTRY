# SENTRY Page-by-Page Feedback & Action Plan

> **Author:** Atlas 🐶 · **Date:** 2026-05-29
> **Trigger:** JRW walkthrough feedback on Dashboard, Vendor Directory, Project
> Portfolio, Competitor Intel, Executive Intel.
> **Status:** Analysis + 1 bug fix shipped (`4b3e8f6`). Web-collection items
> gated pending JRW go-ahead (governed exec-signal-scout pipeline).

---

## 0 · What I already fixed this session

| Item | Commit | Notes |
|---|---|---|
| Project modal not centering | `4b3e8f6` | Portaled modal to `document.body` — it was trapped inside a 3D-transformed ancestor so `position:fixed` resolved against the transform. |
| No phase roadmap in project detail | `4b3e8f6` | Wired the existing `ESTLifecycleTimeline` (8 gates) into the project modal + `estPhase` mapper (6 tests). |

---

## 1 · Dashboard — the intelligence gap (HIGH priority)

**Verdict: valid critique.** `HomeDashboard` today is a *vendor directory
summary* (risk pie, category bars, recent assessments). It surfaces **none** of
the four intelligence domains SENTRY runs: Competitor, Regulatory, Incident,
Executive.

**The morning question a CSO asks is "what do I need to know?" — not "how many
vendors are medium risk?"**

### Recommendation: an "Intelligence Brief" strip at the top
1. **Since-yesterday deltas** across all 4 domains: new competitor events, new
   regulatory changes, new incidents, new exec signals — count + top 3 headlines.
2. **Top 5 attention items** — highest-severity items from *every* domain merged
   into one ranked list with a "why it matters" line and a deep-link.
3. Keep existing vendor KPIs, demote them *below* the brief.

**Reuse, don't rebuild:** `MorningBriefCard.tsx` already exists and is underused.
This is composition, not new infrastructure. Backend already has competitor,
regulatory, incident, and exec endpoints to feed it.

## 2 · Vendor Directory — VARs not showing up (deferred per JRW)

UI is solid; revisit after UI polish. **Early signal from benchmark work:** the
DB has **2,118 vendors but only a handful carry VAR decision bands / scores.**
That points at the **VAR-to-vendor linking or the extract-to-DB write path**,
not the UI. Start the investigation at `backend/admin_var_routes.py` +
the `extract-batch` flow and the `var_reports` join.

---

## 3 · Project Portfolio — DONE + next data step

Modal centering + EST 8-gate roadmap shipped. "Better data" remaining work:
project records are thin (no populated NDA/APM/ERPA/SSP, no milestone history).
The `ComplianceFields` shape already exists — it just needs real data. **Next:**
feed real compliance IDs/dates + add a milestone-history timeline.

---

## 4 · Competitor Intel — data without interpretation (HIGH priority)

**Verdict: the sharpest valid critique.** The page is a *data browser* — logos,
event counts, threat levels, 3D viz. It answers "what happened" but never
"so what for Walmart / what do I do."

### Recommendation: add an interpretation layer (borrow from Executive Intel)
- **Per-competitor "So what for Walmart"** — 1-2 sentence analyst takeaway. The
  Exec Intel page already nails this with "Why it matters" + "Analyst
  recommendations." Bring that pattern here.
- **Trend direction, not just totals** — "Amazon cyber events up 40% QoQ" beats
  "Amazon: 32 events."
- **A ranked "what matters this week" feed** so the user doesn't assemble meaning
  from a grid themselves.
- Keep interactive exploration as the *drill-down*, lead with the value.

## 5 · Executive Intel — images, new leaders, confirmation, value

**Good news: the architecture already exists and is strong.** The
`exec-signal-scout` agent + `config/executive_intel_workflow_profile.json`
define a governed pipeline: public-read-only collection -> analyst review ->
finalized handoff bundle -> optional SENTRY import. **That IS the confirmation
process** JRW referenced (`approved_before_next_phase_required` gates artifact
mutation, persistence, publication, and SENTRY import).

### 5a · Image audit (read-only, done)

| File | Size | Assessment |
|---|---|---|
| `becky-hall.jpg` | 397 KB | OK (largest/best) |
| `jon-raper.jpg` | 30 KB | **Orphan** — no matching profile in `csoProfiles.ts` |
| `stephen-schmidt.jpg` | 17 KB | Low-res, acceptable |
| `rich-agostino.jpg` | 6 KB | **Very low-res** — likely a thumbnail |
| `amy-herzog.jpg` | 5 KB | **Very low-res** — likely a thumbnail |
| `chet-kapoor.jpg` | 3 KB | **Very low-res** — likely a thumbnail |

**Finding:** 3 of 5 profile images are sub-7KB thumbnails (will look poor at the
56px avatar, worse if ever enlarged). One orphan file (`jon-raper.jpg`). The
`ExecutiveAvatar` component already falls back to initials gracefully, so nothing
is broken — but image quality is weak.

**Recommendation:** refresh the 3 low-res headshots + resolve the jon-raper
orphan (either add his profile or remove the file) via the governed scout
pipeline. **Gated pending JRW go-ahead** (involves public web collection).

### 5b · New leaders to track (Kroger, Albertsons, HEB, Costco, ...)

Proposed targets for the scout pipeline (JRW to approve the list before any
collection):
- **Kroger** — VP/Chief Information Security Officer
- **Albertsons** — CISO / VP Security
- **HEB** — Head of Information/Physical Security
- **Costco** — VP/CISO
- (already covered: Amazon, AWS, Target)
- Candidates to consider: Lowe's, Home Depot, Coupang, Ahold Delhaize

**Process:** `exec-signal-scout` drafts from public sources -> analyst review ->
finalize -> import into `csoProfiles.ts`. **Gated pending JRW go-ahead.**

The `ExecutiveProfile` schema is already the right shape; new profiles drop
straight into `CSO_PROFILES`.

### 5c · Is the page adding value? Yes — and here is how to prove it

**Executive Intel is the strongest page in the app** because it already does the
thing every other page is missing: it *interprets*. Each finding has
`whyItMatters`, cited `sources`, `impactScore`, `strategicThreats`, and
`recommendations`. That is genuine CSO value: "here's what a competitor's
security org did, here's why you should care, here's what to do."

**Where it adds the MOST value:** turning raw OSINT into ranked, sourced,
actionable competitive-posture intelligence with analyst recommendations.

**To increase value further:**
1. **Cross-link to Walmart posture** — `WalmartPositionPanel` exists; make each
   competitor finding explicitly contrast "them vs. us."
2. **Freshness/decay indicator** — OSINT goes stale; show last-confirmed date and
   flag aging findings.
3. **"Brief me" export** — one-click board-ready summary per leader (the
   `reportExport.ts` is already there).
4. **Propagate this pattern to Competitor Intel** (see Section 4).

---

## Priority ranking (my recommendation)

| # | Item | Effort | Value | Gated? |
|---|---|---|---|---|
| 1 | Dashboard intelligence brief | M | Very High | No |
| 2 | Competitor Intel interpretation layer | M | Very High | No |
| 3 | Exec image refresh + new leaders | M | High | **Yes (web)** |
| 4 | Vendor VAR linking investigation | L-M | High | No |
| 5 | Project compliance data + milestones | M | Medium | No |

**Gated = needs JRW go-ahead because it uses the governed public web-collection
pipeline (exec-signal-scout).** Everything else I can build read-only + tested.

— Atlas 🐶

