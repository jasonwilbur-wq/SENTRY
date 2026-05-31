// ---------------------------------------------------------------------------
// Walmart self-positioning content for the Security Leadership view.
// Content-only (no JSX) so it is easy to update without touching components.
// Migrated from the legacy CSOIntelligence.tsx inline markup.
// ---------------------------------------------------------------------------

export interface WalmartPosition {
  name: string;
  title: string;
  scope: string[];
  strengths: Array<{ label: string; detail: string }>;
  gaps: Array<{ label: string; detail: string }>;
  opportunity: string;
}

export const WALMART_POSITION: WalmartPosition = {
  name: 'Jerrad Crabtree',
  title: 'SVP, Global Security & Chief Security Officer — Walmart',
  scope: ['Enterprise Protection', 'Threat Mgmt', 'Risk Intel', 'GSOC 24/7', 'Crisis Response'],
  strengths: [
    { label: 'Scale Advantage', detail: 'Largest retail security org globally' },
    { label: 'GSOC Operations', detail: '24/7 enterprise-wide monitoring' },
    { label: 'Convergence Model', detail: 'Physical + cyber + resilience' },
    { label: 'Global Reach', detail: 'International security operations' },
  ],
  gaps: [
    { label: 'Public Thought Leadership', detail: 'Amazon CSO dominates the industry narrative' },
    { label: 'Passwordless Auth', detail: 'Midway-style "no exceptions" identity program' },
    { label: 'AI-Driven Security', detail: 'Autonomous threat analysis capabilities' },
    { label: 'Insider Risk Detection', detail: 'DPRK-level hiring fraud defenses' },
  ],
  opportunity: 'Lead during competitor leadership transitions and AI-security inflection.',
};

export interface ActionColumn {
  horizon: string;
  tone: 'red' | 'yellow' | 'green';
  items: Array<{ label: string; detail: string }>;
}

export const RECOMMENDED_ACTIONS: ActionColumn[] = [
  {
    horizon: '🔥 IMMEDIATE (30 days)',
    tone: 'red',
    items: [
      { label: 'Launch Thought Leadership', detail: 'Publish a LinkedIn article / external POV' },
      { label: 'Accelerate Vendor Deals', detail: 'Leverage competitor leadership gaps' },
      { label: 'Benchmark Midway', detail: 'Assess passwordless auth posture' },
      { label: 'DPRK Screening', detail: 'Review hiring fraud detection controls' },
    ],
  },
  {
    horizon: '⚡ NEAR-TERM (90 days)',
    tone: 'yellow',
    items: [
      { label: 'Conference Circuit', detail: 'RSA, Black Hat speaking slots' },
      { label: 'AI Security POC', detail: 'Agentic threat analysis pilot' },
      { label: 'Fusion Center Upgrade', detail: 'Assess vs Target capabilities' },
      { label: 'Industry Partnerships', detail: 'Join CISA NSTAC' },
    ],
  },
  {
    horizon: '🎯 STRATEGIC (6–12 months)',
    tone: 'green',
    items: [
      { label: 'Security Brand', detail: 'Position Walmart as a thought leader' },
      { label: 'Zero Trust Rollout', detail: '"No exceptions" identity program' },
      { label: 'Talent Magnet', detail: 'Attract talent from Amazon / Target' },
      { label: 'Regulatory Influence', detail: 'Shape regulation via testimony' },
    ],
  },
];
