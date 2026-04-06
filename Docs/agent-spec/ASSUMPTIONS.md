# SENTRY Agent Assumptions

Only evidence gaps that remain unresolved are listed here.

## Assumption 1

**Field:** Ticketing platform

**Value:** UNKNOWN

**Blocking or assumed:** Blocking for automated ticket creation

**Notes:** No Jira or Azure DevOps integration is implemented. The platform is not selected and the contract is undefined.

## Assumption 2

**Field:** Outbound collaboration channel

**Value:** UNKNOWN for implementation; Microsoft Teams is preferred conceptually

**Blocking or assumed:** Blocking for automated outbound delivery

**Notes:** No Teams, Slack, or email integration is active in the current codebase.

## Assumption 3

**Field:** Full structured audit pipeline

**Value:** UNKNOWN beyond PR-01 protected-route improvements

**Blocking or assumed:** Blocking for broader operational autonomy claims

**Notes:** PR-01 improved protected-route safety, but a broader Cloud Logging or equivalent structured audit pipeline is still not active.

## Assumption 4

**Field:** Role-to-gate approver matrix

**Value:** UNKNOWN

**Blocking or assumed:** Blocking for implementation of a formal approval workflow

**Notes:** Protected route confirmation exists for selected actions, but the complete approver mapping by role and action is not yet documented.

## Assumption 5

**Field:** Active user baseline

**Value:** UNKNOWN

**Blocking or assumed:** Non-blocking for package design; blocking for adoption metric reporting

**Notes:** The codebase findings did not establish a reliable active-user baseline.

## Assumption 6

**Field:** Exact assessment turnaround baseline

**Value:** UNKNOWN

**Blocking or assumed:** Non-blocking for launch; blocking for precise KPI automation

**Notes:** The current baseline is described qualitatively as hours of manual review, but exact measured timestamps were not established here.

## Assumption 7

**Field:** LLM prompt filtering for sensitive incident detail

**Value:** INCOMPLETE

**Blocking or assumed:** Blocking for any workflow that would send sensitive incident detail to the LLM without further control

**Notes:** Current findings indicate vendor context is passed to chat, and incident or sensitive context filtering is not mature enough to assume safe automatic inclusion.

## Assumption 8

**Field:** Internal knowledge / MCP RAG contract

**Value:** PARTIAL and undocumented in package form

**Blocking or assumed:** Non-blocking for general operation; blocking when required for correctness

**Notes:** The codebase findings mention an MCP RAG knowledge base, but the full tool contract, source scope, and sensitivity rules are not yet documented.

## Assumption 9

**Field:** Compliance record mutation workflow

**Value:** UNKNOWN formal workflow

**Blocking or assumed:** Blocking for implementation

**Notes:** The safer policy is to treat compliance-owned records as approval-gated and non-autonomous until a formal workflow exists.

## Assumption 10

**Field:** Multi-agent architecture need

**Value:** Not justified in Phase 1

**Blocking or assumed:** Assumed

**Notes:** The codebase and package both support a safer single-agent-with-tools architecture for the current phase.
