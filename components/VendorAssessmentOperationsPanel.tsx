import React, { useEffect, useMemo, useState } from 'react';
import { ViewState } from '../types';
import {
  fetchVendorAssessmentOverview,
  type VendorAssessmentOverview,
  type VendorAssessmentOpsItem,
} from '../services/api';

interface VendorAssessmentOperationsPanelProps {
  onNavigate: (view: ViewState) => void;
}

function MetricCard({ label, value, tone = 'blue' }: { label: string; value: number | string; tone?: 'blue' | 'green' | 'amber' | 'violet'; }) {
  const tones = {
    blue:   { text: '#9BB7DF', border: 'rgba(120,147,184,0.25)', glow: 'rgba(120,147,184,0.10)' },
    green:  { text: '#34d399', border: 'rgba(52,211,153,0.25)', glow: 'rgba(52,211,153,0.10)' },
    amber:  { text: '#fbbf24', border: 'rgba(251,191,36,0.25)', glow: 'rgba(251,191,36,0.10)' },
    violet: { text: '#7893B8', border: 'rgba(120,147,184,0.25)', glow: 'rgba(120,147,184,0.10)' },
  } as const;
  const palette = tones[tone];

  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: palette.glow,
        border: `1px solid ${palette.border}`,
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: 'var(--s-text-dim)' }}>{label}</p>
      <p className="text-xl font-black mt-1" style={{ color: palette.text }}>{value}</p>
    </div>
  );
}

function formatDomainLabel(value: string): string {
  return value.replaceAll('_', ' ');
}

function CompactVendorList({
  items,
  emptyText,
  secondaryKey,
}: {
  items: VendorAssessmentOpsItem[];
  emptyText: string;
  secondaryKey: 'latest_modified_utc' | 'secondary_domains';
}) {
  if (items.length === 0) {
    return <p className="text-xs py-5 text-center" style={{ color: 'var(--s-text-dim)' }}>{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={`${item.vendor_folder}-${item.report_count}-${item.dominant_domain}`}
          className="rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--s-border-light)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--s-text)' }}>{item.vendor_folder}</p>
              <p className="text-[11px] truncate" style={{ color: 'var(--s-text-dim)' }}>
                {formatDomainLabel(item.dominant_domain)}
                {secondaryKey === 'secondary_domains' && item.secondary_domains ? ` · ${item.secondary_domains.split(';').map(formatDomainLabel).join(' · ')}` : ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold" style={{ color: '#60a5fa' }}>{item.report_count} reports</p>
              <p className="text-[10px]" style={{ color: 'var(--s-text-faint)' }}>
                {secondaryKey === 'latest_modified_utc'
                  ? (item.latest_modified_utc ? item.latest_modified_utc.slice(0, 10) : '—')
                  : 'watch'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DomainLeaderGrid({ leaders }: { leaders: VendorAssessmentOverview['domain_leaders'] }) {
  const labels: Record<string, string> = {
    cybersecurity: 'Cybersecurity',
    drone_cuas: 'Drone / C-UAS',
    robotics: 'Robotics',
    identity: 'Identity / Biometrics',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {Object.entries(labels).map(([key, label]) => {
        const rows = leaders[key] ?? [];
        return (
          <div key={key} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--s-border-light)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold" style={{ color: 'var(--s-text)' }}>{label}</p>
              <span className="text-[10px]" style={{ color: '#93c5fd' }}>Top {rows.length}</span>
            </div>
            <div className="space-y-2">
              {rows.slice(0, 4).map((row) => (
                <div key={`${key}-${row.vendor_folder}`} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate" style={{ color: 'var(--s-text-muted)' }}>{row.vendor_folder}</span>
                  <span className="shrink-0 font-bold" style={{ color: '#fcd34d' }}>{row.report_count}</span>
                </div>
              ))}
              {rows.length === 0 && <p className="text-[11px]" style={{ color: 'var(--s-text-dim)' }}>No leaders available.</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const VendorAssessmentOperationsPanel: React.FC<VendorAssessmentOperationsPanelProps> = ({ onNavigate }) => {
  const [overview, setOverview] = useState<VendorAssessmentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchVendorAssessmentOverview({ recent_limit: 6, watchlist_limit: 6, leaders_limit: 5 })
      .then((data) => {
        if (cancelled) return;
        setOverview(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load vendor assessment operations.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const topDomains = useMemo(() => {
    if (!overview) return [] as Array<{ label: string; count: number }>;
    return Object.entries(overview.stats.domain_counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({ label: label.replaceAll('_', ' '), count }));
  }, [overview]);

  return (
    <section
      className="rounded-2xl p-5 space-y-4"
      style={{ background: 'var(--s-card)', border: '1px solid var(--s-border)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#FFC220' }}>
            Operational source online
          </p>
          <h3 className="text-base font-bold mt-1" style={{ color: 'var(--s-text)' }}>
            Vendor assessment operations are now anchored to 00_System
          </h3>
          <p className="text-xs mt-1 max-w-3xl" style={{ color: 'var(--s-text-dim)' }}>
            SENTRY is reading the documented intake and executive-view layer directly from the Desktop SENTRY vendor assessment system.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate(ViewState.ADMIN)}
            className="px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(0,83,226,0.12)', color: '#9BB7DF', border: '1px solid rgba(0,83,226,0.28)' }}
          >
            Open VAR admin
          </button>
          <button
            onClick={() => onNavigate(ViewState.DIRECTORY)}
            className="px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(255,194,32,0.10)', color: '#fcd34d', border: '1px solid rgba(255,194,32,0.25)' }}
          >
            Open directory
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-xs" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard label="Vendor profiles" value={loading ? '…' : (overview?.stats.vendor_profiles_total ?? 0).toLocaleString()} tone="blue" />
        <MetricCard label="Intake queue" value={loading ? '…' : overview?.stats.active_intake_items ?? 0} tone="green" />
        <MetricCard label="Recent additions" value={loading ? '…' : overview?.stats.recent_additions_count ?? 0} tone="amber" />
        <MetricCard label="Multi-domain watch" value={loading ? '…' : overview?.stats.multi_domain_watchlist_count ?? 0} tone="violet" />
        <MetricCard label="Unknown domains" value={loading ? '…' : overview?.stats.unknown_domain_profiles ?? 0} tone="amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--s-border-light)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>Process controls</h4>
              <p className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Read-only operational backbone</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: overview?.source.available.system_root ? '#34d399' : '#f87171' }}>
              {overview?.source.available.system_root ? 'online' : 'missing'}
            </span>
          </div>
          <div className="space-y-2 text-xs" style={{ color: 'var(--s-text-dim)' }}>
            <p><span className="font-semibold text-slate-200">Intake:</span> {overview?.process.intake_rule ?? 'Loading…'}</p>
            <p><span className="font-semibold text-slate-200">Routing:</span> {overview?.process.routing_rule ?? 'Loading…'}</p>
            <p><span className="font-semibold text-slate-200">Persistence:</span> {overview?.process.persistence_rule ?? 'Loading…'}</p>
            <p><span className="font-semibold text-slate-200">Safety:</span> {overview?.process.safety_rule ?? 'Loading…'}</p>
          </div>
          {overview && (
            <div className="mt-3 pt-3 border-t text-[11px] break-all" style={{ borderColor: 'var(--s-border-light)', color: 'var(--s-text-faint)' }}>
              Source: {overview.source.operational_source}
            </div>
          )}
        </div>

        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--s-border-light)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>Recent report additions</h4>
              <p className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Freshest movement in the vendor library</p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-slate-800/40 animate-pulse" />)}</div>
          ) : (
            <CompactVendorList items={overview?.recent_additions ?? []} emptyText="No recent additions are currently logged." secondaryKey="latest_modified_utc" />
          )}
        </div>

        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--s-border-light)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>Multi-domain watchlist</h4>
              <p className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Vendors with broader platform overlap</p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-slate-800/40 animate-pulse" />)}</div>
          ) : (
            <CompactVendorList items={overview?.multi_domain_watchlist ?? []} emptyText="No multi-domain vendors are currently flagged." secondaryKey="secondary_domains" />
          )}
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--s-border-light)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>Top domains in the operational corpus</h4>
            <p className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Current distribution from vendor assessment profiles</p>
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--s-text-faint)' }}>
            00_System
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {topDomains.map((domain) => (
            <div key={domain.label} className="rounded-lg px-3 py-2" style={{ background: 'rgba(0,0,0,0.16)', border: '1px solid var(--s-border-light)' }}>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--s-text-faint)' }}>{domain.label}</p>
              <p className="text-lg font-black mt-1" style={{ color: '#93c5fd' }}>{domain.count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--s-border-light)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>Executive domain leaders</h4>
            <p className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Fast paths into the vendors leadership will ask about first</p>
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-slate-800/40 animate-pulse" />)}
          </div>
        ) : (
          <DomainLeaderGrid leaders={overview?.domain_leaders ?? {}} />
        )}
      </div>
    </section>
  );
};
