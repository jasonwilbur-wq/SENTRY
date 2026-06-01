import React, { useState } from 'react';
import { generateCSOBrief, type CSOBriefGenerateResponse } from '../../services/api';
import { formatApiError } from './csoBriefUiHelpers';

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export const CSOBriefGeneratePage: React.FC = () => {
  const [title, setTitle] = useState('Weekly CSO Competitive Brief');
  const [periodStart, setPeriodStart] = useState(isoDaysAgo(7));
  const [periodEnd, setPeriodEnd] = useState(isoToday());
  const [dateFrom, setDateFrom] = useState(isoDaysAgo(7));
  const [dateTo, setDateTo] = useState(isoToday());
  const [maxItems, setMaxItems] = useState(20);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<CSOBriefGenerateResponse['preflight'] | null>(null);
  const [generatedBriefId, setGeneratedBriefId] = useState<string | null>(null);

  const topExclusionReasons = Object.entries(preflight?.exclusion_reason_counts ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const blockedCount = preflight?.excluded_count ?? 0;
  const actionableCount = preflight?.included_count ?? 0;

  const onGenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      setPreflight(null);
      setGeneratedBriefId(null);
      const res = await generateCSOBrief({
        title,
        period_start: periodStart,
        period_end: periodEnd,
        filters: {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          max_items: maxItems,
        },
      });
      setPreflight(res.preflight);
      setGeneratedBriefId(res.brief.id);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <header className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
        <h1 className="text-xl font-bold" style={{ color: 'var(--s-text)' }}>Generate CSO Brief</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--s-text-muted)' }}>
          Create a new draft brief from qualifying competitor events, then continue in editor.
        </p>
      </header>

      {error && (
        <div className="rounded-md border px-3 py-2 text-xs bg-red-500/10 border-red-500/30 text-red-300">
          {error}
        </div>
      )}

      {preflight && (
        <section className="rounded-xl border p-4 space-y-2" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>Generation preflight summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div>Candidates: <span className="font-bold">{preflight.candidate_count}</span></div>
            <div>Included: <span className="font-bold text-green-400">{preflight.included_count}</span></div>
            <div>Excluded: <span className="font-bold text-orange-400">{preflight.excluded_count}</span></div>
          </div>
          <p className="text-xs" style={{ color: 'var(--s-text-muted)' }}>
            Validation readiness: {preflight.included_count > 0 ? 'Likely viable draft items included.' : 'No ready items included — expect manual triage required.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="rounded border px-2 py-1" style={{ borderColor: 'var(--s-border)' }}>
              <span className="font-semibold" style={{ color: '#2a8703' }}>Actionable now:</span> {actionableCount}
            </div>
            <div className="rounded border px-2 py-1" style={{ borderColor: 'var(--s-border)' }}>
              <span className="font-semibold" style={{ color: '#995213' }}>Blocked by readiness:</span> {blockedCount}
            </div>
          </div>
          {topExclusionReasons.length > 0 && (
            <div className="text-xs">
              <p className="font-semibold mb-1" style={{ color: 'var(--s-text)' }}>Top exclusion reasons</p>
              <ul className="list-disc pl-5 space-y-0.5" style={{ color: 'var(--s-text-muted)' }}>
                {topExclusionReasons.map(([code, count]) => (
                  <li key={code}>{code}: {count}</li>
                ))}
              </ul>
            </div>
          )}

          {generatedBriefId && (
            <button
              type="button"
              onClick={() => window.location.assign(`/cso-briefs/${encodeURIComponent(generatedBriefId)}/edit`)}
              className="px-3 py-2 rounded text-xs font-bold border"
              style={{ borderColor: '#0053e2', color: '#9BB7DF' }}
            >
              Open draft brief editor
            </button>
          )}
        </section>
      )}

      <section className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Title</label>
          <input className="sentry-input w-full text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Period start</label>
            <input type="date" className="sentry-input w-full text-sm" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Period end</label>
            <input type="date" className="sentry-input w-full text-sm" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Filter date from</label>
            <input type="date" className="sentry-input w-full text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Filter date to</label>
            <input type="date" className="sentry-input w-full text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--s-text-muted)' }}>Max items</label>
            <input
              type="number"
              min={1}
              max={100}
              className="sentry-input w-full text-sm"
              value={maxItems}
              onChange={(e) => setMaxItems(Math.max(1, Math.min(100, Number(e.target.value) || 20)))}
            />
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={busy}
          className="px-3 py-2 rounded text-xs font-bold border disabled:opacity-40"
          style={{ borderColor: 'var(--s-border-mid)', color: 'var(--s-text)' }}
        >
          {busy ? 'Generating…' : 'Generate draft brief'}
        </button>
      </section>
    </div>
  );
};
