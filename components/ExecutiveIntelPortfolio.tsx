import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ExecutivePortfolio,
  ExecutivePortfolioSummary,
  ExecutiveReport,
  fetchExecutivePortfolio,
  fetchExecutivePortfolios,
  fetchExecutiveReport,
} from '../services/executiveIntelApi';
import { Badge, Card, StatCard, ExecutiveAvatar } from './executiveIntel/ui';
import { SignalFeed } from './executiveIntel/SignalFeed';
import { ReviewQueue } from './executiveIntel/ReviewQueue';
import { MomentumPanel, MoveTable } from './executiveIntel/MovesAndMomentum';
import { ComparisonRail } from './executiveIntel/ComparisonRail';
import {
  KEY_FINDINGS,
  groupByCompany,
  isArchived,
  optionLabel,
  statusTone,
  svpConclusionText,
} from './executiveIntel/profileLogic';

export function ExecutiveIntelPortfolio() {
  const [portfolios, setPortfolios] = useState<ExecutivePortfolioSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [portfolio, setPortfolio] = useState<ExecutivePortfolio | null>(null);
  const [report, setReport] = useState<ExecutiveReport | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [error, setError] = useState('');
  const profileRef = useRef<HTMLDivElement | null>(null);

  // Select a target and smoothly scroll the profile detail into view.
  const selectAndScroll = (id: string) => {
    setSelectedId(id);
    requestAnimationFrame(() => {
      profileRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

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

  const byCompany = useMemo(() => groupByCompany(portfolios), [portfolios]);

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
              Competitor &amp; supplier C-suite benchmarking from Executive Signal Scout artifacts. Review-only: no DB writes, scheduling, or publication.
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
          <StatCard label="CSO-ready" value={overview.totalCsoReady} tone="green" />
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
                      onClick={() => selectAndScroll(item.profile_id)}
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

      <ComparisonRail portfolios={portfolios} selectedId={selectedId} onSelect={selectAndScroll} />

      {selectedSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Sources" value={selectedSummary.stats.source_count} helper="Collected public source records" />
          <StatCard label="Signals" value={selectedSummary.stats.signal_count} helper="Normalized target intelligence items" />
          <StatCard label="Contract valid" value={selectedSummary.stats.valid_signal_count + '/' + selectedSummary.stats.signal_count} helper="Backend ExecutiveSignal validation" />
          <StatCard label="CSO-ready candidates" value={selectedSummary.stats.cso_ready_signal_count} helper="Still requires analyst approval" tone="green" />
        </div>
      )}

      {error && (
        <Card>
          <Badge tone="red">Selected target error</Badge>
          <p className="mt-2 text-sm" style={{ color: 'var(--s-text)' }}>{error}</p>
        </Card>
      )}

      {portfolio && (
        <div ref={profileRef} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
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
              {portfolio.profile.focus_topics && portfolio.profile.focus_topics.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--s-text-dim)' }}>Focus topics</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {portfolio.profile.focus_topics.map(topic => (
                      <span key={topic} className="rounded-md px-2 py-0.5 text-xs" style={{ background: 'var(--s-input-bg)', color: 'var(--s-text-dim)' }}>{topic}</span>
                    ))}
                  </div>
                </div>
              )}
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

            <MomentumPanel signals={portfolio.signals} />

            <ReviewQueue signals={portfolio.signals} />

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
            <MoveTable signals={portfolio.signals} />

            <SignalFeed signals={portfolio.signals} />

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
