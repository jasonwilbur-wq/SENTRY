/**
 * Forecast operating model data for SENTRY's executive decision cockpit.
 *
 * Research basis: synthesis of mature corporate strategy, intelligence, security,
 * and product-program forecasting practices. The product pattern is to convert
 * forecasts into traceable decisions, evidence confidence, quarter-over-quarter
 * deltas, and accountability loops rather than static reports.
 */
import type { EvidenceConfidence, ExecutivePosture } from './forecastData';

export type ForecastLens = 'All' | 'Life Safety' | 'Evidence' | 'AI' | 'Shrink / ORC' | 'Governance';
export type DeltaStatus = 'New' | 'Upgraded' | 'Carry-forward' | 'Constrained' | 'Watch';

export interface ForecastDecisionCard {
  id: string;
  title: string;
  lenses: ForecastLens[];
  posture: ExecutivePosture;
  confidence: EvidenceConfidence;
  deltaStatus: DeltaStatus;
  horizon: string;
  decisionAsk: string;
  whyItMatters: string;
  nextAction: string;
  owner: string;
  sourceBasis: string;
  openUnknowns: string;
  safeguards: string[];
}

export interface ForecastProgramPattern {
  title: string;
  summary: string;
  sentryProductMove: string;
}

export interface ForecastProductModule {
  name: string;
  executiveValue: string;
  sentryStatus: 'Live now' | 'Prototype now' | 'Next backend hardening';
  output: string;
}

export const FORECAST_LENSES: ForecastLens[] = [
  'All',
  'Life Safety',
  'Evidence',
  'AI',
  'Shrink / ORC',
  'Governance',
];

export const FORECAST_PROGRAM_PATTERNS: ForecastProgramPattern[] = [
  {
    title: 'Delta-first forecasting',
    summary: 'Mature programs lead with what changed since the last cycle, not a fresh static snapshot.',
    sentryProductMove: 'Quarter-to-quarter delta strip and persistent trend ledger model.',
  },
  {
    title: 'Decision-linked intelligence',
    summary: 'Forecasts are valuable when each signal maps to fund, pilot, hold, monitor, or escalate.',
    sentryProductMove: 'Decision cards with owner, horizon, next action, and executive ask.',
  },
  {
    title: 'Dual-axis scoring',
    summary: 'Evidence confidence and action posture stay separate so leaders can see certainty versus urgency.',
    sentryProductMove: 'Required posture and confidence fields on every executive card.',
  },
  {
    title: 'Calibration loop',
    summary: 'Strong forecast teams score past calls and show what converted into action or resolved differently.',
    sentryProductMove: 'Forecast accountability register for hit, miss, partial, decision status, and lessons learned.',
  },
  {
    title: 'Evidence sufficiency gates',
    summary: 'Decision-bearing claims get source tiering, conflict flags, assumptions, and unknowns surfaced.',
    sentryProductMove: 'Evidence drawer pattern with source basis, unresolved gaps, and governance safeguards.',
  },
];

export const FORECAST_DECISION_CARDS: ForecastDecisionCard[] = [
  {
    id: 'agentic-ai-assist',
    title: 'Governed agentic-AI assist for security operations',
    lenses: ['AI', 'Evidence', 'Governance'],
    posture: 'Yellow',
    confidence: 'Medium',
    deltaStatus: 'New',
    horizon: 'Now-30 days decision; 8-12 week pilot',
    decisionAsk: 'Approve a bounded pilot only for human-in-the-loop analyst assist.',
    whyItMatters: 'Forecast data shows AI can accelerate investigation synthesis while also increasing prompt-injection, leakage, hallucinated-action, and audit risk.',
    nextAction: 'Define allowed tasks, controlled data boundary, prompt-injection tests, reviewer gates, and zero-autonomous-action rule.',
    owner: 'GSSI Emerging Technology with AI Governance and Legal/Privacy partners',
    sourceBasis: 'Q2 forecast package: new AI-era pilot, AI threat/opportunity delta, evidence-authenticity pressure.',
    openUnknowns: 'Final data boundary, approved model/runtime, measurable analyst time-savings baseline, and formal AI governance intake status.',
    safeguards: ['Human approval required before action', 'Audit every AI recommendation', 'No autonomous customer or associate impact'],
  },
  {
    id: 'evidence-defensibility',
    title: 'Evidence and BWC media-authenticity hardening',
    lenses: ['Life Safety', 'Evidence', 'Governance'],
    posture: 'Green',
    confidence: 'High',
    deltaStatus: 'Upgraded',
    horizon: 'Now-30 days SOP update; 60-90 days control validation',
    decisionAsk: 'Fund/update the evidence SOP control set now.',
    whyItMatters: 'Synthetic media and chain-of-custody disputes can undermine investigations, litigation posture, associate safety review, and executive trust.',
    nextAction: 'Implement manifest/hash controls, access logs, retention/hold rules, export controls, and authenticity-review workflow.',
    owner: 'Global Security investigations/evidence program with Legal and Records partners',
    sourceBasis: 'Q2 forecast elevated evidence authenticity and defensibility as a keystone control.',
    openUnknowns: 'Current manifest completeness, BWC metadata baseline, legal hold SLA, and export workflow maturity.',
    safeguards: ['Preserve original evidence', 'Separate authenticity review from investigative conclusions', 'Track retention and legal hold exceptions'],
  },
  {
    id: 'bot-ai-agent-traffic',
    title: 'Bot defense reassessment against AI-agent traffic',
    lenses: ['AI', 'Shrink / ORC', 'Governance'],
    posture: 'Yellow',
    confidence: 'Medium',
    deltaStatus: 'Upgraded',
    horizon: 'Before peak traffic planning',
    decisionAsk: 'Commission reassessment of bot controls against AI-agent ambiguity.',
    whyItMatters: 'AI-agent traffic changes abuse economics and raises false-positive, customer-friction, fraud, and operational-resilience risk.',
    nextAction: 'Baseline challenge friction, insult rate, AI-agent classification drift, ATO indicators, and abuse economics before peak periods.',
    owner: 'Cyber/security engineering with fraud, eCommerce, and customer-experience stakeholders',
    sourceBasis: 'Q2 forecast: bot/abuse defense reassessment added as a new AI-era priority.',
    openUnknowns: 'Current AI-agent traffic taxonomy, vendor data reuse boundaries, and internal false-positive thresholds.',
    safeguards: ['Measure customer insult rate', 'Do not block on opaque model signal alone', 'Maintain appeal/escalation path for adverse impacts'],
  },
  {
    id: 'orc-shrink-benchmark',
    title: 'ORC and shrink benchmark decision layer',
    lenses: ['Shrink / ORC', 'Life Safety', 'Evidence'],
    posture: 'Yellow',
    confidence: 'High',
    deltaStatus: 'Carry-forward',
    horizon: '60-90 day baseline and executive readout',
    decisionAsk: 'Approve scoped internal-vs-peer benchmark only if leadership wants a comparison view.',
    whyItMatters: 'Q2 shows ORC remains broad while some peer shrink signals are easing, so leadership needs cleaner Walmart-specific measurement before scaling claims.',
    nextAction: 'Tie fraud graph, returns abuse, incident, and TLog signals to a repeatable benchmark with assumptions and limits explicit.',
    owner: 'GSSI analytics with asset protection, finance, and fraud partners',
    sourceBasis: 'Q2 forecast: ORC named risk across 27 U.S. retail issuers and peer shrink bifurcation.',
    openUnknowns: 'Comparable internal shrink definitions, peer reporting comparability, and validated operational lift.',
    safeguards: ['Avoid false precision in peer comparisons', 'Separate ORC risk from general shrink', 'Document data-quality limits'],
  },
  {
    id: 'drone-detection-only',
    title: 'Drone detection and facility protection readiness',
    lenses: ['Life Safety', 'Governance', 'Evidence'],
    posture: 'Yellow',
    confidence: 'High',
    deltaStatus: 'Carry-forward',
    horizon: 'Now-90 days feasibility at priority sites',
    decisionAsk: 'Hold to detection/intelligence-only and pursue lawful readiness path.',
    whyItMatters: 'Drone detections can become pre-incident intelligence for DCs/FCs, but active mitigation/defeat creates legal, safety, and authority risk.',
    nextAction: 'Pilot low-noise detection workflow, evidence handoff, escalation paths, and fixed-site restriction/readiness review.',
    owner: 'GSSI with Aviation, Legal, facility leadership, and incident-response partners',
    sourceBasis: 'Q2 forecast: FAA/FCC movement and fixed-site pathway increase detection relevance; active defeat remains constrained.',
    openUnknowns: 'Priority site list, nuisance alert thresholds, response owner, and lawful site-readiness path.',
    safeguards: ['No active mitigation/defeat posture', 'Route vendor claims through Aviation/Legal', 'Evidence workflow before operational response'],
  },
  {
    id: 'biometric-cv-constraint',
    title: 'Biometric CV / face-recognition expansion constraint',
    lenses: ['Life Safety', 'Governance', 'Evidence'],
    posture: 'Red',
    confidence: 'High',
    deltaStatus: 'Constrained',
    horizon: 'No expansion pending formal review',
    decisionAsk: 'Maintain no-expansion posture unless Legal/Privacy and executive risk review explicitly clear a narrow use case.',
    whyItMatters: 'Biometric expansion carries litigation, trust, regulatory, purpose-limitation, and surveillance-optics risk at Walmart scale.',
    nextAction: 'Keep non-biometric CV pilots narrowly scoped with redaction, parity testing, and explicit non-identification boundaries.',
    owner: 'Legal/Privacy decision rights with GSSI and workforce/customer trust partners',
    sourceBasis: 'Q2 forecast reinforces Q1 caution on biometrics and face-ID expansion.',
    openUnknowns: 'Jurisdiction-by-jurisdiction requirements, purpose limitation, notice/consent requirements, and retention controls.',
    safeguards: ['Do not normalize face-ID as routine retail practice', 'Require explicit purpose limitation', 'Document privacy impact and executive risk acceptance'],
  },
];

export const FORECAST_PRODUCT_MODULES: ForecastProductModule[] = [
  {
    name: 'Persistent Trend Ledger',
    executiveValue: 'Gives SENTRY memory across quarters: new, upgraded, downgraded, carry-forward, retired.',
    sentryStatus: 'Prototype now',
    output: 'Stable trend IDs and quarter-diff narrative.',
  },
  {
    name: 'Decision Board',
    executiveValue: 'Turns forecast signals into approve, fund, pilot, hold, monitor, or escalate decisions.',
    sentryStatus: 'Live now',
    output: 'Filtered executive cards with owner, horizon, ask, confidence, and next action.',
  },
  {
    name: 'Evidence Drawer',
    executiveValue: 'Lets leaders challenge the basis for a recommendation without reading the full source pack.',
    sentryStatus: 'Live now',
    output: 'Source basis, unknowns, safeguards, and confidence label per card.',
  },
  {
    name: 'Forecast Accountability Register',
    executiveValue: 'Scores past calls and tracks whether recommendations converted into decisions.',
    sentryStatus: 'Next backend hardening',
    output: 'Hit, miss, partial, decision status, and lessons learned by quarter.',
  },
  {
    name: 'Boardroom Brief Mode',
    executiveValue: 'Compresses the same data into a five-minute CSO review surface.',
    sentryStatus: 'Prototype now',
    output: 'Quarter in one view: what changed, what needs decision, what is constrained.',
  },
];

export const FORECAST_ACCOUNTABILITY_LOOP = [
  'Collect signals from forecast, competitor, regulatory, incident, vendor, and evidence programs.',
  'Classify every judgment as confirmed, inferred, assumed, or unknown with confidence drivers.',
  'Attach each material signal to a decision ask, owner, horizon, and governance gate.',
  'Track whether leadership funded, piloted, held, escalated, or rejected the recommendation.',
  'Resolve the forecast later as hit, miss, partial, or still open and feed lessons into the next quarter.',
];
