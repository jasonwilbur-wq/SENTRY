# Optional SENTRY Executive Intel Integration

## Current Status

The Executive Signal Scout pipeline is **agent-first**. SENTRY integration is optional and downstream.

The current read-only SENTRY surface can display local, git-ignored artifacts in `data/executive-intel/` as target portfolios and draft reports. It does not collect new web data, write to SQLite, mutate artifacts, schedule jobs, publish CSO-facing output, or deliver outbound reports.

## Backend Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/executive-intel/health` | Read-only integration health and workspace availability |
| `GET /api/executive-intel/portfolios` | List target portfolios discovered from profile artifacts |
| `GET /api/executive-intel/portfolios/{profile_id}` | Return profile, sources, signals, briefs, validation, and policy summary |
| `GET /api/executive-intel/portfolios/{profile_id}/report` | Return the latest draft markdown report plus validation metadata |

## Frontend Surface

If enabled/used, SENTRY includes an **Executive Intel** navigation item under Intelligence.

The page shows:

- target portfolio selector
- source count
- signal count
- valid signal count
- CSO-ready candidate count
- profile/title notes
- source policy summary
- normalized signal cards
- latest draft brief markdown

## Review Model

The page is intentionally read-only:

- no DB writes
- no artifact edits
- no scheduled runs
- no report publication
- no outbound delivery
- no private/current location tracking
- no authentication, paywall, or CAPTCHA bypass
- no competitor pricing, assortment, or offering scraping

Signals still require analyst review before they are promoted to CSO-facing use or included in a finalized handoff bundle. The controls block prohibited actions only; compliant review, parsing, classification, scoring, dedupe, traceability, and draft-only summaries should continue.

## Portfolio Readiness Logic

A portfolio is marked ready for review when:

1. at least one signal exists;
2. the executive profile validates against `ExecutiveProfile`;
3. every signal validates against `ExecutiveSignal`.

A signal is counted as a CSO-ready candidate only when it is `VERIFIED` and includes at least one `HIGH_PRIMARY_SOURCE` citation. This is a candidate flag, not approval.

## Validation

Implemented checks:

- backend route tests with temp artifacts
- mandatory review-only control tests
- source policy route validation
- TypeScript typecheck
- production frontend build
- local repository smoke test against the current Stephen Schmidt artifacts

Latest local smoke result:

```text
portfolios 1
profile Stephen Schmidt | signals 13 | sources 13 | cso_ready 1 | invalid 0
report_chars 12712 | publication NOT_PUBLISHED_REVIEW_REQUIRED
```

## Preferred Next Steps

Recommended next steps, in order:

1. Use the agent-first handoff bundle as the contract for finalized data.
2. Run at least two more supervised target passes and analyst reviews.
3. Only then decide whether SENTRY should import bundles manually, read files, or add an approved API/database ingestion path.
4. Add SQLite persistence only after the handoff contract settles.
5. Add scheduler only after review workflow and retention rules are approved.
