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