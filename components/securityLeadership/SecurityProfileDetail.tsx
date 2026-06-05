import React from 'react';
import type { ExecutiveProfile } from '../../data/csoProfiles';
import { Badge, Card, ExecutiveAvatar } from '../executiveIntel/ui';
import { riskTone, threatTone, topFinding } from './securityLogic';
import { deriveVerification } from './verificationLogic';

// ---------------------------------------------------------------------------
// Detail pane for a single competitor Chief Security Officer.
// Renders identity, key findings (with sources), recent activity timeline,
// strategic threats, and analyst recommendations on the shared UI kit.
// ---------------------------------------------------------------------------

function walmartImplication(profile: ExecutiveProfile): string {
  const text = `${profile.bio} ${profile.keyFindings.map(f => `${f.headline} ${f.whyItMatters}`).join(' ')}`.toLowerCase();
  if (text.includes('identity') || text.includes('authentication') || text.includes('password')) {
    return 'Benchmark Walmart identity exception governance, phishing-resistant MFA coverage, and device posture enforcement against this competitor signal.';
  }
  if (text.includes('hiring') || text.includes('insider')) {
    return 'Route to insider-risk and workforce identity owners to compare hiring-fraud detection, pre-hire checks, and post-hire anomaly monitoring.';
  }
  if (text.includes('ai') || text.includes('agent')) {
    return 'Compare against secure AI assessment controls, red-team automation, and detection engineering velocity for EST-sponsored AI work.';
  }
  if (text.includes('resilience') || text.includes('cloud')) {
    return 'Use as a resilience benchmark for cloud dependency, cyber-physical disruption, and continuity tabletop planning.';
  }
  return 'Use this dossier to determine whether competitor executive movement changes Walmart security priorities, briefing posture, or owner routing.';
}

export function SecurityProfileDetail({ profile }: { profile: ExecutiveProfile }) {
  const verification = deriveVerification(profile);
  const leadFinding = topFinding(profile);
  const leadRecommendation = profile.recommendations[0];
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start gap-3">
          <ExecutiveAvatar name={profile.name} photoUrl={profile.profileImage} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black" style={{ color: 'var(--s-text)' }}>{profile.name}</h3>
              <Badge tone={threatTone(profile.threatLevel)}>{profile.threatLevel}</Badge>
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
                style={{ background: verification.color + '1a', color: verification.color, border: '1px solid ' + verification.color + '55' }}
                title={verification.reason}
              >
                {verification.level === 'verified' ? '✓' : verification.level === 'review' ? '⚠' : '○'} {verification.label}
              </span>
            </div>
            <p className="mt-1 text-sm font-bold" style={{ color: 'var(--s-text-dim)' }}>{profile.title}</p>
            <p className="text-sm" style={{ color: 'var(--s-text-dim)' }}>{profile.company}</p>
          </div>
        </div>
        {verification.level !== 'verified' && (
          <div
            className="mt-3 rounded-lg px-3 py-2 text-xs"
            style={{ background: verification.color + '12', color: verification.color, border: '1px solid ' + verification.color + '33' }}
            role="note"
          >
            <strong>Data confidence — {verification.label}:</strong> {verification.reason} Analyst verification recommended before acting on this profile.
          </div>
        )}
        <p className="mt-4 text-sm leading-6" style={{ color: 'var(--s-text-dim)' }}>{profile.bio}</p>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-3">
          <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(255,194,32,0.28)', background: 'rgba(255,194,32,0.06)' }}>
            <div className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: '#FFC220' }}>Top signal</div>
            <p className="mt-1 text-xs leading-5" style={{ color: 'var(--s-text-dim)' }}>{leadFinding?.headline ?? 'No lead finding available.'}</p>
          </div>
          <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(0,83,226,0.28)', background: 'rgba(0,83,226,0.08)' }}>
            <div className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: '#9BB7DF' }}>Why Walmart cares</div>
            <p className="mt-1 text-xs leading-5" style={{ color: 'var(--s-text-dim)' }}>{walmartImplication(profile)}</p>
          </div>
          <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(42,135,3,0.28)', background: 'rgba(42,135,3,0.06)' }}>
            <div className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: '#4ade80' }}>Recommended action</div>
            <p className="mt-1 text-xs leading-5" style={{ color: 'var(--s-text-dim)' }}>{leadRecommendation ?? 'Keep monitoring for material posture change.'}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-6">
          <Card>
            <h4 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>Recent activity</h4>
            <ol className="mt-3 space-y-3">
              {profile.recentActivity.map((act, idx) => (
                <li key={idx} className="border-l-2 pl-3" style={{ borderColor: 'var(--s-border-mid)' }}>
                  <div className="text-[11px] font-bold" style={{ color: 'var(--s-text-dim)' }}>{act.date} · {act.type}</div>
                  <div className="mt-0.5 text-sm font-semibold" style={{ color: 'var(--s-text)' }}>{act.title}</div>
                  <div className="mt-0.5 text-xs leading-5" style={{ color: 'var(--s-text-dim)' }}>{act.impact}</div>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <h4 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: '#EA1100' }}>Strategic threats</h4>
            <ul className="mt-3 space-y-2">
              {profile.strategicThreats.map((threat, idx) => (
                <li key={idx} className="text-xs leading-5" style={{ color: 'var(--s-text-dim)' }}>{threat}</li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <Card>
            <h4 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>Key findings</h4>
            <div className="mt-4 space-y-4">
              {profile.keyFindings.map(finding => (
                <div key={finding.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--s-border-light)', background: 'var(--s-input-bg)' }}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h5 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>{finding.headline}</h5>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={riskTone(finding.riskColor)}>{finding.riskColor}</Badge>
                      <Badge tone="gray">impact {finding.impactScore}</Badge>
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] font-bold" style={{ color: 'var(--s-text-dim)' }}>{finding.date} · {finding.type.replace(/_/g, ' ')}</div>
                  <p className="mt-2 text-xs leading-5" style={{ color: 'var(--s-text-dim)' }}>{finding.summary}</p>
                  <p className="mt-2 text-xs leading-5" style={{ color: 'var(--s-text-dim)' }}>
                    <strong style={{ color: 'var(--s-text)' }}>Why it matters: </strong>{finding.whyItMatters}
                  </p>
                  {finding.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {finding.sources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold underline"
                          style={{ color: '#0053E2', background: 'rgba(0,83,226,0.08)' }}
                        >
                          {src.publisher} ({src.date})
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h4 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: '#2A8703' }}>Analyst recommendations</h4>
            <ul className="mt-3 space-y-2">
              {profile.recommendations.map((rec, idx) => (
                <li key={idx} className="text-xs leading-5" style={{ color: 'var(--s-text-dim)' }}>{rec}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default SecurityProfileDetail;
