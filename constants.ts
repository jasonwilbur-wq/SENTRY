/**
 * SENTRY Framework Manager — static constants.
 *
 * RAW_CSV_DATA and SENTRY_FRAMEWORK_TEXT have been moved:
 *   - CSV data        → served by FastAPI backend via /api/vendors
 *   - Framework text  → FastAPI backend uses it as Gemini system prompt
 *
 * The only thing that still lives here is the D3 architecture tree,
 * since it is pure UI config (not data) and belongs in the frontend.
 */
import { PhaseNode } from './types';

export interface ArchLayer {
  name: string;
  label: string;
  y: number;
  color: string;
}

export interface ArchNode {
  id: string;
  label: string;
  layer: number;
  description: string;
  size?: number;
  angleFrac?: number;
}

export interface ArchEdge {
  from: string;
  to: string;
}

export const ARCH_LAYERS: ArchLayer[] = [
  { name: 'Core', label: 'Core', y: 0, color: '#FFC220' },
  { name: 'Experience', label: 'Experience', y: 5, color: '#60a5fa' },
  { name: 'Intelligence Modules', label: 'Intelligence Modules', y: 0, color: '#2a8703' },
  { name: 'API Services', label: 'API Services', y: -5, color: '#a78bfa' },
  { name: 'Data Stores', label: 'Data Stores', y: -10, color: '#fb923c' },
  { name: 'External Signals', label: 'External Signals', y: -15, color: '#ef4444' },
];

export const ARCH_NODES: ArchNode[] = [
  { id: 'sentry', label: 'SENTRY', layer: 0, description: 'Executive risk intelligence hub.', size: 1.5 },
  { id: 'react-ui', label: 'React UI', layer: 1, description: 'Primary frontend experience.' },
  { id: 'admin', label: 'Admin Console', layer: 1, description: 'Operational admin and review workflows.' },
  { id: 'vendors', label: 'Vendor Risk', layer: 2, description: 'Vendor directory, VAR scoring, and assessment operations.' },
  { id: 'projects', label: 'Projects', layer: 2, description: 'Lifecycle and vendor linkage management.' },
  { id: 'competitors', label: 'Competitor Intel', layer: 2, description: 'Competitor signals, scoring, and CSO candidates.' },
  { id: 'cso', label: 'CSO Briefs', layer: 2, description: 'Human-reviewed executive briefing workflow.' },
  { id: 'regulatory', label: 'Regulatory Intel', layer: 2, description: 'Regulatory obligations and geo intelligence.' },
  { id: 'incidents', label: 'Incidents', layer: 2, description: 'Retail incident intelligence.' },
  { id: 'fastapi', label: 'FastAPI', layer: 3, description: 'Backend API gateway and route orchestration.', size: 1.2 },
  { id: 'auth', label: 'Auth', layer: 3, description: 'Header/off/admin auth enforcement.' },
  { id: 'sqlite', label: 'SQLite', layer: 4, description: 'Local persistence and lightweight operational store.', size: 1.1 },
  { id: 'vendor-files', label: 'Assessment Files', layer: 5, description: 'Assessment documents and extracted VAR evidence.' },
  { id: 'market-data', label: 'Market Data', layer: 5, description: 'Competitor, incident, and regulatory source feeds.' },
];

export const ARCH_EDGES: ArchEdge[] = [
  { from: 'sentry', to: 'react-ui' },
  { from: 'react-ui', to: 'admin' },
  { from: 'react-ui', to: 'vendors' },
  { from: 'react-ui', to: 'projects' },
  { from: 'react-ui', to: 'competitors' },
  { from: 'react-ui', to: 'cso' },
  { from: 'react-ui', to: 'regulatory' },
  { from: 'react-ui', to: 'incidents' },
  { from: 'vendors', to: 'fastapi' },
  { from: 'projects', to: 'fastapi' },
  { from: 'competitors', to: 'fastapi' },
  { from: 'cso', to: 'fastapi' },
  { from: 'regulatory', to: 'fastapi' },
  { from: 'incidents', to: 'fastapi' },
  { from: 'admin', to: 'auth' },
  { from: 'fastapi', to: 'auth' },
  { from: 'fastapi', to: 'sqlite' },
  { from: 'sqlite', to: 'vendor-files' },
  { from: 'sqlite', to: 'market-data' },
];

export const ARCHITECTURE_TREE_DATA: PhaseNode = {
  name: 'SENTRY Framework',
  children: [
    {
      name: 'Phase I: Data',
      children: [
        { name: 'Schema & Taxonomy' },
        { name: 'Entity Resolution (Golden Record)' },
        { name: 'Cloud SQL / AlloyDB (SOR)' },
      ],
    },
    {
      name: 'Phase II: Architecture',
      children: [
        { name: 'Cloud Run (Compute)' },
        { name: 'VPC Connector' },
        { name: 'Secret Manager' },
      ],
    },
    {
      name: 'Phase III: Security',
      children: [
        { name: 'IAP (Zero Trust)' },
        { name: 'Cloud Build (CI/CD)' },
        { name: 'Artifact Registry' },
        { name: 'Binary Auth' },
        { name: 'Cloud KMS (CMEK)' },
        { name: 'Cloud Logging & Monitoring' },
      ],
    },
    {
      name: 'Phase IV: Pipeline',
      children: [
        { name: 'Cloud Storage (Ingest)' },
        { name: 'Cloud Functions (ETL)' },
        { name: 'Pub/Sub (Real-time Sync)' },
        { name: 'Pipeline Monitoring' },
      ],
    },
  ],
};