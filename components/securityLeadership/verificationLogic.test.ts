import { describe, it, expect } from 'vitest';
import {
  deriveVerification,
  latestSignalDate,
  daysSinceLatestSignal,
  summarizeVerification,
} from './verificationLogic';
import type { ExecutiveProfile } from '../../data/csoProfiles';

function profile(overrides: Partial<ExecutiveProfile>): ExecutiveProfile {
  return {
    id: 'x',
    name: 'Test Exec',
    title: 'Chief Security Officer',
    company: 'TestCo',
    threatLevel: 'MEDIUM',
    profileImage: '/x.jpg',
    bio: 'A normal sourced bio.',
    keyFindings: [
      {
        id: 'f1', type: 'thought_leadership', headline: 'h', date: '2026-05-01',
        impactScore: 10, riskColor: 'YELLOW', summary: 's', whyItMatters: 'w',
        sources: [{ publisher: 'Pub', url: 'https://x', date: '2026-05-01' }],
      },
    ],
    recentActivity: [{ date: '2026-05-10', title: 't', type: 'ty', impact: 'i' }],
    strategicThreats: [],
    recommendations: [],
    ...overrides,
  };
}

const NOW = new Date('2026-05-29');

describe('latestSignalDate', () => {
  it('returns the most recent date across findings + activity', () => {
    expect(latestSignalDate(profile({}))).toBe('2026-05-10');
  });
  it('returns null when no dates', () => {
    expect(latestSignalDate(profile({ keyFindings: [], recentActivity: [] }))).toBeNull();
  });
});

describe('daysSinceLatestSignal', () => {
  it('computes day delta from now', () => {
    expect(daysSinceLatestSignal(profile({}), NOW)).toBe(19);
  });
});

describe('deriveVerification', () => {
  it('flags provisional when title/bio says unverified', () => {
    const v = deriveVerification(profile({ title: 'VP, Global Security (Unverified)' }), NOW);
    expect(v.level).toBe('provisional');
  });
  it('flags provisional when no sources', () => {
    const noSrc = profile({
      keyFindings: [{
        id: 'f1', type: 'decision', headline: 'h', date: '2026-05-01',
        impactScore: 5, riskColor: 'GREEN', summary: 's', whyItMatters: 'w', sources: [],
      }],
    });
    expect(deriveVerification(noSrc, NOW).level).toBe('provisional');
  });
  it('flags review when signals are stale', () => {
    const stale = profile({
      keyFindings: [{
        id: 'f1', type: 'decision', headline: 'h', date: '2025-01-01',
        impactScore: 5, riskColor: 'GREEN', summary: 's', whyItMatters: 'w',
        sources: [{ publisher: 'P', url: 'u', date: '2025-01-01' }],
      }],
      recentActivity: [{ date: '2025-01-01', title: 't', type: 'ty', impact: 'i' }],
    });
    expect(deriveVerification(stale, NOW).level).toBe('review');
  });
  it('marks verified when sourced + current', () => {
    expect(deriveVerification(profile({}), NOW).level).toBe('verified');
  });
});

describe('summarizeVerification', () => {
  it('rolls up counts across a portfolio', () => {
    const profiles = [
      profile({ id: 'a' }),                                       // verified
      profile({ id: 'b', title: 'CSO (Unverified)' }),            // provisional
      profile({                                                   // review (stale)
        id: 'c',
        keyFindings: [{
          id: 'f', type: 'decision', headline: 'h', date: '2024-01-01',
          impactScore: 5, riskColor: 'GREEN', summary: 's', whyItMatters: 'w',
          sources: [{ publisher: 'P', url: 'u', date: '2024-01-01' }],
        }],
        recentActivity: [{ date: '2024-01-01', title: 't', type: 'ty', impact: 'i' }],
      }),
    ];
    const sum = summarizeVerification(profiles, NOW);
    expect(sum).toEqual({ verified: 1, review: 1, provisional: 1, total: 3 });
  });
});
