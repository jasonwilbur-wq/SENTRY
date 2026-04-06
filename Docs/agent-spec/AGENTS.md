# SENTRY Agent Architecture and State

## Orchestration Choice

### Active Pattern

Single-agent with tools.

The SENTRY domain is already embedded in one application, one authenticated surface, one bounded backend, and one primary data plane. A single agent can apply a single approval policy, read the same canonical state, and return one coherent answer path without introducing multi-agent routing risk.

### Why Multi-agent Is Not Justified Yet

Multi-agent orchestration is not justified in Phase 1 because:

- the domain is operationally cohesive
- the app already has an embedded chat surface
- tool boundaries are limited and manageable
- approval logic should stay centralized
- coordination overhead would increase safety risk before it increases value

### Thresholds for Revisiting Multi-agent Architecture

Revisit the architecture only when at least one of the following becomes true:

- there are multiple production-grade tool domains with materially different security boundaries
- ticketing, CMDB, vulnerability, outbound collaboration, and audit pipelines are all implemented and need distinct policy layers
- specialized review domains require independent tool contracts and approval owners
- evaluation data shows that one-agent context handling has become a correctness or maintainability bottleneck

## State Management

Read before acting:

- MEMORY.md or logical equivalent
- PROJECT_BRIEF.md or logical equivalent
- CONSTRAINTS.md or logical equivalent
- DECISIONS.md or logical equivalent
- TOOL_CATALOG.json or equivalent
- WORKING_STATE.json or equivalent
- approval state or request confirmation state when present

Update after each major phase:

- intake
- classification
- evidence gathering
- draft generation
- validation
- protected-action preview or approval return

Do not overwrite prior decisions silently. If current user input conflicts with prior decisions, preserve both and mark the current instruction as active unless it violates policy.

## Memory Model

Hybrid.

### Components

- session memory for current conversation context
- persistent project memory for durable operating preferences and decisions
- task state for each run
- external knowledge limited to approved SENTRY-connected sources

## Required State Artifacts or Logical Equivalents

### MEMORY.md

Durable user preferences, output preferences, review habits, recurring approval rules.

### PROJECT_BRIEF.md

Current summary of SENTRY scope, stack, goals, current implementation status, and rollout phase.

### CONSTRAINTS.md

Hard limits, anti-goals, prohibited data classes, banned runtimes, and banned actions.

### TOOL_CATALOG.json

Canonical list of available tools, endpoints, auth expectations, and approval requirements.

### DECISIONS.md

Architecture choices, approved integrations, gate policy revisions, current confirmation model, and protected-action decisions.

### EVAL_HISTORY.json

Prior eval results, regressions, false positives, and release gate outcomes.

### WORKING_STATE.json

Required fields:

- request_type
- required_slots
- filled_slots
- missing_slots
- assumptions
- risk_tier
- orchestration_pattern
- approval_points
- confirmation_points
- open_questions
- output_files_generated
- validation_status

## Handoff Protocols

No autonomous downstream handoffs in Phase 1. Route to humans only when needed:

- Security / Compliance reviewer for legal, privacy, regulatory, or incident-sharing questions
- Integration owner for Teams, Jira, Azure DevOps, logging, CMDB, or vulnerability-feed changes
- Platform owner for Cloud Run, Firebase, IAM, auth, deployment, or credential concerns
- Product or workflow owner for phase-gate, executive reporting, or approval-flow changes
- Evaluation owner for regression failures or release threshold revisions

When handing off, include:

- issue summary
- current findings
- blocking unknowns
- tools involved
- approval status
- confirmation status if applicable
- recommended next decision

## Human Escalation

Escalate immediately when:

- an executive-facing output would be published or pushed
- a final business or security decision would be made
- a destructive or irreversible action is requested
- a legal or compliance-owned record would change
- data would leave the approved internal boundary
- permissions, identity, production settings, or credentials would change
- low confidence remains on a material decision
- scope changes from read-only assistance to operational execution
- a dependency-pending tool is required to complete the request

## Release Gate

The SENTRY agent may be marked ready for broader phase use only when:

- required slots are complete
- approval and confirmation triggers are defined
- tool contracts are explicit
- prohibited data handling is explicit
- draft-only behavior is validated
- eval criteria exist
- assumptions are documented
- validation passes
- dependency-pending items are implemented or explicitly excluded from the active phase
