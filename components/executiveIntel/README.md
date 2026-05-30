# Executive Intelligence Module

Competitor & supplier C-suite benchmarking for **Walmart Enterprise Security — Emerging
Technology**. Consumes Executive Signal Scout artifacts and renders a **review-only**
analyst workspace.

> **Review-only.** No DB writes, no scheduling, no publication. Every signal requires
> analyst approval before CSO distribution.

---

## Layout (master–detail)

The view (`components/ExecutiveIntelPortfolio.tsx`) is a responsive two-pane layout:

```
┌──────────────┬───────────────────────────────────────┐
│  Watchlist   │  OverviewDeck (collapsible)            │
│  (sidebar)   │  ─────────────────────────────────────│
│              │  Selected exec + Download report       │
│  search      │  Stat tiles                            │
│  ▸ company   │  ─────────────────────────────────────│
│    exec…     │  Detail grid:                          │
│    exec…     │   ┌ profile · momentum · review queue  │
│  ▸ company   │   └ moves · SWOT · signal feed · brief │
└──────────────┴───────────────────────────────────────┘
```

- **Desktop (`lg+`)** — `grid-cols-[320px_1fr]`, sidebar sticky full-height.
- **Mobile/tablet (`<lg`)** — single column; sidebar stacks on top with its exec list
  capped at `45vh` (own scroll) so the detail pane stays reachable.
- The **global app shell** (`App.tsx` + `Sidebar.tsx`) collapses its nav into a
  hamburger drawer below `md` — the Executive Intel content gets full viewport width.

---

## File map

### Components (`*.tsx`)
| File | Responsibility |
|---|---|
| `ExecutiveSidebar.tsx` | Single searchable, company-grouped exec picker with per-exec mini-stats. Merges the old watchlist + comparison rail. |
| `OverviewDeck.tsx` | Collapsible program-level ESG overview (summary line + stat tiles + key findings). |
| `SignalCard.tsx` | One signal: badges, Walmart-relevance callout, sentiment tag, collapsible citations. |
| `SignalFeed.tsx` | Filter/sort/breakdown over a portfolio's signals. |
| `ReviewQueue.tsx` | Pending-review + stale signals needing analyst attention. |
| `MovesAndMomentum.tsx` | `MomentumPanel` (velocity windows) + `MoveTable` (move / counter-move). |
| `InsightPanels.tsx` | `SwotPanel` (AI-draft SWOT) + `CollectionGaps` (focus-topic coverage holes). |
| `ui.tsx` | Shared primitives: `Badge`, `Card`, `StatCard`, `MiniBar`, `ExecutiveAvatar`. |

### Logic (`*.ts`) — pure, framework-free, unit-tested
| File | Responsibility |
|---|---|
| `signalLogic.ts` | Priority scoring, recency, pending/stale flags, `countBy`, `prettyLabel`. |
| `analytics.ts` | `computeMomentum`, `classifyMove` / `buildMoveRows`, `buildComparison`. |
| `insights.ts` | Sentiment classification, SWOT bucketing, collection-gap detection. |
| `profileLogic.ts` | `groupByCompany`, `isArchived`, `statusTone`, `optionLabel`, `KEY_FINDINGS`, `svpConclusionText`. |
| `reportExport.ts` | Self-contained offline HTML benchmark report (`downloadReport`). |
| `testFactory.ts` | Test factories/builders for the logic unit tests. |

---

## Testing

Logic is isolated from React so it runs in a lean Node-env Vitest config (no DOM,
no `@testing-library` deps required).

```bash
npm run test:logic     # run once
npm run test:watch     # watch mode
```

- `signalLogic.test.ts` (9) · `analytics.test.ts` (9) · `insights.test.ts` (11) = **29 tests**.
- `Date.now()`-dependent logic uses fake timers for determinism.

---

## Accessibility (WCAG 2.2 AA)

- No color-only encoding — every badge carries a text label.
- `role="status"` / `aria-live` on loading & filtered counts; `role="alert"` on errors.
- `:focus-visible` ring on all interactive controls; form controls (`.sentry-input`)
  have a 44px min tap target.
- Decorative glyphs are `aria-hidden`; external links carry an sr-only
  "(opens in a new tab)".
- `MiniBar` exposes `role="img"` + `aria-label`.

---

## Conventions

- **Logic ↔ view split.** Anything testable lives in a `.ts` file; `.tsx` files stay
  presentational. Keeps DRY and makes the 29-test suite possible without a DOM.
- **Git is the bus.** No shared mutable state between modules — props down, callbacks up.
- All files are well under the 600-line cap; split by cohesion, not line count.
