# Executive Signal Scout Source Policy

## Scope

This policy governs public-source collection for executive competitor intelligence in SENTRY.

The workflow may collect business-relevant public information about named competitor executives. It must not collect private personal data, bypass access controls, or scrape competitor pricing, assortment, or offerings.

## Allowed Sources

Allowed when public and accessible without bypass:

- reputable news publications
- official corporate press releases and leadership pages
- conference/event speaker pages
- public webinar, podcast, and interview pages
- public transcripts, videos, and podcast summaries
- public regulatory filings or official announcements
- public industry/security publications
- public government or court records when relevant and appropriate
- analyst-provided URLs or documents

## Conditionally Allowed Sources

Use only with extra caution and analyst review:

- competitor-owned domains
  - allow corporate press, leadership, investor, event, or newsroom pages
  - block product, e-commerce, assortment, pricing, and offering pages
- social platforms
  - collect only if public, terms-compliant, and business-relevant
  - prefer citations to public articles or official event pages over scraping feeds
- paywalled content
  - do not bypass paywalls
  - use only metadata/snippets visible without bypass, or analyst-provided licensed excerpts

## Prohibited Sources / Behaviors

Do not:

- bypass login, MFA, paywalls, CAPTCHAs, bot controls, robots, or rate limits
- scrape competitor pricing, assortment, product availability, or offerings
- collect home addresses, family details, personal phone/email, personal finances, or private photos
- collect or infer home location
- track real-time current location
- automate form submission or account creation
- use credentialed browsing without explicit approval
- use banned tunneling or pen-testing tooling
- send sensitive Walmart data to arbitrary external services

## Business Travel Rules

The user wants broad business travel coverage. The safe interpretation is:

Allowed:

- public conference appearances
- public speaking engagements
- public panels, meetings, or hearings
- official business visits described in public releases or reputable reporting
- public interviews recorded at a known business event
- public executive participation in industry councils or summits

Not allowed:

- private travel
- inferred current location from social posts or photos
- home-to-office patterns
- family vacation or personal events
- stalking-style timelines of where a person is right now

Default handling:

- past public business travel: collect if cited
- future public business event: collect as planned appearance if cited
- same-day/current whereabouts: require analyst review and avoid operationalizing as tracking

## Verification Rules

### Source Quality

| Level | Criteria |
|---|---|
| `HIGH_PRIMARY_SOURCE` | Official corporate, event, government, court, transcript, or direct interview source |
| `MEDIUM_REPUTABLE_SECONDARY` | Reputable news or industry source with named attribution |
| `LOW_SINGLE_SOURCE` | Single public source, unclear attribution, or weak detail |
| `REVIEW_REQUIRED` | Conflicting, sensitive, or potentially private/ambiguous source |

### Minimum Use Threshold

To use a signal in CSO-facing draft content:

- one high-quality primary source, or
- two reputable secondary sources, or
- one reputable secondary source plus analyst validation

Signals below that threshold remain in `REVIEW_REQUIRED` or `LEAD_ONLY` status.

## Disambiguation Rules

Before using a source, verify at least two of:

- exact full name
- current or prior title
- organization
- topic/remit alignment
- photo/bio match from public official page
- event bio matching the target executive
- date context matching known role timeline

If disambiguation fails, do not merge it into the profile.

## Citation Requirements

Every signal must include:

- URL or source identifier
- source title
- publisher/domain
- published or observed date
- extracted date
- evidence excerpt
- source quality
- confidence level

## Retention Guidance

Store only business-relevant public excerpts and metadata needed for verification. Do not store unnecessary raw personal data.

Local collected data should remain under `data/executive-intel/`, which is git-ignored by default.
