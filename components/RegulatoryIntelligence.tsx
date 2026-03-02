import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RegObligation, RegSummary, RegTopAction } from '../types';
import { RegulatoryObligationModal } from './RegulatoryObligationModal';

const API = (window as any).__SENTRY_API__ ?? 'http://127.0.0.1:8082';

// ── RAG colour helpers ───────────────────────────────────────────────────
const RAG_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Red:    { bg: 'rgba(234,17,0,0.12)',   text: '#ff6b6b', border: 'rgba(234,17,0,0.35)',   dot: '#ea1100' },
  Amber:  { bg: 'rgba(251,146,60,0.12)', text: '#fb923c', border: 'rgba(251,146,60,0.35)', dot: '#f97316' },
  Yellow: { bg: 'rgba(255,194,32,0.12)', text: '#FFC220', border: 'rgba(255,194,32,0.35)', dot: '#FFC220' },
  Green:  { bg: 'rgba(42,135,3,0.12)',   text: '#4ade80', border: 'rgba(42,135,3,0.35)',   dot: '#2a8703' },
};

const TECH_ICONS: Record<string, string> = {
  AI: String.fromCodePoint(0x1F9E0),
  'Data Privacy': String.fromCodePoint(0x1F512),
  Biometrics: String.fromCodePoint(0x1F4F7),
  'ALPR/LPR': String.fromCodePoint(0x1F697),
  'Drones/UAS': String.fromCodePoint(0x1F681),
  Surveillance: String.fromCodePoint(0x1F4F9),
  ORC: String.fromCodePoint(0x1F6D2),
  'Weapons Detection': String.fromCodePoint(0x1F6A8),
  Robotics: String.fromCodePoint(0x1F916),
  Other: String.fromCodePoint(0x2696),
};

// Emoji constants for use in JSX expressions
const E_CAL  = String.fromCodePoint(0x1F4C5);
const E_USER = String.fromCodePoint(0x1F464);
const E_DL   = String.fromCodePoint(0x1F4E5);


// ── Sub-components ──────────────────────────────────────────────────────

const KpiCard: React.FC<{ label: string; value: number | string; sub?: string; rag?: string }> = ({ label, value, sub, rag }) => {
  const c = rag ? RAG_COLORS[rag] : null;
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1 border"
      style={{
        background: c ? c.bg : 'rgba(255,255,255,0.03)',
        borderColor: c ? c.border : 'rgba(255,255,255,0.08)',
      }}>
      <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>{label}</span>
      <span className="text-3xl font-black" style={{ color: c ? c.text : 'var(--s-text)' }}>{value}</span>
      {sub && <span className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>{sub}</span>}
    </div>
  );
};

const RagBadge: React.FC<{ rag: string; score?: number }> = ({ rag, score }) => {
  const c = RAG_COLORS[rag] ?? RAG_COLORS.Green;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
      {rag}{score !== undefined ? ` · ${score}` : ''}
    </span>
  );
};

const TechPill: React.FC<{ tech: string }> = ({ tech }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
    style={{ background: 'rgba(0,83,226,0.12)', color: '#60a5fa', border: '1px solid rgba(0,83,226,0.25)' }}>
    {TECH_ICONS[tech] ?? '⚖️'} {tech}
  </span>
);

const ActionCard: React.FC<{ action: RegTopAction; idx: number }> = ({ action, idx }) => {
  const pColor = action.priority === 'High' ? '#ff6b6b' : action.priority === 'Med' ? '#fb923c' : '#4ade80';
  return (
    <div className="flex gap-3 p-3 rounded-lg border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black"
        style={{ background: 'rgba(0,83,226,0.18)', color: '#60a5fa' }}>{idx + 1}</div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold text-white truncate">{action.title}</span>
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${pColor}1a`, color: pColor }}>{action.priority}</span>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--s-text-dim)' }}>{action.description}</p>
        <div className="flex gap-3 mt-1 text-[10px]" style={{ color: 'var(--s-text-dim)' }}>
          <span>{E_CAL} {action.eta}</span>
          <span>{E_USER} {action.owner}</span>
        </div>
      </div>
    </div>
  );
};

// ── Main component ──────────────────────────────────────────────────────────────
export const RegulatoryIntelligence: React.FC = () => {
  const [summary, setSummary]             = useState<RegSummary | null>(null);
  const [obligations, setObligations]     = useState<RegObligation[]>([]);
  const [total, setTotal]                 = useState(0);
  const [loading, setLoading]             = useState(true);
  const [obLoading, setObLoading]         = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [selected, setSelected]           = useState<RegObligation | null>(null);

  // Filters
  const [filterRag, setFilterRag]         = useState('');
  const [filterTech, setFilterTech]       = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterQ, setFilterQ]             = useState('');
  const [sortBy, setSortBy]               = useState('risk');
  const [page, setPage]                   = useState(1);
  const PAGE_SIZE = 20;

  // ── Fetch summary
  useEffect(() => {
    fetch(`${API}/api/regulatory/summary`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setSummary)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // ── Fetch obligations with filters
  const fetchObligations = useCallback(() => {
    setObLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
      sort: sortBy,
    });
    if (filterRag)    params.set('rag', filterRag);
    if (filterTech)   params.set('tech', filterTech);
    if (filterStatus) params.set('status', filterStatus);
    if (filterQ)      params.set('q', filterQ);

    fetch(`${API}/api/regulatory/obligations?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(d => { setObligations(d.obligations); setTotal(d.total); })
      .catch(e => setError(String(e)))
      .finally(() => setObLoading(false));
  }, [page, sortBy, filterRag, filterTech, filterStatus, filterQ]);

  useEffect(() => { setPage(1); }, [filterRag, filterTech, filterStatus, filterQ, sortBy]);
  useEffect(() => { fetchObligations(); }, [fetchObligations]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const techBreakdown = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.stats.tech_breakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [summary]);
  const maxTechCount = techBreakdown[0]?.[1] ?? 1;

  const downloadJSON = useCallback(async () => {
    const res = await fetch(`${API}/api/regulatory/download`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'sentry-regulatory-briefing.json'; a.click();
    URL.revokeObjectURL(url);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm" style={{ color: 'var(--s-text-dim)' }}>Loading regulatory intelligence…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="rounded-xl p-6 border" style={{ background: 'rgba(234,17,0,0.08)', borderColor: 'rgba(234,17,0,0.3)' }}>
      <p className="text-red-400 font-bold">Failed to load regulatory data</p>
      <p className="text-sm text-red-300 mt-1">{error}</p>
      <p className="text-xs mt-2" style={{ color: 'var(--s-text-dim)' }}>Ensure the backend is running and run <code>python build_regulatory_report.py</code> from the backend folder.</p>
    </div>
  );

  const stats = summary?.stats;

  return (
    <div className="space-y-6">

      {/* ── Hero KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard label="Total Obligations" value={stats?.total_obligations ?? 0} sub="unique obligations" />
        <KpiCard label="Red" value={stats?.red ?? 0} sub="Risk 19-25" rag="Red" />
        <KpiCard label="Amber" value={stats?.amber ?? 0} sub="Risk 13-18" rag="Amber" />
        <KpiCard label="Yellow" value={stats?.yellow ?? 0} sub="Risk 7-12" rag="Yellow" />
        <KpiCard label="Green" value={stats?.green ?? 0} sub="Risk 1-6" rag="Green" />
        <KpiCard label="Enacted" value={stats?.enacted ?? 0} sub="in force" />
        <KpiCard label="Proposed" value={stats?.proposed ?? 0} sub="pending" />
      </div>

      {/* ── Summary + Tech breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Exec summary */}
        <div className="lg:col-span-2 rounded-xl p-5 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Executive Summary</h3>
            <div className="flex gap-2">
              <span className="text-[9px] px-2 py-1 rounded-full" style={{ background: 'rgba(255,194,32,0.15)', color: '#FFC220', border: '1px solid rgba(255,194,32,0.3)' }}>
                Confidence: {summary?.confidence ?? '…'}
              </span>
              <span className="text-[9px] px-2 py-1 rounded-full" style={{ background: 'rgba(0,83,226,0.15)', color: '#60a5fa', border: '1px solid rgba(0,83,226,0.3)' }}>
                Through {summary?.data_through ?? '…'}
              </span>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--s-text-dim)' }}>{summary?.summary}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {summary?.jurisdictions.slice(0, 12).map(j => (
              <span key={j} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--s-text-dim)', border: '1px solid rgba(255,255,255,0.08)' }}>{j}</span>
            ))}
            {(summary?.jurisdictions.length ?? 0) > 12 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: 'var(--s-text-dim)' }}>+{(summary?.jurisdictions.length ?? 0) - 12} more</span>
            )}
          </div>
        </div>

        {/* Tech breakdown */}
        <div className="rounded-xl p-5 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-bold text-white mb-3">By Technology Category</h3>
          <div className="space-y-2">
            {techBreakdown.map(([tech, count]) => (
              <button key={tech} className="w-full text-left group" onClick={() => setFilterTech(filterTech === tech ? '' : tech)}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span style={{ color: filterTech === tech ? '#FFC220' : 'var(--s-text)' }}>{TECH_ICONS[tech] ?? '⚖️'} {tech}</span>
                  <span style={{ color: 'var(--s-text-dim)' }}>{count}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${(count / maxTechCount) * 100}%`, background: filterTech === tech ? '#FFC220' : 'rgba(0,83,226,0.7)' }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Obligation Table + Top Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Obligation table — 2/3 width */}
        <div className="xl:col-span-2 rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {/* Toolbar */}
          <div className="p-4 flex flex-wrap gap-3 items-center" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <input
              type="search" placeholder="Search obligations…"
              value={filterQ} onChange={e => setFilterQ(e.target.value)}
              className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg text-sm bg-transparent border text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ borderColor: 'rgba(255,255,255,0.12)' }}
            />
            {/* RAG filter */}
            <select value={filterRag} onChange={e => setFilterRag(e.target.value)}
              className="px-2 py-1.5 rounded-lg text-xs bg-transparent border focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'var(--s-text)' }}>
              <option value="">All RAG</option>
              {['Red','Amber','Yellow','Green'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {/* Tech filter */}
            <select value={filterTech} onChange={e => setFilterTech(e.target.value)}
              className="px-2 py-1.5 rounded-lg text-xs bg-transparent border focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'var(--s-text)' }}>
              <option value="">All Tech</option>
              {techBreakdown.map(([t]) => <option key={t} value={t}>{t}</option>)}
            </select>
            {/* Status filter */}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-2 py-1.5 rounded-lg text-xs bg-transparent border focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'var(--s-text)' }}>
              <option value="">All Status</option>
              <option value="Enacted">Enacted</option>
              <option value="Proposed">Proposed</option>
            </select>
            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="px-2 py-1.5 rounded-lg text-xs bg-transparent border focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'var(--s-text)' }}>
              <option value="risk">Sort: Risk ↓</option>
              <option value="title">Sort: Title</option>
              <option value="jurisdiction">Sort: Jurisdiction</option>
            </select>
            <button onClick={downloadJSON}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
              style={{ background: 'rgba(0,83,226,0.25)', color: '#60a5fa', border: '1px solid rgba(0,83,226,0.35)' }}>
              {E_DL} JSON
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto" style={{ maxHeight: '520px', overflowY: 'auto' }}>
            {obLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['Risk', 'Jurisdiction', 'Title', 'Tech', 'Status', 'Evidence'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--s-text-dim)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {obligations.map((ob, i) => (
                    <tr key={ob.id}
                      onClick={() => setSelected(ob)}
                      className="cursor-pointer transition-colors hover:bg-white/5"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td className="px-3 py-2.5"><RagBadge rag={ob.risk.rag} score={ob.risk.score} /></td>
                      <td className="px-3 py-2.5 max-w-[120px]">
                        <span className="truncate block" style={{ color: 'var(--s-text-dim)' }} title={ob.jurisdiction}>{ob.jurisdiction}</span>
                      </td>
                      <td className="px-3 py-2.5 max-w-[220px]">
                        <span className="font-medium text-white line-clamp-2 leading-tight" title={ob.title}>{ob.title}</span>
                      </td>
                      <td className="px-3 py-2.5"><TechPill tech={ob.tech_category} /></td>
                      <td className="px-3 py-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                          style={{ background: ob.status === 'Enacted' ? 'rgba(42,135,3,0.18)' : 'rgba(255,194,32,0.12)',
                                   color: ob.status === 'Enacted' ? '#4ade80' : '#FFC220' }}>
                          {ob.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: ob.evidence_status === 'Partially' ? 'rgba(251,146,60,0.12)' : 'rgba(255,255,255,0.06)',
                                   color: ob.evidence_status === 'Partially' ? '#fb923c' : 'var(--s-text-dim)' }}>
                          {ob.evidence_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {obligations.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--s-text-dim)' }}>No obligations match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              <span className="text-[11px]" style={{ color: 'var(--s-text-dim)' }}>
                {total} obligations · page {page}/{totalPages}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 rounded text-xs disabled:opacity-40 transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--s-text)' }}>Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1 rounded text-xs disabled:opacity-40 transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--s-text)' }}>Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Top Actions */}
        <div className="rounded-xl p-5 border flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-bold text-white">Remediation Roadmap</h3>
          <p className="text-[11px]" style={{ color: 'var(--s-text-dim)' }}>Top prioritised actions by risk and legal deadline.</p>
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '560px' }}>
            {(summary?.top_actions ?? []).map((a, i) => <ActionCard key={i} action={a} idx={i} />)}
          </div>
          {/* Assumptions */}
          <details className="mt-2">
            <summary className="text-[10px] cursor-pointer font-bold uppercase tracking-wider" style={{ color: 'var(--s-text-dim)' }}>
              Assumptions &amp; Confidence
            </summary>
            <ul className="mt-2 space-y-1.5">
              {(summary?.assumptions ?? []).map((a, i) => (
                <li key={i} className="text-[10px] leading-relaxed p-2 rounded" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--s-text-dim)' }}>{a}</li>
              ))}
            </ul>
          </details>
        </div>
      </div>

      {/* Obligation detail modal */}
      {selected && <RegulatoryObligationModal obligation={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};