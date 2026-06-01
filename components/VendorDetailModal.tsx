import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell 
} from 'recharts';
import {
  Vendor,
  VendorAssessmentEvidence,
  VarReport,
  fetchVendorAssessmentEvidence,
  fetchVendorById,
  fetchVendorVarReports,
  getDownloadUrl,
} from '../services/api';
import { TechAssessmentTab } from './TechAssessmentTab';
import { grade, isScored } from '../utils/grade';

interface VendorDetailModalProps {
  vendor: Vendor;
  onClose: () => void;
}

// ── Tabs ──────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'insights' | 'risk' | 'tech' | 'docs';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'insights', label: 'Insights' },
  { id: 'risk',     label: 'Risk & Scores' },
  { id: 'tech',     label: 'Technology' },
  { id: 'docs',     label: 'Documents' },
];

// ── Helper: Map risk level to color ──────────────────────────────────────────
const RISK_COLOR: Record<string, string> = {
  Low: '#22c55e', Medium: '#eab308', High: '#f97316', Critical: '#ef4444',
};

const normalizeScore = (value: number | null | undefined): number | null => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

const decisionBandFromScore = (score: number | null | undefined): string => {
  if (score == null) return '';
  if (score >= 4.0) return 'Advance';
  if (score >= 3.0) return 'Research Further';
  if (score >= 2.0) return 'Defer';
  return 'Reject';
};

const decisionPathFromMetrics = (
  weightScore: number | null | undefined,
  decisionBand: string,
  riskScore: number | null | undefined,
  complianceScore: number | null | undefined,
): string => {
  const normalizedWeight = normalizeScore(weightScore);
  if (normalizedWeight == null) return 'No VAR weighted score has been extracted yet.';

  const lowerBound = {
    Advance: '4.0 - 5.0',
    'Research Further': '3.0 - 3.9',
    Defer: '2.0 - 2.9',
    Reject: '0.0 - 1.9',
  }[decisionBand] ?? 'band unavailable';

  const notes = [`Weight score ${normalizedWeight.toFixed(1)}/5 maps to ${decisionBand} (${lowerBound}).`];
  if ((riskScore ?? 0) < 3) notes.push('Risk score < 3.0 added mitigation gating.');
  if ((complianceScore ?? 0) < 3.5) notes.push('Compliance score < 3.5 added remediation requirements.');
  return notes.join(' ');
};

const pickPreferredVarReport = (reports: VarReport[]): VarReport | null => {
  if (!reports.length) return null;
  return reports.find((report) => normalizeScore(report.overall_score) != null) ?? reports[0] ?? null;
};

const hydrateVendorFromVarReport = (vendor: Vendor, report: VarReport | null): Vendor => {
  if (!report) return vendor;

  const varScores = {
    Overall: normalizeScore(report.overall_score),
    Compliance: normalizeScore(report.compliance_score),
    Risk: normalizeScore(report.risk_score),
    Maturity: normalizeScore(report.maturity_score),
    Integration: normalizeScore(report.integration_score),
    ROI: normalizeScore(report.roi_score),
    Viability: normalizeScore(report.viability_score),
    Differentiation: normalizeScore(report.differentiation_score),
    'Cloud Dep': normalizeScore(report.cloud_dep_score),
  };

  const weightScore = normalizeScore(report.overall_score) ?? vendor.var_weight_score ?? null;
  const decisionBand = (report.decision_band || vendor.var_decision_band || decisionBandFromScore(weightScore)).trim();
  const riskScore = normalizeScore(report.risk_score) ?? vendor.var_scores?.Risk ?? null;
  const complianceScore = normalizeScore(report.compliance_score) ?? vendor.var_scores?.Compliance ?? null;

  return {
    ...vendor,
    latest_var_id: report.id || vendor.latest_var_id,
    var_scores: {
      ...(vendor.var_scores ?? {}),
      ...varScores,
    },
    var_weight_score: weightScore,
    var_decision_band: decisionBand,
    var_decision_path: decisionPathFromMetrics(weightScore, decisionBand, riskScore, complianceScore),
  };
};

const hasResolvedVarScore = (vendor: Vendor): boolean => {
  const overall = vendor.var_weight_score ?? vendor.var_scores?.Overall ?? null;
  return normalizeScore(overall) != null;
};

const splitList = (value?: string): string[] => (
  (value || '')
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean)
);

const formatSignalLabel = (value: string): string => (
  value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
);

const formatBytes = (value?: number): string => {
  const bytes = Number(value || 0);
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const getVarStatusMeta = (vendor: Vendor) => {
  if (!vendor.has_var) return null;
  if (hasResolvedVarScore(vendor)) {
    return {
      label: 'VAR Scored',
      helper: 'Structured VAR scoring is available for review.',
      style: { background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' },
    };
  }
  return {
    label: 'VAR Linked',
    helper: 'Assessment artifact is linked, but score extraction is still pending.',
    style: { background: 'rgba(250,204,21,0.12)', color: '#facc15', border: '1px solid rgba(250,204,21,0.35)' },
  };
};

export const VendorDetailModal: React.FC<VendorDetailModalProps> = ({ vendor: initialVendor, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [modalVendor, setModalVendor] = useState<Vendor>(initialVendor);
  const [assessmentEvidence, setAssessmentEvidence] = useState<VendorAssessmentEvidence | null>(null);
  const [isHydratingVar, setIsHydratingVar] = useState(false);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const modalBaseId = useId();
  const headingId = `${modalBaseId}-heading`;

  useEffect(() => {
    let cancelled = false;
    setModalVendor(initialVendor);

    const shouldHydrateDetail = initialVendor.has_var || !initialVendor.var_scores || !initialVendor.concerns;
    if (!shouldHydrateDetail) {
      setIsHydratingVar(false);
      return () => { cancelled = true; };
    }

    setIsHydratingVar(initialVendor.has_var);

    void (async () => {
      let nextVendor = initialVendor;

      try {
        nextVendor = await fetchVendorById(initialVendor.id);
      } catch {
        // Keep base vendor if detail fetch fails; modal remains usable.
      }

      if (initialVendor.has_var) {
        try {
          const { reports } = await fetchVendorVarReports(initialVendor.id);
          nextVendor = hydrateVendorFromVarReport(nextVendor, pickPreferredVarReport(reports));
        } catch {
          // Vendor detail payload remains the fallback if VAR report fetch fails.
        }
      }

      if (!cancelled) {
        setModalVendor(nextVendor);
        setIsHydratingVar(false);
      }
    })();

    return () => { cancelled = true; };
  }, [initialVendor]);

  const vendor = modalVendor;

  useEffect(() => {
    let cancelled = false;
    setAssessmentEvidence(null);
    setIsLoadingEvidence(true);

    void fetchVendorAssessmentEvidence(initialVendor.id)
      .then((evidence) => {
        if (!cancelled) setAssessmentEvidence(evidence);
      })
      .catch(() => {
        if (!cancelled) setAssessmentEvidence(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingEvidence(false);
      });

    return () => { cancelled = true; };
  }, [initialVendor.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Prepare Radar Data from latest VAR scores
  const radarData = modalVendor.var_scores ? [
    { subject: 'Compliance', A: modalVendor.var_scores.Compliance || 0, fullMark: 5 },
    { subject: 'Risk',       A: modalVendor.var_scores.Risk || 0,       fullMark: 5 },
    { subject: 'Maturity',   A: modalVendor.var_scores.Maturity || 0,   fullMark: 5 },
    { subject: 'Integration',A: modalVendor.var_scores.Integration || 0,fullMark: 5 },
    { subject: 'ROI',        A: modalVendor.var_scores.ROI || 0,        fullMark: 5 },
    { subject: 'Viability',  A: modalVendor.var_scores.Viability || 0,  fullMark: 5 },
  ] : [];
  const hasVarScoreData = radarData.some(({ A }) => A > 0);

  const riskColor = RISK_COLOR[modalVendor.risk_level] || '#64748b';
  const weightScore = modalVendor.var_weight_score ?? modalVendor.var_scores?.Overall ?? null;
  const decisionBand = (modalVendor.var_decision_band || '').trim();
  const decisionPath = (modalVendor.var_decision_path || '').trim();
  const varStatusMeta = getVarStatusMeta(modalVendor);
  const formatMetricValue = (value: number | null | undefined) => (
    value == null ? 'N/A' : `${Number(value).toFixed(1)} / 5.0`
  );
  const riskSummaryCards = [
    { label: 'Weighted Score', value: formatMetricValue(weightScore), accent: '#0053e2' },
    { label: 'Decision Band', value: decisionBand || 'Pending', accent: '#ffc220' },
    { label: 'Risk Score', value: formatMetricValue(modalVendor.var_scores?.Risk), accent: riskColor },
    { label: 'Compliance', value: formatMetricValue(modalVendor.var_scores?.Compliance), accent: '#22c55e' },
  ];

  type ConcernSource = 'DB' | 'VAR';
  type ConcernItem = { text: string; source: ConcernSource };

  const concernItems: ConcernItem[] = [];
  if (modalVendor.concerns) {
    for (const item of modalVendor.concerns.split('|').map(s => s.trim()).filter(Boolean)) {
      const source: ConcernSource = item.toUpperCase().startsWith('VAR') ? 'VAR' : 'DB';
      concernItems.push({ text: item, source });
    }
  }
  if (modalVendor.var_scores) {
    const risk = modalVendor.var_scores.Risk ?? 0;
    const compliance = modalVendor.var_scores.Compliance ?? 0;
    const overall = modalVendor.var_scores.Overall ?? 0;

    if (risk > 0 && risk < 3) {
      concernItems.push({
        text: 'VAR indicates elevated risk exposure requiring mitigation controls.',
        source: 'VAR',
      });
    }
    if (compliance > 0 && compliance < 3.5) {
      concernItems.push({
        text: 'Compliance score is below target; policy and control gaps should be addressed.',
        source: 'VAR',
      });
    }
    if (overall > 0 && overall < 3.5) {
      concernItems.push({
        text: 'Overall VAR score suggests conditional adoption with remediation milestones.',
        source: 'VAR',
      });
    }
  }

  const uniqueConcernItems = Array.from(
    new Map(concernItems.map((item) => [item.text, item])).values(),
  );
  const productCount = modalVendor.all_products?.length ?? 0;
  const selectedTabIndex = TABS.findIndex(({ id }) => id === activeTab);
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = TABS.length - 1;

    setActiveTab(TABS[nextIndex].id);
  };
  const lastReviewedLabel = modalVendor.last_assessed || 'Assessment date not captured';
  const companyUrl = modalVendor.company_url?.trim() || '';
  const semanticTags = splitList(assessmentEvidence?.profile.top_semantic_tags || modalVendor.top_semantic_tags);
  const stakeholderTags = splitList(assessmentEvidence?.profile.top_stakeholder_tags || modalVendor.top_stakeholder_tags);
  const secondaryDomains = splitList(assessmentEvidence?.profile.secondary_domains || modalVendor.secondary_domains);
  const reportCount = assessmentEvidence?.profile.report_count || modalVendor.report_count || productCount;
  const sampleReportPath = assessmentEvidence?.profile.sample_report_path || modalVendor.sample_report_path || modalVendor.report_url;
  const copyPath = async (path: string) => {
    if (!path) return;
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(path);
      window.setTimeout(() => setCopiedPath(null), 1600);
    } catch {
      setCopiedPath(null);
    }
  };
  const hasInsights = Boolean(
    modalVendor.vendor_highlight
      || modalVendor.use_cases
      || modalVendor.value_to_walmart
      || modalVendor.pros
      || modalVendor.cons
      || modalVendor.concerns,
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-fadeIn">
      {/* Backdrop — deep glassmorphism */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
        style={{
          background: 'var(--s-modal-back)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        }}
      />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        data-testid="vendor-detail-modal"
        style={{
          background: 'var(--s-modal-card)',
          border: '1px solid var(--s-border-mid)',
          boxShadow: '0 0 0 1px rgba(0,83,226,0.12), 0 32px 80px rgba(0,0,0,0.7)',
        }}
      >
        
        {/* ── Header ───────────────────────────────────────────────────────────── */}
        <div
          className="shrink-0 px-8 py-6 flex items-start justify-between relative overflow-hidden"
          style={{
            borderBottom: '1px solid var(--s-border-light)',
            background: `linear-gradient(135deg, ${riskColor}10 0%, rgba(0,83,226,0.06) 50%, transparent 100%)`,
          }}
        >
          {/* Gradient mesh banner */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 60% 80% at 0% 50%, ${riskColor}12, transparent 60%)`,
            }}
            aria-hidden="true"
          />

          <div className="flex items-start gap-4 relative z-10">
            {/* Logo / Initials badge */}
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-lg shrink-0"
              style={{
                background: `linear-gradient(135deg, ${riskColor}33, ${riskColor}18)`,
                border: `1px solid ${riskColor}44`,
                boxShadow: `0 0 24px ${riskColor}33`,
              }}
            >
              {modalVendor.company_name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 id={headingId} className="text-2xl font-bold text-white">{modalVendor.company_name}</h2>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {modalVendor.category}
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                  style={{ borderColor: riskColor, color: riskColor, backgroundColor: `${riskColor}14`, border: `1px solid ${riskColor}44` }}
                >
                  {modalVendor.risk_level} Risk
                </span>
                {varStatusMeta && (
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                    style={varStatusMeta.style}
                    title={varStatusMeta.helper}
                  >
                    {varStatusMeta.label}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-400">
                {reportCount} source {reportCount === 1 ? 'report' : 'reports'} • Last review {lastReviewedLabel} • Status {modalVendor.deployment_status || 'Prospect'}
              </p>
              {varStatusMeta && !hasResolvedVarScore(modalVendor) && (
                <p className="mt-2 text-xs font-medium text-amber-300">
                  Score extraction pending — {varStatusMeta.helper}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="relative z-10 p-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            aria-label="Close"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = '#f1f5f9'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
          >
            ✕
          </button>
        </div>

        {/* ── Tabs Navigation ─────────────────────────────────────────────── */}
        <div
          className="shrink-0 px-8 flex gap-8"
          role="tablist"
          aria-label="Vendor detail sections"
          style={{ borderBottom: '1px solid var(--s-border)', background: 'var(--s-modal-tabs)' }}
        >
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              id={`${modalBaseId}-tab-${tab.id}`}
              role="tab"
              type="button"
              tabIndex={selectedTabIndex === index ? 0 : -1}
              aria-selected={activeTab === tab.id}
              aria-controls={`${modalBaseId}-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className="relative py-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              style={{
                color: activeTab === tab.id ? '#ffffff' : '#475569',
                borderBottom: activeTab === tab.id ? '2px solid #0053E2' : '2px solid transparent',
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #0053E2, #4d9fff)',
                    boxShadow: '0 0 8px rgba(0,83,226,0.6)',
                    animation: 'tab-slide 0.2s ease-out both',
                    transformOrigin: 'left',
                  }}
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>

        {/* ── Scrollable Content Area ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-8" style={{ background: 'var(--s-modal-inner)' }}>
          
          {/* ── TAB: OVERVIEW ───────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div
              id={`${modalBaseId}-panel-overview`}
              role="tabpanel"
              aria-labelledby={`${modalBaseId}-tab-overview`}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Main Description Column */}
              <div className="lg:col-span-2 space-y-8">
                <section>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">About</h3>
                  <p className="text-slate-300 leading-relaxed">
                    {vendor.description || 'No working description is attached yet. Add one from the latest RFI, briefing, or analyst notes so this record is usable without opening source documents.'}
                  </p>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Dominant Domain</p>
                    <p className="mt-1 text-sm font-bold text-white">{formatSignalLabel(assessmentEvidence?.profile.dominant_domain || modalVendor.dominant_domain || modalVendor.category)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Evidence Files</p>
                    <p className="mt-1 text-sm font-bold text-wmt-yellow">
                      {isLoadingEvidence ? 'Loading…' : `${assessmentEvidence?.summary.artifact_count ?? 0} artifacts`}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Latest Source Change</p>
                    <p className="mt-1 text-sm font-bold text-white">{assessmentEvidence?.profile.latest_modified_utc || modalVendor.last_assessed || 'Unknown'}</p>
                  </div>
                </section>

                {(semanticTags.length > 0 || stakeholderTags.length > 0 || secondaryDomains.length > 0) && (
                  <section className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Assessment Signal Map</h3>
                    {semanticTags.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Semantic Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {semanticTags.map(tag => <span key={tag} className="px-2 py-1 rounded-full text-xs border border-blue-900/50 bg-blue-900/20 text-blue-200">{formatSignalLabel(tag)}</span>)}
                        </div>
                      </div>
                    )}
                    {stakeholderTags.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Stakeholder Signals</p>
                        <div className="flex flex-wrap gap-2">
                          {stakeholderTags.map(tag => <span key={tag} className="px-2 py-1 rounded-full text-xs border border-yellow-900/40 bg-yellow-900/10 text-yellow-200">{formatSignalLabel(tag)}</span>)}
                        </div>
                      </div>
                    )}
                    {secondaryDomains.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Secondary Domains</p>
                        <div className="flex flex-wrap gap-2">
                          {secondaryDomains.map(domain => <span key={domain} className="px-2 py-1 rounded-full text-xs border border-slate-700 bg-slate-800/80 text-slate-300">{formatSignalLabel(domain)}</span>)}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                <section>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Products Assessed</h3>
                  <div className="space-y-3">
                    {(modalVendor.all_products || []).map((prod, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center gap-4">
                         <div>
                           <p className="font-semibold text-white">{prod.technology_product || 'Unknown Product'}</p>
                           <p className="text-xs text-slate-500">Last assessed: {prod.last_assessed || 'Pending'}</p>
                         </div>
                         <div className="text-right shrink-0">
                           <p className={`text-sm font-bold ${prod.overall_rating >= 4 ? 'text-green-400' : 'text-yellow-400'}`}>
                             {prod.overall_rating.toFixed(1)} / 5.0
                           </p>
                           <p className="text-[11px] text-slate-500">Overall rating</p>
                         </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Side Metadata Column */}
              <div className="space-y-6">
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Headquarters</p>
                    <p className="text-white font-medium">{vendor.hq_location || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Founded</p>
                    <p className="text-white font-medium">{vendor.founded_year || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Company URL</p>
                    {companyUrl ? (
                      <a 
                        href={companyUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-wmt-blue hover:underline text-sm truncate block"
                      >
                        {companyUrl}
                      </a>
                    ) : (
                      <p className="text-slate-500 text-sm">Not linked</p>
                    )}
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                  <h4 className="text-sm font-bold text-white mb-2">Walmart Stakeholders</h4>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Business Owner</p>
                    <p className="text-white font-medium">{vendor.business_owner || "TBD"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Sourcing Manager</p>
                    <p className="text-white font-medium">{vendor.sourcing_manager || "TBD"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Status</p>
                    <span className="inline-block mt-1 px-2 py-1 rounded bg-blue-900/30 text-blue-300 text-xs font-bold border border-blue-800">
                      {vendor.deployment_status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: INSIGHTS ───────────────────────────────────── */}
          {activeTab === 'insights' && (
            <div
              id={`${modalBaseId}-panel-insights`}
              role="tabpanel"
              aria-labelledby={`${modalBaseId}-tab-insights`}
              className="space-y-6"
            >
              {/* Vendor Highlight Banner */}
              {vendor.vendor_highlight && (
                <div 
                  className="p-5 rounded-xl relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,83,226,0.08) 0%, rgba(255,194,32,0.06) 100%)',
                    border: '1px solid rgba(0,83,226,0.2)',
                  }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl" 
                       style={{ background: 'rgba(255,194,32,0.1)' }} aria-hidden />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-wmt-yellow" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <h3 className="text-sm font-bold text-wmt-yellow uppercase tracking-widest">Key Highlight</h3>
                    </div>
                    <p className="text-white text-sm leading-relaxed">{vendor.vendor_highlight}</p>
                  </div>
                </div>
              )}

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Use Cases */}
                  {vendor.use_cases && (
                    <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Use Cases</h4>
                      </div>
                      <div className="space-y-2">
                        {vendor.use_cases.split('|').map((useCase, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-wmt-blue text-sm mt-0.5">•</span>
                            <p className="text-slate-300 text-sm leading-relaxed">{useCase.trim()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Value to Walmart */}
                  {vendor.value_to_walmart && (
                    <div className="p-5 rounded-xl bg-slate-900/50 border border-green-900/30">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h4 className="text-sm font-bold text-green-400 uppercase tracking-widest">Value to Walmart</h4>
                      </div>
                      <div className="space-y-2">
                        {vendor.value_to_walmart.split('|').map((value, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-green-400 text-sm mt-0.5">✓</span>
                            <p className="text-slate-300 text-sm leading-relaxed">{value.trim()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Maturity Level */}
                  {vendor.maturity_level && (
                    <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
                      <h4 className="text-xs text-slate-500 uppercase tracking-widest mb-2">Maturity Level</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-yellow-500 to-green-500 rounded-full"
                            style={{ width: modalVendor.maturity_level.toLowerCase().includes('early') ? '33%' : vendor.maturity_level.toLowerCase().includes('growth') ? '66%' : '100%' }}
                          />
                        </div>
                        <span className="text-sm font-bold text-white">{vendor.maturity_level}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Pros */}
                  {vendor.pros && (
                    <div className="p-5 rounded-xl bg-green-900/10 border border-green-900/30">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        <h4 className="text-sm font-bold text-green-400 uppercase tracking-widest">Strengths</h4>
                      </div>
                      <div className="space-y-2">
                        {vendor.pros.split('|').map((pro, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-green-400 text-sm mt-0.5">+</span>
                            <p className="text-slate-300 text-sm leading-relaxed">{pro.trim()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cons */}
                  {vendor.cons && (
                    <div className="p-5 rounded-xl bg-orange-900/10 border border-orange-900/30">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                        </svg>
                        <h4 className="text-sm font-bold text-orange-400 uppercase tracking-widest">Challenges</h4>
                      </div>
                      <div className="space-y-2">
                        {vendor.cons.split('|').map((con, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-orange-400 text-sm mt-0.5">−</span>
                            <p className="text-slate-300 text-sm leading-relaxed">{con.trim()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Concerns */}
                  {uniqueConcernItems.length > 0 && (
                    <div className="p-5 rounded-xl bg-red-900/10 border border-red-900/30">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest">Security Concerns</h4>
                      </div>
                      <div className="space-y-2">
                        {uniqueConcernItems.map((item, idx) => (
                          <div key={`${item.text}-${idx}`} className="flex items-start gap-2">
                            <span className="text-red-400 text-sm mt-0.5">⚠</span>
                            <p className="text-slate-300 text-sm leading-relaxed">{item.text}</p>
                            <span
                              className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                item.source === 'VAR'
                                  ? 'border-blue-900/40 text-blue-300 bg-blue-900/20'
                                  : 'border-slate-700 text-slate-400 bg-slate-900/40'
                              }`}
                            >
                              {item.source}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Empty State */}
              {!hasInsights && (
                <div className="py-16 text-center rounded-xl border border-dashed border-slate-700 bg-slate-900/30">
                  <div className="text-5xl mb-3">📊</div>
                  <p className="text-slate-400 font-semibold mb-1">No insight narrative is attached yet</p>
                  <p className="text-slate-600 text-sm">Add highlights, strengths, challenges, or use-case notes so reviewers do not have to reconstruct the story from raw files.</p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: RISK & SCORES ────────────────────────────────────── */}
          {activeTab === 'risk' && (
            <div
              id={`${modalBaseId}-panel-risk`}
              role="tabpanel"
              aria-labelledby={`${modalBaseId}-tab-risk`}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full"
            >
              <div className="flex flex-col items-center justify-center bg-slate-900/50 rounded-2xl border border-slate-800 p-6 relative">
                 <h3 className="absolute top-6 left-6 text-sm font-bold text-slate-400 uppercase tracking-widest">VAR Score Profile</h3>
                 {hasVarScoreData ? (
                   <ResponsiveContainer width="100%" height={350}>
                     <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                       <PolarGrid stroke="#334155" />
                       <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                       <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                       <Radar
                         name={modalVendor.company_name}
                         dataKey="A"
                         stroke="#0053E2"
                         strokeWidth={3}
                         fill="#0053E2"
                         fillOpacity={0.3}
                       />
                       <Tooltip 
                         contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                         itemStyle={{ color: '#f1f5f9' }}
                       />
                     </RadarChart>
                   </ResponsiveContainer>
                 ) : (
                   <div className="text-center text-slate-500">
                     {isHydratingVar ? (
                       <>
                         <p className="text-lg text-slate-300">Pulling latest VAR metrics…</p>
                         <p className="text-sm">Syncing Risk & Scores from the linked Vendor Assessment Report.</p>
                       </>
                     ) : (
                       <>
                         <p className="text-lg">No VAR Score Data Available</p>
                         <p className="text-sm">Run or link an assessed Vendor Assessment Report to populate this profile.</p>
                       </>
                     )}
                   </div>
                 )}
              </div>

              <div className="space-y-4">
                {varStatusMeta && !hasResolvedVarScore(modalVendor) && (
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-amber-300">Score Extraction Pending</h4>
                    <p className="text-sm text-slate-300">{varStatusMeta.helper}</p>
                    <p className="text-xs text-slate-400">Risk & Scores is using the linked Vendor Assessment Report status, but weighted scoring fields have not been extracted yet.</p>
                  </div>
                )}

                {modalVendor.has_var && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {riskSummaryCards.map((card) => (
                      <div key={card.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{card.label}</p>
                        <p className="mt-2 text-lg font-black" style={{ color: card.accent }}>{card.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {modalVendor.has_var && (
                  <div className="p-4 rounded-xl border border-blue-900/40 bg-blue-950/20 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-blue-300">VAR Decision Annotation</h4>
                      <span className="text-[10px] text-slate-400">{modalVendor.last_assessed || 'Latest'}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-1 rounded text-xs font-bold border border-blue-700/40 bg-blue-900/20 text-blue-200">
                        Weight Score: {weightScore !== null ? `${Number(weightScore).toFixed(1)} / 5.0` : 'N/A'}
                      </span>
                      {isScored(weightScore) && (
                        <span
                          className="px-2 py-1 rounded text-xs font-black border"
                          style={{
                            color: grade(weightScore).colorHex,
                            borderColor: `${grade(weightScore).colorHex}66`,
                            background: `${grade(weightScore).colorHex}1a`,
                          }}
                          title={`Grade ${grade(weightScore).letter} — ${grade(weightScore).label}`}
                        >
                          Grade {grade(weightScore).letter}
                        </span>
                      )}
                      <span
                        className="px-2 py-1 rounded text-xs font-bold border"
                        style={{ borderColor: 'rgba(255,194,32,0.45)', background: 'rgba(255,194,32,0.12)', color: '#ffc220' }}
                      >
                        Decision Band: {decisionBand || 'Pending'}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300">
                      {decisionPath || 'Decision path will appear after score extraction completes.'}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Detailed Metrics</h3>
                  {modalVendor.has_var && (
                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-900/40 text-blue-300 bg-blue-900/20">
                      VAR Source: {modalVendor.last_assessed || 'Latest'}
                    </span>
                  )}
                </div>
                {modalVendor.var_scores && Object.values(modalVendor.var_scores).some((val) => val != null) ? (
                  <div className="space-y-3">
                  {Object.entries(modalVendor.var_scores)
                    .filter(([, val]) => val != null)
                    .map(([key, val]) => (
                    <div key={key} className="flex items-center gap-4">
                       <span className="w-32 text-sm text-slate-400 text-right font-medium tracking-wide">{key}</span>
                       <div className="flex-1 h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                         <div 
                           className={`h-full rounded-full transition-all duration-1000 ${ (val || 0) < 3 ? 'bg-red-500' : (val || 0) < 4 ? 'bg-yellow-500' : 'bg-green-500' }`}
                           style={{ width: `${((val || 0) / 5) * 100}%` }}
                         />
                       </div>
                       <span className="w-10 text-sm font-bold text-white text-right">{Number(val).toFixed(1)}</span>
                    </div>
                  ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No metrics found.</p>
                )}

                {modalVendor.has_var && uniqueConcernItems.length > 0 && (
                  <div className="mt-8 p-5 rounded-xl bg-red-900/10 border border-red-900/30">
                    <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-3">VAR Concern Annotations</h4>
                    <div className="space-y-2">
                      {uniqueConcernItems.map((item, idx) => (
                        <div key={`${item.text}-${idx}`} className="flex items-start gap-2">
                          <span className="text-red-400 text-sm mt-0.5">⚠</span>
                          <p className="text-slate-300 text-sm leading-relaxed">{item.text}</p>
                          <span
                            className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              item.source=== 'VAR'
                                ? 'border-blue-900/40 text-blue-300 bg-blue-900/20'
                                : 'border-slate-700 text-slate-400 bg-slate-900/40'
                            }`}
                          >
                            {item.source}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: TECHNOLOGY ─────────────────────────────────────────────── */}
          {activeTab === 'tech' && (
            <div
              id={`${modalBaseId}-panel-tech`}
              role="tabpanel"
              aria-labelledby={`${modalBaseId}-tab-tech`}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
                  <h4 className="text-slate-500 text-xs uppercase mb-1">Hosting Model</h4>
                  <p className="text-xl font-semibold text-white">{vendor.hosting_type || "Unknown"}</p>
                </div>
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
                  <h4 className="text-slate-500 text-xs uppercase mb-1">Data Classification</h4>
                  <p className="text-xl font-semibold text-white">{vendor.data_classification || 'Internal'}</p>
                </div>
              </div>

              <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h4 className="text-slate-500 text-xs uppercase mb-1">Assessment Pipeline</h4>
                    <p className="text-sm text-slate-400">Live product-stage progress across grouped vendor records.</p>
                  </div>
                  <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-700 text-slate-300 bg-slate-800/80">
                    Source: Highlights + VARs
                  </span>
                </div>
                <TechAssessmentTab vendorId={vendor.id} />
              </div>
            </div>
          )}

          {/* ── TAB: DOCUMENTS ──────────────────────────────────────────────── */}
          {activeTab === 'docs' && (
            <div
              id={`${modalBaseId}-panel-docs`}
              role="tabpanel"
              aria-labelledby={`${modalBaseId}-tab-docs`}
              className="space-y-4"
            >
              {/* VAR Report Download */}
              {vendor.has_var && vendor.latest_var_id ? (
                <a 
                  href={getDownloadUrl(modalVendor.latest_var_id)}
                  download
                  className="block p-4 bg-slate-900 border border-slate-700 hover:border-wmt-blue hover:shadow-[0_0_15px_rgba(0,83,226,0.2)] rounded-xl group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-900/20 border border-blue-900/50 flex items-center justify-center text-blue-400 shrink-0">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-white group-hover:text-wmt-blue transition-colors text-sm">
                          Vendor Assessment Report (VAR)
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-xs text-slate-500">Version 1.0</span>
                           <span className="text-slate-700">•</span>
                           <span className="text-xs text-slate-500">{vendor.last_assessed || 'Recent'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 group-hover:text-wmt-blue transition-colors">
                      <span className="text-xs font-semibold uppercase tracking-wider">Download</span>
                      <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                  </div>
                </a>
              ) : (
                <div className="p-6 bg-slate-900/50 border border-dashed border-slate-800 rounded-xl text-center">
                    <p className="text-slate-400 font-medium mb-1">No linked VAR report yet</p>
                    <p className="text-slate-600 text-xs">The vendor record exists, but no downloadable assessment report is attached to this grouped company entry.</p>
                </div>
              )}

              {/* Desktop SENTRY evidence inventory */}
              <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Desktop SENTRY Evidence</h3>
                    <p className="text-xs text-slate-500 mt-1">Read-only source profile from 00_System inventory and vendor assessment reports.</p>
                  </div>
                  <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-700 text-slate-300 bg-slate-800/80">
                    {isLoadingEvidence ? 'Loading' : `${assessmentEvidence?.summary.artifact_count ?? 0} artifacts`}
                  </span>
                </div>

                {sampleReportPath && (
                  <div className="rounded-lg border border-blue-900/30 bg-blue-950/20 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-blue-300 mb-1">Sample Report Path</p>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-300 break-all">{sampleReportPath}</p>
                      <button
                        type="button"
                        onClick={() => copyPath(sampleReportPath)}
                        className="shrink-0 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-800 text-blue-200 hover:bg-blue-900/30"
                      >
                        {copiedPath === sampleReportPath ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}

                {assessmentEvidence && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">Inventory Size</p>
                        <p className="text-sm font-bold text-white mt-1">{formatBytes(assessmentEvidence.summary.total_size_bytes)}</p>
                      </div>
                      <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">Source Run</p>
                        <p className="text-sm font-bold text-white mt-1">{assessmentEvidence.source.source_run_label || 'Unknown'}</p>
                      </div>
                      <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">Inventory Mode</p>
                        <p className="text-sm font-bold text-white mt-1">Read-only</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Artifact Roles</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(assessmentEvidence.summary.artifact_role_counts).slice(0, 6).map(([role, count]) => (
                          <span key={role} className="px-2 py-1 rounded-full text-xs border border-slate-700 bg-slate-800/80 text-slate-300">
                            {formatSignalLabel(role)} · {count}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500">Recent Evidence Files</p>
                      {assessmentEvidence.artifacts.slice(0, 8).map((artifact) => (
                        <div key={`${artifact.current_path}-${artifact.sha256}`} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{artifact.filename || 'Unnamed artifact'}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {formatSignalLabel(artifact.artifact_role || 'Artifact')} • {formatSignalLabel(artifact.primary_domain || 'Unclassified')} • {artifact.modified_utc || 'No modified date'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyPath(artifact.current_path)}
                              className="shrink-0 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-700 text-slate-300 hover:border-wmt-blue hover:text-blue-200"
                            >
                              {copiedPath === artifact.current_path ? 'Copied' : 'Copy Path'}
                            </button>
                          </div>
                          {artifact.current_path && <p className="mt-2 text-[11px] text-slate-600 break-all">{artifact.current_path}</p>}
                        </div>
                      ))}
                      {assessmentEvidence.artifacts.length === 0 && (
                        <p className="text-sm text-slate-500 italic">No artifact-level inventory rows found for this vendor profile.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              {/* Placeholder for NDA/Contracts */}
              <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-slate-400 text-sm">Non-Disclosure Agreement (NDA)</p>
                      <p className="text-xs text-slate-600">Status: Unknown</p>
                    </div>
                 </div>
                 <span className="text-xs text-slate-600 italic px-3 py-1 bg-slate-800 rounded-full">Not Linked</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body,
  );
};
