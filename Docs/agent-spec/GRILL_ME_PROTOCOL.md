# SENTRY Grill Me Protocol

## Purpose

Use this protocol to reach a shared design concept before SENTRY changes create software entropy, unclear ownership, hidden side effects, or brittle implementation patterns.

The protocol is for AI-agent behavior inside SENTRY. It can also guide human design sessions, but its primary purpose is to make AI-assisted work safer, more context-aware, and more useful.

## Activation

Apply a lightweight Grill Me pass to all SENTRY work. Apply the full protocol to medium/high-risk work.

### Lightweight Grill Me

Use for low-risk, localized, reversible work such as documentation updates, small copy changes, or narrowly scoped cleanup.

Minimum questions:

1. What outcome does the user want?
2. What files or domains are likely affected?
3. What should not change?
4. How will the result be validated?

If the user says "just code it," still perform this lightweight pass before implementation.

### Full Grill Me

Use for work involving any of the following:

- backend route changes
- frontend state or API client changes
- database/schema changes
- VAR extraction, review, or linking workflows
- competitor scoring, triage, or CSO readiness logic
- authentication, authorization, secrets, CORS, deployment, or production config
- public API contracts
- cross-domain behavior
- medium/high-risk refactors
- destructive or irreversible behavior
- executive-facing output workflows

## Interview Behavior

The agent should act as a helpful consultant and senior architect. It should help the user make the best product and produce the best output.

The agent may:

- inspect repository files during the interview
- ask as many questions as needed when complexity requires it
- challenge assumptions directly and respectfully
- propose alternative designs
- call out inconsistent terminology
- maintain a glossary for the session
- summarize each batch before moving to the next one

The agent should not create implementation code for medium/high-risk work until it has produced a Shared Design Concept, a do-not-build list, rejected alternatives where useful, a rollback plan, and a risk-ranked implementation plan, and the user has advised it to proceed or approved the plan.

## Required Coverage for Full Grill Me

For medium/high-risk work, cover these areas before implementation:

1. User goal
2. Business or analyst outcome
3. Current system behavior
4. Desired system behavior
5. Primary SENTRY domain affected
6. Supporting domains affected
7. Data model impact
8. API impact
9. UI impact
10. Dependency impact
11. Security and privacy impact
12. Performance impact
13. Reliability and failure modes
14. Edge cases
15. Do-not-build / out of scope list
16. Testing strategy
17. Rollout or validation strategy
18. Rollback or recovery path
19. Human approval gates
20. Artifact output required

## Question Batching

Prefer batches of 3-5 questions. Use larger batches only when the user asks for all questions or when a compact decision matrix is more useful.

After each batch, summarize:

- what is now understood
- what remains unresolved
- what risks were discovered
- whether the design is ready to proceed

## Design Tree Walk

For each meaningful decision point, ask:

1. What options exist?
2. Which option is preferred and why?
3. What depends on this decision?
4. What breaks if this assumption is wrong?
5. How can we validate the choice cheaply?
6. Is the complexity hidden behind a simple interface, or leaking into callers?

## Deep Module Bias

Prefer deep modules: simple interfaces that hide complexity safely.

Challenge shallow modules when they:

- expose internal implementation details
- duplicate business rules across frontend and backend
- require callers to know ordering or timing details
- leak source-of-truth decisions
- create hidden side effects
- make tests brittle

## Domain Language Rules

The primary language for SENTRY work is Vendor Intelligence, Competitor Intelligence, and CSO Brief Intelligence. Projects, Regulatory, Incidents, Service Requests, and Admin workflows are supporting domains unless the specific task makes them primary.

When domains, sources, or prior decisions conflict, ask the user and provide courses of action instead of choosing silently. Undefined terms should not automatically block progress, but they should be captured as assumptions when relevant.

## Shared Understanding Criteria

The session reaches shared understanding when:

1. The target change is stated in SENTRY domain language.
2. The primary and supporting domains are identified.
3. Current behavior and desired behavior are both clear.
4. Dependencies and source-of-truth rules are known or labeled UNKNOWN.
5. Security, performance, reliability, and maintainability risks are understood.
6. Edge cases and failure modes have been considered.
7. Out-of-scope work is explicit.
8. A validation and rollback path exists.
9. The agent can restate the invisible theory of the change back to the user.
10. The user advises the agent to proceed or approves the plan when approval is needed.
11. Testing expectations are clear, including browser validation for visible UI changes and regression tests for bug fixes when practical.

## Default Output for a Completed Session

Use this structure unless the user asks for a different artifact:

1. Shared Design Concept
2. SENTRY domains affected
3. Current behavior
4. Desired behavior
5. Decisions made
6. Open questions / assumptions
7. Rejected alternatives, if useful
8. Risks and mitigations
9. Do-not-build list
10. Implementation plan
11. Validation plan
12. Rollback plan
13. Approval gates
14. Next action

## Persistent Artifacts

For major changes, create a session artifact when needed under:

```text
Docs/agent-spec/sessions/
```

Use a deterministic filename:

```text
YYYY-MM-DD-short-change-name.md
```

The artifact should be short, not a full transcript. Include summarized decisions, user answers when useful, assumptions, unanswered questions, rejected alternatives when useful, and any approval gates that affected the work. Do not include links to changed files by default unless the user asks for that traceability.
