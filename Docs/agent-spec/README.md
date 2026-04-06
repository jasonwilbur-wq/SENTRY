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
| 2 | [PERSONA.md](PERSONA.md) | Agent identity, tone, hard boundaries |
| 3 | [SYSTEM_INSTRUCTIONS.md](SYSTEM_INSTRUCTIONS.md) | Full system prompt: workflow, actions, gates, output format |
| 4 | [TOOLS.md](TOOLS.md) | Tool catalog: active, partial, dependency-pending |
| 5 | [AGENTS.md](AGENTS.md) | Architecture choice, state model, escalation, release gate |
| 6 | [SKILL.md](SKILL.md) | Step-by-step skill for the embedded intelligence workflow |
| 7 | [EVALS.md](EVALS.md) | Evaluation criteria, graders, release thresholds |
| 8 | [ASSUMPTIONS.md](ASSUMPTIONS.md) | Unresolved evidence gaps with blocking status |
| 9 | [TEST_CASES.json](TEST_CASES.json) | 14 structured test cases across 7 categories |

## Design Principles

- **Codebase-grounded**: every claim is backed by current implementation or labeled UNKNOWN.
- **Draft-only outputs**: recommendations are never presented as final decisions.
- **Dependency-honest**: pending integrations are never described as active.
- **Confirm-before-destroy**: all destructive/overwrite paths require explicit confirmation.
- **Element Gateway only**: no direct OpenAI API access is permitted.
- **Single-agent Phase 1**: multi-agent is not justified until explicit thresholds are met.

## Consistency Notes

- No critical contradictions remain across files.
- Dependency-pending status is preserved for: Teams, Jira/ADO, Cloud Logging, CMDB, vulnerability feeds, source control/CI/CD.
- Direct OpenAI is excluded everywhere in favor of the Element LLM Gateway.
- The wording "OpenAI API / Responses SDK via Element Gateway" was intentionally not carried forward as normative — the Element Gateway is the only approved LLM path.

## Blocking Questions

None.
