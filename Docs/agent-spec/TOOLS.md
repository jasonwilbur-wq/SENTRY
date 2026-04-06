# SENTRY Tool Catalog

This catalog distinguishes active, partial, and dependency-pending tools or systems based on current package evidence plus newer codebase findings.

## Tool Status Key

- **ACTIVE**: available now and supported by current code or app behavior
- **PARTIAL**: present but limited, incomplete, or not fully governed
- **DEPENDENCY_PENDING**: not implemented or not documented well enough to treat as active

---

## Tool: SENTRY Read API Layer

**Status:** ACTIVE

### Purpose

Read canonical SENTRY application data for vendor review, portfolio review, reporting, intelligence, and chat grounding.

### Inputs

- endpoint name
- approved filters
- pagination arguments
- authenticated user context

### Outputs

- structured JSON payloads from approved SENTRY routes
- normalized records for summarization and analysis

### Auth / Access Assumptions

- access is mediated by the existing SENTRY application session
- read access is role-bounded by app behavior
- write paths are separate and protected

### Failure Modes

- endpoint unavailable
- malformed payload
- stale cache or stale summary
- incomplete record
- authorization denied

### Retry / Recovery

- retry once for transient read failures
- fall back to other approved internal sources only if correctness is not reduced
- otherwise return UNKNOWN with limitation

### Approval Requirement

None for read-only use

---

## Tool: /api/chat

**Status:** ACTIVE

### Purpose

Generate grounded natural-language answers and draft artifacts inside the embedded SENTRY chat experience.

### Inputs

- user prompt
- approved context payload
- configured system instructions
- current user/session context

### Outputs

- draft answers
- summaries
- recommendations
- issue lists

### Auth / Access Assumptions

- called from the embedded SENTRY app
- model access routes through the Element LLM Gateway
- no direct OpenAI API access is allowed

### Failure Modes

- gateway unavailable
- context truncation
- weak grounding
- missing guardrails
- unsupported sensitive context passed through

### Retry / Recovery

- retry once for transient gateway errors
- if still unavailable, return a non-LLM limitation notice
- if context is insufficient, return UNKNOWN or a partial answer

### Approval Requirement

None for draft generation

Approval still applies to any downstream gated action

---

## Tool: Element LLM Gateway

**Status:** ACTIVE

### Purpose

Provide the approved internal LLM path for score extraction, summarization, and chat responses.

### Inputs

- system prompt
- approved app context
- user prompt or extraction prompt
- configured model parameters

### Outputs

- generated draft text
- extracted scores
- summaries
- reasoning-ready draft artifacts

### Auth / Access Assumptions

- all model traffic must route through the internal Element LLM Gateway
- credentials are configured outside the agent
- the agent never uses direct OpenAI APIs

### Failure Modes

- gateway unavailable
- missing or invalid key
- response timeout
- context truncation
- unsupported output length

### Retry / Recovery

- retry once on transient failures
- if unavailable, surface a non-LLM fallback or limitation

### Approval Requirement

None for draft generation

Gated downstream actions still require approval

---

## Tool: SharePoint Graph VAR Reader

**Status:** ACTIVE

### Purpose

Retrieve VAR documents for download, extraction, summarization, and linking review.

### Inputs

- document identifier or path
- delegated token from existing auth flow
- optional vendor context

### Outputs

- document content
- retrieval metadata
- extracted text for downstream processing

### Auth / Access Assumptions

- read-only access through existing Graph/MSAL integration
- no token rotation or scope changes by the agent

### Failure Modes

- expired token
- permission denied
- malformed document
- network failure

### Retry / Recovery

- retry once with current token/session state
- if retrieval still fails, return access limitation
- do not expand scopes to recover

### Approval Requirement

None for approved read-only retrieval

---

## Tool: VAR Score Extraction Pipeline

**Status:** ACTIVE

### Purpose

Extract the supported VAR score dimensions from documents using the approved LLM path.

### Inputs

- eligible VAR identifiers or selected document
- extraction settings
- overwrite flag where exposed

### Outputs

- extracted score dimensions
- processing status
- draft recommendation inputs

### Auth / Access Assumptions

- available only through authorized analyst/admin paths
- overwrite is high risk and protected

### Failure Modes

- extraction parse failure
- timeout
- incorrect document mapping
- overwrite of already-reviewed scores if unsafe controls are bypassed

### Retry / Recovery

- retry once on transient failures for non-overwrite eligible runs
- do not auto-retry overwrite paths
- if overwrite is requested, require confirmation state and approval path

### Approval Requirement

None for unscored extraction on approved eligible items

Protected confirmation required for overwrite paths

---

## Tool: Protected Admin / Mutation Routes

**Status:** PARTIAL

### Purpose

Support protected admin actions such as delete, unlink, and overwrite-enabled flows.

### Inputs

- authenticated request context
- explicit confirm state
- permanent intent for irreversible paths where applicable
- target record identifiers

### Outputs

- preview result
- dry-run result
- mutation result
- protected error response when confirmation is missing

### Auth / Access Assumptions

- PR-01 added auth to protected routes
- protected actions are not assumed safe without confirmation
- broader human approval workflow is still incomplete

### Failure Modes

- missing confirmation
- auth denied
- incorrect target selection
- concurrent update
- incomplete audit trail coverage

### Retry / Recovery

- do not auto-retry destructive writes
- prefer dry-run or preview
- preserve original state where possible
- return explicit error on missing confirm state

### Approval Requirement

Required confirmation for delete, unlink, overwrite, and permanent delete paths

Additional approval packet still required for broader workflow or policy-level escalation cases

---

## Tool: Morning Brief Data Endpoints

**Status:** ACTIVE

### Purpose

Read the live app snapshot used to assemble the morning brief and related dashboards.

### Inputs

- approved report filters when supported

### Outputs

- briefing-ready summary data
- dashboard inputs
- aggregate metrics

### Auth / Access Assumptions

- existing SENTRY authenticated session
- current delivery is pull-based inside the app

### Failure Modes

- partial snapshot
- stale sections
- missing sections

### Retry / Recovery

- retry once
- if still partial, return a partial draft labeled incomplete

### Approval Requirement

None for draft generation inside SENTRY

Approval required before any push publication or outbound delivery

---

## Tool: Stats and Summary Endpoints

**Status:** ACTIVE

### Purpose

Expose aggregate counts and operational stats for dashboards and summaries.

### Inputs

- none or approved filters, depending on route

### Outputs

- aggregate KPI payloads
- counts, trend summaries, and dashboard data

### Auth / Access Assumptions

- existing SENTRY authenticated session

### Failure Modes

- stale rollups
- mismatch versus record-level counts
- partial coverage

### Retry / Recovery

- retry once
- if mismatch persists, report the mismatch and avoid false precision

### Approval Requirement

None for read-only use

---

## Tool: Vendor / Project / Incident / Competitor / Regulatory Data APIs

**Status:** ACTIVE

### Purpose

Provide the operational data used for assessment triage, project review, intelligence analysis, and regulatory visibility.

### Inputs

- filters
- pagination
- target identifiers where needed

### Outputs

- vendor records
- project records and blockers
- incident records or summaries
- competitor events and analyst annotations
- regulatory obligation records and statuses

### Auth / Access Assumptions

- existing SENTRY authenticated session
- raw detail may be role-bounded
- competitor and incident intelligence are not public outputs

### Failure Modes

- stale data
- duplicate records
- incomplete mapping
- overly sensitive detail exposed to the wrong workflow
- inconsistent summaries

### Retry / Recovery

- retry once
- if data conflicts, report conflict and avoid synthesized certainty
- if safe summarization cannot be guaranteed, return a restricted internal-only answer

### Approval Requirement

None for internal read-only analysis

Approval required before data is pushed outside approved internal boundaries

---

## Tool: Internal Knowledge / MCP RAG Knowledge Base

**Status:** PARTIAL

### Purpose

Support natural-language answers against approved internal documentation or knowledge content when configured.

### Inputs

- user query
- approved retrieval context

### Outputs

- supporting snippets
- grounded answer context

### Auth / Access Assumptions

- contract details are not fully documented in the current package
- do not treat this as a required tool until its boundary is explicit in the active environment

### Failure Modes

- missing retrieval source
- stale or partial grounding
- unclear data sensitivity boundary

### Retry / Recovery

- fall back to approved app sources first
- if required for correctness and unavailable, return limitation

### Approval Requirement

None for approved internal retrieval

Do not use as a basis for claims about undocumented capabilities

---

## Tool: Microsoft Teams Bot

**Status:** DEPENDENCY_PENDING

### Purpose

Deliver approved internal updates or brief content into Teams.

### Inputs

UNKNOWN

### Outputs

UNKNOWN

### Auth / Access Assumptions

- not implemented in the current codebase
- do not assume bot registration, scopes, or channel config

### Failure Modes

- dependency not implemented
- auth not configured
- delivery policy not approved

### Retry / Recovery

- mark as DEPENDENCY_PENDING
- do not fabricate contract details

### Approval Requirement

Would require approval before any outbound posting

Blocked until implemented

---

## Tool: Jira or Azure DevOps Integration

**Status:** DEPENDENCY_PENDING

### Purpose

Create or update work items for assessments and follow-ups.

### Inputs

UNKNOWN

### Outputs

UNKNOWN

### Auth / Access Assumptions

- not implemented
- platform not selected

### Failure Modes

- platform undecided
- field mapping undefined
- auth undefined

### Retry / Recovery

- mark as DEPENDENCY_PENDING
- do not fabricate contract fields

### Approval Requirement

Would require approval before any ticket creation or update

Blocked until implemented

---

## Tool: Cloud Logging / Structured Audit Pipeline

**Status:** DEPENDENCY_PENDING

### Purpose

Persist agent action logs, gate events, and auditable mutation records at a broader operational level.

### Inputs

UNKNOWN

### Outputs

UNKNOWN

### Auth / Access Assumptions

- broader logging pipeline not yet implemented as an active integration
- PR-01 protections do not imply full audit maturity

### Failure Modes

- pipeline not implemented
- schema undefined
- retention undefined

### Retry / Recovery

- mark as DEPENDENCY_PENDING
- do not claim full audit coverage until implemented

### Approval Requirement

None for logging itself

Blocking for broader operational autonomy claims

---

## Tool: CMDB / Asset Inventory Integration

**Status:** DEPENDENCY_PENDING

### Purpose

Map SENTRY vendors to deployed assets for blast-radius analysis.

### Inputs

UNKNOWN

### Outputs

UNKNOWN

### Auth / Access Assumptions

- not implemented

### Failure Modes

- source not connected
- mapping undefined

### Retry / Recovery

- mark as DEPENDENCY_PENDING

### Approval Requirement

None for read-only use once implemented

---

## Tool: Vulnerability Feed Integration

**Status:** DEPENDENCY_PENDING

### Purpose

Cross-reference vendors against CVE or vulnerability intelligence.

### Inputs

UNKNOWN

### Outputs

UNKNOWN

### Auth / Access Assumptions

- not implemented

### Failure Modes

- feed not connected
- mapping undefined
- stale correlation

### Retry / Recovery

- mark as DEPENDENCY_PENDING

### Approval Requirement

None for read-only use once implemented

---

## Tool: Source Control / CI/CD / Deployment Control

**Status:** DEPENDENCY_PENDING

### Purpose

Potential future support for code or release workflow visibility.

### Inputs

UNKNOWN

### Outputs

UNKNOWN

### Auth / Access Assumptions

- there is no active Git API or CI/CD interaction contract for the agent
- Cloud Build config existing in the repo does not mean agent control exists

### Failure Modes

- no integration
- no auth
- unsafe execution risk

### Retry / Recovery

- mark as DEPENDENCY_PENDING

### Approval Requirement

Any future operational or deployment interaction would require explicit approval
