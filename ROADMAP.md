# 🛡️ SENTRY Improvement Roadmap

> **Walmart Global Security · Emerging Technology** — Internal use only
> **Author:** Atlas 🐶 · **Date:** 2026-05-29 · **Status:** DRAFT (awaiting team review)
> **Source:** Competitive benchmark vs. IPVM & 17 peer security-intelligence platforms
> (see `puppy_workspace/reports/sentry_intel_benchmark.html`).

---

## Strategy in one line

Ship cheap credibility upgrades first (grades + comparison), use them to justify
the schema groundwork (score history + citations), then land the moat-defining
**Intelligence Graph** on top of data we already own.

## The two findings that drive everything

1. **SENTRY's moat = 4-in-1 fusion.** No external site combines vendor +
   competitor + regulatory + incident intel. Double down here.
2. **SENTRY's biggest gap = "static."** Best-in-class platforms (BitSight,
   SecurityScorecard, Recorded Future) all do *continuous monitoring +
   time-series scores*. SENTRY assessments are point-in-time snapshots.

---

## Phase 0 — Foundation (Week 1) · do this before anything else

The biggest architectural blocker is the static-scoring data model. Everything
downstream needs scores to be *events over time*, not a single column.

| Action | Why first |
|---|---|
| Add `score_history` table (`vendor_id, dimension, score, source, confidence, captured_at`) | Unlocks trends, monitoring, citations — three items at once |
| Add a `grade()` helper (numeric risk → A–F band) | Pure function, trivially testable, reused everywhere |
| Backfill current scores as the first history row | Zero data loss, instant "since" baseline |

**Effort:** Low–Med · **Risk:** Low (additive migration, no breaking changes)

## Phase 1 — Quick Trust Wins (Weeks 1–2) · ship to users fast

1. **A–F grades everywhere** — map existing risk scores to letters on vendor
   cards + detail modal (uses the Phase 0 helper).
2. **Methodology page** — a static route explaining how grades are computed.
   Pure trust play, near-zero risk.
3. **Side-by-side comparison view** — pick 2–3 vendors, render VAR dimensions in
   one table + a radar chart. The radar component already exists in
   `components/vendor/VarTab.tsx`.

**Why now:** highest trust-per-hour, no new infra, demoable to leadership
immediately.

## Phase 2 — Living Intelligence (Weeks 3–5)

4. **Score trend lines / sparklines** on vendor cards (reads Phase 0 history).
5. **Confidence + citation badges** on intel items (schema field added in Phase 0).
6. **Watchlists + entity alerting** — extend the existing Teams-alert plumbing to
   user-defined watch targets.

**Why now:** directly closes the "static" gap every best-in-class competitor
beats us on.

## Phase 3 — The Moat: Intelligence Graph (Weeks 6–9)

7. **Join layer** linking vendors ↔ incidents ↔ regulations ↔ competitors
   (data lives in separate tables today; needs relationship edges).
8. **Graph API endpoint** (`/api/graph/{entity}` → nodes + edges).
9. **Graph view** — reuse an existing 3D/force component
   (`components/Architecture3D.tsx` / `components/CSORadar3D.tsx`).

**Why last:** highest leverage *and* highest effort — much easier once Phase 0–2
have normalized scores, citations, and entity references in place.

## Phase 4 — Engagement Extras (opportunistic)

10. Interactive calculators (risk exposure / TCO / ROI — ties into existing LPR
    ROI work), internal peer reviews on assessments, peer benchmarking vs.
    category average.

## Execution principles (the *how*)

- **One branch + PR per roadmap item** — small, reviewable, reversible.
- **Tests first for pure logic** (`grade()`, graph joins) — deterministic, cheap
  to lock down.
- **Verify every write** with the gremlin guard so nothing ships corrupted.
- **Commit often**, keep diffs in the 100–300 line range.
- Keep mine-only files separated from in-flight auth/enum work.

## Recommended build order (highest ROI first)

| Order | Item | Phase | Effort | Impact |
|---|---|---|---|---|
| 1 | `score_history` table + `grade()` helper + backfill | 0 | Low–Med | Enabler |
| 2 | A–F grades on cards + modal | 1 | Low | High |
| 3 | Methodology page | 1 | Low | High (trust) |
| 4 | Side-by-side comparison view | 1 | Low–Med | High |
| 5 | Score trend sparklines | 2 | Med | Med |
| 6 | Confidence + citation badges | 2 | Low–Med | Med |
| 7 | Watchlists + entity alerting | 2 | Med | High |
| 8 | Intelligence Graph join + API + view | 3 | High | Game-changer |
| 9 | Calculators / peer reviews / benchmarking | 4 | Varies | Med |

## Open questions for the team

- Is continuous monitoring (live CVE/breach/news ingestion) in scope, or do we
  start with manual re-scoring captured as history?
- Does the Intelligence Graph need write access (analyst-created edges) or is
  read-only inference from existing data enough for v1?
- Should the methodology page be public-facing or internal-only?

## Decision log pointer

When a phase is approved, record the durable decision in `DECISIONS.md` and link
back to this roadmap. This file is a living plan — update statuses as items ship.

