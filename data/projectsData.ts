// ═══════════════════════════════════════════════════════════════════════
// SENTRY Project Portfolio — canonical data
// Walmart Global Security · Emerging Technology
// ───────────────────────────────────────────────────────────────────────
// Single source of truth for the Project Portfolio view. Replaces the old
// fragile `fetch('/data/projects.csv')` flow which (a) 404'd in production
// because the CSV was never copied into public/, (b) crashed on quoted
// commas via naive line.split(','), and (c) duplicated a 1-project stub.
// Edit projects here — types keep us honest.
// ═══════════════════════════════════════════════════════════════════════

export type ProjectHealth = 'green' | 'yellow' | 'red';

export interface Project {
  project_id: string;
  project_name: string;
  summary: string;
  managing_unit: string;
  lifecycle_state: string;
  health: ProjectHealth;
  current_phase: string;
  risk_score: number;
  sensitivity: string;
  tags: string;
  progress_pct: number;
  next_milestone: string;
  next_due_date: string;
  blockers_count: number;
  last_update_at: string;
  last_update_by: string;
  est_cost: string;
}

export const PROJECTS: Project[] = [
  {
    project_id: 'PRJ-SECROBOT-2025',
    project_name: 'Security Robotics — Autonomous Sentry Patrols',
    summary:
      'Deploy autonomous security sentry robots to patrol Walmart parking lots and perimeters to enhance associate and customer safety (86% of incidents happen in parking lots).',
    managing_unit: 'Global Security — Enterprise Security Technology',
    lifecycle_state: 'ended',
    health: 'green',
    current_phase: 'Completed',
    risk_score: 3,
    sensitivity: 'confidential',
    tags: 'robotics;parking-lot-security;autonomous-patrol;physical-security;perimeter-security',
    progress_pct: 100,
    next_milestone: 'Program Closeout',
    next_due_date: '2026-06-30',
    blockers_count: 0,
    last_update_at: '2026-02-28T20:30:00Z',
    last_update_by: 'Cody.Smith@walmart.com',
    est_cost: '',
  },
  {
    project_id: 'PRJ-BWC-2025',
    project_name: 'Body-Worn Cameras (BWC) + Incident Reporting Metadata',
    summary:
      'Standardized incident reporting as an evidence program with sealed evidence packages (BWC + digital evidence), audit-grade chain-of-custody, tiered retention, and legal-hold execution.',
    managing_unit: 'Global Security — Asset Protection & Enterprise Security Technology',
    lifecycle_state: 'active',
    health: 'yellow',
    current_phase: 'Technical Assessment',
    risk_score: 5,
    sensitivity: 'confidential',
    tags: 'bwc;evidence-governance;chain-of-custody;incident-reporting;legal-hold;redaction;privacy;life-safety',
    progress_pct: 65,
    next_milestone: 'Privacy Impact Assessment (PIA) Completion',
    next_due_date: '2026-04-30',
    blockers_count: 1,
    last_update_at: '2026-02-28T21:00:00Z',
    last_update_by: 'Jason.Wilbur@walmart.com',
    est_cost: '',
  },
  {
    project_id: 'PRJ-CUAS-2025',
    project_name: 'Counter-UAS / Drone Detection (Detection & Intelligence Only)',
    summary:
      'Detect drones as a leading indicator for perimeter security — build a low-noise alert/evidence workflow for store and distribution center protection (detection-only, no interdiction).',
    managing_unit: 'Global Security — Enterprise Security Technology',
    lifecycle_state: 'on_hold',
    health: 'red',
    current_phase: 'Intake',
    risk_score: 3,
    sensitivity: 'confidential',
    tags: 'counter-uas;drone-detection;perimeter-security;rf-detection;passive-detection;pilot;physical-security',
    progress_pct: 40,
    next_milestone: 'Pilot Completion & Scale Decision',
    next_due_date: '2026-07-31',
    blockers_count: 0,
    last_update_at: '2026-02-28T21:30:00Z',
    last_update_by: 'Jason.Wilbur@walmart.com',
    est_cost: '',
  },
  {
    project_id: 'PRJ-IDENTITY-2026',
    project_name: 'Identity Hardening & Telemetry (Passkeys/MFA)',
    summary:
      'Harden identity authentication with passkeys/FIDO2 for the workforce and deploy comprehensive telemetry for risk-based MFA — targeting >90% workforce coverage and ~100% privileged users.',
    managing_unit: 'Global Security — Identity & Access Management',
    lifecycle_state: 'active',
    health: 'green',
    current_phase: 'Technical Assessment',
    risk_score: 3,
    sensitivity: 'confidential',
    tags: 'identity;mfa;passkeys;fido2;telemetry;authentication;zero-trust',
    progress_pct: 60,
    next_milestone: 'Entra ID Integration Architecture Finalized',
    next_due_date: '2026-05-31',
    blockers_count: 0,
    last_update_at: '2026-02-28T22:00:00Z',
    last_update_by: 'Jason.Wilbur@walmart.com',
    est_cost: '',
  },
  {
    project_id: 'PRJ-BOTDEF-2026',
    project_name: 'Bot/Abuse Defense (Customer + Internal)',
    summary:
      'Deploy bot detection and abuse defense for customer-facing and internal applications — targeting <0.01% insult rate with ATO reduction and scraping prevention.',
    managing_unit: 'Global Security — Application Security',
    lifecycle_state: 'active',
    health: 'green',
    current_phase: 'ROM',
    risk_score: 3,
    sensitivity: 'internal',
    tags: 'bot-defense;abuse-detection;ato-prevention;scraping;captcha;fraud',
    progress_pct: 50,
    next_milestone: 'Vendor Selection (Cloudflare vs DataDome)',
    next_due_date: '2026-05-15',
    blockers_count: 0,
    last_update_at: '2026-02-28T22:00:00Z',
    last_update_by: 'Jason.Wilbur@walmart.com',
    est_cost: '',
  },
  {
    project_id: 'PRJ-RETURNS-2026',
    project_name: 'Returns Fraud (Entity Resolution + Graph)',
    summary:
      'Deploy entity resolution and graph analytics to detect returns fraud rings — track loss prevented $ and precision/hit-rate with explainable AI.',
    managing_unit: 'Global Security — Loss Prevention & Fraud',
    lifecycle_state: 'active',
    health: 'green',
    current_phase: 'Technical Assessment',
    risk_score: 3,
    sensitivity: 'confidential',
    tags: 'returns-fraud;entity-resolution;graph-analytics;fraud-rings;loss-prevention',
    progress_pct: 55,
    next_milestone: 'Pilot Planning (Graph + Entity Resolution)',
    next_due_date: '2026-06-30',
    blockers_count: 0,
    last_update_at: '2026-02-28T22:00:00Z',
    last_update_by: 'Jason.Wilbur@walmart.com',
    est_cost: '',
  },
  {
    project_id: 'PRJ-SHRINK-2026',
    project_name: 'Shrink/TLog Analytics (Signal Fusion)',
    summary:
      'Deploy transaction-log analytics and signal fusion to detect shrink patterns — targeting alert-burden reduction and intervention success-rate improvement.',
    managing_unit: 'Global Security — Loss Prevention & Shrink',
    lifecycle_state: 'active',
    health: 'green',
    current_phase: 'ROM',
    risk_score: 3,
    sensitivity: 'confidential',
    tags: 'shrink;tlog-analytics;signal-fusion;loss-prevention;self-checkout',
    progress_pct: 45,
    next_milestone: 'ROM Finalization & Vendor Shortlist',
    next_due_date: '2026-05-31',
    blockers_count: 0,
    last_update_at: '2026-02-28T22:00:00Z',
    last_update_by: 'Jason.Wilbur@walmart.com',
    est_cost: '',
  },
  {
    project_id: 'PRJ-RETAILCV-2026',
    project_name: 'Retail CV (Edge Non-Biometric)',
    summary:
      'Deploy edge-based computer vision for retail events (non-biometric) — targeting <500ms latency and <5% FPR with >90% recall on verified events.',
    managing_unit: 'Global Security — Computer Vision & Analytics',
    lifecycle_state: 'active',
    health: 'yellow',
    current_phase: 'Technical Assessment',
    risk_score: 5,
    sensitivity: 'confidential',
    tags: 'retail-cv;computer-vision;edge-computing;non-biometric;privacy;video-analytics',
    progress_pct: 50,
    next_milestone: 'Vendor Selection & Privacy Scope Lock',
    next_due_date: '2026-06-30',
    blockers_count: 1,
    last_update_at: '2026-02-28T22:00:00Z',
    last_update_by: 'Jason.Wilbur@walmart.com',
    est_cost: '',
  },
  {
    project_id: 'PRJ-RFIDCOC-2026',
    project_name: 'RFID Chain-of-Custody (EPC as EAS)',
    summary:
      'Deploy RFID-based chain-of-custody tracking using EPC as electronic article surveillance — targeting exception precision and shrink-impact measurement.',
    managing_unit: 'Global Security — Loss Prevention & RFID',
    lifecycle_state: 'active',
    health: 'green',
    current_phase: 'ROM',
    risk_score: 4,
    sensitivity: 'confidential',
    tags: 'rfid;chain-of-custody;epc;eas;loss-prevention;behavioral-tracking',
    progress_pct: 40,
    next_milestone: 'Privacy Controls & Read Reliability Testing',
    next_due_date: '2026-07-31',
    blockers_count: 0,
    last_update_at: '2026-02-28T22:00:00Z',
    last_update_by: 'Jason.Wilbur@walmart.com',
    est_cost: '',
  },
  {
    project_id: 'PRJ-DURESS-2026',
    project_name: 'Retail Duress Response Analytics',
    summary:
      'Deploy duress response analytics to improve response time and reduce false-alarm rate while maintaining privacy compliance and minimizing surveillance optics.',
    managing_unit: 'Global Security — Duress & Emergency Response',
    lifecycle_state: 'blocked',
    health: 'red',
    current_phase: 'Intake',
    risk_score: 4,
    sensitivity: 'confidential',
    tags: 'duress;emergency-response;privacy;workforce-surveillance;panic-button',
    progress_pct: 10,
    next_milestone: 'Privacy Impact Assessment (PIA) REQUIRED',
    next_due_date: '2026-05-31',
    blockers_count: 1,
    last_update_at: '2026-02-28T22:00:00Z',
    last_update_by: 'Jason.Wilbur@walmart.com',
    est_cost: '',
  },
  {
    project_id: 'PRJ-EPCIS-2026',
    project_name: 'EPCIS 2.0 + Digital Product Passport',
    summary:
      'Implement EPCIS 2.0 and Digital Product Passport for supply-chain traceability — targeting supplier-onboarding time reduction and valid-event percentage improvement.',
    managing_unit: 'Global Security — Supply Chain Security',
    lifecycle_state: 'active',
    health: 'green',
    current_phase: 'Intake',
    risk_score: 2,
    sensitivity: 'internal',
    tags: 'epcis;digital-product-passport;supply-chain;traceability;gs1;sustainability',
    progress_pct: 25,
    next_milestone: 'MVP Architecture & Supplier Onboarding Plan',
    next_due_date: '2026-09-30',
    blockers_count: 0,
    last_update_at: '2026-02-28T22:00:00Z',
    last_update_by: 'Jason.Wilbur@walmart.com',
    est_cost: '',
  },
  {
    project_id: 'PRJ-UAS-2025',
    project_name: 'UAS — Drone-in-a-Box Security Solution',
    summary:
      'Deploy Drone-in-a-Box (DiaB) UAS across retail, home office, and supply chain sites to determine operational effectiveness for security response.',
    managing_unit: 'Global Security — Supply Chain Security',
    lifecycle_state: 'active',
    health: 'green',
    current_phase: 'Pilot',
    risk_score: 3,
    sensitivity: 'confidential',
    tags: 'uas;drone-in-a-box;diab;perimeter-security;pilot;physical-security',
    progress_pct: 35,
    next_milestone: 'Pilot Effectiveness Review',
    next_due_date: '2026-08-31',
    blockers_count: 0,
    last_update_at: '2026-02-28T22:00:00Z',
    last_update_by: 'Jason.Wilbur@walmart.com',
    est_cost: '',
  },
  {
    project_id: 'PRJ-MST-2025',
    project_name: 'Mobile Surveillance Trailer (MST)',
    summary:
      'Assess and test improved Mobile Surveillance Trailer options tuned for the Walmart store and lot environment.',
    managing_unit: 'Global Security — Supply Chain Security',
    lifecycle_state: 'active',
    health: 'green',
    current_phase: 'Lab Testing',
    risk_score: 2,
    sensitivity: 'internal',
    tags: 'mst;mobile-surveillance;parking-lot-security;physical-security;pilot',
    progress_pct: 30,
    next_milestone: 'Lab Testing & Option Comparison',
    next_due_date: '2026-08-31',
    blockers_count: 0,
    last_update_at: '2026-02-28T22:00:00Z',
    last_update_by: 'Jason.Wilbur@walmart.com',
    est_cost: '',
  },
];

// ── Derived portfolio summary (single source — no magic numbers in the UI) ──
export interface PortfolioSummary {
  total: number;
  green: number;
  yellow: number;
  red: number;
  active: number;
  blockers: number;
}

export function summarizePortfolio(projects: Project[] = PROJECTS): PortfolioSummary {
  return {
    total: projects.length,
    green: projects.filter((p) => p.health === 'green').length,
    yellow: projects.filter((p) => p.health === 'yellow').length,
    red: projects.filter((p) => p.health === 'red').length,
    active: projects.filter((p) => p.lifecycle_state === 'active').length,
    blockers: projects.reduce((sum, p) => sum + (p.blockers_count || 0), 0),
  };
}

// ── Live API integration ──────────────────────────────────────────
// The backend (GET /api/projects) is the source of truth in production. The
// static PROJECTS array above is a typed offline fallback so the 3D view still
// renders if the API is unreachable (dev without backend, transient network).

/** Coerce any backend health string into our normalized union. */
export function normalizeHealth(raw: unknown): ProjectHealth {
  const h = String(raw ?? '').toLowerCase().trim();
  if (h === 'green' || h === 'yellow' || h === 'red') return h;
  if (h === 'ok' || h === 'good' || h === 'healthy') return 'green';
  if (h === 'warn' || h === 'warning' || h === 'at-risk' || h === 'at_risk') return 'yellow';
  if (h === 'blocked' || h === 'critical' || h === 'danger') return 'red';
  return 'yellow';
}

/** Map one raw backend project record into our strict Project shape. */
export function mapApiProject(raw: Record<string, unknown>): Project {
  const str = (v: unknown, fallback = ''): string => (v == null ? fallback : String(v));
  const num = (v: unknown, fallback = 0): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    project_id: str(raw.project_id),
    project_name: str(raw.project_name),
    summary: str(raw.summary),
    managing_unit: str(raw.managing_unit),
    lifecycle_state: str(raw.lifecycle_state, 'active').toLowerCase().trim(),
    health: normalizeHealth(raw.health),
    current_phase: str(raw.current_phase, 'Intake'),
    risk_score: num(raw.risk_score),
    sensitivity: str(raw.sensitivity, 'internal'),
    tags: str(raw.tags),
    progress_pct: Math.max(0, Math.min(100, num(raw.progress_pct))),
    next_milestone: str(raw.next_milestone),
    next_due_date: str(raw.next_due_date),
    blockers_count: num(raw.blockers_count),
    last_update_at: str(raw.last_update_at),
    last_update_by: str(raw.last_update_by),
    est_cost: str(raw.est_cost),
  };
}

export interface LoadProjectsResult {
  projects: Project[];
  source: 'api' | 'fallback';
  error?: string;
}

/**
 * Load the portfolio from the live backend, falling back to the static dataset
 * on any failure. Never throws — always returns a usable list for the UI.
 */
export async function loadProjects(signal?: AbortSignal): Promise<LoadProjectsResult> {
  try {
    const res = await fetch('/api/projects', { signal });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = (await res.json()) as { projects?: unknown };
    const rows = Array.isArray(data.projects) ? data.projects : [];
    if (rows.length === 0) throw new Error('API returned no projects');
    return {
      projects: rows.map((r) => mapApiProject(r as Record<string, unknown>)),
      source: 'api',
    };
  } catch (err) {
    return {
      projects: PROJECTS,
      source: 'fallback',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
