# SENTRY Executive Signal Scout

## Agent Name

**SENTRY Executive Signal Scout**

- Short name: `exec-signal-scout`
- Type: SENTRY single-agent tool/workflow profile plus optional standalone Code Puppy manifest
- Primary domains: Competitor Intelligence, CSO Brief Intelligence
- Status: Docs/config scaffold only; implementation pending approval

## Mission

Collect and normalize public-source executive intelligence about competitor leaders so Walmart Global Security can understand public actions, strategy themes, business travel/appearances, initiatives, and major decisions.

The output is draft decision support for analysts and the Walmart CSO. It is never final approval, legal judgment, HR judgment, or private-person surveillance.

## Operating Principles

1. **Evidence first** — every usable signal needs citations.
2. **Verify before use** — unverified leads stay in review status.
3. **Public-source only** — no bypassing auth, paywalls, CAPTCHAs, bot controls, or site restrictions.
4. **Business relevance only** — collect professional activity, not personal/private life.
5. **No private travel tracking** — business travel means public, business-related travel/appearances only.
6. **Draft-only executive output** — CSO-facing material requires human review.
7. **No competitor pricing/assortment/offering scraping** — out of policy.
8. **Element only for LLM extraction** — no direct OpenAI API.
9. **SENTRY Phase 1 architecture** — single-agent with tools unless formally revised.
10. **Small reversible changes** — YAGNI is not optional just because the internet is huge.

## Inputs

Minimum executive input:

```text
full_name: Stephen Schmidt
organization: Amazon
title: SVP & Chief Security Officer
```

Optional enrichment inputs:

```text
known_aliases:
  - Steve Schmidt
  - Stephen A. Schmidt
focus_topics:
  - physical security
  - investigations
  - global security operations
  - executive protection
competitor_context:
  - Amazon
```

## Outputs

The workflow should produce:

1. Executive profile record
2. Source inventory
3. Verified signal list
4. Public business travel / appearance timeline
5. Initiative and decision timeline
6. Confidence-scored citations
7. Analyst review queue records
8. Draft CSO-ready summary
9. Collection gaps and open questions

## Signal Categories

| Category | Meaning |
|---|---|
| `PUBLIC_APPEARANCE` | Conference, interview, panel, keynote, public meeting |
| `BUSINESS_TRAVEL` | Publicly sourced business travel/appearance detail |
| `INITIATIVE` | Publicly announced program, platform, policy, or effort |
| `MAJOR_DECISION` | Public leadership or strategic decision tied to the executive |
| `ORG_CHANGE` | Role, reporting line, or leadership transition |
| `PARTNERSHIP` | Public partnership/vendor/agency collaboration |
| `PUBLIC_QUOTE` | Attributed quote from public interview/article/transcript |
| `RISK_OR_INCIDENT_CONTEXT` | Public incident/risk context linked to executive remit |
| `OTHER` | Relevant signal not otherwise categorized |

## Recommended Tools / Plugins

### SENTRY and local tools

- SENTRY Read API Layer
- Existing Competitor Intelligence routes
- Existing CSO Brief draft/readiness workflow
- Local SQLite storage when implementation is approved
- Local data folder: `data/executive-intel/`

### Web and OSINT tools

- Deterministic HTTP fetch for static pages and feeds
- RSS/news feed ingestion where available
- Approved search API or exported search results
- Trafilatura/readability-style article extraction when available
- Skyvern / Browser-use for rendered public pages only
- Playwright for deterministic browser validation where applicable

### LLM and enrichment

- Element LLM Gateway
- Pydantic AI structured extraction
- Local Walmart EST RAG if available and documented

### Verification helpers

- Domain allow/deny policy
- Citation normalizer
- Duplicate detector
- Entity disambiguation checks
- Confidence scoring
- Analyst review status

## Browser Use Rules

Use browser automation only when static fetch is insufficient.

Allowed:

- navigate to public pages
- extract visible public text
- capture screenshots for analyst review
- validate page state

Not allowed:

- login or credentialed browsing unless explicitly approved
- submitting forms
- bypassing MFA, CAPTCHA, bot controls, paywalls, or access restrictions
- scraping competitor product/pricing/assortment/offering pages
- real-time location monitoring

## Recommended Cadence

| Cadence | Job | Why |
|---|---|---|
| Daily | Delta watch | Catch new public signals without noisy full recrawls |
| Weekly | Analyst synthesis | Promote verified material into useful SENTRY output |
| Monthly | Deep refresh | Revisit broader sources, profile, and timeline |

## Human Review Gates

Human review is required before:

- promoting a signal to CSO candidate status
- adding scheduled automation
- creating schema/API/UI integration
- publishing or sending any report
- adding competitor-owned domain allowlists beyond safe corporate/public pages
- using any source with unclear terms, access, or sensitivity

## Success Criteria

The agent is useful when it can answer:

- What has this executive publicly done recently?
- What public business travel/appearances are known?
- What initiatives or decisions are attributed to them?
- Why might Walmart Global Security care?
- What is confirmed, inferred, or unknown?
- What should an analyst review next?
