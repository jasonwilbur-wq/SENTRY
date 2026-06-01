/**
 * TrendInsights - shared "What Changed" analytics strip.
 *
 * Consumes the server-computed TrendPayload from /api/{incidents,regulatory}/trends
 * and renders V1+V2+V3 value-adds:
 *   V1  momentum summary (delta + direction + pct) and top movers
 *   V2  severity/RAG-weighted trend alongside raw counts
 *   V3  anomaly/spike badges on the trend bars
 *
 * Domain-agnostic: pass any TrendPayload. Used by Incident and Regulatory pages.
 */
import React, { useMemo } from 'react';
import type { TrendPayload, TrendPoint, TrendSummary, TrendMover } from '../services/api';

const DIR: Record<string, { glyph: string; color: string; label: string }> = {
  up: { glyph: '\u25B2', color: '#ea1100', label: 'rising' },
  down: { glyph: '\u25BC', color: '#2a8703', label: 'cooling' },
  flat: { glyph: '=', color: '#7893b8', label: 'steady' },
};

function pct(p: number | null | undefined): string {
  if (p === null || p === undefined) return '\u2014';
  return `${p >= 0 ? '+' : ''}${p}%`;
}

function MomentumCard({ title, summary, accent }: { title: string; summary: TrendSummary; accent: string }) {
  const d = DIR[summary.direction] ?? DIR.flat;
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-1"
      style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>
        {title}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black" style={{ color: accent }}>{summary.latest_value}</span>
        <span className="text-sm font-black" style={{ color: d.color }} aria-hidden>{d.glyph}</span>
        <span className="text-xs font-bold" style={{ color: d.color }}>{pct(summary.pct_change)}</span>
      </div>
      <span className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>
        {summary.latest_period ?? 'n/a'} vs prior ({summary.previous_value}) - {d.label}
      </span>
      {summary.anomaly_count > 0 && (
        <span className="text-[10px] font-bold mt-0.5" style={{ color: '#FFC220' }}>
          {'\u26A0\uFE0F'} {summary.anomaly_count} spike{summary.anomaly_count > 1 ? 's' : ''} flagged
        </span>
      )}
    </div>
  );
}

function DualTrendChart({ series, weighted }: { series: TrendPoint[]; weighted: TrendPoint[] }) {
  const maxCount = Math.max(...series.map((p) => p.count), 1);
  const maxW = Math.max(...weighted.map((p) => p.weighted), 1);
  return (
    <div
      className="rounded-xl border p-5 lg:col-span-2"
      style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>
          Volume vs. Risk-Weighted Trend
        </h3>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--s-text-dim)' }}>
          <span className="flex items-center gap-1">
            <i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#0053e2' }} /> count
          </span>
          <span className="flex items-center gap-1">
            <i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#FFC220' }} /> weighted
          </span>
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-32">
        {series.map((p, i) => {
          const w = weighted[i];
          const ch = Math.max((p.count / maxCount) * 100, 3);
          const wh = w ? Math.max((w.weighted / maxW) * 100, 2) : 0;
          return (
            <div
              key={p.period}
              className="flex-1 flex flex-col items-center justify-end gap-1 group relative"
              title={`${p.period}: ${p.count} events (weighted ${p.weighted})${p.is_anomaly ? ' - SPIKE' : ''}`}
            >
              {p.is_anomaly && <span className="text-[10px] leading-none" aria-label="anomaly">{'\u26A0\uFE0F'}</span>}
              <div className="w-full flex items-end justify-center gap-[2px] h-full">
                <div
                  className="w-1/2 rounded-t transition-all duration-500"
                  style={{ height: `${ch}%`, background: p.is_anomaly ? '#ea1100' : '#0053e2' }}
                />
                <div
                  className="w-1/2 rounded-t transition-all duration-500"
                  style={{ height: `${wh}%`, background: '#FFC220', opacity: 0.85 }}
                />
              </div>
              <span className="text-[8px] font-mono" style={{ color: 'var(--s-text-dim)' }}>
                {p.period.slice(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopMovers({ movers }: { movers: TrendMover[] }) {
  if (movers.length === 0) return null;
  return (
    <div className="rounded-xl border p-5" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--s-text-dim)' }}>
        Top Movers (latest vs prior)
      </h3>
      <div className="space-y-2">
        {movers.map((m) => {
          const d = DIR[m.direction] ?? DIR.flat;
          return (
            <div key={m.category} className="flex items-center justify-between gap-2">
              <span className="text-xs truncate" style={{ color: 'var(--s-text-muted)' }} title={m.category}>
                {m.category}
              </span>
              <span className="text-xs font-bold whitespace-nowrap" style={{ color: d.color }}>
                {d.glyph} {m.delta >= 0 ? '+' : ''}{m.delta}
                <span className="ml-1 opacity-70">({pct(m.pct_change)})</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TrendInsights({ data, title = '\u{1F4C8} What Changed' }: { data: TrendPayload | null; title?: string }) {
  const hasData = useMemo(() => !!data && data.series.length > 0, [data]);
  if (!hasData || !data) return null;

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
        <h2 className="text-2xl font-bold">{title}</h2>
        <span className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>
          {data.weighting} - {data.frequency}
        </span>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--s-text-dim)' }}>
        Momentum, risk-weighted volume, and spike detection - leads with "what's
        getting worse?" rather than a flat total. Latest period may be partial.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <MomentumCard title="Volume Momentum" summary={data.summary} accent="#9BB7DF" />
        <MomentumCard title="Risk-Weighted Momentum" summary={data.weighted_summary} accent="#FFC220" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DualTrendChart series={data.series} weighted={data.weighted_series} />
        <TopMovers movers={data.top_movers} />
      </div>
    </div>
  );
}

export default TrendInsights;
