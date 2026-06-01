# SENTRY Implementation Gate

## Purpose

This gate defines when an AI agent may proceed with implementation, when it should ask for confirmation, and when explicit approval is required.

The gate is intentionally practical: the agent should not become blocked by unnecessary ceremony for low-risk work, but it must slow down for changes that can affect data integrity, security, architecture, production behavior, or executive-facing outputs.

## Risk Tiers

### Low Risk

Examples:

- documentation-only updates
- typo fixes
- small comments or non-functional cleanup
- local, reversible refactors with no public API impact
- adding non-invasive tests
- reading files, inspecting code, running tests, updating documentation, proposing plans, adding tests, and making small safe refactors requested by the user

Agent behavior:

- Run lightweight Grill Me.
- Proceed when user intent is clear.
- Summarize changes and validation.

### Medium Risk

Examples:

- frontend state-management changes
- API client restructuring
- backend route modularization
- database migration helper changes that are additive and tested
- changes to VAR, competitor, or CSO brief workflows that preserve behavior
- non-destructive admin workflow changes

Agent behavior:

- Run full Grill Me or a focused equivalent.
- Inspect relevant files before editing.
- Produce a Shared Design Concept and risk-ranked implementation plan.
- Confirm medium-risk refactors, API changes, schema changes, dependency additions, production config changes, and auth changes before execution.
- Proceed when the user says `Proceed`, `Approved`, or gives equivalent clear direction.
- Notify the user when tests should precede a risky refactor.
- Validate with targeted tests and broader tests when practical.

### High Risk

Examples:

- destructive data changes
- permanent unlinking or permanent deletion
- schema changes that modify or remove existing fields
- authentication or authorization changes
- secrets, credentials, IAM, CORS, Cloud Run, Firebase, or deployment config changes
- executive publication or outbound delivery behavior
- compliance-owned record mutation
- production-affecting changes
- public API changes with client impact
- dependency additions that materially change risk or maintenance burden
- low-confidence architecture changes

Agent behavior:

- Run full Grill Me.
- Produce an approval packet.
- Do not execute until explicit approval is provided.
- Include rollback/recovery path.
- Validate with the highest practical confidence.

## Confirmation Language

The user may unlock implementation with natural language such as:

- `Proceed`
- `Approved`
- `Proceed with implementation`
- `Design approved`
- `Go ahead`

For high-risk actions, the agent should provide the relevant information, explain risk and alternatives, and obtain explicit `Proceed` / `Do not proceed` direction that names the action or risk being approved.

## When to Pause

Pause and ask before implementation if:

- the desired behavior is ambiguous
- source-of-truth is unclear
- a public API or data contract may change
- a destructive or irreversible action may occur
- production or security configuration may change
- the implementation could conflict with existing architecture
- the request conflicts with `DECISIONS.md`
- source data conflicts in a way that could affect decisions
- test coverage is weak for a critical path
- the agent detects a safer alternative that materially changes the plan
- architectural risk is discovered mid-implementation

## When to Proceed Without Extra Approval

Proceed without additional approval when all are true:

1. The user has clearly requested the work.
2. The work is low risk or the user already advised `Proceed`/`Approved`.
3. The agent has inspected relevant files where applicable.
4. The change is incremental and reversible.
5. Existing business logic is preserved unless the user asked to fix a defect.
6. Validation is feasible and planned.
7. The change does not touch public API/schema/auth/production boundaries unless explicitly approved.

## Approval Packet Template

Use this format for high-risk or gated work:

```markdown
## Approval Packet

- requested_action:
- reason_for_escalation:
- current_state:
- proposed_change:
- affected_domains:
- risk_summary:
- security_privacy_impact:
- data_integrity_impact:
- tools_or_files_involved:
- validation_plan:
- rollback_path:
- approval_required:
- approve_option:
- reject_option:
- revise_option:
```

## Validation Expectations

Backend changes should use the strongest practical combination of compile/import checks, targeted pytest, full pytest when practical, and route smoke tests.

Frontend changes should use the strongest practical combination of TypeScript checks, build, Vitest, browser validation, Playwright, and other applicable browser automation such as Skyvern or Browser-use when available and appropriate.

Visible UI changes require browser validation when practical. Bug fixes should include regression tests when practical. Documentation-only changes usually require markdown/readability validation rather than runtime tests.

## Post-Implementation Requirements

After implementation, always report:

1. Files changed
2. What changed
3. Why it changed
4. Risk level
5. Validation performed
6. Known caveats
7. Recommended next step
