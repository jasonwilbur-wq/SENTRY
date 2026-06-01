/**
 * IncidentIntelligence — Retail incident tracking dashboard.
 *
 * 325+ incidents imported from SENTRY incident CSVs.
 * Features: KPI tiles, severity breakdown, type chart, regional heatmap,
 * monthly trend, and a searchable/filterable incident table.
 */
import React, { useState, useEffect, useCallback } from 'react';
import type { Incident, IncidentStats, IncidentSeverity } from '../types';
import {
  fetchIncidentStats,
  fetchIncidents,
  fetchIncidentFilters,
  type IncidentQuery,
} from '../services/api';
import { Pagination } from './Pagination';

// ── Severity colour map ───────────────────────────────────────────────────

const SEV_STYLE: Record<IncidentSeverity, { bg: string; text: string; border: string; bar: string }> = {
  Critical: { bg: 'rgba(234,17,0,0.14)',    text: '#ff6b6b', border: 'rgba(234,17,0,0.45)',    bar: '#ea1100' },
  High:     { bg: 'rgba(249,115,22,0.14)', text: '#fb923c', border: 'rgba(249,115,22,0.45)',  bar: '#f97316' },
  Medium:   { bg: 'rgba(255,194,32,0.14)', text: '#FFC220', border: 'rgba(255,194,32,0.45)',  bar: '#FFC220' },
  Low:      { bg: 'rgba(42,135,3,0.14)',   text: '#4ade80', border: 'rgba(42,135,3,0.45)',    bar: '#2a8703' },
};

const TYPE_ICONS: Record<string, string> = {
  'Retail Theft Arrests':    '🚔',
  'Cargo Theft':             '🚚',
  'Cyber Incident':          '💻',
  'Data Breach':             '🔓',
  'ORC':                     '🛒',
  'Violence':                '⚠️',
  'Carjacking':              '🚗',
  'Arson':                   '🔥',
  'Fraud':                   '💳',
  'Robbery':                 '💰',
  'Regulatory':              '⚖️',
  'Other':                   '📋',
};

// ── Small re-usable pieces ─────────────────────────────────────────────────

function SeverityBadge({ level }: { level: string }) {
  const s = SEV_STYLE[level as IncidentSeverity] ?? SEV_STYLE.Medium;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}>
      {level}
    </span>
  );
}

function KpiTile({
  label, value, sub, accent = '#FFC220',
}: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-4 rounded-xl border"
      style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>
      <span className="text-2xl font-black" style={{ color: accent }}>{value}</span>
      {sub && <span className="text-[10px] font-mono text-slate-500 mt-0.5">{sub}</span>}
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mt-1">{label}</span>
    </div>
  );
}

function FilterPill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="px-3 py-1 rounded-full text-[11px] font-bold border transition-all"
      style={{
        background: active ? 'rgba(0,83,226,0.22)' : 'var(--s-card)',
        color:      active ? '#9BB7DF' : 'var(--s-text-dim)',
        borderColor: active ? '#0053e2' : 'var(--s-border)',
      }}>
      {label}
    </button>
  );
}

// ── Severity bar chart ─────────────────────────────────────────────────────

function SeverityChart({ bySeverity, total }: { bySeverity: Record<string, number>; total: number }) {
  const order: IncidentSeverity[] = ['Critical', 'High', 'Medium', 'Low'];
  return (
    <div className="rounded-xl border p-5" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--s-text-dim)' }}>
        By Severity
      </h3>
      <div className="space-y-3">
        {order.map(sev => {
          const count = bySeverity[sev] ?? 0;
       const pct   = total > 0 ? (count / total) * 100 : 0;
          const s     = SEV_STYLE[sev];
          return (
            <div key={sev}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold" style={{ color: s.text }}>{sev}</span>
                <span className="text-xs font-mono" style={{ color: 'var(--s-text-muted)' }}>{count}</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: 'var(--s-border)' }}>
                <div className="h-2 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: s.bar }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Top incident types chart ───────────────────────────────────────────────

function TypeChart({ byType }: { byType: { type: string; count: number }[] }) {
  const max = byType[0]?.count ?? 1;
  return (
    <div className="rounded-xl border p-5" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--s-text-dim)' }}>
        Top Incident Types
      </h3>
      <div className="space-y-2.5">
        {byType.slice(0, 10).map(({ type, count }) => (
          <div key={type}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--s-text-muted)' }}>
                <span>{TYPE_ICONS[type] ?? '📋'}</span>
                <span className="truncate max-w-[160px]">{type}</span>
              </span>
              <span className="text-xs font-mono font-bold" style={{ color: '#9BB7DF' }}>{count}</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'var(--s-border)' }}>
              <div className="h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${(count / max) * 100}%`, background: '#0053e2' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Monthly trend sparkline ─────────────────────────────────────────────────

function TrendChart({ trend }: { trend: { month: string; count: number }[] }) {
  const max = Math.max(...trend.map(t => t.count), 1);
  return (
    <div className="rounded-xl border p-5" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--s-text-dim)' }}>
        Monthly Trend
      </h3>
      <div className="flex items-end gap-1.5 h-24">
        {trend.map(({ month, count }) => (
          <div key={month} className="flex-1 flex flex-col items-center gap-1 group" title={`${month}: ${count}`}>
            <span className="text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: '#9BB7DF' }}>{count}</span>
            <div className="w-full rounded-t transition-all duration-500"
              style={{
                height: `${Math.max((count / max) * 80, 4)}px`,
                background: 'linear-gradient(to top, #0053e2, #9BB7DF)',
              }} />
            <span className="text-[8px] font-mono" style={{ color: 'var(--s-text-dim)' }}>
              {month.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Region heatmap ────────────────────────────────────────────────────────────

function RegionChart({ byRegion }: { byRegion: Record<string, number> }) {
  const entries = Object.entries(byRegion).sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] ?? 1;
  const colors = ['#0053e2', '#001E60', '#9BB7DF', '#7893B8', '#FFC220', '#D95F02', '#C62828', '#111827'];
  return (
    <div className="rounded-xl border p-5" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--s-text-dim)' }}>
        By Region
      </h3>
      <div className="space-y-2">
        {entries.map(([region, count], i) => (
          <div key={region}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs" style={{ color: 'var(--s-text-muted)' }}>{region}</span>
              <span className="text-xs font-mono font-bold" style={{ color: colors[i % colors.length] }}>{count}</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'var(--s-border)' }}>
              <div className="h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${(count / max) * 100}%`, background: colors[i % colors.length] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Incident row ─────────────────────────────────────────────────────────────

function IncidentRow({ incident }: { incident: Incident }) {
  const [expanded, setExpanded] = useState(false);
  const s = SEV_STYLE[incident.severity] ?? SEV_STYLE.Medium;
  return (
    <div className="rounded-xl border transition-all duration-200 cursor-pointer"
      style={{ background: 'var(--s-card)', borderColor: expanded ? '#0053e2' : 'var(--s-border)' }}
      onClick={() => setExpanded(p => !p)}>
      <div className="p-4 flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <SeverityBadge level={incident.severity} />
            <span className="text-[10px] px-2 py-0.5 rounded"
              style={{ background: 'rgba(0,83,226,0.14)', color: '#D9E3F0' }}> 
              {TYPE_ICONS[incident.incident_type] ?? '📋'} {incident.incident_type}
            </span>
            {incident.incident_date && (
              <span className="text-[10px] text-slate-500">{incident.incident_date}</span>
            )}
          </div>
          <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--s-text)' }}>
            {incident.summary.slice(0, 160)}{incident.summary.length > 160 ? '…' : ''}
          </p>
          {incident.location && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--s-text-dim)' }}>
              📍 {incident.location}
            </p>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--s-border)' }}>
          {incident.impact && (
            <div className="pt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
                style={{ color: '#FFC220' }}>Walmart Impact</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--s-text-muted)' }}>
                {incident.impact}
              </p>
            </div>
          )}
          {incident.recommended_action && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
                style={{ color: '#9BB7DF' }}>Recommended Action</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--s-text-muted)' }}>
                {incident.recommended_action}
              </p>
            </div>
          )}
          {incident.source_url && (
            <a href={incident.source_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-200 transition-colors"
              onClick={e => e.stopPropagation()}>
              ↗ Source
            </a>
          )}
        </div>
      )}
      <div className="px-4 pb-2 text-[10px]" style={{ color: 'var(--s-text-dim)' }}>
        {expanded ? '▲ collapse' : '▼ expand'}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function IncidentIntelligence() {
  const [stats,     setStats]     = useState<IncidentStats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [totalPages,setTotalPages]= useState(1);
  const [types,     setTypes]     = useState<string[]>([]);
  const [regions,   setRegions]   = useState<string[]>([]);
  const [loading,   setLoading]   = useState(true);

  // Active filters
  const [severity, setSeverity] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'date' | 'severity' | 'type'>('date');

  // Load stats + filter options once
  useEffect(() => {
    fetchIncidentStats().then(setStats).catch(console.error);
    fetchIncidentFilters().then(f => {
      setTypes(f.types);
      setRegions(f.regions);
    }).catch(console.error);
  }, []);

  // Load incidents when filters/page change
  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const query: IncidentQuery = {
        severity:  severity  || undefined,
        type:      typeFilter || undefined,
        region:    regionFilter || undefined,
        q:         search    || undefined,
        sort,
        page,
        page_size: 20,
      };
      const res = await fetchIncidents(query);
      setIncidents(res.incidents);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [severity, typeFilter, regionFilter, search, sort, page]);

  useEffect(() => { loadIncidents(); }, [loadIncidents]);

  const resetFilters = () => {
    setSeverity(''); setTypeFilter(''); setRegionFilter('');
    setSearch(''); setPage(1);
  };

  const critCount = stats?.by_severity['Critical'] ?? 0;
  const highCount = stats?.by_severity['High']     ?? 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--s-bg)', color: 'var(--s-text)' }}>

      {/* Hero banner */}
      <div className="incident-hero-bg relative rounded-2xl overflow-hidden mb-8"
        style={{ border: '1px solid var(--s-border)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.05,
            backgroundImage: 'linear-gradient(rgba(234,17,0,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(234,17,0,.5) 1px,transparent 1px)',
            backgroundSize: '48px 48px',
          }} />
        <div className="relative z-10 p-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#FFC220' }}>
            Enterprise Security • Global Threat Intelligence
          </p>
          <h1 className="text-4xl font-black mb-3"
            style={{ background: 'linear-gradient(135deg, #ff6b6b, #ea1100, #FFC220)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Incident Intelligence
          </h1>
          <p className="text-sm max-w-xl mx-auto mb-5" style={{ color: 'var(--s-text-muted)' }}>
            Retail security incidents — ORC, cargo theft, cyber attacks, violence &amp; more.
            Tracked across all regions from global security feeds.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1.5 rounded-full text-xs font-bold border"
              style={{ background: 'rgba(234,17,0,0.15)', color: '#ff6b6b', borderColor: 'rgba(234,17,0,0.4)' }}>
              🔴 Critical: {critCount}
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold border"
              style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c', borderColor: 'rgba(249,115,22,0.4)' }}>
              🟠 High: {highCount}
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold border"
              style={{ background: 'rgba(0,83,226,0.15)', color: '#D9E3F0', borderColor: 'rgba(0,83,226,0.4)' }}> 
              {stats?.total ?? '—'} Total Incidents
            </span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      {stats && (
        <div className="flex flex-wrap gap-3 mb-8">
          <KpiTile label="Total Incidents"  value={stats.total}                        accent="#FFC220" />
          <KpiTile label="Critical"         value={critCount}                           accent="#ea1100" />
          <KpiTile label="High Severity"    value={highCount}                           accent="#f97316" />
          <KpiTile label="Incident Types"   value={stats.by_type.length}               accent="#9BB7DF" />
          <KpiTile label="Regions Covered"  value={Object.keys(stats.by_region).length} accent="#7893B8" />
        </div>
      )}

      {/* Charts row */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SeverityChart bySeverity={stats.by_severity} total={stats.total} />
          <TypeChart byType={stats.by_type} />
          <RegionChart byRegion={stats.by_region} />
          {stats.monthly_trend.length > 0 && <TrendChart trend={stats.monthly_trend} />}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border p-4 mb-6" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <input
            type="text" placeholder="🔍 Search incidents…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ background: 'var(--s-modal-inner)', borderColor: 'var(--s-border-mid)', color: 'var(--s-text)' }}
          />
          <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
            className="sentry-select text-sm">
            <option value="date">Sort: Date</option>
            <option value="severity">Sort: Severity</option>
            <option value="type">Sort: Type</option>
          </select>
          {(severity || typeFilter || regionFilter || search) && (
            <button onClick={resetFilters}
              className="px-3 py-2 rounded-lg text-xs font-bold border"
              style={{ borderColor: 'rgba(234,17,0,0.4)', color: '#ff6b6b', background: 'rgba(234,17,0,0.08)' }}>
              × Clear
            </button>
          )}
        </div>

        {/* Severity pills */}
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest self-center" style={{ color: 'var(--s-text-dim)' }}>Severity:</span>
          {['Critical', 'High', 'Medium', 'Low'].map(s => (
            <FilterPill key={s} label={s}
              active={severity === s}
              onClick={() => { setSeverity(p => p === s ? '' : s); setPage(1); }} />
          ))}
        </div>

        {/* Region pills */}
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest self-center" style={{ color: 'var(--s-text-dim)' }}>Region:</span>
          {regions.slice(0, 8).map(r => (
            <FilterPill key={r} label={r}
              active={regionFilter === r}
              onClick={() => { setRegionFilter(p => p === r ? '' : r); setPage(1); }} />
          ))}
        </div>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: 'var(--s-text-muted)' }}>
          {loading ? 'Loading…' : `${total.toLocaleString()} incidents`}
          {(severity || typeFilter || regionFilter || search) && ' (filtered)'}
        </p>
      </div>

      {/* Incident list */}
      <div className="space-y-3 mb-8">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse"
                style={{ background: 'var(--s-card)' }} />
            ))
          : incidents.map(inc => <IncidentRow key={inc.id} incident={inc} />)
        }
        {!loading && incidents.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--s-text-dim)' }}>
            No incidents match your filters.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={20}
          onChange={setPage}
        />
      )}
    </div>
  );
}
