/**
 * Q2 2026 Security Technology Forecast data.
 * Sources:
 * - WMT_ES_Q2_Security_Technology_Forecast_Master_v2.docx
 * - WMT_ES_Q2 Security Technology Forecast.docx
 * - Q2_Physical_Security_Tech_Forecast_Exec_Summary_v1.docx
 * - Q2_README.md
 * Prepared by Jason Wilbur, June 2026 | v2.0 consolidated review draft
 */

export type ExecutivePosture = 'Green' | 'Yellow' | 'Red';
export type EvidenceConfidence = 'High' | 'Medium' | 'Low';

export interface ForecastMeta {
  quarter: string;
  status: string;
  audience: string;
  classification: string;
  preparedBy: string;
  sourcePackage: string;
  executiveThesis: string;
}

export const FORECAST_META: ForecastMeta = {
  quarter: 'Q2 2026',
  status: 'Consolidated Master v2.0 · Review Draft · As of June 2026',
  audience: 'CSO / GSSI leadership decision briefing',
  classification: 'Internal Use Only — need-to-know within Walmart Global Security, Aviation & Investigations',
  preparedBy: 'Jason Wilbur, Sr. Security Manager — Emerging Security Technology',
  sourcePackage: 'Q2 forecast package in OneDrive Forecast folder',
  executiveThesis:
    'Q2 does not reset the Q1 forecast; it hardens it. AI now sits on both sides of the ledger: a force multiplier for investigations and fraud analysis, and a new attack surface for bot ambiguity, prompt injection, autonomous-action error, and synthetic-media authenticity challenges.',
};

export interface TechCategory {
  name: string;
  shortName: string;
  timeToValue: string;
  deployability: 'High' | 'Medium' | 'Low';
  sensitivity: 'Low' | 'Medium' | 'Medium-High' | 'High';
  minCostK: number;  // thousands USD; Q1 ranges carried forward unless noted
  maxCostK: number;
  primaryRisk: string;
  color: string;
  phase: 0 | 1 | 2;  // 0=now, 1=6-12mo, 2=6-24mo
  posture: ExecutivePosture;
  evidenceConfidence: EvidenceConfidence;
  q2Delta: string;
  recommendedAction: string;
  investmentNote?: string;
}

export const TECH_CATEGORIES: TechCategory[] = [
  {
    name: 'Evidence / Incident Program + BWC Metadata (Anti-Deepfake Hardened)',
    shortName: 'Evidence SOPs',
    timeToValue: '0–6 months',
    deployability: 'High',
    sensitivity: 'High',
    minCostK: 50, maxCostK: 200,
    primaryRisk: 'Discovery, spoliation, authenticity disputes, retention/hold gaps',
    color: '#f97316',
    phase: 0,
    posture: 'Green',
    evidenceConfidence: 'High',
    q2Delta: 'Elevated by synthetic-media authenticity risk; evidence defensibility becomes a keystone control.',
    recommendedAction: 'Update incident/evidence SOPs for manifesting, hashes, access logs, retention/holds, export control, and media-authenticity review.',
  },
  {
    name: 'Identity Hardening & Telemetry (Passkeys / Method-Level MFA)',
    shortName: 'Identity',
    timeToValue: '0–6 months',
    deployability: 'High',
    sensitivity: 'Medium',
    minCostK: 100, maxCostK: 350,
    primaryRisk: 'Telemetry over-collection; friction regressions',
    color: '#0053e2',
    phase: 0,
    posture: 'Green',
    evidenceConfidence: 'High',
    q2Delta: 'Persistent Q1 priority; supports AI-era fraud, bot, and privileged-flow resilience.',
    recommendedAction: 'Continue passkey/FIDO2 and method-level telemetry path with privacy-minimized analytics.',
  },
  {
    name: 'OT / Robotics Telemetry Security',
    shortName: 'OT/Robotics',
    timeToValue: '0–6 months',
    deployability: 'High',
    sensitivity: 'Medium-High',
    minCostK: 200, maxCostK: 800,
    primaryRisk: 'Safety-stop DoS; vendor remote access; weak incident handoff',
    color: '#22c55e',
    phase: 0,
    posture: 'Green',
    evidenceConfidence: 'Medium',
    q2Delta: 'Automation growth increases cyber-physical dependency; telemetry and remote-access controls remain foundational.',
    recommendedAction: 'Advance segmentation, logging, remote-access governance, SBOM posture, patching cadence, and incident handoff readiness.',
  },
  {
    name: 'Governed Agentic-AI Security Ops Assist',
    shortName: 'Agentic AI',
    timeToValue: '0–6 months',
    deployability: 'Medium',
    sensitivity: 'High',
    minCostK: 50, maxCostK: 250,
    primaryRisk: 'Prompt injection, hallucinated action, data leakage, uncontrolled autonomy',
    color: '#a78bfa',
    phase: 0,
    posture: 'Yellow',
    evidenceConfidence: 'Medium',
    q2Delta: 'New Q2 AI-era pilot: potential analyst force multiplier if constrained to human-in-the-loop workflows.',
    recommendedAction: 'Approve only a bounded 8–12 week pilot with controlled data, reviewer gates, AI-action audit, and zero autonomous customer/associate action.',
    investmentNote: 'Planning estimate; Q2 source specifies bounded pilot scope but not a final budget.',
  },
  {
    name: 'Bot / Abuse Defense Reassessment vs AI-Agent Traffic',
    shortName: 'Bot Defense',
    timeToValue: '0–6 months',
    deployability: 'High',
    sensitivity: 'Medium',
    minCostK: 150, maxCostK: 600,
    primaryRisk: 'Human/bot ambiguity; false positives; customer insult rate; vendor data reuse',
    color: '#FFC220',
    phase: 0,
    posture: 'Yellow',
    evidenceConfidence: 'Medium',
    q2Delta: 'Accelerating: AI agents blur human/bot classification and increase drift risk before peak traffic periods.',
    recommendedAction: 'Commission a bot-defense reassessment focused on AI-agent traffic, challenge friction, false positives, and abuse economics.',
  },
  {
    name: 'Returns Fraud / ORC Graph + Entity Resolution',
    shortName: 'ORC Fraud',
    timeToValue: '0–6 months',
    deployability: 'High',
    sensitivity: 'Medium',
    minCostK: 200, maxCostK: 750,
    primaryRisk: 'Overreach, bias, weak explainability, poor adverse-action governance',
    color: '#06b6d4',
    phase: 0,
    posture: 'Yellow',
    evidenceConfidence: 'High',
    q2Delta: 'ORC remains a named risk across 27 U.S. retail issuers; peer shrink is bifurcating/easing for some large peers.',
    recommendedAction: 'Continue fraud-graph path while benchmarking Walmart-specific lift against a changing peer baseline.',
  },
  {
    name: 'TLog Shrink Analytics (Signal Fusion)',
    shortName: 'Shrink Analytics',
    timeToValue: '0–6 months',
    deployability: 'High',
    sensitivity: 'Medium',
    minCostK: 150, maxCostK: 500,
    primaryRisk: 'Alert fatigue, associate trust, weak loss-outcome attribution',
    color: '#22c55e',
    phase: 0,
    posture: 'Yellow',
    evidenceConfidence: 'Medium',
    q2Delta: 'Q1 pilot remains valid, but Q2 peer shrink easing raises the need for cleaner internal-vs-peer measurement.',
    recommendedAction: 'Keep log-first analytics pilots and approve a scoped internal benchmark if executive comparison is desired.',
  },
  {
    name: 'Retail Computer Vision (Edge, Non-Biometric)',
    shortName: 'Retail CV',
    timeToValue: '6–12 months',
    deployability: 'Medium',
    sensitivity: 'High',
    minCostK: 300, maxCostK: 1500,
    primaryRisk: 'Misidentification, scope creep to biometrics, redaction failure, FPR at scale',
    color: '#f43f5e',
    phase: 1,
    posture: 'Yellow',
    evidenceConfidence: 'Medium',
    q2Delta: 'Persistent Q1 posture; Q2 regulation and workforce-trust pressure reinforce narrow non-biometric boundaries.',
    recommendedAction: 'Continue only narrow edge-CV pilots with non-biometric guarantee, redaction-by-default, evidence-vault controls, bias/parity testing, and KPI gates.',
  },
  {
    name: 'RFID Chain-of-Custody (EPC as EAS)',
    shortName: 'RFID CoC',
    timeToValue: '6–12 months',
    deployability: 'Medium',
    sensitivity: 'High',
    minCostK: 400, maxCostK: 2000,
    primaryRisk: 'Behavioral tracking risk, read reliability, operational economics',
    color: '#a78bfa',
    phase: 1,
    posture: 'Yellow',
    evidenceConfidence: 'Medium',
    q2Delta: 'Strengthened by provenance and DPP pressure, but economics and privacy constraints remain gating factors.',
    recommendedAction: 'Pilot on high-theft SKUs only where exception precision, privacy controls, and investigation-cycle lift are measurable.',
  },
  {
    name: 'EPCIS 2.0 / Digital Product Passport Provenance Spine',
    shortName: 'EPCIS/DPP',
    timeToValue: '6–24 months',
    deployability: 'Medium',
    sensitivity: 'Medium',
    minCostK: 250, maxCostK: 900,
    primaryRisk: 'Data poisoning, API abuse, supplier-readiness gaps, IP leakage',
    color: '#22c55e',
    phase: 2,
    posture: 'Yellow',
    evidenceConfidence: 'High',
    q2Delta: 'Provenance clock tightened; Q2 package flags Feb 2027 readiness pressure and supplier influence.',
    recommendedAction: 'Fund the EPCIS/DPP spine as reusable architecture, not an isolated tool; measure supplier onboarding and event quality.',
  },
  {
    name: 'Drone Detection / Facility Protection Readiness (Detection-Only)',
    shortName: 'Drone Detect',
    timeToValue: '0–6 months',
    deployability: 'Medium',
    sensitivity: 'Medium',
    minCostK: 50, maxCostK: 250,
    primaryRisk: 'Legal constraints, nuisance alerts, vendor defeat claims, local response ambiguity',
    color: '#0053e2',
    phase: 0,
    posture: 'Yellow',
    evidenceConfidence: 'High',
    q2Delta: 'FAA/FCC movement and fixed-site pathway make lawful detection/readiness more relevant; active mitigation remains constrained.',
    recommendedAction: 'Hold detection/intelligence-only posture; pursue lawful fixed-site restriction/readiness path for priority DCs/FCs.',
  },
  {
    name: 'Biometric CV / Face Recognition Expansion',
    shortName: 'Biometrics',
    timeToValue: 'Now–24 months',
    deployability: 'Low',
    sensitivity: 'High',
    minCostK: 300, maxCostK: 1500,
    primaryRisk: 'BIPA-style litigation, state/global biometric regulation, identity-resolving surveillance optics',
    color: '#ef4444',
    phase: 2,
    posture: 'Red',
    evidenceConfidence: 'High',
    q2Delta: 'Q2 reinforces Q1 caution: biometric and face-ID expansion remains heightened diligence / no-expansion.',
    recommendedAction: 'Do not expand biometric CV without formal Legal/Privacy diligence, explicit purpose limitation, and executive risk review.',
  },
  {
    name: 'Active Drone Mitigation / Defeat',
    shortName: 'Drone Defeat',
    timeToValue: 'Now–24 months',
    deployability: 'Low',
    sensitivity: 'High',
    minCostK: 250, maxCostK: 1500,
    primaryRisk: 'Legal authority, FCC/FAA constraints, safety impact, vendor overclaiming',
    color: '#dc2626',
    phase: 2,
    posture: 'Red',
    evidenceConfidence: 'High',
    q2Delta: 'Q2 keeps active mitigation/defeat constrained; lawful fixed-site restriction and detection are the safer alternatives.',
    recommendedAction: 'Avoid mitigation/defeat posture; keep vendor claims in heightened diligence and route through aviation/legal review.',
    investmentNote: 'Range is directional only; Q2 action is constrain/avoid, not budget approval.',
  },
];

export interface PilotPlan {
  name: string;
  shortName: string;
  objective: string;
  minCostK: number;
  maxCostK: number;
  kpis: string[];
  color: string;
  phase?: 0 | 1 | 2;
  posture?: ExecutivePosture;
  costConfidence?: 'Source-backed' | 'Planning estimate';
}

export const PILOTS: PilotPlan[] = [
  {
    name: 'Governed Agentic-AI Security Ops Assist',
    shortName: 'Agentic AI Assist',
    objective: 'Human-in-the-loop analyst assist for evidence review, summaries, triage, and workflow acceleration — no autonomous customer/associate actions.',
    minCostK: 50, maxCostK: 250,
    kpis: ['Analyst time saved', 'Summary accuracy', 'Prompt-injection test pass rate', 'Zero unauthorized actions'],
    color: '#a78bfa',
    phase: 0,
    posture: 'Yellow',
    costConfidence: 'Planning estimate',
  },
  {
    name: 'Bot Defense Reassessment vs AI-Agent Traffic',
    shortName: 'Bot Reassess',
    objective: 'Re-test bot/abuse posture as AI agents blur human/bot classification and alter ATO, scraping, inventory, and returns-abuse economics.',
    minCostK: 150, maxCostK: 600,
    kpis: ['False positive / insult rate', 'AI-agent classification drift', 'ATO/abuse indicators', 'Challenge pass/fail rate'],
    color: '#FFC220',
    phase: 0,
    posture: 'Yellow',
    costConfidence: 'Source-backed',
  },
  {
    name: 'Evidence SOP + Media Authenticity Hardening',
    shortName: 'Evidence SOPs',
    objective: 'Harden incident/BWC evidence handling against deepfake and manipulated-media authenticity challenges.',
    minCostK: 50, maxCostK: 200,
    kpis: ['Hash/manifest completeness', 'Access-log coverage', 'Legal hold/export success', 'Authenticity review SLA'],
    color: '#f97316',
    phase: 0,
    posture: 'Green',
    costConfidence: 'Source-backed',
  },
  {
    name: 'Passkeys + Method-Level MFA Telemetry',
    shortName: 'Identity MFA',
    objective: 'Eliminate phishing risk on high-value flows; instrument method-level telemetry with privacy-minimized controls.',
    minCostK: 100, maxCostK: 350,
    kpis: ['Phishing-resistant coverage %', 'Fraud value deterred $', 'Auth failure rate %'],
    color: '#0053e2',
    phase: 0,
    posture: 'Green',
    costConfidence: 'Source-backed',
  },
  {
    name: 'Returns Fraud Graph + Entity Resolution',
    shortName: 'ORC Fraud',
    objective: 'Disrupt ORC rings and reduce fraud loss while protecting legitimate customers and avoiding overreach.',
    minCostK: 200, maxCostK: 750,
    kpis: ['Loss prevented $', 'Precision/hit-rate', 'Ring cluster interdict time'],
    color: '#06b6d4',
    phase: 0,
    posture: 'Yellow',
    costConfidence: 'Source-backed',
  },
  {
    name: 'TLog Shrink Analytics (10–30 stores)',
    shortName: 'TLog Analytics',
    objective: 'Reduce scan-gap/override loss via log-first decisioning, cleaner peer/internal benchmarking, and prescriptive operations.',
    minCostK: 150, maxCostK: 500,
    kpis: ['Shrink lift proxy', 'Alert burden per lane-hour', 'Intervention success rate'],
    color: '#22c55e',
    phase: 0,
    posture: 'Yellow',
    costConfidence: 'Source-backed',
  },
  {
    name: 'Retail CV Edge Pilot (5–15 stores)',
    shortName: 'CV Edge Pilot',
    objective: 'Validate edge-first CV for SCO scan integrity and safety cues with non-biometric boundary and redaction-by-default.',
    minCostK: 300, maxCostK: 1500,
    kpis: ['<500ms latency', '<5% FPR', '>90% recall on verified events'],
    color: '#f43f5e',
    phase: 1,
    posture: 'Yellow',
    costConfidence: 'Source-backed',
  },
  {
    name: 'RFID "EPC as EAS" Chain-of-Custody Pilot',
    shortName: 'RFID CoC',
    objective: 'Prove item-level provenance correlation for high-theft SKUs where privacy and economics are measurable.',
    minCostK: 400, maxCostK: 2000,
    kpis: ['Exception precision', 'Shrink impact proxy', 'Investigation time-to-identify'],
    color: '#a78bfa',
    phase: 1,
    posture: 'Yellow',
    costConfidence: 'Source-backed',
  },
  {
    name: 'EPCIS 2.0 / DPP Standards Spine MVP',
    shortName: 'DPP Spine',
    objective: 'Build interoperable EPCIS capture/query and resolver capability ahead of supplier and provenance pressure.',
    minCostK: 250, maxCostK: 900,
    kpis: ['Supplier onboarding time', '% valid events', 'Resolver abuse rate'],
    color: '#22c55e',
    phase: 2,
    posture: 'Yellow',
    costConfidence: 'Source-backed',
  },
  {
    name: 'Drone Detection Feasibility MVP (1–2 sites)',
    shortName: 'Drone Detect',
    objective: 'Detect drones as pre-incident intelligence; build low-noise alert/evidence workflow and lawful fixed-site readiness path.',
    minCostK: 50, maxCostK: 250,
    kpis: ['Alert timeliness', 'Nuisance rate', 'Confirmed sightings pattern'],
    color: '#0053e2',
    phase: 0,
    posture: 'Yellow',
    costConfidence: 'Source-backed',
  },
];

export const EXEC_INSIGHTS = [
  {
    icon: '',
    title: 'AI Is on Both Sides of the Ledger',
    text: 'Agentic AI can accelerate investigations and fraud analysis, but it also raises prompt-injection, autonomous-action, bot-ambiguity, and synthetic-identity risk.',
  },
  {
    icon: '',
    title: 'The Defensibility Bill Is Due',
    text: 'Evidence handling, BWC metadata, hashes, manifests, access logs, retention, legal holds, and media-authenticity review are now executive-level controls.',
  },
  {
    icon: '',
    title: 'ORC Risk Is Broad; Shrink Signals Are Bifurcating',
    text: 'Q2 package flags ORC as a named risk across 27 U.S. retail issuers while peer shrink appears to be easing for some large retailers, requiring cleaner internal benchmarking.',
  },
  {
    icon: '',
    title: 'Two Red Lines Hold',
    text: 'Biometric CV / face-recognition expansion and active drone mitigation/defeat remain constrained until formal Legal, Privacy, Aviation, and executive risk review clears them.',
  },
];

export const KPIS = [
  { label: 'Q2 New AI-Era Pilots', value: '2', unit: 'agentic assist + bot reassessment', color: '#a78bfa' },
  { label: 'Carry-Forward MVPs', value: '8', unit: 'Q1 pilots retained with gates', color: '#0053e2' },
  { label: 'Peer ORC Risk Signal', value: '27', unit: 'U.S. retail issuers named ORC risk', color: '#FFC220' },
  { label: 'Red Constraints', value: '2', unit: 'biometrics + active drone defeat', color: '#ef4444' },
  { label: 'Evidence Confidence', value: 'High', unit: 'FAA/FCC, EUR-Lex, SEC posture', color: '#22c55e' },
  { label: 'Pilot Horizon', value: '8–12', unit: 'weeks per MVP', color: '#06b6d4' },
  { label: 'CV False Positive Gate', value: '<5%', unit: 'FPR target retained', color: '#f43f5e' },
  { label: 'CV Recall Gate', value: '>90%', unit: 'verified events target retained', color: '#FFC220' },
];

export const Q2_DELTAS = [
  { label: 'New', title: 'Agentic AI security-ops assist', detail: 'Approve only as a bounded, human-in-the-loop pilot with auditability and prompt-injection testing.', color: '#a78bfa' },
  { label: 'Up', title: 'Bot / abuse defense reassessment', detail: 'AI-agent traffic blurs human/bot detection; reassess before peak periods.', color: '#FFC220' },
  { label: 'Up', title: 'Synthetic-media evidence risk', detail: 'Evidence authenticity now affects investigations, litigation, and brand trust.', color: '#f97316' },
  { label: 'Hold', title: 'Drone detection-only posture', detail: 'Use detection and lawful facility-readiness paths; avoid mitigation/defeat claims.', color: '#0053e2' },
  { label: 'Hold', title: 'Biometric / face-ID expansion', detail: 'Remain no-expansion until Legal/Privacy diligence and explicit executive risk review.', color: '#ef4444' },
];

export const EXEC_DECISIONS = [
  'Approve scoped governed agentic-AI assist pilot; prohibit autonomous customer/associate action.',
  'Commission bot-defense reassessment against AI-agent traffic before peak periods.',
  'Update evidence SOPs for media authenticity, manifest/hash controls, access logs, retention/holds, and export control.',
  'Fund EPCIS 2.0 / DPP provenance spine as reusable architecture ahead of supplier-readiness pressure.',
  'Hold drone program to detection/intelligence-only; pursue lawful fixed-site restriction/readiness path for priority DCs/FCs.',
  'Approve scoped internal-vs-peer shrink benchmark only if executives want a comparison view.',
];

export const POSTURE_SUMMARY = [
  { posture: 'Green' as const, label: 'Act Now', count: 3, detail: 'Evidence/BWC hardening, OT telemetry security, identity hardening.', color: '#22c55e' },
  { posture: 'Yellow' as const, label: 'Gate & Pilot', count: 8, detail: 'Agentic AI, bot defense, ORC/fraud, TLog, CV, RFID, EPCIS/DPP, drone detection.', color: '#FFC220' },
  { posture: 'Red' as const, label: 'Constrain', count: 2, detail: 'Biometric CV / face ID expansion and active drone mitigation/defeat.', color: '#ef4444' },
];

export const TIMELINE_ACTIONS = [
  {
    horizon: 'Now–30 Days',
    color: '#0053e2',
    actions: [
      'Lock Q2 posture map: Green act-now, Yellow gated pilots, Red constraints',
      'Approve bounded agentic-AI assist scope and control plane',
      'Commission bot-defense reassessment against AI-agent traffic',
      'Update evidence SOPs for synthetic-media authenticity and chain-of-custody',
    ],
  },
  {
    horizon: '60–90 Days',
    color: '#FFC220',
    actions: [
      'Run evidence, bot, drone-detection, identity, fraud graph, and TLog pilot checkpoints',
      'Baseline internal metrics for shrink, exceptions, returns, bot, incident, drone, and evidence workflows',
      'Validate Legal/Privacy/Workforce Trust gates for CV, RFID, bodycam, ALPR, and AI-assisted workflows',
      'Produce CSO-ready pilot readout with KPI gates, operator burden, and residual risk',
    ],
  },
  {
    horizon: '6–12 Months',
    color: '#22c55e',
    actions: [
      'Fund EPCIS/DPP provenance spine and supplier-readiness roadmap',
      'Scale only pilots sustaining low FPR, stable ops load, and defensible evidence controls',
      'Keep biometrics and active drone defeat constrained pending formal executive risk review',
      'Refresh quarterly forecast using primary evidence, internal KPI deltas, and explicit open residuals',
    ],
  },
];
