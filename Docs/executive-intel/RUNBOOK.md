# Executive Signal Scout Runbook

## Default Recommendation

Start manually, then move to weekly review, then add daily deltas only after validation.

Do **not** begin with full autonomous daily crawling. That is not an intelligence program; it is a raccoon with a network card.

## Manual Run Workflow

1. Create or select an executive profile from `data/executive-intel/profiles/`.
2. Build a search plan from:
   - full name + organization
   - title variants
   - aliases
   - focus topics
   - event/conference terms
   - initiative terms
3. Collect candidate sources using allowed sources only.
4. Validate source against `SOURCE_POLICY.md`.
5. Extract facts and citations.
6. Deduplicate by executive, date, event title, and source URL.
7. Assign confidence and verification status.
8. Save sources/signals locally under `data/executive-intel/`.
9. Produce a draft brief under `data/executive-intel/briefs/`.
10. Analyst reviews before anything becomes SENTRY/CSO-facing.

## Daily Delta Watch

Purpose: catch net-new public signals.

Recommended scope:

- RSS/search feed deltas
- known event/calendar pages
- known press/newsroom pages
- prior source follow-up links

Outputs:

- new leads
- updated source inventory
- review-required queue

Do not run broad recrawls daily.

## Weekly Analyst Review

Purpose: turn leads into useful intelligence.

Tasks:

- review all `READY_FOR_REVIEW` and `NEEDS_MORE_EVIDENCE` items
- verify business travel/appearance signals
- promote approved items to SENTRY-ready summaries
- produce weekly executive signal digest
- identify new collection gaps

## Monthly Deep Refresh

Purpose: refresh the profile and broader timeline.

Tasks:

- rerun broader discovery queries
- update aliases/title variants
- review stale sources
- summarize month-over-month themes
- archive irrelevant leads

## Future Scheduler Model

Suggested cadence after prototype maturity:

```text
04:30 CT daily    lightweight delta watch
Friday 09:00 CT   weekly analyst digest build
1st business day  monthly deep refresh
```

Scheduler must be approved before activation.

## Quality Checklist

Before a signal is used:

- [ ] Source is allowed by policy
- [ ] Executive identity is disambiguated
- [ ] Citation is captured
- [ ] Business relevance is stated
- [ ] Walmart CSO relevance is stated
- [ ] Travel is public business travel only
- [ ] Confidence level is assigned
- [ ] Review status is set
- [ ] Private/prohibited data is absent

## Failure Handling

| Failure | Handling |
|---|---|
| Source inaccessible | Mark `SOURCE_UNAVAILABLE`; do not bypass |
| Paywall/login/CAPTCHA | Stop; do not bypass |
| Conflicting sources | Mark `CONFLICTING`; require analyst review |
| Weak disambiguation | Keep as `LEAD_ONLY` |
| Private/prohibited data found | Drop content; retain minimal rejection metadata |
| RAG unavailable | Continue without RAG and note dependency gap |
| Browser extraction fails | Fall back to static/source metadata if sufficient |

## Reporting Format

Use this structure for draft briefs:

1. Executive snapshot
2. Confirmed public activity
3. Business travel / appearance timeline
4. Initiatives and major decisions
5. Themes and implications
6. Walmart CSO relevance
7. Confidence and source notes
8. Collection gaps
9. Analyst review items

## Approval Gates

Approval is required before:

- writing to SENTRY DB or mutating source artifacts
- changing from review-only API/UI to analyst-edit or promotion workflows
- scheduling automated runs
- external publication or delivery
- using unclear source types
- expanding beyond public business signals
