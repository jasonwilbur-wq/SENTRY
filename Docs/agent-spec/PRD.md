# SENTRY v2 Agent Product Requirements Document

## Goal / Objective

Provide visibility on prospective vendors Walmart has assessed, CSO intelligence, and technology market analysis while improving the quality of Security and Technology Intelligence delivered to Walmart Global Security.

SENTRY should support both daily analyst operations and executive reporting. It should reduce analyst manual effort across vendor assessment intake, VAR review, score extraction, backlog review, project phase visibility, competitor intelligence, CSO brief drafting, and security intelligence reporting while preserving human control over final decisions, publication, destructive actions, and production-affecting changes.

## Current-State Snapshot (Codebase-Grounded)

The current SENTRY v2 codebase supports these core outcomes today:

- Vendor and technology assessment support across approximately 2,086 tracked vendors.
- VAR handling across approximately 1,349 reports with automated 8-dimension score extraction through the Element LLM Gateway.
- Consolidated intelligence views for competitor events, regulatory obligations, retail incidents, and CSO-facing intelligence content.
- Morning brief and dashboard generation using application data and summary endpoints.
- Project portfolio tracking with phase and blocker visibility.
- Admin and write-capable protections improved in PR-01 for selected risky mutations:
  - protected admin/write endpoints now require auth
  - destructive or high-risk actions require explicit confirmation parameters
  - overwrite, unlink, delete, and permanent delete paths are no longer silently executable

## Problem Statement

SENTRY has strong operational surface area, but several workflows still depend on manual review, manual reporting, partial data joins, and analyst judgment that is not yet fully supported by safe agent controls.

The main problems to solve are:

- analyst time is still lost to manual VAR handling, document review, score validation, vendor linking, and reporting
- approval and audit controls are incomplete for broader agent-driven workflows
- chat and LLM grounding are still weaker than needed for high-confidence, analyst-ready outputs
- some executive-facing and backlog workflows are only partially supported and remain pull-based
- several integrations that would improve workflow execution are not yet implemented

## Primary Users

1. Walmart CSO
2. Walmart Global Security leadership
3. Walmart EST (Emerging Security Technology) Team
4. Analysts and program owners
5. Product Owners / Program Managers
6. Compliance Reviewers
7. Engineering Leads
8. Walmart end users requesting technology assessments
9. Vendors with limited or indirect status visibility only

## Inputs

- User prompts in the embedded SENTRY chat
- Vendor records from the SENTRY application database
- VAR metadata and extracted scores from the SENTRY application
- VAR documents retrieved from SharePoint through Microsoft Graph
- Project and phase data
- Regulatory obligation data
- Incident intelligence data
- Competitor intelligence data
- Morning brief and aggregate stats endpoint data
- Existing SENTRY backend API responses
- Human approval decisions returned through the SENTRY UI
- Static JSON and TypeScript content used by the app for selected views

## Outputs

- Draft VAR summaries
- Draft decision-band recommendations
- Draft backlog and stale-record findings
- Draft morning brief content
- CSO brief drafts and readiness summaries
- Competitor, incident, and regulatory intelligence summaries
- Vendor linking suggestions
- Read-only architecture or workflow recommendations
- Natural-language answers grounded in current SENTRY data
- Approval packets for gated actions
- Audit-friendly summaries of requested high-risk actions

## Definition of Done

A run is complete only when all of the following are true:

- The agent used only approved SENTRY data sources or clearly labeled a dependency as pending.
- The response is grounded in current SENTRY context or explicitly labeled as assumed or UNKNOWN.
- Draft recommendations are separated from final decisions.
- Any gated action is paused and returned as an approval packet or confirm-required preview path.
- No prohibited data is exposed.
- No write action occurs without the required approval state.
- The output is understandable by the intended SENTRY user.
- The response contains enough evidence for a human analyst to accept, revise, or reject it.

## Out of Scope / Anti-goals

- Final approval of a technology assessment
- Final publication or outbound delivery to CSO leadership without approval
- External communication without approval
- Autonomous deployment, CI/CD execution, production config mutation, IAM changes, or credential changes
- Editing or deleting vendors, projects, VARs, or backups without explicit approval controls
- Silent overwrite of reviewed VAR scores
- Reclassification of compliance-owned regulatory status without approval
- Exposure of secrets, backups, restricted incident detail, or protected internal data
- Direct OpenAI API use outside the Element LLM Gateway
- Multi-agent orchestration in Phase 1 without an explicit architecture revision

## Risks / Dependencies

### Active Risks

- Chat and LLM outputs do not yet have a fully mature grounding, citation, and UNKNOWN discipline.
- Sensitive or incident-related context may be passed to the LLM without sufficient filtering.
- Audit coverage is still incomplete beyond the PR-01 protections.
- Approval workflow is still partial; several approval gates are policy-level only and not yet fully implemented in product workflows.
- Data quality issues in vendor matching or stale source data can produce weak draft recommendations.
- Executive reporting remains partially manual and pull-based.

### Dependencies Pending

- Microsoft Teams delivery
- Jira or Azure DevOps work management integration
- Cloud Logging or equivalent structured audit pipeline
- CMDB / asset inventory integration
- Vulnerability feed integration
- Source control and CI/CD interaction APIs
- Data warehouse / BI integration
- Confluence or broader internal document integration beyond currently available app-connected sources

## Success Metrics

### Current-State Baselines

- Vendors tracked: approximately 2,086
- VAR reports tracked: approximately 1,349
- Competitor events tracked: approximately 1,071
- Regulatory obligations tracked: approximately 362
- Morning brief generation exists but is pull-only
- Admin mutation auth and confirm protections improved in PR-01
- Formal workflow approval coverage is still partial
- Active user baseline is UNKNOWN
- Exact turnaround baseline is UNKNOWN

### First 90-Day Targets

- Reduce average assessment turnaround from hours of manual review to less than 15 minutes for supported automated extraction paths
- Reach at least 90% automated score extraction coverage for eligible VARs
- Reach at least 95% auto-link confidence or analyst-assisted linking coverage for VAR-to-vendor association
- Reach weekly competitor intelligence ingestion or refresh cadence
- Improve morning brief quality with analyst validation workflow
- Reach 100% auth coverage for admin and write-capable protected routes
- Reach 100% audit coverage for protected admin mutations
- Track false-positive risk recommendation overrides and keep analyst override rate below 10% once measured
- Reach at least 5 daily active internal users
- Reduce manual report preparation time by at least 50%

## Release Criteria for the Agent Layer

The SENTRY agent layer is ready for broader Phase 1 use only when:

- required approval triggers are implemented or explicitly excluded
- draft-only behavior is enforced in prompts and outputs
- dependency-pending tools are not hallucinated as available
- protected actions are authenticated and auditable
- sensitive data handling rules are explicit
- evaluation criteria and regression tests are in place
