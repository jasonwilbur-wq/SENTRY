# Executive Signal Scout Data Contract

## Purpose

Define a uniform local data shape for public executive competitor intelligence. This contract is docs-only until backend/schema implementation is explicitly approved.

## Entity Overview

| Entity | Purpose |
|---|---|
| `ExecutiveProfile` | Normalized person + role identity |
| `ExecutiveAlias` | Alternate names and title variants |
| `ExecutiveSource` | Source metadata and extraction details |
| `ExecutiveSignal` | Verified or review-pending intelligence item |
| `SignalCitation` | Evidence excerpt tied to a signal |
| `CollectionRun` | Audit trail for each manual/scheduled collection run |
| `ReviewDecision` | Analyst disposition and notes |

## ExecutiveProfile

```json
{
  "profile_id": "exec_amazon_stephen_schmidt",
  "full_name": "Stephen Schmidt",
  "organization": "Amazon",
  "title": "SVP & Chief Security Officer",
  "status": "ACTIVE",
  "aliases": ["Steve Schmidt"],
  "focus_topics": ["global security", "investigations"],
  "created_at": "2026-05-27T00:00:00Z",
  "updated_at": "2026-05-27T00:00:00Z"
}
```

## ExecutiveSource

```json
{
  "source_id": "src_20260527_0001",
  "profile_id": "exec_amazon_stephen_schmidt",
  "url": "https://example.com/source",
  "source_title": "Example public event page",
  "publisher": "Example Publisher",
  "domain": "example.com",
  "source_type": "EVENT_PAGE",
  "published_date": "2026-05-20",
  "observed_at": "2026-05-27T00:00:00Z",
  "source_quality": "HIGH_PRIMARY_SOURCE",
  "access_method": "STATIC_FETCH",
  "robots_allowed": true,
  "extraction_status": "EXTRACTED",
  "raw_storage_path": "sources/src_20260527_0001.json"
}
```

## ExecutiveSignal

```json
{
  "signal_id": "sig_20260527_0001",
  "profile_id": "exec_amazon_stephen_schmidt",
  "category": "PUBLIC_APPEARANCE",
  "event_date": "2026-05-20",
  "event_location": "New York, NY",
  "title": "Public conference appearance",
  "summary": "Executive appeared on a public panel about enterprise security operations.",
  "business_relevance": "Shows public security strategy emphasis and partnership themes.",
  "walmart_cso_relevance": "May inform CSO watch topics around retail security operating models.",
  "confidence_level": "HIGH_PRIMARY_SOURCE",
  "verification_status": "VERIFIED",
  "sensitivity_level": "PUBLIC_BUSINESS",
  "analyst_review_status": "READY_FOR_REVIEW",
  "created_at": "2026-05-27T00:00:00Z",
  "updated_at": "2026-05-27T00:00:00Z"
}
```

## SignalCitation

```json
{
  "citation_id": "cite_20260527_0001",
  "signal_id": "sig_20260527_0001",
  "source_id": "src_20260527_0001",
  "evidence_excerpt": "Speaker bio or article excerpt supporting the signal.",
  "excerpt_start": null,
  "excerpt_end": null,
  "citation_note": "Primary event page names the executive and session topic."
}
```

## CollectionRun

```json
{
  "run_id": "run_20260527_manual_0001",
  "started_at": "2026-05-27T00:00:00Z",
  "finished_at": "2026-05-27T00:04:00Z",
  "mode": "MANUAL",
  "profile_ids": ["exec_amazon_stephen_schmidt"],
  "query_count": 12,
  "sources_seen": 24,
  "sources_extracted": 8,
  "signals_created": 3,
  "signals_review_required": 2,
  "blocked_sources": 4,
  "status": "COMPLETED_WITH_REVIEW_ITEMS",
  "notes": "No schema/API writes in docs-only scaffold."
}
```

## Enumerations

### SourceType

- `NEWS_ARTICLE`
- `PRESS_RELEASE`
- `LEADERSHIP_PAGE`
- `EVENT_PAGE`
- `INTERVIEW`
- `PODCAST`
- `VIDEO_TRANSCRIPT`
- `FILING`
- `GOVERNMENT_RECORD`
- `ANALYST_PROVIDED`
- `OTHER`

### SignalCategory

- `PUBLIC_APPEARANCE`
- `BUSINESS_TRAVEL`
- `INITIATIVE`
- `MAJOR_DECISION`
- `ORG_CHANGE`
- `PARTNERSHIP`
- `PUBLIC_QUOTE`
- `RISK_OR_INCIDENT_CONTEXT`
- `OTHER`

### VerificationStatus

- `LEAD_ONLY`
- `PARTIALLY_VERIFIED`
- `VERIFIED`
- `CONFLICTING`
- `REJECTED`

### AnalystReviewStatus

- `NEW`
- `READY_FOR_REVIEW`
- `APPROVED_FOR_SENTRY`
- `APPROVED_FOR_CSO_DRAFT`
- `NEEDS_MORE_EVIDENCE`
- `REJECTED`
- `ARCHIVED`

## Privacy/Sensitivity Labels

- `PUBLIC_BUSINESS`
- `PUBLIC_BUT_SENSITIVE`
- `PRIVATE_OR_PROHIBITED`
- `UNKNOWN_REVIEW_REQUIRED`

`PRIVATE_OR_PROHIBITED` signals must not be used and should not be retained beyond minimal rejection metadata.
