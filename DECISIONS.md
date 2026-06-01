# DECISIONS

## 2026-05-15 — SENTRY AI-agent operating model should use Grill Me with SENTRY-specific domain rules
- Context: User completed the SENTRY Grill Me operating-model questionnaire to clarify mission, domain priorities, source-of-truth rules, agent authority, implementation gates, validation expectations, artifacts, glossary, failure handling, security boundaries, and future agent evolution.
- Decision: Treat SENTRY as a Security and Technology Intelligence platform optimized for both daily analyst operations and executive reporting.
- Primary domains:
  - Vendor Intelligence
  - Competitor Intelligence
  - CSO Brief Intelligence
- Supporting domains:
  - Project Portfolio
  - Regulatory Intelligence
  - Incident Intelligence
- Agent operating choices:
  - Use lightweight Grill Me for all work, including when the user says "just code it."
  - Use full Grill Me for medium/high-risk work.
  - Produce a Shared Design Concept before medium/high-risk code changes.
  - Include risk tiers, do-not-build list, rejected alternatives when useful, validation plan, and rollback plan for full Grill Me.
  - Ask the user and provide courses of action when domains, source data, or prior decisions conflict.
  - Stop and provide courses of action if architectural risk is discovered mid-implementation.
- Source-of-truth choices:
  - Vendor Intelligence is based on the totality of authenticated sources, including SENTRY SQLite, SharePoint VAR documents, `00_System`, imported CSVs, and backend API responses.
  - Competitor Intelligence is based on created and curated datasets.
  - CSO Brief Intelligence is based on OSINT plus human-in-the-loop intelligence processing.
- Security choices:
  - Do not read `.env.production`.
  - Never expose secrets, tokens, service account keys, or backup files.
  - Executive-facing outputs remain draft-only until approved.
- Validation choices:
  - Backend changes should use compile/import checks, targeted pytest, full pytest when practical, and route smoke tests.
  - Frontend changes should use TypeScript checks, build, Vitest, browser validation, Playwright, and additional browser automation such as Skyvern or Browser-use when available and appropriate.
  - Visible UI changes require browser validation when practical.
- Status: Documented in `Docs/agent-spec/` agent operating files and summarized in `Docs/agent-spec/sessions/2026-05-15-sentry-operating-model-answers.md`.


## 2026-04-30 — Vendor Directory Risk & Scores data source hardening
- Context: Risk and score presentation in Vendor Directory was not reliably surfacing Vendor Assessment Report (VAR) data at both the card layer and the modal detail layer.
- Decision: Prefer latest available scored VAR metadata for Vendor Directory display when present.
- Implementation choice:
  - Enrich grouped vendor list payloads with latest VAR score, decision band, and component metrics.
  - In `VendorDetailModal`, fetch vendor detail plus linked VAR reports and derive fallback Risk & Scores directly from the latest scored VAR when the base payload is incomplete.
  - Surface a clearer Risk & Scores summary in the modal so key VAR metrics are visible above the fold.
- Rationale: This keeps Vendor Directory aligned with the source-of-record assessment artifact instead of relying only on product-row `overall_rating` fields.
- Status: Implemented, pending runtime validation.
- Follow-up hardening: Surface the pending state in two places so it is harder to miss:
  - inline under the modal header metadata
  - at the top of the Risk & Scores panel before summary cards

## 2026-05-13 — Vendor directory should self-bootstrap from 00_System when visible vendor coverage is empty
- Context: User reported that vendor information still was not visible in SENTRY even after localhost delivery prep.
- Decision: On backend startup, automatically seed the vendor directory from `00_System/vendor_assessment_vendor_profiles.csv` when the DB is empty or when no vendors are visible after canonical filtering.
- Implementation choice:
  - Add a startup bootstrap check in `backend/main.py`.
  - Trigger `import_vendor_data.import_all()` only when vendor coverage is effectively empty.
  - Clear in-memory caches after bootstrap so fresh vendor data is exposed immediately.
- Rationale: This removes reliance on manual import steps and prevents a blank Vendor Directory when the canonical operational source exists locally.
- Status: Implemented, pending localhost restart validation.

## 2026-05-13 — Localhost delivery should be one-step for validation
- Context: User asked to access the integrated SENTRY experience via localhost.
- Decision: Provide a root-level launcher that starts backend and frontend together for local validation.
- Implementation choice:
  - Add `start_sentry_localhost.bat` at repo root.
  - Keep backend on `:8082` and frontend on `:3000`, matching existing Vite proxy and backend starter assumptions.
- Rationale: The fastest path to user validation is a simple, consistent localhost boot flow.
- Status: Implemented, pending user execution.

## 2026-05-13 — 00_System is the operational vendor-assessment source
- Context: User explicitly directed app integration work to treat `Desktop\SENTRY\Vendor Assessments\00_System` as the operational source.
- Decision: Integrate vendor-assessment operations into the app as a read-only source-backed surface before attempting automated mutation or workflow moves.
- Implementation choice:
  - Add a backend route that reads `00_System` CSV/SQLite-adjacent artifacts and executive views directly.
  - Surface operational metrics, recent additions, and multi-domain watchlist data on the Home dashboard.
  - Keep integration read-only for now to avoid accidental file or assessment state changes.
- Rationale: `00_System` already contains the process control plane and executive rollups; exposing it in-app delivers immediate utility with low operational risk.
- Status: Implemented, pending runtime validation.

## 2026-05-13 — Desktop SENTRY path is the active local source-of-truth
- Context: User confirmed the current local data root is `C:\Users\j0w16ja\OneDrive - Walmart Inc\Desktop\SENTRY`, while parts of the codebase still referenced older `ET\SENTRY_Data` locations.
- Decision: Treat `Desktop\SENTRY` as the preferred local source root for recovery work.
- Implementation choice:
  - Update incident import logic to prefer `Desktop\SENTRY` and fall back to legacy locations only when needed.
  - Update the shared path config for verified directories under the Desktop SENTRY tree.
- Rationale: Recovery work should align to the user-confirmed artifact location instead of preserving stale path assumptions.
- Status: Implemented, pending runtime validation.

## 2026-05-13 — Retire Walmart Spark from primary navigation
- Context: User requested removal of the Walmart Spark tab because it is no longer needed.
- Decision: Remove Walmart Spark from the main user flow.
- Implementation choice:
  - Remove the sidebar entry.
  - Remove the landing-page CTA.
  - Remove the routed page registration in `App.tsx`.
- Rationale: Unused modules create distraction and increase failure surface during recovery.
- Status: Implemented, pending runtime validation.

## 2026-05-13 — Vendor Directory filters must be fully wired through context
- Context: Vendor data appeared missing, but the frontend had a broken context path: undefined `PAGE_SIZE`, missing risk propagation, and incomplete provider values.
- Decision: Restore Vendor Directory as a reliable, server-filtered context-driven view.
- Implementation choice:
  - Use `VENDOR_PAGE_SIZE` instead of undefined `PAGE_SIZE`.
  - Include `risk` in query keys, API calls, and provided context state.
  - Align `VendorDashboard` destructuring with the context contract.
- Rationale: Broken filter/state plumbing can present as missing data even when the backend still contains records.
- Status: Implemented, pending runtime validation.

## 2026-05-13 — Frontend query cache should immediately retry cached empty-error states
- Context: Logs showed prior `ECONNREFUSED` failures for `/api/vendors` and `/api/vendors/categories`, while the backend later recovered and served those endpoints. A cached error with no data could leave Vendor Directory stuck empty until a remount or manual state change.
- Decision: Make the query layer aggressively retry when a cached entry contains an error but no usable data.
- Implementation choice:
  - Update `hooks/useQuery.ts` so cached failure states with `undefined`/`null` data trigger `revalidate()` immediately on mount.
- Rationale: This prevents false "no vendor data" states caused by transient backend startup gaps.
- Status: Implemented, pending browser refresh validation.

## 2026-05-13 — Vendor Directory should self-heal after cached successful-empty responses
- Context: The backend now shows repeated `200 OK` responses for `/api/vendors`, but the UI can still remain empty if an earlier successful response cached an empty vendor list or empty categories during a startup race.
- Decision: Add one-shot recovery refetches in the Vendor context when the default directory view resolves to an empty dataset.
- Implementation choice:
  - Update `context/VendorContext.tsx` to re-fetch vendors once when the default unfiltered view returns `total === 0`.
  - Re-fetch categories once when the category response resolves empty.
- Rationale: This keeps the directory from getting stuck in a false empty state even when the backend has already recovered and local source data exists under `Desktop\SENTRY\Vendor Assessments`.
- Status: Implemented, pending browser refresh validation.

## 2026-05-13 — Vendor Directory and stats should prefer Desktop Vendor Assessments source over DB-derived visibility when available
- Context: User confirmed the operational source is `C:\Users\j0w16ja\OneDrive - Walmart Inc\Desktop\SENTRY\Vendor Assessments`, while the UI still showed no vendor information despite backend `200 OK` responses.
- Decision: Prefer source-backed vendor profiles from `00_System/vendor_assessment_vendor_profiles.csv` for directory lists, categories, and dashboard stats whenever that source is available.
- Implementation choice:
  - Update `backend/main.py` so `/api/vendors` chooses source-backed vendor profiles ahead of DB-grouped rows.
  - Update `/api/vendors/categories` and `/api/stats` to derive from the same source-backed vendor set when present.
- Rationale: This aligns the UI with the user-designated source-of-truth instead of relying on DB visibility heuristics.
- Status: Implemented, backend restart required for validation.

## 2026-05-13 — Local backend launcher should default to stable non-reload mode
- Context: The UI reported `Backend offline`, while logs showed uvicorn `--reload` churn and WatchFiles-triggered restarts, including reload noise from files under `backend\.venv`.
- Decision: Make the local backend launcher default to non-reload mode and require an explicit opt-in for hot reload.
- Implementation choice:
  - Update `backend/start_backend.bat` to run uvicorn without `--reload` by default.
  - Allow developers to opt back in with `SENTRY_BACKEND_RELOAD=1`.
- Rationale: Stable backend availability matters more than hot reload for local validation of Vendor Directory and dashboard data.
- Status: Implemented, backend restart required.

## 2026-05-13 — Local frontend should prefer same-origin `/api` in localhost development
- Context: The user still saw `failing to fetch data` after backend launcher stabilization. The frontend had been configured with `VITE_API_URL=http://127.0.0.1:8082`, while Vite already provides a local `/api` proxy on port 3000.
- Decision: Prefer same-origin relative `/api` requests whenever the app is running on localhost or 127.0.0.1.
- Implementation choice:
  - Update `services/api.ts` so localhost development ignores `VITE_API_URL` and uses relative paths through the Vite proxy.
  - Expand backend default CORS origins to include both `localhost` and `127.0.0.1` on common dev ports.
- Rationale: This removes direct cross-origin fetch fragility in local dev and aligns all UI traffic behind the existing Vite proxy.
- Status: Implemented, frontend refresh and backend availability validation pending.

## 2026-05-13 — Localhost launcher should enforce a single frontend port and expose a real health endpoint
- Context: Logs showed Vite silently moving from `3000` to `3001/3002` when port 3000 was already occupied, while the user kept browsing `http://localhost:3000/`. This created a stale-frontend loop that looked like repeated API failure. The backend also lacked a concrete `/api/health` endpoint despite prior guidance referencing one.
- Decision: Make localhost startup deterministic and observable.
- Implementation choice:
  - Update `vite.config.ts` with `strictPort: true` so Vite fails instead of drifting to another port.
  - Update `start_sentry_localhost.bat` to stop any existing listener on port 3000 before launching the frontend.
  - Update `package.json` `backend:start` to use stable non-reload uvicorn.
  - Add `/api/health` in `backend/main.py`.
- Rationale: This removes the stale-port ambiguity and gives the user a real backend liveness check.
- Status: Implemented, full launcher restart required.

## 2026-05-13 — Backend launcher should not hard-fail when `uv` is unavailable
- Context: The user reached a hard `ERR_CONNECTION_REFUSED` state on `127.0.0.1:8082`, which indicates the backend process is not listening at all. The launcher still depended on `uv` being available on PATH.
- Decision: Add a standard Python fallback path for backend bootstrap.
- Implementation choice:
  - Update `backend/start_backend.bat` to use `uv` when available.
  - Fall back to `py -3 -m venv` or `python -m venv`, then install dependencies with pip when `uv` is missing.
- Rationale: The local backend must be able to start on a normal Windows machine even if `uv` is not installed.
- Status: Implemented, backend relaunch required.

## 2026-05-13 — Backend path resolution should anchor to the Desktop SENTRY workspace
- Context: The user explicitly designated `C:\Users\j0w16ja\OneDrive - Walmart Inc\Desktop\SENTRY` as the local source-of-truth for vendor, regulatory, incident, project, and shared data.
- Decision: Centralize backend path resolution around the Desktop SENTRY workspace and derive domain-specific roots from that base.
- Implementation choice:
  - Add `backend/path_config.py` with a single `SENTRY_DATA_ROOT` and derived roots for Vendor Assessments, Regulatory, Incidents, Projects, and Data.
  - Update `backend/main.py`, `backend/vendor_assessment_routes.py`, `backend/build_regulatory_report.py`, `backend/import_incidents.py`, and `backend/import_vendor_data.py` to use shared path resolution.
  - Extend `/api/health` so it reports the active workspace roots and availability.
- Rationale: This removes path drift, narrows debugging scope, and aligns the app with the user-declared Desktop SENTRY workspace.
- Status: Implemented, backend restart required.

## 2026-05-13 — Regulatory 2D map should not depend on new npm packages in a restricted network environment
- Context: `npm install` failed with `ENOTFOUND registry.npmjs.org`, so adding new frontend packages was not viable on the user's machine.
- Decision: Remove the new package requirement and keep the regulatory map functional with the dependencies already present in the repo.
- Implementation choice:
  - Refactor `components/RegulatoryMap2D.tsx` to render a projection/graticule-based globe backdrop without `topojson-client` or `world-atlas`.
  - Remove `topojson-client` and `world-atlas` from `package.json` so the frontend can boot without network package installation.
- Rationale: Local startup reliability is more important than detailed country polygons when npm registry access is blocked.
- Status: Implemented, frontend restart required.

## 2026-05-13 — Route failures should be isolated instead of crashing the app shell
- Context: After the landing page was stabilized, navigation beyond the dashboard still caused failures when route modules contained syntax or runtime errors.
- Decision: Wrap every primary routed view in `ViewErrorBoundary`.
- Implementation choice:
  - Add route-level error boundaries around each lazy-loaded page in `App.tsx`.
  - Keep failures localized to the selected page instead of taking down the visible app shell.
  - Use route-specific `viewName` labels so the failing surface is obvious during triage.
- Rationale: In a lazy-loaded app, page-level failures should be diagnosable and recoverable without looking like a full application outage.
- Status: Implemented, pending runtime validation.

## 2026-05-13 — Landing page should degrade gracefully when 3D background initialization fails
- Context: The landing experience depended on `LandingBackground3D`, which created a Three.js WebGL renderer without a fallback path. A renderer-init failure could blank the landing page.
- Decision: Preserve the landing experience even when WebGL is unavailable or unstable.
- Implementation choice:
  - Wrap the landing route in `ViewErrorBoundary`.
  - Add a guarded WebGL initialization path in `LandingBackground3D`.
  - Fall back to the existing static gradient background when renderer creation fails or WebGL is unavailable.
- Rationale: The landing page is a gateway surface and should never be a single point of failure for app entry.
- Status: Implemented, pending runtime validation.

## 2026-04-30 — Distinguish linked VAR artifacts from extracted VAR scores
- Context: Backstreet Surveillance rendered the Risk & Scores UI successfully, but the vendor still showed no weighted score while being labeled `VAR Assessed`.
- Decision: Use more precise status language in Vendor Directory surfaces.
- Implementation choice:
  - Show `VAR Scored` when weighted score / structured VAR score data exists.
  - Show `VAR Linked` when a VAR artifact exists but score extraction is still pending.
  - Add an amber pending-state explanation inside the Risk & Scores tab when score extraction has not completed.
- Rationale: This avoids overstating evidence quality and improves trust when a vendor has a linked assessment document but no extracted score payload yet.
- Status: Implemented, pending runtime validation.
