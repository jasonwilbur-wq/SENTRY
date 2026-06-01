# Shared Design Concept — Grill Me Agent Operating Model

## 1. Change Name

`2026-05-15-grill-me-agent-operating-model`

## 2. Request Summary

Improve the way AI agents work on SENTRY by integrating the Grill Me design-interview skill into the SENTRY agent specification package. The goal is better SENTRY understanding, better implementation/update plans, safer code changes, and stronger shared understanding before medium/high-risk work.

## 3. SENTRY Domains Affected

Primary domains:

- Vendor Intelligence
- Competitor Intelligence
- CSO Brief Intelligence

Supporting domains:

- Projects
- Regulatory Intelligence
- Incident Intelligence
- Service Requests
- Admin workflows
- Backend API
- Frontend UI
- Documentation and agent operating model

## 4. Current Behavior

SENTRY already has an agent specification package under `Docs/agent-spec/` covering product requirements, persona, system instructions, tools, agent architecture, skills, evals, assumptions, and test cases.

Before this change, the package did not explicitly contain a SENTRY-specific Grill Me protocol for asking design questions, challenging assumptions, producing shared design concepts, or applying risk-tier implementation gates before code changes.

## 5. Desired Behavior

The SENTRY agent should behave like a helpful consultant and senior architect. It should use lightweight Grill Me questioning for all work and full Grill Me for medium/high-risk work. It should inspect relevant files when needed, challenge weak assumptions, propose alternatives, maintain domain language, and produce risk-ranked implementation plans before risky changes.

## 6. Invisible Theory

SENTRY changes are safer when the agent understands the operational theory of the system before writing code. The most important domains are Vendor Intelligence, Competitor Intelligence, and CSO Brief Intelligence; Projects, Regulatory, Incidents, Service Requests, and Admin workflows support those primary domains unless a task makes them primary.

The agent should not be blocked by ceremony for low-risk work, but it should slow down when changes may affect data integrity, architecture, security, production configuration, executive-facing outputs, or public API contracts.

## 7. Decisions Made

| Decision | Rationale | Risk |
|---|---|---|
| Use lightweight Grill Me for all work and full Grill Me for medium/high-risk work | Balances safety with productivity | Low |
| Treat Vendor Intelligence, Competitor Intelligence, and CSO Brief Intelligence as primary domains | Matches user guidance and SENTRY mission | Low |
| Describe SENTRY as Security and Technology Intelligence | Reflects broader mission than vendor directory only | Low |
| Store major session artifacts in `Docs/agent-spec/sessions/` | Keeps program-specific agent memory inside the repo | Low |
| Use flexible confirmation language such as `Proceed` or `Approved` | Matches user preference and practical workflow | Medium |

## 8. Open Questions / Assumptions

| Item | Status | Blocking? | Notes |
|---|---|---|---|
| Exact future artifact frequency | ASSUMED | No | Major changes should create artifacts; minor work can summarize in response only. |
| Whether to add automated tests for docs | ASSUMED | No | Documentation-only change does not require runtime tests. |

## 9. Rejected Alternatives

| Alternative | Why rejected |
|---|---|
| Keep Grill Me only as a standalone downloaded markdown file | Agents working in SENTRY may not reliably discover or apply it. |
| Require exact phrase `Shared Understanding reached — proceed` for all code | User prefers flexible `Proceed`/`Approved` depending on context. |
| Apply full Grill Me to every small task | Too much process overhead for low-risk work. |

## 10. Do-Not-Build List

- Do not change SENTRY runtime behavior in this cycle.
- Do not modify production configuration, IAM, auth, CORS, secrets, or deployment files.
- Do not add new dependencies.
- Do not implement autonomous writes or approval workflow changes.

## 11. Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Agents over-apply process to trivial tasks | Medium | Define lightweight vs full Grill Me. |
| Agents proceed too quickly on risky work | High | Add implementation gate and approval packet rules. |
| Domain language stays ambiguous | Medium | Add SENTRY context and glossary. |
| Session artifacts become noise | Low | Use artifacts for major changes only. |

## 12. Implementation Plan

1. Create SENTRY context documentation.
2. Create SENTRY-specific Grill Me protocol.
3. Create implementation gate rules.
4. Create shared design concept template.
5. Update README read order and design principles.
6. Update system instructions, skill workflow, and agent state docs to reference the new protocol.
7. Save this session artifact.

## 13. Validation Plan

- Confirm new markdown files are present.
- Confirm updated files reference the new protocol and gate.
- No runtime tests required because this is documentation-only.

## 14. Rollback Plan

Revert the new files and the small edits to existing `Docs/agent-spec/` markdown files.

## 15. Approval Gate

Risk tier: Low.

The user explicitly said `Proceed`, so documentation-only implementation is approved.

## 16. Final Confirmation

Shared understanding was reached for a documentation-only implementation that improves SENTRY agent behavior without changing application runtime behavior.
