# Skill: Operate SENTRY Embedded Intelligence Workflow

## Trigger

Activate this skill when a user asks the agent to:

- assess a vendor or technology
- summarize or review a VAR
- review backlog or stale records
- explain project or phase-gate blockers
- generate a morning brief draft
- summarize incident, competitor, or regulatory intelligence
- answer a natural-language question about SENTRY data
- identify data quality or coverage gaps
- suggest relink candidates or score-extraction actions
- recommend read-only architecture or workflow improvements
- review a protected mutation request and return the safe next step

## Required Tools

- SENTRY read API layer
- Element LLM Gateway
- embedded chat path or equivalent app prompt path
- SharePoint Graph VAR reader when document retrieval is needed
- SQLite-backed app data through approved backend routes

## Optional Tools

- stats and summary endpoints
- morning brief data endpoints
- internal knowledge or MCP RAG connector only when configured and documented
- protected admin preview routes when a user asks for a high-risk action assessment

## Dependency-Pending Tools

- Microsoft Teams bot
- Jira or Azure DevOps integration
- Cloud Logging / full audit pipeline
- CMDB / asset inventory integration
- vulnerability feed integration
- source control / CI/CD interaction APIs

## Step-by-Step Process

### 1. Read State

Load request context, role context, constraints, prior decisions, confirmation state, and approval state.

### 2. Classify the Request

Determine whether the request is:

- triage
- intelligence
- reporting
- phase-gate review
- architecture advice
- protected mutation request
- dependency-pending request

### 3. Gather Evidence

Read the minimum required approved sources. Prefer current API views over derived or static copies when both exist. Pull SharePoint content only when needed.

### 4. Produce a Draft Result

Return findings, draft recommendations, and supporting evidence. Separate findings from recommendations. Do not present any decision as final.

### 5. Check Gates

If the request crosses a policy gate, stop and emit an approval packet. If the request targets an implemented protected mutation, require confirmation state and prefer preview-first behavior. If the request depends on an unavailable integration, mark it DEPENDENCY_PENDING.

### 6. Validate

Confirm:

- no prohibited data is present
- no unsupported claim is made
- no pending integration is described as active
- no final decision is presented as final
- no direct OpenAI path is referenced
- no risky action bypasses auth, confirmation, or approval controls

### 7. Return

Return the response in fixed output format.

## Error Handling

### Missing Context

- Return UNKNOWN for non-blocking ns.
- Ask one bounded question only when a missing fact blocks safe execution.
- Mark unavailable integrations as DEPENDENCY_PENDING.

### Tool Failure

- Retry once for transient read failures.
- If retry fails, continue with remaining approved sources if correctness is preserved.
- If the missing tool is required for correctness, stop and state the limitation.

### Conflicting Data

- Report the conflict.
- Do not fabricate a reconciled answer.
- Prefer current system-of-record API views over derived local copies.

### Safety or Policy Issue

- Refuse the unsafe action.
- Offer a draft-only, preview-only, or approval-gated path instead.

## Validation Checklist

- Request type correctly classified
- Only approved sources used
- Data used section names sources
- No direct OpenAI usage
- No PII, secret, or restricted data leakage
- No final decision presented as final
- Every risky action mapped to a gate or confirm requirement
- No invented tool or permission
- No contradiction with known constraints
- Output sections in required order

## Output Format

Markdown with these sections:

1. Request type
2. Data used
3. Findings
4. Draft recommendation or draft artifact
5. Risks / caveats
6. Required approval gate, if any
7. Next human action
