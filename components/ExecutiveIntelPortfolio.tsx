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

const verificationTone = (status?: string): 'blue' | 'green' | 'yellow' | 'red' | 'gray' => {
  if (status === 'VERIFIED') return 'green';
  if (status === 'PARTIALLY_VERIFIED') return 'blue';
  if (status === 'LEAD_ONLY') return 'yellow';
  if (status === 'REJECTED' || status === 'CONFLICTING') return 'red';
  return 'gray';
};

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
              {portfolios.map(item => (
                <option key={item.profile_id} value={item.profile_id}>{item.full_name} · {item.organization}</option>
              ))}
            </select>
          </label>
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
              <h3 className="text-lg font-black" style={{ color: 'var(--s-text)' }}>{portfolio.profile.full_name}</h3>
              <p className="mt-1 text-sm font-bold" style={{ color: 'var(--s-text-dim)' }}>{portfolio.profile.title}</p>
              <p className="text-sm" style={{ color: 'var(--s-text-dim)' }}>{portfolio.profile.organization}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone={portfolio.validation.profile_valid ? 'green' : 'red'}>{portfolio.validation.profile_valid ? 'Profile valid' : 'Profile invalid'}</Badge>
                <Badge tone={portfolio.stats.portfolio_ready_for_review ? 'green' : 'yellow'}>{portfolio.stats.portfolio_ready_for_review ? 'Ready for review' : 'Needs cleanup'}</Badge>
              </div>
              {portfolio.profile.title_svp_conclusion && (
                <p className="mt-4 text-sm leading-6" style={{ color: 'var(--s-text-dim)' }}>{portfolio.profile.title_svp_conclusion}</p>
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
