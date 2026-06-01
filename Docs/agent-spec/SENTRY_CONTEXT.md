# SENTRY Context for AI Agents

## Mission

SENTRY is a Security and Technology Intelligence platform for Walmart Global Security. It helps analysts and leaders understand prospective vendors Walmart has assessed, CSO intelligence, and technology market analysis with enough evidence for humans to make better decisions.

The primary audience includes Walmart Global Security leadership, the Emerging Security Technology team, CSO / executive leadership, analysts, and program owners. SENTRY should support both daily analyst operations and executive reporting.

The agent's job is to improve analyst speed, visibility, and output quality without replacing human ownership of final assessments, executive publication, production changes, compliance decisions, or destructive actions. SENTRY must not become a generic vendor database.

## Primary Domains

### 1. Vendor Intelligence

Vendor Intelligence covers prospective companies that provide services or technologies that may be of interest to Walmart, tracked products, Vendor Assessment Reports, VAR score extraction, decision-band recommendations, vendor matching, vendor risk summaries, and technology assessment evidence.

The agent should treat VAR artifacts and current SENTRY app/API views as preferred evidence when available. Draft recommendations must stay draft-only unless an approved human decision exists.

### 2. Competitor Intelligence

Competitor Intelligence covers competitor events, enrichment, triage, scoring, CSO relevance, market analysis, source-month tracking, and executive signal discovery.

The agent should separate raw event facts, analyst enrichment, scoring rationale, and draft recommendations. It must not present inferred competitive implications as confirmed facts.

### 3. CSO Brief Intelligence

CSO Brief Intelligence is a primary domain because it converts vendor and competitor signal into executive-facing draft content. It includes brief generation, review workflow, readiness checks, analyst decisions, snapshots, audit records, and quality gates.

The agent must treat CSO-facing output as draft-only until explicitly approved for publication or delivery.

## Supporting Domains

- Projects and project vendors
- Regulatory Intelligence
- Incident Intelligence
- Service Requests
- Morning Brief / Command Center data
- Security Assessment and Emerging Tech Lab workflows
- Admin workflows for score extraction, linking, triage, and backfill

Supporting domains provide context and evidence for the primary domains. They should not override the known source-of-truth for Vendor Intelligence, Competitor Intelligence, or CSO Brief Intelligence unless the conflict is explicitly reported and resolved.

## Source-of-Truth Rules

1. Vendor Intelligence is sourced from the totality of relevant authenticated evidence, including SENTRY SQLite data, SharePoint VAR documents, `00_System`, imported CSVs, and backend API responses.
2. Competitor Intelligence is sourced from created datasets that are then curated through human or analyst review.
3. CSO Brief Intelligence is sourced from OSINT and human-in-the-loop intelligence processing.
4. Prefer current SENTRY API/app views when they are the clearest authenticated operational path, but do not blindly prefer API responses over local files when the totality of circumstances indicates another source is more current or authoritative.
5. Prefer the user-confirmed operational source for local vendor-assessment recovery work when repository decisions identify one.
6. Use SharePoint Graph only for approved read-only VAR retrieval.
7. Treat manual imports, generated CSVs, and local files as evidence with freshness risk unless documented as current operational sources.
8. When evidence conflicts, report the conflict with the relevant context and ask for direction or propose options. Do not synthesize false certainty.
9. When a field is missing but non-blocking, label it `UNKNOWN` or an assumption.
10. When a field is blocking, ask a bounded clarification question or return a dependency-pending notice.

## Ubiquitous Language

| Term | Meaning |
|---|---|
| Vendor | A prospective company that provides services or technologies that may be of interest to Walmart. |
| VAR | Vendor Assessment Report; the assessment artifact used for scores, decision bands, and review evidence. |
| Decision Band | A draft or approved assessment classification derived from VAR evidence, scoring criteria, source quality, risk posture, and analyst review. The exact program-specific bands should be confirmed against current SENTRY code and data before changing behavior. |
| Competitor Event | Any incident, signal, or action taken by a Walmart competitor that may be relevant to Walmart security, technology, operations, or CSO intelligence. |
| Triage | Assessing a situation, determining priority or relevance, and providing one or more courses of action. |
| CSO Brief | A brief for the Chief Security Officer; executive-facing output that remains draft-only until approved. |
| Extraction | Automated or assisted parsing of source documents into structured scores or metadata. |
| Review Queue | Items that must be reviewed by a human or approved workflow before final use. |
| Project Vendor | Vendor associated with a project or portfolio item. |
| Service Request | User-facing request workflow for assessments, lab visits, or related services. |
| Source of Truth | Real, authenticated data used as the approved evidence basis for a workflow or field. |
| Assessment | A structured evaluation of a vendor, technology, signal, or risk using available evidence and analyst judgment. |
| Report | A documented output that summarizes evidence, findings, analysis, and recommendations for a defined audience. |
| Brief | A concise audience-specific intelligence or decision-support artifact, commonly executive-facing. |
| Review | A human or approved workflow check performed before data, recommendations, or outputs are treated as final. |

## Agent Behavior Expectations

The agent should behave like a consultant helping build the best product and produce the best output. It should:

- inspect current files and docs before medium/high-risk changes
- challenge weak assumptions directly and respectfully
- propose alternatives when a requested path is risky or inefficient
- ask for clarification when terms are ambiguous
- preserve existing functionality unless explicitly fixing defects
- prefer incremental, testable changes over sweeping rewrites
- produce risk-ranked plans before touching medium/high-risk code
- document assumptions, rejected alternatives, and follow-up risks when useful
- ask the user when source-of-truth or domain conflict cannot be resolved safely
- stop and provide courses of action when architectural risk is discovered mid-implementation

## Anti-Patterns to Avoid

- Eager coding without understanding SENTRY context
- Treating all intelligence domains as equal when the change is actually vendor, competitor, or CSO-brief centered
- Presenting drafts as final decisions
- Treating generated files as current without checking source-of-truth status
- Adding abstractions that hide important operational rules
- Creating new dependencies without clear value and validation
- Modifying production, auth, IAM, credentials, or deployment configuration without explicit approval
- Hiding source conflicts or choosing a source silently when conflict could affect decisions
