# SENTRY Push Plan + Release Notes (2026-06-05)

## Scope
This document covers the latest five local commits:

1. `89c9528` — exec-intel quality gate
2. `7c0e61d` — competitor action-center + dossier workflow
3. `c9fdc5b` — vendor comparison + leadership evidence flow
4. `aa8e3c1` — regulatory source/report data refresh
5. `5644e42` — workspace hygiene + resume checklist

---

## Safe Push Plan (draft-first)

### 0) Preconditions
- Local branch: `master`
- Working tree: clean
- Backend health check should return `status: ok` at `/api/health`
- Required local test baseline:
  - `npm run typecheck`
  - `npm run test`
  - `backend/.venv/Scripts/python.exe -m pytest tests/test_executive_intel_routes.py tests/test_competitor_brief_readiness.py tests/test_vendor_company_grouping.py -q`

### 1) Push strategy
Use incremental pushes in logical order for rollback clarity:

1. Push application logic and UI commits:
   - `89c9528`
   - `7c0e61d`
   - `c9fdc5b`
2. Push data refresh separately:
   - `aa8e3c1`
3. Push workspace hygiene/docs:
   - `5644e42`

### 2) Command sequence
```bash
git fetch origin
git status --short --branch
git log --oneline origin/master..HEAD

# Optional: tag checkpoint before push
git tag -a sentry-prepush-20260605 -m "Checkpoint before 2026-06-05 push"

# Push everything currently queued on master
git push origin master
```

### 3) Post-push smoke checks
- Confirm CI quality gates succeed.
- Open these views and validate no runtime regressions:
  - Competitor Intelligence (Action Center + dossier modal)
  - Vendor Dashboard (compare tray + detail modal)
  - Executive Intelligence people selection quality gate
- Verify regulatory reports load with refreshed source artifacts.

### 4) Rollback path (no force-push)
If a regression is found, revert the smallest responsible commit:

```bash
git revert <commit_sha>
git push origin master
```

Recommended rollback order (last-in, first-out):
1. `5644e42`
2. `aa8e3c1`
3. `c9fdc5b`
4. `7c0e61d`
5. `89c9528`

---

## Release Notes (per commit)

## `89c9528` — feat(exec-intel): exclude unnamed placeholder profiles from people portfolios
**Summary**
- Added server-side filtering to exclude unnamed/placeholder profiles from executive people portfolio results.
- Updated profile logic messaging to align with quality gate behavior.
- Added/updated route tests validating exclusion behavior.

**Files touched**
- `backend/executive_intel/repository.py`
- `backend/tests/test_executive_intel_routes.py`
- `components/executiveIntel/profileLogic.ts`

**Risk**: Low/Medium (selection quality logic change)

---

## `7c0e61d` — feat(competitor-intel): add action center, dossier modal, and richer signal routing
**Summary**
- Introduced competitor action-center workflow with CSO candidate queue.
- Added dossier modal flow from competitor profile cards.
- Expanded event table data context (priority/readiness/owner routing).
- Updated style hooks for richer competitor intel UI states.

**Files touched**
- `App.tsx`
- `backend/competitor_routes.py`
- `components/CompetitorEventTable.tsx`
- `components/CompetitorIntel.tsx`
- `components/CompetitorProfileModal.tsx`
- `styles.css`

**Risk**: Medium (new UI path + API shaping)

---

## `c9fdc5b` — feat(vendor-intel): add comparison tray and evidence-first leadership workflows
**Summary**
- Added vendor comparison tray with multi-select compare workflow.
- Expanded vendor detail/evidence context for decision-ready review.
- Introduced Data Trust panel and security leadership briefing room integration.
- Updated vendor route behavior to improve fallback handling and response shape.

**Files touched**
- `backend/vendor_routes.py`
- `components/DataTrustPanel.tsx`
- `components/ExecutiveIntelligence.tsx`
- `components/HomeDashboard.tsx`
- `components/Sidebar.tsx`
- `components/VendorComparisonTray.tsx`
- `components/VendorDashboard.tsx`
- `components/VendorDetailModal.tsx`
- `components/securityLeadership/SecurityBriefingRoom.tsx`
- `components/securityLeadership/SecurityLeadership.tsx`
- `components/securityLeadership/SecurityProfileDetail.tsx`
- `components/securityLeadership/SecuritySidebar.tsx`

**Risk**: Medium/High (large UI surface and modal behavior change)

---

## `aa8e3c1` — data(regulatory): refresh 2026 source workbook and normalized report artifacts
**Summary**
- Refreshed regulatory source workbook and regenerated normalized JSON/CSV report artifacts.
- Large data-only delta impacts downstream reporting and analytical outputs.

**Files touched**
- `backend/data/source/Regulatory Data - 2026.xlsx`
- `backend/data/source/regulatory_cleaned_master.csv`
- `backend/data/source/regulatory_cleaned_master.json`
- `backend/data/regulatory_rows.json`
- `backend/data/json_reports/regulatory-briefing.json`

**Risk**: High (data volume and downstream report sensitivity)

**Validation note**
- Treat this as a separately reviewable change set in PR description and QA checklist.

---

## `5644e42` — chore(workspace): ignore local backup probes and add resume checklist
**Summary**
- Hardened ignore rules for local backup/debug artifacts.
- Added durable resume checklist for repo continuity and handoff.

**Files touched**
- `.gitignore`
- `Docs/RESUME_CHECKLIST_20260605.md`

**Risk**: Low

---

## QA evidence at time of preparation
- `npm run typecheck` ✅
- `npm run test` ✅
- Targeted backend pytest bundle ✅

---

## Approval boundary reminder
This document prepares push and release artifacts only.
No external system writes or pushes were executed as part of this planning step.
