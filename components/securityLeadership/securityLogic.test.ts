import { describe, it, expect } from 'vitest';
import type { ExecutiveProfile, Finding } from '../../data/csoProfiles';
import { threatTone, riskTone, deriveCounts, byThreatThenName, topFinding } from './securityLogic';

// Pure-logic unit tests for the Security Leadership helpers.
// No DOM / React needed - runs under the lightweight logic vitest config.

const SRC = { publisher: 'X', url: 'u', date: 'd' };

function makeFinding(over: Partial<Finding> = {}): Finding {
  const base: Finding = {
    id: 'f1',
    type: 'decision',
    headline: 'Headline',
    date: '2026-01-01',
    impactScore: 50,
    riskColor: 'GREEN',
    summary: 'summary',
    whyItMatters: 'because',
    sources: [],
  };
  return Object.assign(base, over);
}

function makeProfile(over: Partial<ExecutiveProfile> = {}): ExecutiveProfile {
  const base: ExecutiveProfile = {
    id: 'p1',
    name: 'Test Person',
    title: 'CSO',
    company: 'TestCo',
    threatLevel: 'LOW',
    profileImage: '',
    bio: 'bio',
    keyFindings: [],
    recentActivity: [],
    strategicThreats: [],
    recommendations: [],
  };
  return Object.assign(base, over);
}

describe('threatTone', () => {
  it('maps each threat level to the expected tone', () => {
    expect(threatTone('CRITICAL')).toBe('red');
    expect(threatTone('HIGH')).toBe('yellow');
    expect(threatTone('MEDIUM')).toBe('blue');
    expect(threatTone('LOW')).toBe('green');
  });
});

describe('riskTone', () => {
  it('collapses RED and ORANGE to red', () => {
    expect(riskTone('RED')).toBe('red');
    expect(riskTone('ORANGE')).toBe('red');
  });
  it('maps YELLOW and GREEN distinctly', () => {
    expect(riskTone('YELLOW')).toBe('yellow');
    expect(riskTone('GREEN')).toBe('green');
  });
});

describe('deriveCounts', () => {
  it('rolls up profiles, findings, critical, high and sources', () => {
    const findingsA = [
      makeFinding({ id: 'a1', riskColor: 'RED', sources: [SRC] }),
      makeFinding({ id: 'a2', riskColor: 'YELLOW' }),
    ];
    const findingsB = [
      makeFinding({ id: 'b1', riskColor: 'ORANGE' }),
      makeFinding({ id: 'b2', riskColor: 'GREEN', sources: [SRC, SRC] }),
    ];
    const profiles = [
      makeProfile({ id: 'pa', keyFindings: findingsA }),
      makeProfile({ id: 'pb', keyFindings: findingsB }),
    ];
    const counts = deriveCounts(profiles);
    expect(counts.profiles).toBe(2);
    expect(counts.findings).toBe(4);
    // RED + ORANGE = 2 critical
    expect(counts.critical).toBe(2);
    // YELLOW = 1 high
    expect(counts.high).toBe(1);
    // 1 + 2 = 3 sources
    expect(counts.sources).toBe(3);
  });

  it('handles an empty list', () => {
    const counts = deriveCounts([]);
    expect(counts).toEqual({ profiles: 0, findings: 0, critical: 0, high: 0, sources: 0 });
  });
});

describe('byThreatThenName', () => {
  it('sorts most-threatening first, then alphabetically', () => {
    const profiles = [
      makeProfile({ id: '1', name: 'Zed', threatLevel: 'LOW' }),
      makeProfile({ id: '2', name: 'Bob', threatLevel: 'CRITICAL' }),
      makeProfile({ id: '3', name: 'Ann', threatLevel: 'CRITICAL' }),
      makeProfile({ id: '4', name: 'Cat', threatLevel: 'HIGH' }),
    ];
    const sorted = [...profiles].sort(byThreatThenName).map(p => p.name);
    expect(sorted).toEqual(['Ann', 'Bob', 'Cat', 'Zed']);
  });
});

describe('topFinding', () => {
  it('returns the highest-impact finding', () => {
    const profile = makeProfile({
      keyFindings: [
        makeFinding({ id: 'lo', impactScore: 10 }),
        makeFinding({ id: 'hi', impactScore: 99 }),
        makeFinding({ id: 'mid', impactScore: 55 }),
      ],
    });
    expect(topFinding(profile)?.id).toBe('hi');
  });
  it('returns undefined when there are no findings', () => {
    expect(topFinding(makeProfile())).toBeUndefined();
  });
});
