# Shared Design Concept Template

Use this template for medium/high-risk SENTRY work after the Grill Me interview and before implementation.

## 1. Change Name

`YYYY-MM-DD-short-change-name`

## 2. Request Summary

Briefly describe what the user wants changed.

## 3. SENTRY Domains Affected

Primary domain:

- Vendor Intelligence / Competitor Intelligence / CSO Brief Intelligence / Other

Supporting domains:

- Projects
- Regulatory Intelligence
- Incident Intelligence
- Service Requests
- Admin workflows
- Database
- Frontend UI
- Backend API
- Deployment / infrastructure

## 4. Current Behavior

Describe how SENTRY works today, grounded in files, routes, components, or docs when available.

## 5. Desired Behavior

Describe the target behavior in domain language.

## 6. Invisible Theory

Explain the non-obvious design theory behind the change:

- source-of-truth rule
- ownership boundary
- workflow assumption
- data contract assumption
- user mental model
- operational risk being reduced

## 7. Decisions Made

| Decision | Rationale | Risk |
|---|---|---|
|  |  |  |

## 8. Open Questions / Assumptions

| Item | Status | Blocking? | Notes |
|---|---|---|---|
|  | UNKNOWN / ASSUMED / RESOLVED | Yes / No |  |

## 9. Rejected Alternatives

| Alternative | Why rejected |
|---|---|
|  |  |

## 10. Do-Not-Build List

Explicitly list work that is out of scope.

## 11. Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
|  | Critical / High / Medium / Low |  |

## 12. Implementation Plan

Risk-ranked and incremental steps:

1. 
2. 
3. 

## 13. Validation Plan

Include at least one of:

- unit tests
- integration tests
- backend pytest
- frontend typecheck/build
- browser validation
- manual smoke test
- route registration check
- compile/import check

## 14. Rollback Plan

Describe how to revert safely.

## 15. Approval Gate

State whether implementation is:

- low risk and may proceed
- medium risk and needs `Proceed` or equivalent
- high risk and needs explicit approval packet

## 16. Final Confirmation

Shared understanding reached when both are true:

1. The agent can restate the plan clearly.
2. The user advises `Proceed`, `Approved`, or equivalent where required.
