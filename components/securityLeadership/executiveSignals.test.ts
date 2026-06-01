import { describe, it, expect } from 'vitest';
import {
  collectSignals,
  recentSignals,
  latestSignalDate,
  signalsSince,
} from './executiveSignals';
import type { ExecutiveProfile } from '../../data/csoProfiles';

function profile(over: Partial<ExecutiveProfile>): ExecutiveProfile {
  return {
    id: 'p', name: 'Exec', title: 'CSO', company: 'Co', threatLevel: 'MEDIUM',
    profileImage: '', bio: '',
    keyFindings: [],
    recentActivity: [],
    strategicThreats: [], recommendations: [],
    ...over,
  };
}

const A = profile({
  id: 'a', name: 'Alice', company: 'Amazon',
  keyFindings: [{
    id: 'f', type: 'thought_leadership', headline: 'Big finding', date: '2026-05-20',
    impactScore: 10, riskColor: 'ORANGE', summary: 's', whyItMatters: 'matters',
    sources: [{ publisher: 'P', url: 'u', date: '2026-05-20' }],
  }],
  recentActivity: [{ date: '2026-05-25', title: 'Spoke at RSA', type: 'Appearance', impact: 'i' }],
});

const B = profile({
  id: 'b', name: 'Bob', company: 'Target',
  keyFindings: [{
    id: 'f2', type: 'decision', headline: 'Old finding', date: '2026-01-01',
    impactScore: 5, riskColor: 'YELLOW', summary: 's', whyItMatters: 'w',
    sources: [{ publisher: 'P', url: 'u', date: '2026-01-01' }],
  }],
});

describe('collectSignals', () => {
  it('flattens findings + activity into one stream', () => {
    const s = collectSignals([A, B]);
    expect(s).toHaveLength(3);
    expect(s.filter((x) => x.kind === 'finding')).toHaveLength(2);
    expect(s.filter((x) => x.kind === 'activity')).toHaveLength(1);
  });
  it('skips entries without dates', () => {
    const noDate = profile({
      keyFindings: [{
        id: 'f', type: 'decision', headline: 'h', date: '',
        impactScore: 1, riskColor: 'GREEN', summary: 's', whyItMatters: 'w', sources: [],
      }],
    });
    expect(collectSignals([noDate])).toHaveLength(0);
  });
});

describe('recentSignals', () => {
  it('returns most recent first and respects the limit', () => {
    const s = recentSignals([A, B], 2);
    expect(s).toHaveLength(2);
    expect(s[0].date).toBe('2026-05-25');
    expect(s[1].date).toBe('2026-05-20');
  });
});

describe('latestSignalDate', () => {
  it('returns the freshest date across all profiles', () => {
    expect(latestSignalDate([A, B])).toBe('2026-05-25');
  });
  it('returns null when there are no dated signals', () => {
    expect(latestSignalDate([profile({})])).toBeNull();
  });
});

describe('signalsSince', () => {
  it('counts signals on/after the cutoff', () => {
    expect(signalsSince([A, B], '2026-05-01')).toBe(2);
    expect(signalsSince([A, B], '2026-01-01')).toBe(3);
  });
});
