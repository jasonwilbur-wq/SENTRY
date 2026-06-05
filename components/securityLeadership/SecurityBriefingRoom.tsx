import React from 'react';
import type { ExecutiveProfile, Finding } from '../../data/csoProfiles';
import { Badge, Card, StatCard } from '../executiveIntel/ui';
import type { ExecutiveSignal } from './executiveSignals';
import type { PortfolioCounts } from './securityLogic';
import { riskTone } from './securityLogic';

interface Props {
  profiles: ExecutiveProfile[];
  counts: PortfolioCounts;
  verification: { total: number; verified: number; provisional: number; review: number };
  whatsNew: ExecutiveSignal[];
  freshest: string | null;
  onSelectProfile: (id: string) => void;
}

interface BriefCandidate {
  profileId: string;
  execName: string;
  company: string;
  finding: Finding;
}

function candidatePriority(finding: Finding): number {
  const riskWeight = finding.riskColor === 'RED' ? 20 : finding.riskColor === 'ORANGE' ? 16 : finding.riskColor === 'YELLOW' ? 10 : 4;
  return riskWeight + finding.impactScore;
}

function buildBriefCandidates(profiles: ExecutiveProfile[]): BriefCandidate[] {
  return profiles
    .flatMap(profile => profile.keyFindings.map(finding => ({
      profileId: profile.id,
      execName: profile.name,
      company: profile.company,
      finding,
    })))
    .sort((a, b) => candidatePriority(b.finding) - candidatePriority(a.finding))
    .slice(0, 4);
}

function walmartTheme(signal: ExecutiveSignal | undefined): string {
  const text = `${signal?.headline ?? ''} ${signal?.whyItMatters ?? ''}`.toLowerCase();
  if (text.includes('identity') || text.includes('authentication') || text.includes('password')) return 'Identity exception governance and phishing-resistant authentication maturity.';
  if (text.includes('hiring') || text.includes('insider')) return 'Hiring-fraud, insider-risk, and workforce identity controls.';
  if (text.includes('ai') || text.includes('agent')) return 'Secure AI / agentic testing controls and detection engineering velocity.';
  if (text.includes('resilience') || text.includes('cloud')) return 'Cyber-physical resilience, continuity planning, and operating dependency risk.';
  return 'Competitor posture changes that may alter executive security expectations for Walmart.';
}

export function SecurityBriefingRoom({ profiles, counts, verification, whatsNew, freshest, onSelectProfile }: Props) {
  const topSignal = whatsNew[0];
  const candidates = buildBriefCandidates(profiles);
  const verifiedPct = verification.total > 0 ? Math.round((verification.verified / verification.total) * 100) : 0;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden relative">
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{ background: 'radial-gradient(circle at 12% 0%, rgba(0,83,226,0.22), transparent 35%), radial-gradient(circle at 100% 20%, rgba(255,194,32,0.12), transparent 28%)' }}
        />
        <div className="relative grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-5">
          <div>
            <Badge tone="blue">Start here</Badge>
            <h2 className="mt-3 text-2xl font-black" style={{ color: 'var(--s-text)' }}>CSO Briefing Room</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--s-text-dim)' }}>
              Decision-ready view of competitor CSO/CISO leadership movement, security posture,
              and Walmart implications. Start with the top signal, then review the brief queue or open a leader dossier.
            </p>
            <div className="mt-4 grid grid-cols-2 xl:grid-cols-4 gap-3">
              <StatCard label="Leaders" value={counts.profiles} helper="CSO / CISO watchlist" />
              <StatCard label="Findings" value={counts.findings} helper="OSINT intelligence items" />
              <StatCard label="Critical/high" value={counts.critical} helper="Executive attention candidates" tone="red" />
              <StatCard label="Verified" value={`${verifiedPct}%`} helper={`${verification.verified}/${verification.total} profiles`} tone={verifiedPct === 100 ? 'green' : 'yellow'} />
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: 'rgba(255,194,32,0.28)', background: 'rgba(255,194,32,0.06)' }}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: '#FFC220' }}>Top executive signal</h3>
              {freshest && <span className="text-[11px] font-semibold" style={{ color: 'var(--s-text-dim)' }}>{freshest}</span>}
            </div>
            {topSignal ? (
              <button
                type="button"
                onClick={() => onSelectProfile(topSignal.profileId)}
                className="mt-3 w-full rounded-xl border p-3 text-left transition hover:bg-white/5 focus:outline-none focus-visible:ring-2"
                style={{ borderColor: 'var(--s-border-light)', background: 'rgba(0,0,0,0.14)' }}
              >
                <div className="text-xs font-bold" style={{ color: 'var(--s-text-dim)' }}>{topSignal.execName} · {topSignal.company}</div>
                <div className="mt-1 text-sm font-black leading-5" style={{ color: 'var(--s-text)' }}>{topSignal.headline}</div>
                <div className="mt-2 text-xs leading-5" style={{ color: 'var(--s-text-dim)' }}>
                  <strong style={{ color: 'var(--s-text)' }}>Walmart angle: </strong>{walmartTheme(topSignal)}
                </div>
              </button>
            ) : (
              <p className="mt-3 text-sm" style={{ color: 'var(--s-text-dim)' }}>No recent executive signals available.</p>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-5">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>CSO brief queue</h3>
              <p className="mt-1 text-xs" style={{ color: 'var(--s-text-dim)' }}>Highest-impact findings that should be reviewed for executive briefing.</p>
            </div>
            <Badge tone="yellow">{candidates.length} candidates</Badge>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {candidates.map(item => (
              <button
                key={`${item.profileId}-${item.finding.id}`}
                type="button"
                onClick={() => onSelectProfile(item.profileId)}
                className="rounded-xl border p-3 text-left transition hover:bg-white/5 focus:outline-none focus-visible:ring-2"
                style={{ borderColor: 'var(--s-border-light)', background: 'var(--s-input-bg)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold" style={{ color: 'var(--s-text-dim)' }}>{item.company}</span>
                  <Badge tone={riskTone(item.finding.riskColor)}>impact {item.finding.impactScore}</Badge>
                </div>
                <div className="mt-2 text-sm font-bold leading-5" style={{ color: 'var(--s-text)' }}>{item.finding.headline}</div>
                <div className="mt-2 text-xs leading-5" style={{ color: 'var(--s-text-dim)' }}>
                  <strong style={{ color: 'var(--s-text)' }}>Why it matters: </strong>{item.finding.whyItMatters}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>What changed since last review</h3>
          <div className="mt-4 space-y-2">
            {whatsNew.slice(0, 4).map((signal, idx) => (
              <button
                key={`${signal.profileId}-${signal.date}-${idx}`}
                type="button"
                onClick={() => onSelectProfile(signal.profileId)}
                className="w-full rounded-xl border p-3 text-left transition hover:bg-white/5 focus:outline-none focus-visible:ring-2"
                style={{ borderColor: 'var(--s-border-light)', background: 'var(--s-input-bg)' }}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-bold" style={{ color: 'var(--s-text-dim)' }}>
                  <span>{signal.date}</span>
                  <span>{signal.company}</span>
                </div>
                <div className="mt-1 text-sm font-semibold leading-5" style={{ color: 'var(--s-text)' }}>{signal.headline}</div>
              </button>
            ))}
            {whatsNew.length === 0 && <p className="text-sm" style={{ color: 'var(--s-text-dim)' }}>No recent changes available.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SecurityBriefingRoom;
