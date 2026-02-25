/**
 * VendorDetailModal — slide-over panel showing the full vendor profile.
 *
 * Tabs: Overview | Assessment History | Tech Pipeline | VAR Reports
 *
 * Each tab is its own component in ./vendor/ to keep files under 200 lines.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Vendor, VarReport, Highlight,
  fetchVendorVarReports, fetchVendorHighlights,
} from '../services/api';
import { TechAssessmentTab } from './TechAssessmentTab';
import { OverviewTab }  from './vendor/OverviewTab';
import { HistoryTab }   from './vendor/HistoryTab';
import { VarTab }       from './vendor/VarTab';
import { TabButton, Tab } from './vendor/shared';

export interface VendorDetailModalProps {
  vendor: Vendor;
  onClose: () => void;
}

const RISK_COLORS: Record<string, string> = {
  Low: 'text-green-400', Medium: 'text-yellow-400',
  High: 'text-orange-400', Critical: 'text-red-400',
};

export const VendorDetailModal: React.FC<VendorDetailModalProps> = ({ vendor, onClose }) => {
  const [activeTab,       setActiveTab]       = useState<Tab>('overview');
  const [varReports,      setVarReports]      = useState<VarReport[]>([]);
  const [highlights,      setHighlights]      = useState<Highlight[]>([]);
  const [loadingVar,      setLoadingVar]      = useState(false);
  const [loadingHistory,  setLoadingHistory]  = useState(false);

  // Eagerly load all tab data on open
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
        // Backend may not have data yet — fail silently
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

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleTabChange = useCallback((t: Tab) => setActiveTab(t), []);

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
        className="fixed right-0 top-0 h-full w-full max-w-3xl bg-sentry-card border-l
                   border-slate-700 shadow-2xl z-50 flex flex-col overflow-hidden animate-slideIn"
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <header className="bg-slate-900 border-b border-slate-700 px-6 py-4 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white truncate">
                  {vendor.company_name}
                </h2>
                {vendor.has_var && (
                  <span className="shrink-0 text-[10px] font-bold bg-green-900/40
                                  text-green-400 border border-green-700 px-2 py-0.5 rounded-full">
                    VAR LINKED
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                  {vendor.category}
                </span>
                <span className={RISK_COLORS[vendor.risk_level] ?? 'text-slate-400'}>
                  {vendor.risk_level} Risk
                </span>
                <span className="text-wmt-yellow font-bold">
                  {vendor.overall_rating.toFixed(2)} / 5.0
                </span>
                {vendor.company_url && (
                  <a
                    href={vendor.company_url}
                    target="_blank"
                    rel="noopener"
                    className="text-wmt-blue hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    \u2197 Website
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close panel"
              className="shrink-0 text-slate-500 hover:text-white transition p-1
                         rounded-lg hover:bg-slate-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* ── Tabs ────────────────────────────────────────────────── */}
        <nav className="px-6 pt-3 pb-2 border-b border-slate-700 flex gap-1 shrink-0 overflow-x-auto">
          <TabButton id="overview" label="Overview"           active={activeTab === 'overview'} onClick={handleTabChange} />
          <TabButton id="history"  label="Assessment History" active={activeTab === 'history'}  count={highlights.length} onClick={handleTabChange} />
          <TabButton id="tech"     label="Tech Pipeline"      active={activeTab === 'tech'}     onClick={handleTabChange} />
          <TabButton id="var"      label="VAR Reports"        active={activeTab === 'var'}      count={varReports.length} onClick={handleTabChange} />
        </nav>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && <OverviewTab vendor={vendor} />}
          {activeTab === 'history'  && <HistoryTab  highlights={highlights} loading={loadingHistory} />}
          {activeTab === 'tech'     && <TechAssessmentTab vendorId={vendor.id} />}
          {activeTab === 'var'      && <VarTab vendor={vendor} varReports={varReports} loading={loadingVar} />}
        </div>
      </aside>
    </>
  );
};
