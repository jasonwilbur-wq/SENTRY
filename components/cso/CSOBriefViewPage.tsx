import React, { useEffect, useState } from 'react';
import { fetchCSOBriefSnapshot } from '../../services/api';
import type { CSOBriefSnapshot } from './csoBriefTypes';
import { formatApiError, statusChipStyles } from './csoBriefUiHelpers';

export const CSOBriefViewPage: React.FC<{ briefId: string }> = ({ briefId }) => {
  const [snapshot, setSnapshot] = useState<CSOBriefSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCSOBriefSnapshot(briefId)
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch((err) => {
        if (!cancelled) setError(formatApiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [briefId]);

  if (loading) return <div className="p-6 text-sm" style={{ color: 'var(--s-text-muted)' }}>Loading snapshot…</div>;
  if (error) return <div className="p-6 text-sm text-red-300">{error}</div>;
  if (!snapshot) return <div className="p-6 text-sm text-red-300">Snapshot not found.</div>;

  return (
    <div className="p-6 space-y-4">
      <header className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--s-text)' }}>{snapshot.title}</h1>
            <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>
              {snapshot.period_start} → {snapshot.period_end}
            </p>
          </div>
          <span className={`px-3 py-1 rounded border text-xs font-bold ${statusChipStyles(snapshot.status)}`}>
            {snapshot.status}
          </span>
        </div>

        <div className="rounded-md border px-3 py-2 text-xs font-bold bg-amber-500/10 border-amber-500/30 text-amber-300">
          {snapshot.banner}
        </div>
      </header>

      <section className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
        <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--s-text)' }}>Executive summary</h2>
        <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--s-text-muted)' }}>
          {snapshot.executive_summary || '—'}
        </p>
      </section>

      <section className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
        <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--s-text)' }}>Top priorities</h2>
        <div className="space-y-3">
          {snapshot.items.map((item, idx) => (
            <article key={`${item.rank}-${idx}`} className="rounded-lg border p-3" style={{ borderColor: 'var(--s-border)' }}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>
                  #{item.rank} · {item.competitor} — {item.event_title}
                </p>
                <span className="text-xs" style={{ color: 'var(--s-text-muted)' }}>
                  {item.confidence_level || 'unknown'} confidence
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs" style={{ color: 'var(--s-text-muted)' }}>
                <p><span className="font-bold">Rationale:</span> {item.why_walmart_cares || '—'}</p>
                <p><span className="font-bold">Actionability:</span> {item.walmart_actionability_context || '—'}</p>
                <p><span className="font-bold">Correlation:</span> {item.correlation_summary || '—'}</p>
                <p><span className="font-bold">Owner:</span> {item.owner_assignment || '—'}</p>
                <p><span className="font-bold">Uncertainty:</span> {item.uncertainty_note || '—'}</p>
                <p>
                  <span className="font-bold">Source:</span>{' '}
                  {item.source_link ? (
                    <a href={item.source_link} className="text-blue-300 underline break-all" target="_blank" rel="noreferrer">
                      {item.source_link}
                    </a>
                  ) : '—'}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="rounded-md border px-3 py-2 text-xs font-bold bg-slate-500/10 border-slate-500/30" style={{ color: 'var(--s-text-muted)' }}>
        {snapshot.footer}
      </footer>
    </div>
  );
};
