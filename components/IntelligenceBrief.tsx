/**
 * IntelligenceBrief - the dashboard's "what do I need to know?" strip.
 *
 * Merges the four intelligence domains (incidents, competitor, regulatory)
 * into (1) since-window delta tiles and (2) a single ranked "needs your
 * attention" feed. Answers the CSO's morning question without making them
 * hop across five pages.
 */
import React, { useEffect, useState } from 'react';
import { ViewState } from '../types';
import { fetchIntelDigest, type IntelDigestResponse, type IntelAttentionItem } from '../services/api';

interface Props {
  onNavigate: (v: ViewState) => void;
}

const DOMAIN_STYLE: Record<string, { color: string; icon: string }> = {
  Incident:   { color: '#ea1100', icon: '🛡️' },
  Competitor: { color: '#f97316', icon: '👁️' },
  Regulatory: { color: '#0053e2', icon: '⚖️' },
};

function sevColor(sev: string): string {
  const s = (sev || '').toLowerCase();
  if (s.includes('crit') || s.includes('cso')) return '#ea1100';
  if (s.includes('high') || s.includes('leader')) return '#f97316';
  if (s.includes('med') || s.includes('analyst')) return '#ffc220';
  if (s.includes('low')) return '#2a8703';
  return '#7893b8';
}

function DeltaTile({ icon, label, value, sub, color, onClick }: {
  icon: string; label: string; value: number; sub: string; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl p-4 border transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
      style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}
      aria-label={`${label}: ${value}. ${sub}. Open ${label}.`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm">{icon}</span>
        <span className="text-2xl font-black" style={{ color }}>{value}</span>
      </div>
      <div className="mt-1 text-xs font-bold" style={{ color: 'var(--s-text)' }}>{label}</div>
      <div className="text-[11px]" style={{ color: 'var(--s-text-dim)' }}>{sub}</div>
    </button>
  );
}

function AttentionRow({ item, onNavigate }: { item: IntelAttentionItem; onNavigate: (v: ViewState) => void }) {
  const ds = DOMAIN_STYLE[item.domain] ?? { color: '#7893b8', icon: '•' };
  return (
    <button
      onClick={() => onNavigate(item.view as ViewState)}
      className="w-full text-left flex items-start gap-3 py-2.5 px-2 rounded-lg transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2"
      style={{ borderBottom: '1px solid var(--s-border)' }}
    >
      <span
        className="shrink-0 mt-0.5 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md"
        style={{ background: `${ds.color}1a`, color: ds.color, border: `1px solid ${ds.color}55` }}
      >
        {item.domain}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {item.severity && (
            <span className="text-[10px] font-black" style={{ color: sevColor(item.severity) }}>
              {item.severity.slice(0, 8).toUpperCase()}
            </span>
          )}
          <span className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>{item.date}</span>
        </div>
        <p className="text-[13px] font-semibold leading-snug truncate" style={{ color: 'var(--s-text)' }}>{item.title}</p>
        {item.why && (
          <p className="text-[11px] leading-snug mt-0.5 line-clamp-2" style={{ color: 'var(--s-text-muted)' }}>
            <span style={{ color: 'var(--s-text-dim)' }}>Why it matters: </span>{item.why}
          </p>
        )}
      </div>
    </button>
  );
}

export function IntelligenceBrief({ onNavigate }: Props) {
  const [digest, setDigest] = useState<IntelDigestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchIntelDigest(7, 8)
      .then(setDigest)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}
      aria-label="Intelligence brief"
    >
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(90deg, rgba(234,17,0,0.08), rgba(0,83,226,0.08))' }}
      >
        <div>
          <h3 className="text-sm font-black tracking-wide" style={{ color: 'var(--s-text)' }}>
            🧭 Intelligence Brief — what you need to know
          </h3>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--s-text-dim)' }}>
            Across incidents, competitors &amp; regulatory · last 7 days
          </p>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
          style={{ background: 'rgba(42,135,3,0.12)', color: '#4ade80', border: '1px solid rgba(42,135,3,0.3)' }}
        >
          LIVE
        </span>
      </div>

      <div className="p-5">
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded animate-pulse" style={{ background: 'var(--s-border)' }} />
            ))}
          </div>
        )}

        {error && !loading && (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--s-text-dim)' }}>
            Backend offline — start the FastAPI server to see the brief.
          </p>
        )}

        {digest && !loading && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <DeltaTile icon="🛡️" label="Incidents" value={digest.deltas.incidents.count} sub="new this week" color="#ea1100" onClick={() => onNavigate(ViewState.INCIDENT_INTELLIGENCE)} />
              <DeltaTile icon="👁️" label="Competitor" value={digest.deltas.competitor.count} sub="new events" color="#f97316" onClick={() => onNavigate(ViewState.COMPETITOR_INTEL)} />
              <DeltaTile icon="⚖️" label="Reg — Red" value={digest.deltas.regulatory.red} sub="obligations" color="#ea1100" onClick={() => onNavigate(ViewState.REGULATORY_INTELLIGENCE)} />
              <DeltaTile icon="🟠" label="Reg — Amber" value={digest.deltas.regulatory.amber} sub="obligations" color="#f97316" onClick={() => onNavigate(ViewState.REGULATORY_INTELLIGENCE)} />
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--s-text-dim)' }}>
              Top items needing your attention
            </p>
            {digest.attention.length === 0 ? (
              <p className="text-xs py-3" style={{ color: 'var(--s-text-dim)' }}>Nothing flagged in the last 7 days. 🎉</p>
            ) : (
              <div>
                {digest.attention.map((item, i) => (
                  <AttentionRow key={i} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default IntelligenceBrief;
