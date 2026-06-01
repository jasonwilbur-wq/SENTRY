# SENTRY v2 — Agent Specification Package

**Version:** 1.0.0
**Phase:** 1 — Single-agent with tools
**Last Updated:** 2026-04-04
**Grounded Against:** SENTRY v2 codebase + PR-01 security foundation

## Package Files

Read in this order:

| # | File | Purpose |
|---|---|---|
| 1 | [PRD.md](PRD.md) | Product requirements, success metrics, release criteria |
| 2 | [SENTRY_CONTEXT.md](SENTRY_CONTEXT.md) | Durable SENTRY mission, domain, source-of-truth, and language context |
| 3 | [PERSONA.md](PERSONA.md) | Agent identity, tone, hard boundaries |
| 4 | [SYSTEM_INSTRUCTIONS.md](SYSTEM_INSTRUCTIONS.md) | Full system prompt: workflow, actions, gates, output format |
| 5 | [GRILL_ME_PROTOCOL.md](GRILL_ME_PROTOCOL.md) | Lightweight/full design interview protocol before implementation |
| 6 | [IMPLEMENTATION_GATE.md](IMPLEMENTATION_GATE.md) | Risk tiers, proceed/approval rules, approval packet template |
| 7 | [TOOLS.md](TOOLS.md) | Tool catalog: active, partial, dependency-pending |
| 8 | [AGENTS.md](AGENTS.md) | Architecture choice, state model, escalation, release gate |
| 9 | [SKILL.md](SKILL.md) | Step-by-step skill for the embedded intelligence workflow |
| 10 | [SHARED_DESIGN_CONCEPT_TEMPLATE.md](SHARED_DESIGN_CONCEPT_TEMPLATE.md) | Reusable template for Grill Me session artifacts |
| 11 | [EVALS.md](EVALS.md) | Evaluation criteria, graders, release thresholds |
| 12 | [ASSUMPTIONS.md](ASSUMPTIONS.md) | Unresolved evidence gaps with blocking status |
| 13 | [TEST_CASES.json](TEST_CASES.json) | 19 structured test cases across expanded safety, design, and implementation-gate categories |

## Design Principles

- **Codebase-grounded**: every claim is backed by current implementation or labeled UNKNOWN.
- **Draft-only outputs**: recommendations are never presented as final decisions.
- **Dependency-honest**: pending integrations are never described as active.
- **Confirm-before-destroy**: all destructive/overwrite paths require explicit confirmation.
- **Element Gateway only**: no direct OpenAI API access is permitted.
- **Single-agent Phase 1**: multi-agent is not justified until explicit thresholds are met.
- **Grill Me before risky work**: use lightweight design questioning for all work and full Grill Me for medium/high-risk changes.

## Consistency Notes

- No critical contradictions remain across files.
- Dependency-pending status is preserved for: Teams, Jira/ADO, Cloud Logging, CMDB, vulnerability feeds, source control/CI/CD.
- Direct OpenAI is excluded everywhere in favor of the Element LLM Gateway.
- The wording "OpenAI API / Responses SDK via Element Gateway" was intentionally not carried forward as normative — the Element Gateway is the only approved LLM path.

## Session Artifacts

Major design/interview sessions should be saved under:

```text
Docs/agent-spec/sessions/
```

Use the shared design concept template for medium/high-risk changes.

## Blocking Questions

None.
