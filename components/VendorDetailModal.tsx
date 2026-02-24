/**
 * VendorDetailModal — slide-over panel showing full vendor profile.
 *
 * Tabs: Overview | Assessment History | VAR Reports
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Vendor,
  VarReport,
  Highlight,
  fetchVendorVarReports,
  fetchVendorHighlights,
} from '../services/api';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

type Tab = 'overview' | 'history' | 'var';

const BAND_STYLES: Record<string, string> = {
  Advance:           'bg-green-900/30 text-green-400 border border-green-700',
  'Research Further': 'bg-blue-900/30 text-blue-400 border border-blue-700',
  Defer:             'bg-yellow-900/30 text-yellow-400 border border-yellow-700',
  Reject:            'bg-red-900/30 text-red-400 border border-red-700',
  Pass:              'bg-green-900/30 text-green-400 border border-green-700',
};

const SCORE_COLOR: Record<string, string> = {
  Advance:           '#2A8703',
  'Research Further': '#0053E2',
  Defer:             '#F59E0B',
  Reject:            '#EA1100',
  Pass:              '#2A8703',
};

function bandStyle(band: string) {
  return BAND_STYLES[band] ?? 'bg-slate-700 text-slate-300 border border-slate-600';
}

function scoreColor(band: string) {
  return SCORE_COLOR[band] ?? '#9E9E9E';
}

function TabButton({
  id, label, active, count, onClick,
}: {
  id: Tab; label: string; active: boolean; count?: number; onClick: (t: Tab) => void;
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
        active
          ? 'bg-wmt-blue text-white shadow-[0_0_12px_rgba(0,83,226,0.4)]'
          : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          active ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'
        }`}>{count}</span>
      )}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</dt>
      <dd className="text-sm text-slate-200">{value || '—'}</dd>
    </div>
  );
}

function RatingBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = score >= 4 ? '#2A8703' : score >= 3 ? '#0053E2' : score >= 2 ? '#F59E0B' : '#EA1100';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-700 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{score.toFixed(2)}</span>
    </div>
  );
}

// ── Overview tab ─────────────────────────────────────────────────────────────────

function OverviewTab({ vendor }: { vendor: Vendor }) {
  const stars = Math.round(vendor.overall_rating);
  return (
    <div className="space-y-6">
      {/* Rating + status hero row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Overall Rating', value: vendor.overall_rating.toFixed(2) + ' / 5.0' },
          { label: 'Decision',       value: vendor.vendor_status },
          { label: 'Risk Level',     value: vendor.risk_level },
          { label: 'Last Assessed',  value: vendor.last_assessed || '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</p>
            <p className="text-sm font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Stars */}
      <div className="flex items-center gap-2">
        <div className="flex">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={`text-xl ${i < stars ? 'text-wmt-yellow' : 'text-slate-700'}`}>★</span>
          ))}
        </div>
        <span className="text-slate-400 text-sm">{vendor.overall_rating.toFixed(1)} out of 5</span>
      </div>

      {/* Details grid */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DetailRow label="Company" value={vendor.company_name} />
        <DetailRow label="Category" value={vendor.category} />
        <DetailRow label="Top Product" value={vendor.technology_product} />
        <DetailRow label="Vendor Status" value={vendor.vendor_status} />
        <DetailRow
          label="Website"
          value={
            vendor.company_url
              ? <a href={vendor.company_url} target="_blank" rel="noopener"
                   className="text-wmt-blue hover:underline break-all">{vendor.company_url}</a>
              : null
          }
        />
        <DetailRow label="VAR Report" value={vendor.has_var ? '✅ Available' : '⏳ Pending Phase 2'} />
      </dl>

      {/* All products */}
      {vendor.all_products.length > 1 && (
        <div>
          <h4 className="text-xs uppercase tracking-widest text-slate-500 mb-3 font-semibold">
            All Assessed Products ({vendor.all_products.length})
          </h4>
          <div className="space-y-2">
            {vendor.all_products.map((p, i) => (
              <div key={i} className="bg-slate-800/40 border border-slate-700 rounded-lg p-3 flex justify-between items-center gap-3">
                <span className="text-sm text-slate-300 flex-1">{p.technology_product || '—'}</span>
                <span className="text-xs font-mono text-wmt-yellow shrink-0">{p.overall_rating.toFixed(2)}</span>
                <span className="text-xs text-slate-500 shrink-0">{p.last_assessed}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── History tab ───────────────────────────────────────────────────────────────────

function HistoryTab({ highlights, loading }: { highlights: Highlight[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-slate-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!highlights.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <p className="text-lg font-medium">No assessment history</p>
        <p className="text-sm mt-1">Highlights are populated from the monthly CSV imports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {highlights.map(h => (
        <div key={h.id} className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <span className="text-xs font-mono text-slate-400">
              {h.source_file.replace('_updated.csv', '')}
            </span>
            {h.assessment_date && (
              <span className="text-xs text-wmt-yellow">{h.assessment_date}</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Product</p>
              <p className="text-xs text-slate-300 truncate">{h.product_name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Score</p>
              <p className="text-xs font-bold" style={{
                color: h.pre_assessment_score
                  ? (h.pre_assessment_score >= 4 ? '#2A8703'
                    : h.pre_assessment_score >= 3 ? '#0053E2'
                    : h.pre_assessment_score >= 2 ? '#F59E0B' : '#EA1100')
                  : '#9E9E9E',
              }}>
                {h.pre_assessment_score?.toFixed(2) ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Decision</p>
              <p className="text-xs">
                {h.pre_assessment_decision
                  ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${bandStyle(h.pre_assessment_decision)}`}>
                      {h.pre_assessment_decision}
                    </span>
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Maturity</p>
              <p className="text-xs text-slate-300">{h.maturity_level || '—'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── VAR tab ──────────────────────────────────────────────────────────────────────

const VAR_DIMENSIONS = [
  { key: 'compliance_score',      label: 'Compliance',     weight: '25%' },
  { key: 'risk_score',            label: 'Risk',           weight: '25%' },
  { key: 'maturity_score',        label: 'Maturity',       weight: '15%' },
  { key: 'integration_score',     label: 'Integration',    weight: '10%' },
  { key: 'roi_score',             label: 'ROI',            weight: '10%' },
  { key: 'viability_score',       label: 'Viability',      weight: '5%' },
  { key: 'differentiation_score', label: 'Differentiation',weight: '5%' },
  { key: 'cloud_dep_score',       label: 'Cloud Dep',      weight: '5%' },
] as const;

function VarCard({ report }: { report: VarReport }) {
  const hasScores = VAR_DIMENSIONS.some(d => report[d.key] !== null);
  const radarData = VAR_DIMENSIONS.map(d => ({
    subject: d.label,
    value: (report[d.key] as number | null) ?? 0,
  }));

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-white">{report.filename}</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {report.report_date} · {report.report_type} · {report.report_version}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report.overall_score !== null && (
            <span
              className={`text-sm font-bold px-3 py-1 rounded-full ${bandStyle(report.decision_band)}`}
            >
              {report.overall_score.toFixed(2)} — {report.decision_band}
            </span>
          )}
          {report.sharepoint_url ? (
            <a
              href={report.sharepoint_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-wmt-blue text-white text-xs font-bold
                         px-4 py-2 rounded-xl hover:bg-wmt-blue/80 transition"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4
                         M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Report
            </a>
          ) : (
            <span className="text-xs text-slate-500 italic">SharePoint link pending Phase 2</span>
          )}
        </div>
      </div>

      {/* Scores */}
      {hasScores && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Radar chart */}
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#0053E2"
                  fill="#0053E2"
                  fillOpacity={0.3}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [v.toFixed(2), 'Score']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Score bars */}
          <div className="space-y-2.5">
            {VAR_DIMENSIONS.map(d => (
              <div key={d.key}>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>{d.label}</span>
                  <span>{d.weight}</span>
                </div>
                {report[d.key] !== null
                  ? <RatingBar score={report[d.key] as number} />
                  : <div className="h-1.5 bg-slate-700 rounded-full" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VarTab({ vendor, varReports, loading }: {
  vendor: Vendor;
  varReports: VarReport[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-40 bg-slate-800/50 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!varReports.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-center">
        <div className="w-16 h-16 bg-wmt-yellow/10 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-wmt-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
                     a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="font-semibold text-slate-300 text-lg">No VAR reports linked yet</p>
        <p className="text-sm mt-2 max-w-sm">
          Phase 2 will match <strong className="text-white">{vendor.company_name}</strong> to their
          VAR report on the SharePoint Vault. Once matched, the full scored
          report will appear here with a direct link.
        </p>
        <div className="mt-4 bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-400 text-left max-w-sm">
          <p className="font-semibold text-slate-300 mb-1">SharePoint Vault Location:</p>
          <p className="font-mono break-all">Emerging Security Technology › Vault › Solution and Report Data › Reports</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {varReports.map(r => <VarCard key={r.id} report={r} />)}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────────

export interface VendorDetailModalProps {
  vendor: Vendor;
  onClose: () => void;
}

export const VendorDetailModal: React.FC<VendorDetailModalProps> = ({ vendor, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [varReports, setVarReports] = useState<VarReport[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loadingVar, setLoadingVar] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load data for both tabs eagerly on open
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingVar(true);
      setLoadingHistory(true);
      try {
        const [varData, histData] = await Promise.all([
          fetchVendorVarReports(vendor.id),
          fetchVendorHighlights(vendor.id),
        ]);
        if (!cancelled) {
          setVarReports(varData.reports);
          setHighlights(histData.highlights);
        }
      } catch {
        // silent — backend may not have data yet
      } finally {
        if (!cancelled) {
          setLoadingVar(false);
          setLoadingHistory(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [vendor.id]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const riskColors: Record<string, string> = {
    Low: 'text-green-400', Medium: 'text-yellow-400',
    High: 'text-orange-400', Critical: 'text-red-400',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${vendor.company_name} details`}
        className="fixed right-0 top-0 h-full w-full max-w-3xl bg-sentry-card border-l border-slate-700
                   shadow-2xl z-50 flex flex-col overflow-hidden animate-slideIn"
      >
        {/* Header */}
        <header className="bg-slate-900 border-b border-slate-700 px-6 py-4 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white truncate">{vendor.company_name}</h2>
                {vendor.has_var && (
                  <span className="shrink-0 text-[10px] font-bold bg-green-900/40 text-green-400
                                  border border-green-700 px-2 py-0.5 rounded-full">
                    VAR LINKED
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded"
                >{vendor.category}</span>
                <span className={riskColors[vendor.risk_level] ?? 'text-slate-400'}>
                  {vendor.risk_level} Risk
                </span>
                <span className="text-wmt-yellow font-bold">
                  {vendor.overall_rating.toFixed(2)} / 5.0
                </span>
                {vendor.company_url && (
                  <a href={vendor.company_url} target="_blank" rel="noopener"
                     className="text-wmt-blue hover:underline"
                     onClick={e => e.stopPropagation()}>
                    ↗ Website
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close panel"
              className="shrink-0 text-slate-500 hover:text-white transition p-1 rounded-lg
                         hover:bg-slate-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Tabs */}
        <nav className="px-6 pt-3 pb-2 border-b border-slate-700 flex gap-1 shrink-0">
          <TabButton id="overview" label="Overview" active={activeTab === 'overview'}
                     onClick={setActiveTab} />
          <TabButton id="history"  label="Assessment History" active={activeTab === 'history'}
                     count={highlights.length} onClick={setActiveTab} />
          <TabButton id="var"      label="VAR Reports" active={activeTab === 'var'}
                     count={varReports.length} onClick={setActiveTab} />
        </nav>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && <OverviewTab vendor={vendor} />}
          {activeTab === 'history'  && (
            <HistoryTab highlights={highlights} loading={loadingHistory} />
          )}
          {activeTab === 'var' && (
            <VarTab vendor={vendor} varReports={varReports} loading={loadingVar} />
          )}
        </div>
      </aside>
    </>
  );
};
