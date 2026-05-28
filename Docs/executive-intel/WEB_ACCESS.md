# Executive Signal Scout Web Access

## Status

`exec-signal-scout` is installed as a local Code Puppy agent manifest at:

```text
C:\Users\j0w16ja\.code_puppy\agents\exec-signal-scout.json
```

It is also tracked in the SENTRY repo at:

```text
agents/exec-signal-scout.agent.json
```

Code Puppy currently lists the agent as:

```text
exec-signal-scout — SENTRY Executive Signal Scout 🛡️
```

## Web Access Mode

Default mode is **public read-only OSINT**.

Allowed:

- public webpage extraction
- public search/RSS/source discovery
- rendered-page validation
- screenshots for analyst review
- citation capture
- public business travel / appearance collection

Blocked:

- authentication bypass
- CAPTCHA bypass
- paywall bypass
- credential entry
- form submission
- state-changing clicks
- competitor pricing, assortment, product, or offering scraping
- broad competitor-site crawling
- private travel, home location, or real-time whereabouts tracking

## Tool Routing Order

### 1. ScoutBridge via `invoke_agent`

Use when a concrete public URL is available and structured extraction is needed.

Expected invocation pattern:

```text
invoke_agent(
  agent_name="scoutbridge",
  prompt="Extract title, date, executive name, organization, event/location, summary, and citations from this public URL: <url>. Public read-only extraction only."
)
```

### 2. Goose broker public extraction

Use when broker tools are available:

- `goose_tool_broker_status`
- `goose_seleniumbase_status`
- `goose_seleniumbase_fetch`
- `goose_browser_use_status`
- `goose_browser_use_public_extract`
- `goose_skyvern_status`
- `goose_registered_mcp_tools`
- `goose_call_registered_mcp_tool`

### 3. Built-in browser tools

Use when the page is rendered/dynamic and simpler extraction is insufficient:

1. `browser_initialize`
2. `browser_new_page`
3. `browser_navigate`
4. `browser_wait_for_load`
5. `browser_get_page_info`
6. `browser_get_text`
7. `browser_screenshot_analyze`
8. `browser_close`

Do not click unless it is non-destructive navigation needed to reveal public content.

### 4. Skyvern through MCP relay

Use only when a real browser interaction is necessary and policy allows it. Never use Skyvern to bypass auth, MFA, CAPTCHAs, paywalls, or access restrictions.

## Verification Flow

1. Gather candidate URL/source.
2. Run source URL through source policy.
3. Extract public page evidence.
4. Disambiguate executive identity.
5. Classify signal category.
6. Assign source quality and confidence.
7. Store under `data/executive-intel/`.
8. Mark as `LEAD_ONLY`, `READY_FOR_REVIEW`, or `VERIFIED`.
9. Promote to CSO draft only after review threshold is met.

## Mandatory Review-Only Controls

Web access and artifact review must enforce the mandatory review-only controls:

- no SQLite writes
- no artifact mutation
- no scheduled collection
- no report publication
- no outbound delivery
- no private/current location tracking
- no authentication, paywall, or CAPTCHA bypass
- no competitor pricing, assortment, or offering scraping

These controls block prohibited actions only. They do not stop compliant read-only review, parsing, classification, confidence scoring, dedupe, stale information detection, source traceability, or draft-only summaries.

## Important Constraint

Web access is enabled for approved public read-only collection/review, not for automatic publication or operational action. Sending, sharing, scheduling, writing to external systems, SQLite persistence, and CSO publication remain blocked unless explicitly approved and separately implemented.
