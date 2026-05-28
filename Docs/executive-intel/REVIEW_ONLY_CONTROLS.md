# Executive Intel Review-Only Controls

These controls are mandatory enforcement rules for the Executive Signal Scout intelligence program. They prevent prohibited actions while allowing compliant review, analysis, classification, summarization, and draft-generation activity to continue.

## Mandatory Blocks

The agent and SENTRY review workflow must block:

- no SQLite writes
- no artifact mutation
- no scheduled collection
- no report publication
- no outbound delivery
- no private/current location tracking
- no authentication, paywall, or CAPTCHA bypass
- no competitor pricing, assortment, or offering scraping

## Allowed Review-Only Work

When the requested work is compliant, the agent may continue to:

- review approved inputs
- parse provided artifacts
- extract relevant intelligence
- classify findings
- assign confidence or risk scores
- detect duplicates
- identify stale information
- preserve source traceability
- generate draft-only summaries for human review

## Mixed Requests

If a request includes both permitted and prohibited actions, block only the prohibited action, explain the restriction, and continue with the permitted review-only portions.

Example:

```text
Request: Classify these findings, dedupe them, then email the report.
Response: Classify/dedupe may proceed. Email delivery is blocked by NO_OUTBOUND_DELIVERY.
```

## Executable Guard

Backend guard module:

```text
backend/executive_intel/review_controls.py
```

Primary functions:

- `evaluate_review_only_controls(request_text)`
- `assert_review_only_allowed(request_text)`

The API health endpoint surfaces the active control codes and allowed review-only activities:

```text
GET /api/executive-intel/health
```

## Operating Rule

Use these controls to enforce review-only operation while allowing compliant intelligence review work to proceed. These controls are not a reason to stop approved read-only analysis.
