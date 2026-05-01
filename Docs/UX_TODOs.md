# SENTRY v2 UX Improvement To‑Dos (Program Analysis)

This list is based on a code-level review of the current frontend shell, API behavior, and project docs.

## Priority 0 — Stability and trust first

1. **Fix `App.tsx` structural duplication and broken composition.**  
   The app shell currently contains duplicated imports/components and mismatched layout tags, which risks compile/runtime issues and unpredictable navigation behavior.

2. **Add a global, user-facing error state for failed API calls.**  
   `services/api.ts` tracks errors for analytics, but there is no standardized user-facing pattern shown here for retry guidance, fallback content, or degraded mode messaging.

3. **Add session restore for landing + last-view navigation consistently.**  
   Keys are defined (`sentry.platform.entered`, `sentry.platform.view`) and helpers exist, but state init currently does not use those readers in the shown implementation.

## Priority 1 — Reduce friction in core workflows

4. **Unify loading states across all views and data widgets.**  
   Keep one consistent skeleton/loading pattern (not just spinner) so users understand what is loading and what is actionable.

5. **Standardize empty-state copy and CTAs per view.**  
   For pages such as Request Queue, Competitor Intel, and Regulatory Intel, provide “why empty”, “what to do next”, and one primary action.

6. **Improve keyboard-first navigation for power users.**  
   Command palette is present; extend with consistent shortcuts (e.g., switch views, focus search, open request form, jump to vendor detail).

7. **Add progressive disclosure in dense intelligence views.**  
   Reduce visual overload by defaulting to summarized insights, then allowing drill-down into raw detail.

## Priority 2 — Transparency and decision confidence

8. **Show data freshness timestamps everywhere decisions are made.**  
   Add “last updated” and source indicators to key cards/tables/charts to reduce ambiguity.

9. **Expose API timeout/retry status in UI for long-running requests.**  
   API timeout is currently fixed at 12s; users need visible feedback and retry options when operations exceed this.

10. **Add “explain this score” affordances for risk/VAR metrics.**  
    Each score should have one-click rationale: inputs, weighting, confidence, and date.

11. **Improve comparative context in market/incident/regulatory views.**  
    Include baseline and trend deltas so users can answer “Is this better or worse than last month?” instantly.

## Priority 3 — Accessibility, consistency, and polish

12. **Run an accessibility pass on contrast, focus rings, and ARIA labels.**  
    The dark theme is visually strong, but accessibility outcomes should be validated and enforced in CI.

13. **Create a copy style guide for status labels and nouns.**  
    Normalize terms (e.g., “assessment”, “request”, “incident”, “intelligence”) and consistent capitalization across views.

14. **Establish design tokens for spacing and typography tiers.**  
    Ensure dashboard modules feel coherent despite many feature areas.

15. **Add responsive behavior targets for common analyst laptop resolutions.**  
    Verify that critical workflows are comfortable at 125% zoom and smaller vertical viewport heights.

## Priority 4 — Instrumentation and validation loop

16. **Define UX KPIs tied to existing analytics hooks.**  
    Track task-completion funnels (submit assessment, find vendor, export/report) and drop-off points.

17. **Add in-product micro-feedback prompts for key workflows.**  
    Ask targeted “Was this useful?” questions immediately after high-value actions.

18. **Create a monthly UX debt review with top 5 fixes.**  
    Keep this backlog living; close quick wins each sprint and re-prioritize by usage and impact.

---

## Suggested implementation order (first 2 sprints)

- **Sprint 1:** Items 1–5 (stability, error handling, restore state, loading/empty states).
- **Sprint 2:** Items 6–11 (navigation efficiency + decision transparency).
- **Ongoing:** Items 12–18 (accessibility, consistency, instrumentation culture).
