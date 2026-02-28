/**
 * Q1 2026 Security Technology Forecast data.
 * Source: WMT_ES_Q1 Security Technology Forecast_v1.1.docx
 * Prepared by Jason Wilbur, Feb 2026 | v1.1 (Final)
 */

export interface TechCategory {
  name: string;
  shortName: string;
  timeToValue: string;
  deployability: 'High' | 'Medium' | 'Low';
  sensitivity: 'Low' | 'Medium' | 'Medium-High' | 'High';
  minCostK: number;  // thousands USD
  maxCostK: number;
  primaryRisk: string;
  color: string;
  phase: 0 | 1 | 2;  // 0=now, 1=6-12mo, 2=6-24mo
}

export const TECH_CATEGORIES: TechCategory[] = [
  {
    name: 'Identity Hardening & Telemetry (Passkeys/MFA)',
    shortName: 'Identity',
    timeToValue: '0–6 months',
    deployability: 'High',
    sensitivity: 'Medium',
    minCostK: 100, maxCostK: 350,
    primaryRisk: 'Telemetry over-collection; friction regressions',
    color: '#0053e2',
    phase: 0,
  },
  {
    name: 'Bot/Abuse Defense (Customer + Internal)',
    shortName: 'Bot Defense',
    timeToValue: '0–6 months',
    deployability: 'High',
    sensitivity: 'Medium',
    minCostK: 150, maxCostK: 600,
    primaryRisk: 'False positives/insult rate; vendor data reuse',
    color: '#FFC220',
    phase: 0,
  },
  {
    name: 'Returns Fraud (Entity Resolution + Graph)',
    shortName: 'Returns Fraud',
    timeToValue: '0–6 months',
    deployability: 'High',
    sensitivity: 'Medium',
    minCostK: 200, maxCostK: 750,
    primaryRisk: 'Overreach/bias; weak explainability',
    color: '#06b6d4',
    phase: 0,
  },
  {
    name: 'Shrink/TLog Analytics (Signal Fusion)',
    shortName: 'Shrink Analytics',
    timeToValue: '0–6 months',
    deployability: 'High',
    sensitivity: 'Medium',
    minCostK: 150, maxCostK: 500,
    primaryRisk: 'Alert fatigue; associate trust',
    color: '#22c55e',
    phase: 0,
  },
  {
    name: 'Incident Reporting + BWC Metadata',
    shortName: 'Incident/BWC',
    timeToValue: '0–6 months',
    deployability: 'High',
    sensitivity: 'High',
    minCostK: 50, maxCostK: 200,
    primaryRisk: 'Discovery/spoliation; inconsistent metadata',
    color: '#f97316',
    phase: 0,
  },
  {
    name: 'ML Labeling Governance',
    shortName: 'ML Governance',
    timeToValue: '0–6 months',
    deployability: 'High',
    sensitivity: 'High',
    minCostK: 50, maxCostK: 150,
    primaryRisk: 'Indefensible ground truth; bias',
    color: '#a78bfa',
    phase: 0,
  },
  {
    name: 'Drone Detection (Detection/Intel Only)',
    shortName: 'Drone Detection',
    timeToValue: '0–6 months',
    deployability: 'Medium',
    sensitivity: 'Medium',
    minCostK: 50, maxCostK: 250,
    primaryRisk: 'Legal constraints; nuisance alerts',
    color: '#0053e2',
    phase: 0,
  },
  {
    name: 'Retail CV (Edge, Non-Biometric)',
    shortName: 'Retail CV',
    timeToValue: '6–12 months',
    deployability: 'Medium',
    sensitivity: 'High',
    minCostK: 300, maxCostK: 1500,
    primaryRisk: 'Misidentification; scope creep to biometrics',
    color: '#f43f5e',
    phase: 1,
  },
  {
    name: 'RFID Chain-of-Custody (EPC as EAS)',
    shortName: 'RFID CoC',
    timeToValue: '6–12 months',
    deployability: 'Medium',
    sensitivity: 'High',
    minCostK: 400, maxCostK: 2000,
    primaryRisk: 'Behavioral tracking risk; read reliability',
    color: '#a78bfa',
    phase: 1,
  },
  {
    name: 'OT/Robotics Telemetry Security',
    shortName: 'OT/Robotics',
    timeToValue: '6–12 months',
    deployability: 'Medium',
    sensitivity: 'Medium-High',
    minCostK: 200, maxCostK: 800,
    primaryRisk: 'Safety-stop DoS; vendor remote access',
    color: '#f97316',
    phase: 1,
  },
  {
    name: 'Retail Duress Response Analytics',
    shortName: 'Duress Analytics',
    timeToValue: '6–12 months',
    deployability: 'Medium',
    sensitivity: 'High',
    minCostK: 100, maxCostK: 400,
    primaryRisk: 'Workforce surveillance optics; minimization',
    color: '#f43f5e',
    phase: 1,
  },
  {
    name: 'EPCIS 2.0 + Digital Product Passport',
    shortName: 'EPCIS/DPP',
    timeToValue: '6–24 months',
    deployability: 'Medium',
    sensitivity: 'Medium',
    minCostK: 250, maxCostK: 900,
    primaryRisk: 'Data poisoning; API abuse; IP leakage',
    color: '#22c55e',
    phase: 2,
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
}

export const PILOTS: PilotPlan[] = [
  {
    name: 'Passkeys + Method-Level MFA Telemetry',
    shortName: 'Identity MFA',
    objective: 'Eliminate phishing risk on high-value flows; instrument method-level telemetry',
    minCostK: 100, maxCostK: 350,
    kpis: ['Phishing-resistant coverage %', 'Fraud value deterred $', 'Auth failure rate %'],
    color: '#0053e2',
  },
  {
    name: 'Bot/Abuse Defense MVP',
    shortName: 'Bot Defense',
    objective: 'Reduce ATO, scraping, inventory abuse, and automated returns initiation',
    minCostK: 150, maxCostK: 600,
    kpis: ['ATO indicators', 'False positive / insult rate', 'Challenge pass/fail rate'],
    color: '#FFC220',
  },
  {
    name: 'Returns Fraud Graph + Entity Resolution',
    shortName: 'Returns Fraud',
    objective: 'Disrupt ORC rings and reduce fraud loss while protecting legitimate customers',
    minCostK: 200, maxCostK: 750,
    kpis: ['Loss prevented $', 'Precision/hit-rate', 'Ring cluster interdict time'],
    color: '#06b6d4',
  },
  {
    name: 'TLog Shrink Analytics (10–30 stores)',
    shortName: 'TLog Analytics',
    objective: 'Reduce scan-gap/override loss via log-first decisioning + prescriptive ops',
    minCostK: 150, maxCostK: 500,
    kpis: ['Shrink lift proxy', 'Alert burden per lane-hour', 'Intervention success rate'],
    color: '#22c55e',
  },
  {
    name: 'Retail CV Edge Pilot (5–15 stores)',
    shortName: 'CV Edge Pilot',
    objective: 'Validate edge-first CV for SCO scan integrity + safety cues (non-biometric)',
    minCostK: 300, maxCostK: 1500,
    kpis: ['<500ms latency', '<5% FPR', '>90% recall on verified events'],
    color: '#f43f5e',
  },
  {
    name: 'RFID "EPC as EAS" CoC Pilot (2–5 sites)',
    shortName: 'RFID CoC',
    objective: 'Prove item-level provenance correlation for high-theft SKUs',
    minCostK: 400, maxCostK: 2000,
    kpis: ['Exception precision', 'Shrink impact proxy', 'Investigation time-to-identify'],
    color: '#a78bfa',
  },
  {
    name: 'EPCIS 2.0 / DPP Standards Spine MVP',
    shortName: 'DPP MVP',
    objective: 'Interoperable EPCIS capture/query + resolver with selective access + integrity',
    minCostK: 250, maxCostK: 900,
    kpis: ['Supplier onboarding time', '% valid events', 'Resolver abuse rate'],
    color: '#22c55e',
  },
  {
    name: 'Drone Detection Feasibility MVP (1–2 sites)',
    shortName: 'Drone MVP',
    objective: 'Detect drones as leading indicator; build low-noise alert/evidence workflow',
    minCostK: 50, maxCostK: 250,
    kpis: ['Alert timeliness', 'Nuisance rate', 'Confirmed sightings pattern'],
    color: '#0053e2',
  },
];

export const EXEC_INSIGHTS = [
  {
    icon: '🎯',
    title: 'Store as Anchor',
    text: 'The store is the operational center of gravity — physical loss, customer experience, employee safety, and brand risk converge in real time. Integration is the differentiator.',
  },
  {
    icon: '📡',
    title: 'Telemetry is the Product',
    text: 'Security advantage will come less from "one big platform" and more from disciplined integration of telemetry, governance, and operational workflows.',
  },
  {
    icon: '⚖️',
    title: 'Evidence is the Liability',
    text: 'Chain-of-custody, retention, and redaction are not overhead — they are the control. As soon as technology influences intervention, evidence governance is mandatory.',
  },
  {
    icon: '🛡️',
    title: 'Operational Viability > Accuracy',
    text: 'At Walmart scale, false positives drive labor cost, customer impact, and loss of trust. Programs that don\'t manage FPR fail in production regardless of model accuracy.',
  },
];

export const KPIS = [
  { label: 'CV Inference Target', value: '<500ms', unit: 'latency', color: '#0053e2' },
  { label: 'CV False Positive Target', value: '<5%', unit: 'FPR', color: '#22c55e' },
  { label: 'CV Recall Target', value: '>90%', unit: 'theft events', color: '#FFC220' },
  { label: 'Bot False Positive Target', value: '<0.01%', unit: 'insult rate', color: '#f43f5e' },
  { label: 'Identity MFA Coverage', value: '>90%', unit: 'workforce', color: '#0053e2' },
  { label: 'Privileged Coverage', value: '~100%', unit: 'passkey/FIDO2', color: '#a78bfa' },
  { label: 'Pilot Horizon', value: '8–12', unit: 'weeks per MVP', color: '#06b6d4' },
  { label: 'Tech Categories', value: '12', unit: 'in scope', color: '#f97316' },
];

export const TIMELINE_ACTIONS = [
  {
    horizon: 'Next 30 Days',
    color: '#0053e2',
    actions: [
      'Confirm portfolio focus: identity, abuse defense, returns/shrink, evidence governance',
      'Adopt Entra ID + SharePoint reference architecture as go/no-go gate',
      'Stand up sensitivity tiering model (Appendix D)',
      'Publish KPI slate and assign owner roles for reporting',
    ],
  },
  {
    horizon: '60–90 Days',
    color: '#FFC220',
    actions: [
      'Baseline current-state metrics (coverage, alert volumes, false positives, loss outcomes)',
      'Run limited-scope validations for highest-uncertainty domains',
      'Implement decision-file logging for all intervention-adjacent systems',
      'Validate legal hold and export workflows for incident/evidence systems',
    ],
  },
  {
    horizon: '12 Months',
    color: '#22c55e',
    actions: [
      'Scale only categories sustaining: low FPR, stable ops load, defensible auditability',
      'Formalize quarterly forecast refresh cadence with structured decision questions',
      'Expand governance model globally (EPCIS/DPP + privacy regimes)',
      'Ensure controls are configuration-driven and consistent across geographies',
    ],
  },
];