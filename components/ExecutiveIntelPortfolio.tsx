import React, { useEffect, useMemo, useState } from 'react';
import {
  ExecutivePortfolio,
  ExecutivePortfolioSummary,
  ExecutiveReport,
  fetchExecutivePortfolio,
  fetchExecutivePortfolios,
  fetchExecutiveReport,
} from '../services/executiveIntelApi';

const badgeStyle = (tone: 'blue' | 'green' | 'yellow' | 'red' | 'gray') => {
  const styles = {
    blue: { background: 'rgba(0,83,226,0.12)', color: '#0053E2', border: 'rgba(0,83,226,0.28)' },
    green: { background: 'rgba(42,135,3,0.12)', color: '#2A8703', border: 'rgba(42,135,3,0.28)' },
    yellow: { background: 'rgba(255,194,32,0.16)', color: '#995213', border: 'rgba(255,194,32,0.5)' },
    red: { background: 'rgba(234,17,0,0.12)', color: '#EA1100', border: 'rgba(234,17,0,0.28)' },
    gray: { background: 'var(--s-input-bg)', color: 'var(--s-text-dim)', border: 'var(--s-border-mid)' },
  }[tone];
  return { background: styles.background, color: styles.color, border: `1px solid ${styles.border}` };
};

function Badge({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'blue' | 'green' | 'yellow' | 'red' | 'gray' }) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em]" style={badgeStyle(tone)}>
      {children}
    </span>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${className}`} style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}>
      {children}
    </section>
  );
}

function StatCard({ label, value, helper }: { label: string; value: React.ReactNode; helper?: string }) {
  return (
    <Card className="p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--s-text-dim)' }}>{label}</div>
      <div className="mt-2 text-2xl font-black" style={{ color: 'var(--s-text)' }}>{value}</div>
      {helper && <div className="mt-1 text-xs" style={{ color: 'var(--s-text-dim)' }}>{helper}</div>}
    </Card>
  );
}

// Deterministic gradient palette for letter-avatar fallback (no external calls).
const AVATAR_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ['#0053E2', '#2A6FF0'], ['#995213', '#C8821F'], ['#2A8703', '#3EA821'],
  ['#6D28D9', '#8B5CF6'], ['#BE185D', '#E11D74'], ['#0E7490', '#0EA5C4'],
  ['#B91C1C', '#EA1100'], ['#475569', '#64748B'],
];
function initialsOf(name: string): string {
  const parts = (name || '?').replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function gradientFor(name: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function ExecutiveAvatar({ name, photoUrl, size = 44 }: { name: string; photoUrl?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const dim = { width: size, height: size };
  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt={`${name} headshot`}
        onError={() => setFailed(true)}
        className="rounded-xl object-cover flex-shrink-0"
        style={{ ...dim, border: '1px solid var(--s-border)' }}
      />
    );
  }
  const [from, to] = gradientFor(name);
  return (
    <div
      aria-label={`${name} (no photo)`}
      role="img"
      className="rounded-xl flex items-center justify-center flex-shrink-0 font-black text-white"
      style={{ ...dim, background: `linear-gradient(135deg, ${from}, ${to})`, fontSize: size * 0.36 }}
    >
      {initialsOf(name)}
    </div>
  );
}

const verificationTone = (status?: string): 'blue' | 'green' | 'yellow' | 'red' | 'gray' => {
  if (status === 'VERIFIED') return 'green';
  if (status === 'PARTIALLY_VERIFIED') return 'blue';
  if (status === 'LEAD_ONLY') return 'yellow';
  if (status === 'REJECTED' || status === 'CONFLICTING') return 'red';
  return 'gray';
};

const statusTone = (status?: string): 'blue' | 'green' | 'yellow' | 'red' | 'gray' => {
  const value = (status ?? 'ACTIVE').toUpperCase();
  if (value === 'ACTIVE') return 'green';
  if (value === 'ARCHIVED') return 'red';
  if (value === 'DISCOVERY') return 'yellow';
  return 'gray';
};

const isArchived = (status?: string) => (status ?? 'ACTIVE').toUpperCase() === 'ARCHIVED';

// title_svp_conclusion may be a plain string OR a structured object
// ({status, evidence/note, confirmed_by_run, confirmed_at}). Never render the
// raw object — React throws "Objects are not valid as a React child".
function svpConclusionText(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const status = typeof obj.status === 'string' ? obj.status.replace(/_/g, ' ') : '';
    const detail = typeof obj.evidence === 'string'
      ? obj.evidence
      : (typeof obj.note === 'string' ? obj.note : '');
    return [status ? `SVP title: ${status}.` : '', detail].filter(Boolean).join(' ');
  }
  return '';
}

function optionLabel(item: ExecutivePortfolioSummary): string {
  const archived = isArchived(item.status);
  const prefix = archived ? '\u26A0 ' : '';
  const suffix = archived ? ' (archived)' : '';
  return `${prefix}${item.full_name} \u00b7 ${item.organization}${suffix}`;
}

// Analyst review layer: curated ESG key findings surfaced from the collection passes.
const KEY_FINDINGS: string[] = [
  'Ex-Walmart U.S. CEO Greg Foran is now Kroger\u2019s CEO (Feb 2026) \u2014 deepest competitive flag in this watchlist.',
  '3 of the original 9 targets had stale/incorrect data \u2014 Target\u2019s Nusz departed, Kroger\u2019s CSO is embedded in Comms (unnamed), FedEx has no CSO (CEO owns it).',
  'Regulatory center of gravity shifted: the U.S. SEC climate rule was withdrawn (Mar 2025); EU CSRD + California SB 253/261 are now the real mandatory triggers.',
  'Escalation: a possible Walmart-CFO / Microsoft-board overlap was surfaced (MSFT sig_020) \u2014 route to Legal/Compliance before downstream use.',
];

export function ExecutiveIntelPortfolio() {
  const [portfolios, setPortfolios] = useState<ExecutivePortfolioSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [portfolio, setPortfolio] = useState<ExecutivePortfolio | null>(null);
  const [report, setReport] = useState<ExecutiveReport | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchExecutivePortfolios()
      .then(payload => {
        if (cancelled) return;
        setPortfolios(payload.portfolios);
        const first = payload.portfolios[0]?.profile_id ?? '';
        setSelectedId(first);
        setStatus(first ? 'ready' : 'empty');
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to load portfolios');
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setError('');
    Promise.all([fetchExecutivePortfolio(selectedId), fetchExecutiveReport(selectedId)])
      .then(([portfolioPayload, reportPayload]) => {
        if (cancelled) return;
        setPortfolio(portfolioPayload);
        setReport(reportPayload);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to load selected portfolio');
      });
    return () => { cancelled = true; };
  }, [selectedId]);

  const selectedSummary = useMemo(
    () => portfolios.find(item => item.profile_id === selectedId),
    [portfolios, selectedId],
  );

  const overview = useMemo(() => {
    const active = portfolios.filter(p => !isArchived(p.status));
    const archived = portfolios.filter(p => isArchived(p.status));
    return {
      active,
      archived,
      totalSignals: portfolios.reduce((sum, p) => sum + p.stats.signal_count, 0),
      totalSources: portfolios.reduce((sum, p) => sum + p.stats.source_count, 0),
      totalCsoReady: portfolios.reduce((sum, p) => sum + p.stats.cso_ready_signal_count, 0),
      totalInvalid: portfolios.reduce((sum, p) => sum + p.stats.invalid_signal_count, 0),
    };
  }, [portfolios]);

  // Group portfolios by company for the picker; companies sorted A–Z,
  // members active-first then alphabetical.
  const byCompany = useMemo(() => {
    const groups = new Map<string, ExecutivePortfolioSummary[]>();
    for (const p of portfolios) {
      const org = p.organization || 'Other';
      if (!groups.has(org)) groups.set(org, []);
      groups.get(org)!.push(p);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([org, members]) => [
        org,
        members.sort((a, b) => {
          const aa = isArchived(a.status) ? 1 : 0;
          const bb = isArchived(b.status) ? 1 : 0;
          return aa - bb || a.full_name.localeCompare(b.full_name);
        }),
      ] as [string, ExecutivePortfolioSummary[]]);
  }, [portfolios]);

  if (status === 'loading') {
    return <div className="text-sm" style={{ color: 'var(--s-text-dim)' }}>Loading executive intelligence portfolios…</div>;
  }

  if (status === 'error') {
    return (
      <Card>
        <Badge tone="red">Load failed</Badge>
        <p className="mt-3 text-sm" style={{ color: 'var(--s-text)' }}>{error}</p>
      </Card>
    );
  }

  if (status === 'empty') {
    return (
      <Card>
        <Badge tone="yellow">No portfolios yet</Badge>
        <h2 className="mt-3 text-xl font-black" style={{ color: 'var(--s-text)' }}>No target portfolios found</h2>
        <p className="mt-2 text-sm leading-6" style={{ color: 'var(--s-text-dim)' }}>
          Run Executive Signal Scout against a target, then this review-only page will render the profile, sources, signals, and draft report from local artifacts.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <Badge tone="blue">Review-only portfolio builder</Badge>
            <h2 className="mt-3 text-2xl font-black" style={{ color: 'var(--s-text)' }}>Executive Intelligence Targets</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--s-text-dim)' }}>
              This page proves the pipeline can build reusable target portfolios and draft reports from Executive Signal Scout artifacts without DB writes, scheduling, or publication.
            </p>
          </div>
          <label className="w-full lg:w-96">
            <span className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text-dim)' }}>Target portfolio</span>
            <select
              className="sentry-input mt-2 w-full"
              value={selectedId}
              onChange={event => setSelectedId(event.target.value)}
              aria-label="Select executive intelligence target portfolio"
            >
              {byCompany.map(([org, members]) => (
                <optgroup key={org} label={org}>
                  {members.map(item => (
                    <option key={item.profile_id} value={item.profile_id}>{optionLabel(item)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <Badge tone="blue">ESG / Sustainability benchmark</Badge>
        <h2 className="mt-3 text-xl font-black" style={{ color: 'var(--s-text)' }}>Competitor &amp; Supplier CSO Watchlist</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--s-text-dim)' }}>
          Sustainability (Chief Sustainability Officer) benchmarking for Walmart Enterprise Security — Emerging Technology. Not a security benchmark.
        </p>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="Active execs" value={overview.active.length} />
          <StatCard label="Archived/stale" value={overview.archived.length} />
          <StatCard label="Total signals" value={overview.totalSignals} />
          <StatCard label="Total sources" value={overview.totalSources} />
          <StatCard label="CSO-ready" value={overview.totalCsoReady} />
          <StatCard label="Invalid signals" value={overview.totalInvalid} helper="Schema validation" />
        </div>
        <div className="mt-6">
          <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>Key findings</h3>
          <ul className="mt-3 space-y-2">
            {KEY_FINDINGS.map((finding, idx) => (
              <li key={idx} className="flex gap-2 text-sm leading-6" style={{ color: 'var(--s-text-dim)' }}>
                <span aria-hidden="true" style={{ color: '#0053E2' }}>▸</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs" style={{ color: 'var(--s-text-dim)' }}>
            Review-only. No DB writes, scheduling, or publication. Signals require analyst approval before CSO distribution.
          </p>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>Watchlist by company</h3>
        <div className="mt-4 space-y-5">
          {byCompany.map(([org, members]) => (
            <div key={org}>
              <div className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: 'var(--s-text-dim)' }}>{org}</div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {members.map(item => {
                  const archived = isArchived(item.status);
                  const selected = item.profile_id === selectedId;
                  return (
                    <button
                      key={item.profile_id}
                      type="button"
                      onClick={() => setSelectedId(item.profile_id)}
                      className="flex items-center gap-3 rounded-xl border p-2.5 text-left transition"
                      style={{
                        borderColor: selected ? '#0053E2' : 'var(--s-border)',
                        background: selected ? 'rgba(0,83,226,0.06)' : 'var(--s-card)',
                        opacity: archived ? 0.7 : 1,
                      }}
                      aria-pressed={selected}
                    >
                      <ExecutiveAvatar name={item.full_name} photoUrl={item.photo_url} size={40} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold" style={{ color: 'var(--s-text)' }}>{item.full_name}</div>
                        <div className="truncate text-xs" style={{ color: 'var(--s-text-dim)' }}>{archived ? '⚠ archived · ' : ''}{item.stats.signal_count} signals</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {selectedSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Sources" value={selectedSummary.stats.source_count} helper="Collected public source records" />
          <StatCard label="Signals" value={selectedSummary.stats.signal_count} helper="Normalized target intelligence items" />
          <StatCard label="Contract valid" value={`${selectedSummary.stats.valid_signal_count}/${selectedSummary.stats.signal_count}`} helper="Backend ExecutiveSignal validation" />
          <StatCard label="CSO-ready candidates" value={selectedSummary.stats.cso_ready_signal_count} helper="Still requires analyst approval" />
        </div>
      )}

      {error && (
        <Card>
          <Badge tone="red">Selected target error</Badge>
          <p className="mt-2 text-sm" style={{ color: 'var(--s-text)' }}>{error}</p>
        </Card>
      )}

      {portfolio && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-6">
            <Card>
              <div className="flex items-start gap-3">
                <ExecutiveAvatar name={portfolio.profile.full_name} photoUrl={portfolio.profile.photo_url} size={56} />
                <div className="min-w-0">
                  <h3 className="text-lg font-black" style={{ color: 'var(--s-text)' }}>{portfolio.profile.full_name}</h3>
                  <p className="mt-1 text-sm font-bold" style={{ color: 'var(--s-text-dim)' }}>{portfolio.profile.title}</p>
                  <p className="text-sm" style={{ color: 'var(--s-text-dim)' }}>{portfolio.profile.organization}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone={statusTone(portfolio.profile.status)}>{(portfolio.profile.status ?? 'ACTIVE').toUpperCase()}</Badge>
                {portfolio.profile.officer_type === 'CHIEF_SUSTAINABILITY_OFFICER' && <Badge tone="blue">ESG / Sustainability</Badge>}
                <Badge tone={portfolio.validation.profile_valid ? 'green' : 'red'}>{portfolio.validation.profile_valid ? 'Profile valid' : 'Profile invalid'}</Badge>
                <Badge tone={portfolio.stats.portfolio_ready_for_review ? 'green' : 'yellow'}>{portfolio.stats.portfolio_ready_for_review ? 'Ready for review' : 'Needs cleanup'}</Badge>
              </div>
              {portfolio.profile.stale_reason?.finding && (
                <div className="mt-4 rounded-xl border p-3 text-sm leading-6" style={{ borderColor: 'rgba(234,17,0,0.28)', background: 'rgba(234,17,0,0.06)', color: 'var(--s-text-dim)' }}>
                  <strong style={{ color: '#EA1100' }}>Archived: </strong>{portfolio.profile.stale_reason.finding}
                  {portfolio.profile.stale_reason.superseded_by && (
                    <div className="mt-1 text-xs">Superseded by: {portfolio.profile.stale_reason.superseded_by}</div>
                  )}
                </div>
              )}
              {portfolio.profile.discovery_result?.finding && (
                <p className="mt-4 text-sm leading-6" style={{ color: 'var(--s-text-dim)' }}><strong>Discovery: </strong>{portfolio.profile.discovery_result.finding}</p>
              )}
              {svpConclusionText(portfolio.profile.title_svp_conclusion) && (
                <p className="mt-4 text-sm leading-6" style={{ color: 'var(--s-text-dim)' }}>{svpConclusionText(portfolio.profile.title_svp_conclusion)}</p>
              )}
            </Card>

            <Card>
              <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>Source policy</h3>
              <div className="mt-4 space-y-2">
                {Object.entries(portfolio.source_policy.counts).map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--s-text-dim)' }}>{label}</span>
                    <Badge tone={label.startsWith('ALLOWED') ? 'green' : 'red'}>{count}</Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text)' }}>Draft report</h3>
              <p className="mt-2 text-sm" style={{ color: 'var(--s-text-dim)' }}>
                {report?.latest_brief?.name ?? 'No brief artifact found'}
              </p>
              <Badge tone="yellow">{report?.publication_status ?? 'NOT_PUBLISHED_REVIEW_REQUIRED'}</Badge>
            </Card>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <Card>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black" style={{ color: 'var(--s-text)' }}>Signals</h3>
                <Badge tone="gray">{portfolio.signals.length} items</Badge>
              </div>
              <div className="mt-4 space-y-4">
                {portfolio.signals.map(signal => (
                  <article key={`${signal._artifact_file}-${signal.signal_id}`} className="rounded-xl border p-4" style={{ borderColor: 'var(--s-border-light)', background: 'var(--s-input-bg)' }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={verificationTone(signal.verification_status)}>{signal.verification_status}</Badge>
                      <Badge tone="gray">{signal.category}</Badge>
                      <span className="text-xs" style={{ color: 'var(--s-text-dim)' }}>{signal.event_date ?? 'UNKNOWN DATE'}</span>
                    </div>
                    <h4 className="mt-3 font-black" style={{ color: 'var(--s-text)' }}>{signal.title}</h4>
                    <p className="mt-2 text-sm leading-6" style={{ color: 'var(--s-text-dim)' }}>{signal.summary}</p>
                    <p className="mt-3 text-sm leading-6" style={{ color: 'var(--s-text)' }}><strong>Walmart CSO relevance:</strong> {signal.walmart_cso_relevance}</p>
                    {signal.citations?.length > 0 && (
                      <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--s-border-light)' }}>
                        <div className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text-dim)' }}>Citations ({signal.citations.length})</div>
                        <ul className="mt-2 space-y-1">
                          {signal.citations.map(citation => (
                            <li key={citation.citation_id} className="text-xs leading-5">
                              <a href={citation.url} target="_blank" rel="noreferrer" className="underline" style={{ color: '#0053E2' }}>{citation.source_title || citation.url}</a>
                              <span style={{ color: 'var(--s-text-dim)' }}> · {citation.source_quality}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-black" style={{ color: 'var(--s-text)' }}>Latest draft brief</h3>
              <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl border p-4 text-sm leading-6" style={{ color: 'var(--s-text)', borderColor: 'var(--s-border-light)', background: 'var(--s-input-bg)' }}>
                {report?.markdown || 'No draft brief loaded.'}
              </pre>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExecutiveIntelPortfolio;
