# Agent-First Executive Intel Handoff

## Decision

Executive intelligence collection and review should be **agent-first**, not SENTRY-first.

The Executive Signal Scout agent owns collection, normalization, validation, dedupe, confidence scoring, and draft-only synthesis in the local governed workspace. SENTRY is a downstream consumer that may import or display finalized bundles later.

## Default Flow

```text
exec-signal-scout
  -> local review-only workspace
  -> analyst review / finalization
  -> handoff bundle
  -> SENTRY program optional import or consumption
```

This avoids coupling collection policy, browser tooling, and review workflow directly to SENTRY UI or SQLite persistence.

## Why This Is Better

- Keeps collection controls inside the agent program.
- Lets analysts review and finalize before SENTRY sees anything.
- Avoids premature SQLite schema commitments.
- Keeps SENTRY ingestion optional and reversible.
- Supports other delivery paths later without rewriting collection logic.

## Handoff Bundle

The handoff bundle is a read-only structured package generated from local artifacts. It should be treated as the contract between the agent and the SENTRY program.

Backend builder:

```text
backend/executive_intel/handoff.py
```

Primary function:

```python
build_handoff_bundle(profile_id, finalized_by="analyst_id")
```

Default behavior includes only signals with:

- `verification_status = VERIFIED`
- `analyst_review_status` in:
  - `APPROVED_FOR_SENTRY`
  - `APPROVED_FOR_CSO_DRAFT`

Draft dry-runs may use `include_review_ready=True`, but those bundles are clearly marked `DRAFT_HANDOFF_REVIEW_ONLY`.

## Bundle Contents

Each bundle includes:

- bundle metadata
- profile
- approved/finalized signals
- source inventory
- validation summary
- source policy summary
- draft report markdown
- mandatory review-only controls enforced
- import notes for SENTRY consumers

## Mandatory Controls Still Apply

The handoff process remains review-only:

- no SQLite writes
- no artifact mutation
- no scheduled collection
- no report publication
- no outbound delivery
- no private/current location tracking
- no authentication, paywall, or CAPTCHA bypass
- no competitor pricing, assortment, or offering scraping

Generating a bundle is not publication. Importing it into SENTRY, sending it, or promoting it to CSO-facing output remains a separate approved action.

## SENTRY Relationship

SENTRY may later consume handoff bundles through:

1. manual upload/import,
2. read-only file pickup,
3. approved API import,
4. approved database persistence.

Those are downstream implementation choices. The intelligence program should not depend on SENTRY UI to operate.
