/**
 * HomeDashboard — Mission-control landing after the cinematic entry.
 *
 * Shows live KPIs + grouped module cards so every user knows
 * where they are and what SENTRY can do for them.
 */
import React, { useEffect, useState } from 'react';
import { ViewState } from '../types';
import { fetchStats, fetchCompetitorStats, DirectoryStats, CompetitorStats } from '../services/api';

interface HomeDashboardProps {
  onNavigate: (view: ViewState) => void;
}

// ── KPI strip ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, accent = '#FFC220' }) => (
  <div
    className="flex flex-col items-center justify-center px-5 py-4 rounded-xl flex-1 min-w-[120px]"
    style={{
      background: 'var(--s-card)',
      border: '1px solid var(--s-border-mid)',
      backdropFilter: 'blur(12px)',
    }}
  >
    <span className="text-2xl font-black tracking-tight" style={{ color: accent }}>{value}</span>
    {sub && <span className="text-[10px] font-mono text-slate-500 mt-0.5">{sub}</span>}
    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mt-1">{label}</span>
  </div>
);

// ── Module card ───────────────────────────────────────────────────────────────

interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  stat: string;
  statColor?: string;
  view: ViewState;
  onNavigate: (v: ViewState) => void;
  accent?: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({
  icon, title, description, stat, statColor = '#FFC220',
  view, onNavigate, accent = '#0053E2',
}) => (
  <button
    onClick={() => onNavigate(view)}
    className="group flex flex-col gap-3 p-5 rounded-2xl text-left w-full transition-all duration-200 focus-visible:ring-2 focus-visible:ring-wmt-blue focus-visible:outline-none"
    style={{
      background: 'var(--s-card)',
      border: '1px solid var(--s-border)',
      backdropFilter: 'blur(12px)',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.border = `1px solid ${accent}55`;
      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${accent}18`;
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.border = '1px solid var(--s-border)';
      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
    }}
  >
    {/* Icon + stat row */}
    <div className="flex items-center justify-between">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}18`, color: accent }}
      >
        {icon}
      </div>
      <span
        className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
        style={{ background: `${statColor}14`, color: statColor }}
      >
        {stat}
      </span>
    </div>

    {/* Title + description */}
    <div>
      <h3 className="text-sm font-extrabold tracking-wide" style={{ color: 'var(--s-text)' }}>
        {title}
      </h3>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--s-text-muted)' }}>
        {description}
      </p>
    </div>

    {/* Launch CTA */}
    <div
      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mt-auto"
      style={{ color: accent }}
    >
      <span>Launch</span>
      <svg
        className="w-3 h-3 transition-transform group-hover:translate-x-1"
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </div>
  </button>
);

// ── Section heading ───────────────────────────────────────────────────────────

const SectionHeading: React.FC<{ label: string; accent?: string }> = ({ label, accent = '#0053E2' }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-0.5 h-5 rounded-full shrink-0" style={{ background: accent }} aria-hidden />
    <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--s-text-dim)' }}>
      {label}
    </span>
    <div className="flex-1 h-px" style={{ background: 'var(--s-border)' }} aria-hidden />
  </div>
);

// ── Icons (self-contained — no external dep) ──────────────────────────────────

const IconDirectory = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);
const IconProjects = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);
const IconMarket = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const IconEye = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const IconPeople = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconScale = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
  </svg>
);
const IconShield = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const IconLab = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);
const IconArch = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
  </svg>
);
const IconAdmin = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// ── Main component ────────────────────────────────────────────────────────────

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DirectoryStats | null>(null);
  const [compStats, setCompStats] = useState<CompetitorStats | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchStats().then(setStats).catch(() => {});
    fetchCompetitorStats().then(setCompStats).catch(() => {});
  }, []);

  const totalVendors  = stats  ? stats.total_vendors.toLocaleString()        : '—';
  const totalVars     = stats  ? stats.total_vars.toLocaleString()           : '—';
  const coverage      = stats  ? `${stats.var_coverage_pct.toFixed(1)}%`     : '—';
  const avgRating     = stats  ? stats.avg_rating.toFixed(2)                 : '—';
  const compEvents    = compStats ? compStats.total.toLocaleString()         : '—';
  const vendorStat    = stats  ? `${totalVendors} vendors`                   : 'Loading…';
  const varStat       = stats  ? `${totalVars} VARs`                        : 'Loading…';
  const compEventStat = compStats ? `${compEvents} events`                   : 'Loading…';

  // ── Module groups ────────────────────────────────────────────────────────
  const intelligenceModules = [
    {
      view: ViewState.COMPETITOR_INTEL,
      icon: <IconEye />,
      title: 'Competitor Intelligence',
      description: 'Live threat tracking across Amazon, Target, Costco & Kroger — analyst-enriched security events by category and timeline.',
      stat: compEventStat,
      statColor: '#ef4444',
      accent: '#ef4444',
    },
    {
      view: ViewState.CSO_INTELLIGENCE,
      icon: <IconPeople />,
      title: 'CSO Intelligence',
      description: 'Executive security leadership analysis — competitive positioning of retail CSOs and strategic threat mapping.',
      stat: '4 Exec Profiles',
      statColor: '#a78bfa',
      accent: '#a78bfa',
    },
    {
      view: ViewState.REGULATORY_INTEL,
      icon: <IconScale />,
      title: 'Regulatory Intelligence',
      description: '362 obligations across AI, Biometrics, ALPR, UAS & Data Privacy — tracked by jurisdiction, RAG status, and deadline.',
      stat: '85 Red · 186 Amber',
      statColor: '#f97316',
      accent: '#f97316',
    },
  ];

  const operationsModules = [
    {
      view: ViewState.DIRECTORY,
      icon: <IconDirectory />,
      title: 'Vendor Directory',
      description: 'Centralized record of all assessed Emerging Technology vendors — searchable, filterable, with full VAR score history.',
      stat: vendorStat,
      statColor: '#22c55e',
      accent: '#0053E2',
    },
    {
      view: ViewState.PROJECTS,
      icon: <IconProjects />,
      title: 'Project Portfolio',
      description: '3D visualization of all active EST projects — budget tracking, phase status, and pilot outcomes across the portfolio.',
      stat: '14 Active · $5.05M',
      statColor: '#FFC220',
      accent: '#FFC220',
    },
    {
      view: ViewState.COMPETITOR_ANALYSIS,
      icon: <IconMarket />,
      title: 'Market Analysis',
      description: 'Visualize risk metrics and compare vendor performance — radar charts, score distributions, and competitive benchmarks.',
      stat: varStat,
      statColor: '#22c55e',
      accent: '#0053E2',
    },
  ];

  const actionModules = [
    {
      view: ViewState.REQUEST_ASSESSMENT,
      icon: <IconShield />,
      title: 'Security Assessment',
      description: 'Initiate a GRC workflow for a new technology vendor review — kicks off the formal VAR pipeline with compliance scoring.',
      stat: 'GRC Workflow',
      statColor: '#0053E2',
      accent: '#0053E2',
    },
    {
      view: ViewState.REQUEST_LAB_VISIT,
      icon: <IconLab />,
      title: 'Emerging Tech Lab',
      description: 'Schedule hands-on evaluation time in the secure Emerging Tech lab — book demo sessions for physical hardware assessments.',
      stat: 'Schedule a Visit',
      statColor: '#06b6d4',
      accent: '#06b6d4',
    },
  ];

  const systemModules = [
    {
      view: ViewState.ARCHITECTURE,
      icon: <IconArch />,
      title: 'SENTRY Architecture',
      description: 'GCP four-phase framework hierarchy — Data, Architecture, Security, and Pipeline layers visualized as an interactive 3D graph.',
      stat: '4-Phase · GCP',
      statColor: '#64748b',
      accent: '#64748b',
    },
    {
      view: ViewState.ADMIN,
      icon: <IconAdmin />,
      title: 'VAR Administration',
      description: 'Power-user console — manage VAR reports, extract scores via AI, fix vendor linkage, and audit the assessment pipeline.',
      stat: 'Admin Only',
      statColor: '#64748b',
      accent: '#64748b',
    },
  ];

  return (
    <div
      className="max-w-6xl mx-auto px-2"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateY(16px)',
        transition: 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* ── Welcome banner ──────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-3xl font-black tracking-tight" style={{ color: 'var(--s-text)' }}>
            Welcome to{' '}
            <span style={{
              background: 'linear-gradient(90deg, #0053E2, #FFC220)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>SENTRY</span>
          </h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--s-text-muted)' }}>
          Walmart Enterprise Security's single source of truth for emerging-tech vendor risk.
          Select a module below to get started.
        </p>
      </div>

      {/* ── Live KPI strip ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-10">
        <KpiCard label="Vendors Tracked"    value={totalVendors}  accent="#FFC220" />
        <KpiCard label="VAR Reports"        value={totalVars}     accent="#0053E2" />
        <KpiCard label="Assessment Coverage" value={coverage}     accent="#22c55e" />
        <KpiCard label="Avg VAR Score"      value={avgRating}     accent="#a78bfa" />
        <KpiCard label="Competitor Events"  value={compEvents}    accent="#ef4444" />
      </div>

      {/* ── Intelligence group ──────────────────────────────────────────── */}
      <div className="mb-8">
        <SectionHeading label="Intelligence" accent="#ef4444" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {intelligenceModules.map(m => (
            <ModuleCard key={m.view} {...m} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      {/* ── Operations group ────────────────────────────────────────────── */}
      <div className="mb-8">
        <SectionHeading label="Operations" accent="#0053E2" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {operationsModules.map(m => (
            <ModuleCard key={m.view} {...m} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      {/* ── Actions group ───────────────────────────────────────────────── */}
      <div className="mb-8">
        <SectionHeading label="Actions" accent="#06b6d4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actionModules.map(m => (
            <ModuleCard key={m.view} {...m} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      {/* ── System group ────────────────────────────────────────────────── */}
      <div className="mb-8">
        <SectionHeading label="System" accent="#64748b" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systemModules.map(m => (
            <ModuleCard key={m.view} {...m} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      {/* ── Footer note ─────────────────────────────────────────────────── */}
      <p
        className="text-center text-[10px] font-mono uppercase tracking-widest pb-6"
        style={{ color: 'var(--s-text-faint)' }}
      >
        SENTRY v2.0 · Walmart Internal Only · Eagle WiFi or VPN Required
      </p>
    </div>
  );
};