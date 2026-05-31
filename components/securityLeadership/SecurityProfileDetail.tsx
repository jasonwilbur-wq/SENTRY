import React from 'react';
import type { ExecutiveProfile } from '../../data/csoProfiles';
import { Badge, Card, ExecutiveAvatar } from '../executiveIntel/ui';
import { riskTone, threatTone } from './securityLogic';

// ---------------------------------------------------------------------------
// Detail pane for a single competitor Chief Security Officer.
// Renders identity, key findings (with sources), recent activity timeline,
// strategic threats, and analyst recommendations on the shared UI kit.
// ---------------------------------------------------------------------------

export function SecurityProfileDetail({ profile }: { profile: ExecutiveProfile }) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start gap-3">
          <ExecutiveAvatar name={profile.name} photoUrl={profile.profileImage} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black" style={{ color: 'var(--s-text)' }}>{profile.name}</h3>
              <Badge tone={threatTone(profile.threatLevel)}>{profile.threatLevel}</Badge>
            </div>
            <p className="mt-1 text-sm font-bold" style={{ color: 'var(--s-text-dim)' }}>{profile.title}</p>
            <p className="text-sm" style={{ color: 'var(--s-text-dim)' }}>{profile.company}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6" style={{ color: 'var(--s-text-dim)' }}>{profile.bio}</p>
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
