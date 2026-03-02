/**
 * SENTRY Framework Manager — static constants.
 *
 * RAW_CSV_DATA and SENTRY_FRAMEWORK_TEXT have been moved:
 *   - CSV data        → served by FastAPI backend via /api/vendors
 *   - Framework text  → FastAPI backend uses it as Gemini system prompt
 *
 * Architecture 3D graph data lives here (pure UI config, belongs in frontend).
 * PhaseNode is kept for backwards-compat with types.ts.
 */
import { PhaseNode } from './types';

// ── Legacy D3 tree (kept for type compatibility) ──────────────────────────────
export const ARCHITECTURE_TREE_DATA: PhaseNode = {
  name: 'SENTRY Framework',
  children: [
    { name: 'Phase I: Data',         children: [{ name: 'Schema & Taxonomy' }, { name: 'Entity Resolution' }, { name: 'SQLite (SOR)' }] },
    { name: 'Phase II: Architecture', children: [{ name: 'FastAPI Backend' }, { name: 'Cloud Run' }, { name: 'VPC Connector' }] },
    { name: 'Phase III: Security',   children: [{ name: 'IAP (Zero Trust)' }, { name: 'Cloud KMS' }, { name: 'Audit Logging' }] },
    { name: 'Phase IV: Pipeline',    children: [{ name: 'Cloud Storage' }, { name: 'ETL Functions' }, { name: 'Pub/Sub Sync' }] },
  ],
};

// ── 3D Architecture Graph ─────────────────────────────────────────────────────

export interface ArchNode {
  id: string;
  label: string;
  layer: 0 | 1 | 2 | 3 | 4 | 5;
  desc: string;
  tech: string;
  size?: number;       // multiplier, default 1.0
  angleFrac?: number;  // 0–1 override for exact placement
}

export interface ArchEdge {
  from: string;
  to: string;
}

/** Layer metadata */
export const ARCH_LAYERS = [
  { id: 0, label: 'SENTRY Core',        color: '#FFC220', y: 18  },
  { id: 1, label: 'Frontend Stack',     color: '#0053e2', y: 10  },
  { id: 2, label: 'App Modules',        color: '#22c55e', y: 1   },
  { id: 3, label: 'Backend API',        color: '#f97316', y: -8  },
  { id: 4, label: 'Data Layer',         color: '#a78bfa', y: -16 },
  { id: 5, label: 'External Services',  color: '#06b6d4', y: -22 },
] as const;

export const ARCH_NODES: ArchNode[] = [
  // ── Layer 0: Core ─────────────────────────────────────────────────────────
  { id: 'core',       label: 'SENTRY',          layer: 0, size: 2.2,
    desc: 'Enterprise Security Emerging-tech Node Tracking & Review. Central intelligence platform for Walmart\'s ET Security team.',
    tech: 'React 19 · FastAPI · SQLite · Three.js · Tailwind v4' },

  // ── Layer 1: Frontend Stack ────────────────────────────────────────────────
  { id: 'react',      label: 'React 19',         layer: 1, size: 1.3,
    desc: 'UI framework with concurrent rendering, server components support, and fine-grained state management via Context.',
    tech: 'React 19.2 · TypeScript 5.8 · Vite 6.4' },
  { id: 'threejs',    label: 'Three.js',          layer: 1, size: 1.3,
    desc: 'WebGL 3D rendering engine powering all orbital scenes, globes, radars, and constellation visualizations.',
    tech: 'Three.js 0.183 · WebGL · ACESFilmic TMO' },
  { id: 'tailwind',   label: 'Tailwind v4',       layer: 1,
    desc: 'Utility-first CSS with Walmart brand tokens (blue #0053e2, spark #FFC220). Lightning-fast HMR via Vite plugin.',
    tech: '@tailwindcss/vite 4.2 · PostCSS' },
  { id: 'recharts',   label: 'Recharts / D3',     layer: 1,
    desc: 'Declarative chart library for risk donuts, category bars, competitor trend lines, and regulatory breakdowns.',
    tech: 'Recharts 3.6 · D3 7.9' },
  { id: 'framer',     label: 'Framer Motion',     layer: 1,
    desc: 'Physics-based animations for page transitions, card entrances, and modal overlays.',
    tech: 'Framer Motion 12.34' },

  // ── Layer 2: App Modules ───────────────────────────────────────────────────
  { id: 'vendor',     label: 'Vendor Directory',  layer: 2, size: 1.2,
    desc: '2,086 vendors · 1,349 VARs · 45.3% coverage. Filter by category, risk level, and search. GlassCard3D grid with animated score rings.',
    tech: 'VendorDashboard · VendorCard3D · VendorStatsPanel · VendorOrb3D' },
  { id: 'projects',   label: 'Project Dashboard', layer: 2, size: 1.1,
    desc: 'Active pilot tracking with 3D orbital visualization. Each project is a glowing orb with phase progress and status.',
    tech: 'ProjectDashboard3D · R3F Canvas · Orbital mechanics' },
  { id: 'competitor', label: 'Competitor Intel',  layer: 2, size: 1.1,
    desc: '1,071 events across 124 competitors. Heatmap, trend lines, and 3D threat constellation. Competitor Orbital 3D hero.',
    tech: 'CompetitorIntelligence · CompetitorThreat3D · CompetitorOrbital3D' },
  { id: 'cso',        label: 'CSO Intelligence',  layer: 2,
    desc: 'Competitor executive tracking. 6 CSO profiles (Amazon, Kroger, Target, AWS). 3D radar sweep with threat ring classification.',
    tech: 'CSOIntelligence · CSORadar3D · Raycaster tooltips' },
  { id: 'regulatory', label: 'Regulatory Intel',  layer: 2,
    desc: '362 obligations across 57 jurisdictions. RAG risk scoring, globe visualization, and obligation detail modal.',
    tech: 'RegulatoryIntelligence · RegulatoryGlobe3D · 24 lat/lon nodes' },
  { id: 'analysis',   label: 'Market Analysis',   layer: 2,
    desc: 'MarketGlobe 3D with tech-category nodes, forecast charts, pilot pipeline, and vendor analytics.',
    tech: 'CompetitorAnalysis · MarketGlobe · Recharts forecast' },
  { id: 'admin',      label: 'Admin Panel',       layer: 2,
    desc: 'VAR score extraction, vendor–VAR linking, bulk import, competitor event CRUD. Backend management interface.',
    tech: 'AdminPanel · CompetitorIntelAdmin · extract_scores.py' },
  { id: 'chat',       label: 'AI Chat',           layer: 2,
    desc: 'Contextual AI assistant powered by Element LLM Gateway. Answers questions about the vendor portfolio.',
    tech: 'ChatAssistant · Element LLM Gateway · Streaming SSE' },

  // ── Layer 3: Backend API ───────────────────────────────────────────────────
  { id: 'fastapi',    label: 'FastAPI',           layer: 3, size: 1.3,
    desc: 'Python 3.12 REST API. 20+ endpoints, auto-generated OpenAPI docs, CORS, SQLite connection pooling.',
    tech: 'FastAPI · Uvicorn · Pydantic v2 · Python 3.12' },
  { id: 'vendor-api', label: 'Vendor API',        layer: 3,
    desc: '/api/vendors — search, filter, paginate 2,086 vendors. /api/stats — live KPI aggregation.',
    tech: 'GET /api/vendors · /api/stats · /api/vendors/{id}' },
  { id: 'var-api',    label: 'VAR API',           layer: 3,
    desc: '/api/var-reports — 1,349 VAR documents. Score extraction, vendor linking, SharePoint URL tracking.',
    tech: 'GET /api/var-reports · /api/vars/download/{id}' },
  { id: 'comp-api',   label: 'Competitor API',    layer: 3,
    desc: '/api/competitors/* — events, entities, monthly trends, heatmap matrix. Cascaded delete, admin CRUD.',
    tech: 'GET /api/competitors/stats · /events · /heatmap' },
  { id: 'reg-api',    label: 'Regulatory API',    layer: 3,
    desc: '/api/regulatory/* — 362 obligations with RAG scores, jurisdiction grouping, obligation detail.',
    tech: 'GET /api/regulatory/summary · /obligations' },

  // ── Layer 4: Data ──────────────────────────────────────────────────────────
  { id: 'sqlite',     label: 'SQLite (sentry.db)', layer: 4, size: 1.3,
    desc: 'Primary datastore. Tables: vendors, var_reports, competitor_entities, competitor_events, regulatory_obligations.',
    tech: 'SQLite 3 · Row factory · WAL mode · Foreign keys' },
  { id: 'var-docs',   label: 'VAR Documents',     layer: 4,
    desc: '1,349 DOCX VAR report files. Stored on SharePoint, indexed by vendor_id + filename in SQLite.',
    tech: 'SharePoint URLs · DOCX · extract_scores.py (python-docx)' },
  { id: 'json-data',  label: 'JSON / CSV Data',   layer: 4,
    desc: 'Regulatory briefing JSON (11k+ rows), competitor events CSV, vendor tracker CSV. ETL via import scripts.',
    tech: 'backend/data/ · build_regulatory_report.py · import_competitors.py' },
  { id: 'comp-db',    label: 'Competitor Events', layer: 4,
    desc: '1,071 events across 124 entities after cleanup. Categories: Cyber, ORC/Theft, Recall, Legal, Tech, Strategic.',
    tech: 'competitor_entities · competitor_events · CASCADE DELETE' },

  // ── Layer 5: External ──────────────────────────────────────────────────────
  { id: 'sharepoint', label: 'SharePoint / OneDrive', layer: 5,
    desc: 'Walmart internal document store. Source of all VAR DOCX files, Emerging Tech Tracker Excel, and NDA tracking.',
    tech: 'teams.wal-mart.com · OneDrive sync · ET Security site' },
  { id: 'element-llm',label: 'Element LLM Gateway',   layer: 5, size: 1.1,
    desc: 'Walmart\'s internal AI gateway. Keeps all data inside Eagle/VPN. Powers Chat Assistant. #element-genai-support on Slack.',
    tech: 'Element LLM Gateway · OpenAI-compatible API · Eagle WiFi' },
  { id: 'firebase',   label: 'Firebase Hosting',      layer: 5,
    desc: 'Static frontend hosting with CDN. CI/CD via Cloud Build. Preview channels for feature branches.',
    tech: 'Firebase Hosting · Cloud Build · Artifact Registry' },
];

export const ARCH_EDGES: ArchEdge[] = [
  // Core → Frontend
  { from: 'core', to: 'react' }, { from: 'core', to: 'threejs' },
  { from: 'core', to: 'tailwind' }, { from: 'core', to: 'recharts' }, { from: 'core', to: 'framer' },
  // Frontend → Modules
  { from: 'react', to: 'vendor' }, { from: 'react', to: 'projects' }, { from: 'react', to: 'competitor' },
  { from: 'react', to: 'cso' }, { from: 'react', to: 'regulatory' }, { from: 'react', to: 'analysis' },
  { from: 'react', to: 'admin' }, { from: 'react', to: 'chat' },
  { from: 'threejs', to: 'projects' }, { from: 'threejs', to: 'competitor' },
  { from: 'threejs', to: 'cso' }, { from: 'threejs', to: 'regulatory' }, { from: 'threejs', to: 'analysis' },
  { from: 'recharts', to: 'vendor' }, { from: 'recharts', to: 'competitor' }, { from: 'recharts', to: 'analysis' },
  // Modules → API
  { from: 'vendor', to: 'vendor-api' }, { from: 'vendor', to: 'fastapi' },
  { from: 'competitor', to: 'comp-api' }, { from: 'cso', to: 'comp-api' },
  { from: 'regulatory', to: 'reg-api' },
  { from: 'admin', to: 'vendor-api' }, { from: 'admin', to: 'var-api' }, { from: 'admin', to: 'comp-api' },
  { from: 'chat', to: 'fastapi' }, { from: 'chat', to: 'element-llm' },
  { from: 'projects', to: 'fastapi' }, { from: 'analysis', to: 'comp-api' }, { from: 'analysis', to: 'vendor-api' },
  // API → Data
  { from: 'fastapi', to: 'sqlite' },
  { from: 'vendor-api', to: 'sqlite' }, { from: 'var-api', to: 'sqlite' },
  { from: 'comp-api', to: 'sqlite' }, { from: 'comp-api', to: 'comp-db' },
  { from: 'reg-api', to: 'sqlite' }, { from: 'reg-api', to: 'json-data' },
  { from: 'var-api', to: 'var-docs' },
  // Data → External
  { from: 'var-docs', to: 'sharepoint' },
  { from: 'sqlite', to: 'json-data' },
  { from: 'fastapi', to: 'firebase' },
];