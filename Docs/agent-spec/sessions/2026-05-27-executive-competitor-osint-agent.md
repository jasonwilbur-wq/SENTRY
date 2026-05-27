# Executive Competitor OSINT Agent — Grill Me / Shared Design Draft

**Date:** 2026-05-27  
**Owner:** JRW / Enterprise Security - Emerging Technology  
**Working agent:** code-puppy-2a43c8  
**Risk tier:** Medium-High  
**Confirmation status:** User confirmed docs/config scaffold first, then approved backend prototype with `proceed`. Schema/API/UI/browser collection/scheduler remain pending explicit approval.

## Objective

Design a SENTRY-compatible agent and toolset that collects, normalizes, cites, and summarizes public executive-level competitor intelligence for an input executive such as `Stephen Schmidt, SVP & Chief Security Officer, Amazon`.

The goal is decision support for Walmart CSO awareness, not surveillance, doxxing, private tracking, final risk approval, or outbound publication.

## Current Understanding

SENTRY already has a Competitor Intelligence domain with SQLite-backed `competitor_events`, scoring, triage, CSO readiness logic, admin routes, and executive-facing CSO brief workflows.

The requested capability should extend that domain with person/entity-aware OSINT collection and analyst review rather than creating a disconnected scraper that dumps messy internet sludge into production. Messy internet sludge is how dashboards become haunted.

## Proposed Agent Name

**SENTRY Executive Signal Scout**

Short name: `exec-signal-scout`  
Role: public-source executive intelligence collector and normalizer for SENTRY Competitor Intelligence + CSO Brief Intelligence.

## SENTRY Domains Affected

Primary:
- Competitor Intelligence
- CSO Brief Intelligence

Supporting:
- Admin review workflow
- Source/citation management
- Future scheduled ingestion jobs
- Browser validation / web extraction tooling

## Desired Behavior

For a user-provided executive profile, the agent should:

1. Normalize the identity:
   - full name
   - organization
   - title
   - known aliases / title variants
   - disambiguation terms
2. Generate governed search plans:
   - public news
   - press releases
   - conference/event speaker pages
   - public interviews/podcasts/videos/transcripts
   - public filings or corporate announcements where relevant
   - industry publications
3. Collect only allowed public signals:
   - public business appearances and speaking events
   - announced initiatives
   - major public decisions / organizational moves
   - published security strategy themes
   - partnerships or vendor references
   - public quotes / interviews
   - leadership changes
4. Exclude or downgrade unsafe/private signals:
   - home address, family info, personal contact data
   - real-time/current location tracking
   - inferred personal travel not publicly announced
   - social media scraping that violates terms or access restrictions
   - competitor pricing, assortment, or offering scraping
   - content behind auth, paywalls, CAPTCHAs, or bot controls
5. Normalize output into a uniform evidence model:
   - raw source metadata
   - extracted facts
   - source quality
   - confidence level
   - relevance to Walmart CSO
   - recommended analyst review status
   - source citations
6. Produce draft-only CSO intelligence summaries:
   - executive snapshot
   - timeline of public activity
   - themes and initiatives
   - implication hypotheses
   - open questions
   - citations and confidence notes

## Do-Not-Build List

Do not build:

- a mass scraper for competitor e-commerce/product pages
- a tool that bypasses authentication, robots, paywalls, CAPTCHAs, bot controls, or rate limits
- real-time travel tracking
- private-person dossier collection
- automated outbound reporting to CSO, Teams, email, Slack, or SharePoint without approval
- direct OpenAI API usage; Element Gateway only for LLM summarization/extraction
- multi-agent orchestration inside SENTRY Phase 1 unless architecture is revised
- permanent production schema/data changes without explicit approval and tests

## Recommended Collection Cadence

Recommended operating model:

- **Daily lightweight watch:** RSS/search result deltas and source freshness checks for existing tracked executives.
- **Weekly analyst review:** deduplicate, score, summarize, and promote material signals to CSO candidates.
- **Monthly deep refresh:** rerun broader source discovery, update profile/timeline, and archive stale leads.

Why: Daily full web crawls are noisy, brittle, and compliance-spicy. Daily deltas + weekly human review gives CSO value without creating a robot raccoon in a trench coat.

## Proposed Toolset / Plugins

### Core tools

1. **SENTRY Read API Layer**
   - Read existing competitors, CSO candidates, and current events.

2. **SENTRY Admin Review Routes**
   - Later extension point for analyst-approved imports only.

3. **Element LLM Gateway / Pydantic AI**
   - Structured extraction, entity disambiguation, quote/theme summarization, and draft CSO snippets.
   - No direct OpenAI API.

4. **Local SQLite persistence**
   - Store sources, signals, run logs, citations, and analyst review status.

5. **Skyvern / Browser-use style browser validation**
   - Use only for public pages that need rendered interaction.
   - No auth bypass, no CAPTCHA solving, no credential entry, no competitor e-commerce scraping.

6. **Deterministic HTTP fetch + article extraction**
   - Prefer RSS/known URLs/static pages before browser automation.
   - Respect robots, rate limits, user agent, and source allow/deny rules.

7. **RAG / internal knowledge base**
   - Use only when available and documented for approved source context.
   - Current local RAG attempt failed because the direct helper environment lacked `rank_bm25`; treat as dependency-pending until the MCP/tool contract is confirmed.

### Candidate source families

- Public news RSS/search APIs approved for internal use
- Corporate press releases / leadership pages when not product/pricing/assortment scraping
- Conference/event speaker pages
- Public podcasts/interviews/transcripts
- Public regulatory filings or official announcements when relevant
- Industry security publications

## Proposed Uniform Data Model

Draft entities:

- `executive_profiles`
- `executive_aliases`
- `executive_sources`
- `executive_signals`
- `executive_signal_citations`
- `executive_collection_runs`
- `executive_review_queue`

Draft signal categories:

- `PUBLIC_APPEARANCE`
- `PUBLIC_TRAVEL_OR_EVENT`
- `INITIATIVE`
- `MAJOR_DECISION`
- `ORG_CHANGE`
- `PARTNERSHIP`
- `PUBLIC_QUOTE`
- `RISK_OR_INCIDENT_CONTEXT`
- `OTHER`

Draft confidence levels:

- `HIGH_PRIMARY_SOURCE`
- `MEDIUM_REPUTABLE_SECONDARY`
- `LOW_SINGLE_SOURCE`
- `REVIEW_REQUIRED`

## Rejected Alternatives

1. **One giant scraper script**
   - Rejected: brittle, non-auditable, hard to review, likely to collect junk.

2. **Fully autonomous daily import into CSO brief**
   - Rejected: executive-facing outputs must remain draft-only and human-reviewed.

3. **Multi-agent swarm**
   - Rejected for Phase 1: SENTRY agent-spec currently requires single-agent-with-tools unless thresholds change.

4. **Social-media-first scraping**
   - Rejected: terms/privacy/access ambiguity and high personal-data risk.

## Initial Implementation Plan After Approval

Phase 0 — documentation/config scaffold:
- Add `Docs/executive-intel/EXECUTIVE_SIGNAL_SCOUT.md`
- Add `Docs/executive-intel/SOURCE_POLICY.md`
- Add `Docs/executive-intel/DATA_CONTRACT.md`
- Add `agents/exec-signal-scout.agent.json` or equivalent local agent manifest if Code Puppy agent schema is confirmed

Phase 1 — backend-only local prototype: **completed**
- Added `backend/executive_intel/` package
- Added deterministic Pydantic models
- Added source policy validator
- Added normalizer/deduper utilities
- Added tests for prohibited/private data handling and source policy

Phase 2 — persistence/API:
- Add additive schema migrations only after approval
- Add read-only routes first
- Add admin/import routes only with review gates

Phase 3 — UI/admin workflow:
- Add analyst review queue and CSO candidate promotion flow
- Browser validation via Playwright/Skyvern where applicable

Phase 4 — scheduler:
- Start with manual run
- Add weekly job first
- Add daily lightweight delta only after false-positive rate is tolerable

## Validation Performed

- Python compile checks passed for backend prototype modules.
- Targeted pytest passed: `backend/tests/test_executive_intel_policy.py` — 8 passed.
- Covered:
  - identity normalization
  - source allow/deny policy
  - competitor commerce-page blocking
  - public business travel validation
  - private travel/location blocking
  - CSO draft readiness gating
  - URL normalization
  - signal deduplication
- No API smoke tests were needed because no routes were added.
- No browser validation was needed because no UI or web collection was added.

## Rollback Plan

- Keep changes additive and feature-flagged.
- No destructive migrations.
- New docs/config/backend package can be reverted independently.
- Schema additions, if approved later, should be additive and backed by startup-safe migration tests.

## JRW Answers Captured

1. **Build depth:** Docs/config scaffold only.
2. **Source boundary:** Any open-source data that can be located, using OSINT best practices and verification before use.
3. **Travel boundary:** Any and all business travel details, excluding homes/private tracking. Safe interpretation: public business travel/appearances only, with citations and review gates.
4. **First output surface:** Create a folder to organize and store the data.
5. **Agent architecture:** Both — create a SENTRY workflow profile and a standalone Code Puppy-style agent manifest.

## Remaining Open Questions

1. Which specific executive should be used for the first dry-run profile once implementation is approved?
2. Should competitor-owned corporate/newsroom/event pages be default-allowed when they match source policy, or should they still require manual allowlisting?
3. What retention period should apply to rejected/private/prohibited leads beyond minimal rejection metadata?

## Approval Gate

Implementation code, schema/API changes, scheduled runs, and any external/browser collection require explicit user approval after this shared design concept is accepted.
