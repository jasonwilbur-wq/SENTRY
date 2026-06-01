# SENTRY Operating Model Answers — Summary

## Purpose

Capture the user's answered SENTRY Grill Me questions as durable agent-spec context. This is a short summary, not a full transcript.

## Mission and Scope

- SENTRY is a Security and Technology Intelligence platform for Walmart Global Security.
- Primary audience: Walmart Global Security leadership, Emerging Security Technology team, CSO / executive leadership, analysts, and program owners.
- Optimization target: both daily analyst operations and executive reporting.
- SENTRY should not become a generic vendor database.
- Top outcomes:
  - visibility on prospective vendors Walmart has assessed
  - CSO intelligence
  - technology market analysis

## Domain Priorities

Primary domains:

- Vendor Intelligence
- Competitor Intelligence
- CSO Brief Intelligence

Supporting domains:

- Project Portfolio
- Regulatory Intelligence
- Incident Intelligence

When domains conflict, the agent should ask the user and provide courses of action instead of choosing silently.

## Source of Truth

- Vendor Intelligence source of truth is a combination of SENTRY SQLite database, SharePoint VAR documents, `00_System`, imported CSVs, backend API responses, and other authenticated evidence.
- Competitor Intelligence source of truth is created datasets that are then curated.
- CSO Brief Intelligence source of truth is OSINT plus human-in-the-loop intelligence processing.
- Backend API routes are not always automatically preferred over local file parsing; the totality of circumstances determines the best source.
- When backend API and local CSV/source files disagree, the agent should report the conflict with further information and ask for direction or provide options.

## Agent Authority

The agent may do the following without asking first when the user intent is clear and the action is low risk:

- read files
- inspect code
- run tests
- update documentation
- make small safe refactors
- add tests
- propose plans

The following require confirmation or approval before action:

- medium-risk refactors
- API changes
- schema changes
- production config changes
- auth changes
- dependency additions
- destructive deletes
- permanent unlinking
- production deployment/config changes
- executive publication
- compliance-owned records
- secrets/IAM/auth changes

For high-risk work, the agent should provide information, explain the risk, and obtain a clear `Proceed` or `Do not proceed` direction before action.

The agent may create or modify session artifacts automatically for major changes when needed.

The agent may update `DECISIONS.md` after major architecture choices when appropriate, but should explain the decision and avoid silent contradiction.

## Grill Me Behavior

- Lightweight Grill Me should be used even when the user says "just code it."
- The purpose is to enhance the program and ensure AI interactions produce the best output.
- Full Grill Me should always produce a Shared Design Concept before code.
- Full Grill Me should include:
  - do-not-build list
  - rejected alternatives
  - rollback plan

## Implementation Planning

- Every medium/high-risk implementation plan should include risk tiers.
- Implementation should be incremental.
- When behavior is risky, the agent should notify the user when tests should precede refactoring.
- The agent should avoid changing public APIs unless explicitly approved.
- The agent should avoid new dependencies unless explicitly justified and approved.

## Testing and Validation

Backend changes should use the strongest practical combination of:

- compile/import check
- targeted pytest
- full pytest when practical
- route smoke test

Frontend changes should use the strongest practical combination of:

- TypeScript check
- build
- Vitest
- browser validation
- Playwright
- additional browser automation such as Skyvern or Browser-use when available and appropriate

Visible UI changes require browser validation. Bug fixes should include regression tests when practical. Documentation-only changes require markdown/readability validation and do not require runtime tests unless they affect executable docs or examples.

## Artifacts and Memory

- Major Grill Me sessions should create session artifacts only when needed.
- Session artifacts should be short summaries, not full transcripts.
- Artifacts should include both summarized user answers and verbatim snippets when useful.
- Artifacts should include assumptions and unanswered questions.
- Artifacts should not include links to changed files by default.

## Glossary Decisions

- Vendor: a prospective company that provides services or technologies that may be of interest to Walmart.
- VAR: Vendor Assessment Report.
- Decision Band: to be confirmed by analyzing the current program before behavior changes; generally a draft or approved assessment classification derived from VAR evidence, scoring criteria, source quality, risk posture, and analyst review.
- Competitor Event: anything incident or action taken by a competitor of Walmart.
- CSO Brief: the brief for the Chief Security Officer.
- Triage: assessing the situation and providing courses of action.
- Review Queue: items that must be reviewed.
- Source of Truth: real authenticated data.
- Assessment, Report, Brief, and Review should have strict definitions.
- Glossary in `SENTRY_CONTEXT.md` is acceptable.

## Failure Handling

- If answers are incomplete, ask questions and provide options.
- If the user says "just code it," still perform lightweight Grill Me.
- If architectural risk is discovered mid-implementation, stop and provide courses of action.
- If a requested change conflicts with `DECISIONS.md`, advise the user and provide courses of action.
- If source data conflicts, ask the user or provide options instead of silently choosing.

## Security and Data Handling

- The agent should not read `.env.production`.
- The agent must never expose secrets, tokens, service account keys, or backup files.
- If explicitly requested and safe, the agent may place user-provided secret values into an appropriate environment/configuration target without echoing the values back.
- Incident details should be summarized differently from vendor or competitor data.
- Executive-facing outputs are draft-only until approved.

## Future Agent Evolution

- SENTRY should remain single-agent for now.
- Specialized agents may exist later for Vendor Intelligence, Competitor Intelligence, CSO Briefs, Regulatory, Incidents, or Projects.
- Multi-agent architecture should be revisited based on best practices and evidence such as separate security boundaries, separate approval owners, large enough tool domains, or eval evidence that one agent is not enough.
- Future agents should inherit the Grill Me protocol by default.

## Open Human-Review Items

- Analyze the current program to define `Decision Band` precisely before changing behavior.
- Decide future multi-agent thresholds when tool domains and approval boundaries mature.
- Confirm redaction policy for sensitive incident/person/vendor information per output audience; current guidance says incident details should be handled differently, but not blanket-redacted by default.
