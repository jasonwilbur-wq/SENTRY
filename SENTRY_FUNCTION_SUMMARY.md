# SENTRY v2 — Function Summary

**Application:** SENTRY (Vendor Intelligence Platform)  
**Owner:** Jason Wilbur (j0w16ja) — Emerging Technology Security, Walmart Global Security  
**Stack:** FastAPI (Python) + React/TypeScript + SQLite + GCP  
**Generated:** March 26, 2026

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Backend API — Core Routes (`main.py`)](#2-backend-api--core-routes)
3. [Backend API — Admin Routes (`admin_routes.py`)](#3-backend-api--admin-routes)
4. [Backend API — Project Routes (`project_routes.py`)](#4-backend-api--project-routes)
5. [Backend API — Regulatory Routes (`regulatory_routes.py`)](#5-backend-api--regulatory-routes)
6. [Backend API — Incident Routes (`incident_routes.py`)](#6-backend-api--incident-routes)
7. [Database Layer (`database.py`)](#7-database-layer)
8. [Data Models (`models.py`)](#8-data-models)
9. [Frontend — Application Shell (`App.tsx`)](#9-frontend--application-shell)
10. [Frontend — Views & Modules](#10-frontend--views--modules)
11. [Frontend — Shared Components](#11-frontend--shared-components)
12. [Frontend — Services & Context](#12-frontend--services--context)
13. [Data & Utilities](#13-data--utilities)
14. [Database Schema Summary](#14-database-schema-summary)

---

## 1. Application Overview

SENTRY is an **internal-facing vendor intelligence and security assessment platform** for the
Walmart Emerging Technology Security (EST) team. It centralizes vendor data, VAR (Vendor
Assessment Reports) scores, project pipeline tracking, competitor intelligence, regulatory
obligations, and retail incident data in a single operational dashboard.

**Runs on:**
- Backend: `uvicorn main:app --port 8082`
- Frontend: Vite dev server on port 5173 (or Firebase Hosting in production)
- Database: SQLite (`backend/data/sentry.db`)
- AI: Element LLM Gateway (`api.llm.walmart.com`) — GPT-4o-mini via Walmart's internal proxy

**Modules (Views):**

| View | Purpose |
|---|---|
| Command Center | Home dashboard — morning brief, quick stats |
| Vendor Directory | Full vendor catalog with scoring and VAR reports |
| Project Portfolio | 3D project lifecycle tracking ($5.05M portfolio) |
| Market Analysis | Competitor performance comparison visualizations |
| Competitor Intelligence | 1,100+ analyst-enriched competitor events |
| CSO Intelligence | Executive security leadership competitive positioning |
| Regulatory Intelligence | 362 obligations across AI, Biometrics, ALPR, UAS, Privacy |
| Incident Intelligence | Retail security incidents — ORC, cargo theft, cyber, violence |
| Vendor Risk Galaxy | 3D risk map of all vendors by category and risk level |
| VAR Administration | Admin panel for VAR score extraction and vendor linkage |
| Project Administration | Manual project metadata, compliance IDs, phase gate edits |
| Security Assessment | GRC workflow request form |
| Emerging Tech Lab | Lab visit scheduling form |
| SENTRY Architecture | GCP 4-phase framework visualization |

---

## 2. Backend API — Core Routes

**File:** `backend/main.py`  
**Base:** FastAPI app on port 8082

### Vendor Endpoints

#### `GET /api/vendors`
Returns paginated vendor list from the SQLite database.
- **Params:** `category`, `search`, `page`, `page_size` (up to 500)
- Groups multiple products per company into a single `VendorOut` object
- Enriches each vendor with: VAR report flags, latest VAR ID, linked project associations
- Sorted by `overall_rating DESC`

#### `GET /api/vendors/categories`
Returns all distinct vendor categories for the filter dropdown.  
⚠️ Must be registered **before** `/{vendor_id}` in route order to avoid shadowing.

#### `GET /api/vendors/{vendor_id}`
Returns a single vendor by ID, enriched with latest VAR dimension scores.
- Pulls 8 VAR score dimensions: Overall, Compliance, Risk, Maturity, Integration, ROI, Viability, Differentiation, Cloud Dependency
- Returns 404 if not found

#### `GET /api/vendors/{vendor_id}/highlights`
Returns all monthly assessment highlights for a vendor, ordered by date descending.

#### `GET /api/vendors/{vendor_id}/var-reports`
Returns all VAR reports linked to a vendor, ordered by date descending.

#### `GET /api/vendors/{vendor_id}/tech-pipeline`
Returns the technology assessment pipeline stage for each of a vendor's products.
- Pipeline stages: `0=Not Started → 1=Pre-Assessment → 2=Initial Assessment → 3=Technical Assessment → 4=VAR Complete`
- Aggregates pass/fail stats across all products

#### `GET /api/var-reports`
Returns all VAR reports across all vendors (joined with company name).

#### `GET /api/vars/download/{var_id}`
Proxy-downloads a VAR `.docx` from SharePoint via the Microsoft Graph API.
- Tries Graph API with MSAL token first
- Falls back to SharePoint web redirect if Graph token is unavailable or expired

### Stats & Dashboard

#### `GET /api/stats`
Aggregate KPIs for the Vendor Directory dashboard panel:
- Total vendors, total VARs, vendors with VAR, VAR coverage %, average rating
- Risk distribution breakdown
- Top 12 categories by count + average rating
- Decision band distribution
- Recently assessed vendor count (last 90 days)

#### `GET /api/morning-brief`
Live snapshot for the Home Dashboard morning brief card:
- Last 5 incidents with severity, type, location, summary
- Total incident count and critical incident count
- Regulatory Red and Amber obligation counts (from JSON file)
- Competitor event total
- Vendors with stale assessments (>180 days, has VAR)

### AI Chat

#### `POST /api/chat`
Powered by the Element LLM Gateway (GPT-4o-mini). Pulls live SENTRY data as context.
- **Context injected into system prompt:**
  - Total vendors, VAR count, risk distribution
  - Top technology categories
  - High/Critical risk vendors
  - Competitor event count
  - Incident totals, top types, recent critical incidents
- Falls back to a configuration help message if `ELEMENT_API_KEY` is not set
- Supports conversation history via `history[]` array

### Forms

#### `POST /api/assessment`
Accepts a security assessment request. Returns a reference ID (`SENTRY-ASM-XXXXXXXX`).

#### `POST /api/lab-visit`
Accepts a lab visit request. Returns a reference ID (`SENTRY-LAB-XXXXXXXX`).

### Competitor Intelligence (Core)

#### `GET /api/competitors/stats`
KPI totals across all competitor events — total, by category (Cyber, ORC/Theft, Recall, Legal, Strategic), and competitor count.

#### `GET /api/competitors/entities`
Ranked competitor entities for the card grid and 3D orbital visualization.
- Params: `limit` (up to 135), `min_events` filter

#### `GET /api/competitors/monthly`
Monthly event counts for top-N competitors, covering Sep 2025 – Feb 2026.

#### `GET /api/competitors/heatmap`
Competitor × category event-count matrix (up to 10 competitors × 10 categories).

#### `GET /api/competitors/events`
Paginated, filterable competitor events feed.
- Filters: `competitor`, `category`, `month`, free-text `q`
- Up to 100 per page

#### `GET /api/competitors/categories`
Distinct event categories used across all competitor events.

### Internal Helpers

#### `_group_products(rows, var_vendor_ids, latest_var_ids, linked_map)`
Groups multiple product rows for the same company into one `VendorOut`. Called by `list_vendors` and `get_vendor`.

#### `_pipeline_stage(pre_decision, initial, technical, has_var)`
Returns 0–4 representing how far in the assessment pipeline a product is.

---

## 3. Backend API — Admin Routes

**File:** `backend/admin_routes.py`  
**Prefix:** `/api/admin`

Manages VAR reports, score extraction, and vendor linkage.

#### `GET /api/admin/stats`
Dashboard stats: total vendors, VARs, scored/unscored VARs, vendors with/without VAR, decision band counts, extraction coverage %.

#### `GET /api/admin/vars`
Paginated VAR report list with vendor name join.
- Filters: `filter` (all/scored/unscored), `search` (by vendor name or filename)
- Includes full score columns and `has_scores` flag

#### `GET /api/admin/vars/{var_id}`
Single VAR report detail, including all score fields and linked company name.

#### `PATCH /api/admin/vars/{var_id}/link`
Manually links a VAR report to a different vendor ID.

#### `POST /api/admin/vars/{var_id}/extract`
Triggers score extraction for a single VAR report by:
1. Downloading the `.docx` from SharePoint via Graph API
2. Running `var_score_extractor.extract_scores()` on the content
3. Writing extracted scores back to `var_reports` table

#### `POST /api/admin/vars/batch-extract`
Batch score extraction across all unscored VARs.
- Runs extractions concurrently (up to 5 at a time via `asyncio.Semaphore`)
- Skips already-scored reports unless `force=true`
- Returns per-report success/failure summary

#### `DELETE /api/admin/vars/{var_id}`
Deletes a VAR report record from the database.

#### `GET /api/admin/sharepoint/catalog`
Fetches the full VAR file catalog from SharePoint via the Graph API — used to discover new VARs not yet linked.

#### `POST /api/admin/vendors`
Creates a new vendor record.

#### `PATCH /api/admin/vendors/{vendor_id}`
Partial update for a vendor (name, category, rating, status, risk level, etc.).

#### `DELETE /api/admin/vendors/{vendor_id}`
Deletes a vendor and all associated VAR reports and highlights.

### Competitor Admin Routes

**Router:** `competitor_router` (from `admin_routes.py`)  
**Prefix:** `/api/admin/competitors`

#### `GET /api/admin/competitors`
Paginated list of all competitor events with filtering.

#### `POST /api/admin/competitors`
Creates a new competitor event.

#### `PATCH /api/admin/competitors/{event_id}`
Updates a competitor event record.

#### `DELETE /api/admin/competitors/{event_id}`
Deletes a competitor event.

---

## 4. Backend API — Project Routes

**File:** `backend/project_routes.py`  
**Prefix:** `/api/projects`

Manages the EST project portfolio with lifecycle state, compliance tracking, and vendor associations.

#### `GET /api/projects`
Returns all projects sorted by `est_phase_index DESC`. Includes all vendor entries per project in one efficient bulk query.

#### `GET /api/projects/{project_id}`
Returns a single project with full detail including vendor list.

#### `PATCH /api/projects/{project_id}`
Partial update — only supplied fields are written. Supports:
- Project metadata: name, health, lifecycle_state, phase, progress, milestones, blockers
- Compliance IDs: NDA numbers, APM entries, ERPA entries, SSP entries (each stored as JSON arrays)
- Phase gate tracking

#### `DELETE /api/projects/{project_id}`
Permanently deletes a project and all associated vendor entries (CASCADE).

#### `GET /api/projects/{project_id}/vendors`
Returns all vendor entries for a project, ordered by status (active first) then name.

#### `POST /api/projects/{project_id}/vendors`
Adds a vendor to a project with role, status, and notes.

#### `PATCH /api/projects/{project_id}/vendors/{entry_id}`
Updates a vendor entry on a project (name, ID, role, status, notes).

#### `DELETE /api/projects/{project_id}/vendors/{entry_id}`
Removes a vendor from a project.

### Internal Helpers

#### `_phase_index(label)`
Maps a free-text EST phase label (e.g. "Lab Testing", "APM / ERPA / SSP") to numeric phase index 1–8.

#### `_parse_compliance_list(raw)`
Parses a JSON column into a list of `ComplianceEntry` objects (NDA, APM, ERPA, SSP).

#### `_fetch_vendors(conn, project_id)`
Fetches all vendor entries for a project ordered by status priority.

#### `_row_to_project(row, vendors)`
Converts a SQLite row to a `ProjectOut` Pydantic model, parsing all JSON columns.

---

## 5. Backend API — Regulatory Routes

**File:** `backend/regulatory_routes.py`  
**Prefix:** `/api/regulatory`

Serves the pre-built `regulatory-briefing.json` (362 obligations across 5 tech domains).

#### `GET /api/regulatory/summary`
Top-level KPIs: stats (Red/Amber/Yellow/Green counts), top actions, jurisdictions, assumptions, confidence rating.

#### `GET /api/regulatory/obligations`
Paginated, filterable obligations list.
- Filters: `rag` (Red/Amber/Yellow/Green), `tech` (AI/Biometrics/ALPR/UAS/Data Privacy), `status` (Enacted/Proposed/Failed), `jurisdiction`, free-text `q`
- Sort options: `risk` (score DESC), `title`, `jurisdiction`, `deadline`

#### `GET /api/regulatory/obligations/{obligation_id}`
Single obligation detail with full description, risk scores, controls, evidence links, and provenance.

#### `GET /api/regulatory/filters`
All distinct filter values for frontend dropdowns — tech categories, jurisdictions, RAG bands, statuses, evidence statuses.

#### `GET /api/regulatory/download`
Returns the full regulatory report JSON for client-side download.

**RAG Score Bands:**
- 🔴 Red: 19–25 (Immediate action)
- 🟡 Amber: 13–18 (Priority attention)
- 🟡 Yellow: 7–12 (Monitor)
- 🟢 Green: 1–6 (Low risk)

---

## 6. Backend API — Incident Routes

**File:** `backend/incident_routes.py`  
**Prefix:** `/api/incidents`

Serves retail security incident data from the `incidents` table.

#### `GET /api/incidents/stats`
KPI summary:
- Total incidents, by severity, by type (top 15), by region
- Monthly trend for the last 12 months
- 5 most recent incidents

#### `GET /api/incidents`
Paginated, filterable incident list.
- Filters: `severity`, `type`, `region`, `date_from`, `date_to`, free-text `q`
- Sort options: `date` (default), `severity`, `type`

#### `GET /api/incidents/filters`
Distinct filter options: severities, incident types, regions.

#### `GET /api/incidents/recent`
Most recent incidents by date — feeds the Morning Brief widget. Limit 1–20.

**Severity Levels:** Critical → High → Medium → Low  
**Incident Types:** ORC, Cargo Theft, Carjacking, Cyber, Violence, Fraud, Data Breach, and more.

---

## 7. Database Layer

**File:** `backend/database.py`

#### `get_connection()`
Returns a SQLite connection with:
- `row_factory = sqlite3.Row` (dict-like column access)
- `timeout=30` seconds (prevents lock errors under concurrent load)
- `check_same_thread=False` (required for FastAPI thread pool)
- WAL journal mode (readers don't block writers)
- `PRAGMA busy_timeout=30000` and `PRAGMA synchronous=NORMAL`

#### `init_db()`
Creates all tables if they don't exist and runs safe column migrations on startup via the FastAPI `lifespan` context.

**Tables Created:**
- `vendors` — all vendor records
- `var_reports` — VAR assessment scores
- `vendor_highlights` — monthly assessment highlights
- `incidents` — retail security incidents
- `projects` — EST project portfolio
- `project_vendors` — vendors associated with projects (CASCADE delete)

---

## 8. Data Models

**File:** `backend/models.py` (Pydantic v2)

| Model | Purpose |
|---|---|
| `VendorProduct` | Single product entry (rating, status, URL, assessed date) |
| `VendorOut` | Full vendor record with all fields, products, VAR scores, linked projects |
| `VendorsResponse` | Paginated vendor list wrapper |
| `CategoriesResponse` | List of distinct categories |
| `VarReportOut` | Full VAR report with 8 dimension scores and decision band |
| `VarReportsResponse` | Paginated VAR report list wrapper |
| `HighlightOut` | Monthly assessment highlight record |
| `HighlightsResponse` | List of highlights |
| `ChatMessage` | Single message in AI chat history (role + text) |
| `ChatRequest` | AI chat request (message + history) |
| `ChatResponse` | AI chat response text |
| `FormResponse` | Assessment/lab form submission response with ref ID |
| `NdaEntry` | NDA record under a project (number, vendor, status, note) |
| `ComplianceEntry` | APM / ERPA / SSP record (number, vendor, status, note) |
| `ProjectVendor` | Vendor entry within a project (role, status, notes) |
| `ProjectVendorCreate` | Payload to add a vendor to a project |
| `ProjectVendorUpdate` | Partial update payload for a project vendor |
| `ProjectOut` | Full project record with compliance, phase history, vendor list |
| `ProjectsResponse` | List of all projects with total count |
| `ProjectUpdate` | Partial update payload for a project |
| `LinkedProject` | Project association shown on vendor cards |

**VAR Decision Bands:**
- **Advance:** Overall score > 4.0
- **Research Further:** 3.0 – 4.0
- **Defer:** 2.0 – 2.9
- **Reject:** < 2.0

**VAR Score Dimensions:** Compliance, Risk, Maturity, Integration, ROI, Viability, Differentiation, Cloud Dependency

---

## 9. Frontend — Application Shell

**File:** `App.tsx`

#### Root Component: `App`
- Manages `showLanding` state — starts on `LandingPage`, transitions to `AppShell` on enter
- Wraps everything in `ThemeProvider` and `VendorProvider` contexts
- Includes accessible skip-to-main-content link

#### `AppShell`
The main authenticated layout:
- **Sidebar** — navigation between all views
- **Header** — glassmorphic command bar with view title, subtitle, and backend status indicator (Online/Offline pulse)
- **Main content area** — renders the active view via `React.lazy` + `Suspense`
- **CommandPalette** — `Ctrl+K` / `Cmd+K` triggered keyboard navigation overlay
- **ChatAssistant** — floating SENTRY-AI panel (bottom-right), slides up/down with animation
- **Dismiss/restore logic** — chat can be dismissed to a ghost pill and restored

#### `VIEW_META`
Title and subtitle metadata for all 14 view states — rendered in the header bar.

#### `ViewSkeleton`
Loading fallback shown while lazy-loaded view chunks are fetching.

#### Keyboard Shortcuts
- `Ctrl+K` / `Cmd+K` — opens Command Palette

---

## 10. Frontend — Views & Modules

### `HomeDashboard`
- Morning brief card with live data from `/api/morning-brief`
- Stat tiles: vendor count, VAR count, incident count, regulatory red obligations
- Quick navigation CTAs to key modules
- 3D background element

### `VendorDashboard`
- Full vendor catalog with search, category filter, and pagination
- Vendor cards with risk badges, VAR availability indicators
- Vendor detail modal with full profile, all VAR scores, product list, assessment pipeline
- Stats panel: coverage, risk distribution, top categories

### `VendorDetailModal`
- Detailed view of a single vendor
- Tabs: Overview, VAR Scores (radar chart), Assessment Pipeline, Products, Linked Projects
- Download button for latest VAR `.docx`

### `ProjectDashboard3D`
- 3D visualization of the EST project portfolio (57KB — the largest component)
- 14 active projects displayed across 8 EST lifecycle phases
- Phase gates: Intake → VAR → Vendor Engagement → NDA → ROM/Technical → Lab Testing → APM/ERPA/SSP → Pilot/BAU
- Health indicators (green/amber/red), compliance badges, vendor counts
- Interactive 3D cards with depth and parallax effects

### `CompetitorAnalysis`
- Market comparison visualization of vendor performance metrics
- Navigates to `CompetitorIntelligence` for deep-dive

### `CompetitorIntelligence`
- Full competitor intelligence module — 1,100+ events
- Filterable event feed by competitor, category, month, free-text
- KPI tiles: total events, by category breakdown
- Monthly trend charts for top competitors
- Competitor entity cards with threat level badges

### `CompetitorIntel` / `CompetitorIntelAdmin`
- Admin-facing competitor event management — create, edit, delete events

### `CSOIntelligence`
- Executive security leadership competitive profiles
- Amazon, Target, Costco, Kroger CSO/CISO bios and strategic positioning
- Competitor threat assessment for executive briefings

### `RegulatoryIntelligence`
- 362 regulatory obligations across AI, Biometrics, ALPR, UAS, Data Privacy
- Filter by RAG band, tech category, jurisdiction, status
- `RegulatoryGlobe3D` — 3D globe visualization of obligations by jurisdiction
- `RegulatoryObligationModal` — full obligation detail (controls, evidence, risk scores, deadlines)

### `IncidentIntelligence`
- Retail security incident tracker
- Severity/type/region filters, date range selection, free-text search
- Charts: monthly trend, by severity, by type, by region
- Incident detail rows with summary, impact, recommended action

### `VendorRiskMap3D`
- 3D scatter plot of all vendors positioned by risk level and category
- Color-coded by risk: Critical (red) → High (orange) → Medium (yellow) → Low (green)
- Interactive — click vendor orbs to open detail

### `AdminPanel`
- VAR report management: list all VARs, filter scored/unscored, view scores
- Manual vendor linkage for mismatched VARs
- Single and batch score extraction triggers
- Vendor CRUD operations

### `ProjectAdminPanel`
- Manual project metadata editing — phase, health, lifecycle state
- Compliance ID management: NDA, APM, ERPA, SSP entries (multi-vendor support)
- Phase gate history log
- Vendor association management (add/edit/remove vendors per project)

### `RequestAssessment`
- GRC workflow intake form for new technology security assessments
- Submits to `POST /api/assessment`, returns reference ID

### `RequestLabVisit`
- Lab visit scheduling form for hands-on technology evaluation
- Submits to `POST /api/lab-visit`, returns reference ID

### `ArchitectureGraph`
- Static visualization of SENTRY's GCP four-phase architecture framework

### `LandingPage`
- Animated entry screen with 3D background (`LandingBackground3D`)
- "Enter SENTRY" CTA that transitions to the main app

---

## 11. Frontend — Shared Components

| Component | Function |
|---|---|
| `Sidebar` | Left-rail navigation — all 14 views, icons, active state, Cmd+K trigger |
| `ChatAssistant` | Floating SENTRY-AI chat panel — sends messages to `/api/chat`, renders markdown |
| `CommandPalette` | `Ctrl+K` command palette — fuzzy search across all views |
| `PageTransition` | Animated transition wrapper between views |
| `Pagination` | Reusable paginator component |
| `MorningBriefCard` | Home dashboard morning brief card widget |
| `VendorCard3D` | 3D-styled vendor card for grid display |
| `VendorStatsPanel` | Stats sidebar for the vendor directory |
| `VendorManager` | Vendor add/edit/remove interface (used in project admin) |
| `VendorOrb3D` | Individual vendor orb for the 3D risk map |
| `GlassCard3D` | Reusable glassmorphic 3D card wrapper |
| `MarketGlobe` | 3D globe component for geographic data (competitor/regulatory) |
| `CompetitorOrbital3D` | 3D orbital visualization of competitor entities |
| `CompetitorThreat3D` | 3D threat level chart for competitors |
| `CompetitorEventTable` | Filterable table of competitor events |
| `RegulatoryGlobe3D` | 3D globe for regulatory jurisdiction visualization |
| `RegulatoryObligationModal` | Full obligation detail modal |
| `ESTLifecycleTimeline` | EST 8-phase lifecycle timeline visualization |
| `Architecture3D` | 3D architecture diagram component |
| `PilotCards` | Vendor pilot cards display |
| `TechAssessmentTab` | Technology assessment tab within vendor detail |
| `LandingBackground3D` | Animated 3D particle background for landing page |
| `CSORadar3D` | 3D radar chart for CSO competitive positioning |

---

## 12. Frontend — Services & Context

### `services/api.ts`
Centralized API client — all fetch calls to the FastAPI backend.
- Functions for every backend endpoint: vendors, VAR reports, stats, chat, projects, competitors, regulatory, incidents, morning brief, admin operations
- Handles base URL configuration (localhost:8082 in dev, GCP URL in production)
- Type-safe return types aligned with backend Pydantic models

### `services/geminiService.ts`
Legacy Gemini AI integration stub (not actively used — superseded by Element LLM Gateway via `/api/chat`).

### `context/VendorContext.tsx`
- Global vendor state management (`VendorProvider`)
- Exposes `vendors`, `loading`, `backendOffline` flags to all components
- Polls backend health on startup to determine online/offline status

### `context/ThemeContext.tsx`
- Theme management (`ThemeProvider`)
- Exposes `reducedMotion` setting for accessibility (respects `prefers-reduced-motion`)

---

## 13. Data & Utilities

### `data/csoProfiles.ts`
Static profiles for competitor CSOs/CISOs — Amazon, Target, Costco, Kroger, and other major retailers. Includes bios, tenure, strategic priorities, and security positioning.

### `data/forecastData.ts`
Static market forecast data used by the architecture and market analysis views.

### `constants.ts`
Shared constants: API base URL, color palettes, category lists, risk level definitions, EST phase definitions, decision band thresholds.

### `utils/dataProcessor.ts`
Legacy local data processor — CSV parsing fallback when the backend is offline.

### `styles.css`
Global CSS: Walmart brand colors (blue `#0053E2`, spark yellow `#FFC220`), dark theme variables, glassmorphic card styles, animation keyframes (`animate-ping-ring`, `skip-nav`), scrollbar styling.

---

## 14. Database Schema Summary

### `vendors`
Core vendor records — ~1,931 rows.

| Column | Type | Description |
|---|---|---|
| id | TEXT PK | UUID |
| company_name | TEXT | Vendor company name |
| category | TEXT | Technology category |
| technology_product | TEXT | Specific product/solution |
| overall_rating | REAL | Composite score (0.0–5.0) |
| vendor_status | TEXT | Active / Inactive / Archived |
| risk_level | TEXT | Low / Medium / High / Critical |
| last_assessed | TEXT | ISO date of last assessment |
| deployment_status | TEXT | Prospect / Pilot / BAU / etc. |
| pros/cons/concerns | TEXT | Assessment notes |
| use_cases | TEXT | Identified Walmart use cases |
| value_to_walmart | TEXT | Strategic value statement |
| vendor_highlight | TEXT | Key highlight from latest assessment |
| maturity_level | TEXT | Technology maturity classification |

### `var_reports`
VAR (Vendor Assessment Report) score records.

| Column | Type | Description |
|---|---|---|
| id | TEXT PK | UUID |
| vendor_id | TEXT FK | Links to vendors |
| filename | TEXT | `.docx` filename |
| sharepoint_url | TEXT | SharePoint web URL |
| report_date | TEXT | Assessment date |
| overall_score | REAL | Overall VAR score (0.0–5.0) |
| decision_band | TEXT | Advance / Research Further / Defer / Reject |
| compliance_score | REAL | Compliance dimension score |
| risk_score | REAL | Risk dimension score |
| maturity_score | REAL | Maturity dimension score |
| integration_score | REAL | Integration dimension score |
| roi_score | REAL | ROI dimension score |
| viability_score | REAL | Viability dimension score |
| differentiation_score | REAL | Differentiation dimension score |
| cloud_dep_score | REAL | Cloud dependency dimension score |
| match_method | TEXT | manual / auto / fuzzy |

### `vendor_highlights`
Monthly tracker assessment highlights per vendor-product.

### `incidents`
Retail security incidents — ORC, cargo theft, cyber, violence, fraud.

| Key Columns | Description |
|---|---|
| incident_date | Event date |
| incident_type | Categorized type (ORC, Cargo Theft, Cyber, etc.) |
| severity | Critical / High / Medium / Low |
| location | Specific location |
| region | Geographic region |
| summary | Plain-language description |
| impact | Business impact |
| recommended_action | EST recommended response |

### `projects`
EST project portfolio — lifecycle, compliance, phase tracking.

| Key Columns | Description |
|---|---|
| project_id | Unique ID |
| lifecycle_state | active / rejected / discontinued |
| health | green / amber / red |
| current_phase | EST phase label |
| est_phase_index | Numeric phase (1–8) |
| nda_numbers | JSON array of NDA entries |
| apm_entries | JSON array of APM compliance entries |
| erpa_entries | JSON array of ERPA compliance entries |
| ssp_entries | JSON array of SSP compliance entries |
| phase_history | JSON array of phase gate records |

### `project_vendors`
Vendors associated with EST projects (many-to-many).

---

*Generated by Atlas 🐾 (Code Puppy) | March 26, 2026*
