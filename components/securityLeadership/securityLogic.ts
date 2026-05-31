import type { ExecutiveProfile, Finding } from '../../data/csoProfiles';
import type { Tone } from '../executiveIntel/signalLogic';

// ---------------------------------------------------------------------------
// Pure helpers for the Security Leadership (Chief Security Officer) view.
// Kept logic-only and side-effect-free so they can be unit tested in isolation.
// ---------------------------------------------------------------------------

export type ThreatLevel = ExecutiveProfile['threatLevel'];

// Map a competitor threat level to the shared UI tone palette.
export function threatTone(level: ThreatLevel): Tone {
  switch (level) {
    case 'CRITICAL': return 'red';
    case 'HIGH': return 'yellow';
    case 'MEDIUM': return 'blue';
    case 'LOW': return 'green';
    default: return 'gray';
  }
}

// Map a finding's risk colour to the shared UI tone palette.
export function riskTone(risk: Finding['riskColor']): Tone {
  switch (risk) {
    case 'RED': return 'red';
    case 'ORANGE': return 'red';
    case 'YELLOW': return 'yellow';
    case 'GREEN': return 'green';
    default: return 'gray';
  }
}

export interface PortfolioCounts {
  profiles: number;
  findings: number;
  critical: number;
  high: number;
  sources: number;
}

// Roll up headline numbers across the whole watchlist for the overview deck.
export function deriveCounts(profiles: ExecutiveProfile[]): PortfolioCounts {
  const findings = profiles.flatMap(p => p.keyFindings);
  const sources = findings.reduce((sum, f) => sum + f.sources.length, 0);
  return {
    profiles: profiles.length,
    findings: findings.length,
    critical: findings.filter(f => f.riskColor === 'RED' || f.riskColor === 'ORANGE').length,
    high: findings.filter(f => f.riskColor === 'YELLOW').length,
    sources,
  };
}

// Numeric weight so the watchlist can sort most-threatening first.
const THREAT_WEIGHT: Record<ThreatLevel, number> = {
  CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1,
};

export function byThreatThenName(a: ExecutiveProfile, b: ExecutiveProfile): number {
  const w = THREAT_WEIGHT[b.threatLevel] - THREAT_WEIGHT[a.threatLevel];
  return w !== 0 ? w : a.name.localeCompare(b.name);
}

// Highest impact finding for a profile (used for the watchlist preview line).
export function topFinding(profile: ExecutiveProfile): Finding | undefined {
  return [...profile.keyFindings].sort((a, b) => b.impactScore - a.impactScore)[0];
}
