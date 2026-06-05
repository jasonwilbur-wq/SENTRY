/**
 * CompetitorProfileModal — decision-focused dossier opened from a competitor card.
 * Keeps profile click behavior out of the main CompetitorIntel page and reuses
 * the existing competitor event feed with a locked competitor filter.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CompetitorEntity } from '../services/api';
import { CompetitorEventTable } from './CompetitorEventTable';

interface Props {
  entity: CompetitorEntity;
  onClose: () => void;
}

const CATEGORY_OWNER: Record<string, string> = {
  Cyber: 'Cyber / InfoSec',
  Technology: 'EST Technology Owner',
  'ORC/Theft': 'Asset Protection',
  Recall: 'Food Safety / Compliance',
  Legal: 'Legal / Compliance',
  Compliance: 'Compliance',
  Fraud: 'Asset Protection',
  Operational: 'Operations Resilience',
  Strategic: 'EST Strategy',
  Other: 'Intel Triage',
};

function safeJsonRecord(value: string | null | undefined): Record<string, number> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([key, raw]) => [key, Number(raw) || 0]),
    );
  } catch {
    return {};
  }
}

function dominantCategory(entity: CompetitorEntity, categories: Record<string, number>) {
  if (entity.top_category) return entity.top_category;
  return Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Other';
}

function walmartAngle(category: string) {
  switch (category) {
    case 'Cyber':
      return 'Review cyber exposure, third-party dependency patterns, and incident response lessons that may transfer to Walmart operations.';
    case 'Technology':
      return 'Compare competitor technology movement against EST pilots, vendor assessments, and emerging control requirements.';
    case 'ORC/Theft':
      return 'Translate recurring theft and ORC signals into Asset Protection watch items, store operations implications, and technology demand.';
    case 'Recall':
      return 'Monitor food/product safety signals for customer trust, supplier controls, and operational readiness implications.';
    case 'Legal':
    case 'Compliance':
      return 'Track regulatory or litigation movement that may change operating constraints or executive risk posture.';
    case 'Strategic':
      return 'Watch market moves, partnerships, and investment patterns that could shift Walmart security or technology priorities.';
    default:
      return 'Use this profile to determine whether the signal pattern should remain monitored or move into analyst follow-up.';
  }
}

function recommendedAction(entity: CompetitorEntity, category: string) {
  if (entity.threat_level === 'High') {
    return `Assign ${CATEGORY_OWNER[category] || 'Intel Triage'} to review top signals and decide whether a CSO brief item is warranted.`;
  }
  if (entity.threat_level === 'Medium') {
    return `Keep in weekly intel review; validate whether ${category} activity is increasing or linked to Walmart projects/vendors.`;
  }
  return 'Monitor for trend changes; no immediate executive escalation suggested from profile-level volume alone.';
}

function StatTile({ label, value, tone = 'text-white' }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
      <p className={`text-xl font-black ${tone}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">{label}</p>
    </div>
  );
}

export const CompetitorProfileModal: React.FC<Props> = ({ entity, onClose }) => {
  const categories = useMemo(() => safeJsonRecord(entity.categories_json), [entity.categories_json]);
  const monthly = useMemo(() => safeJsonRecord(entity.monthly_json), [entity.monthly_json]);
  const category = dominantCategory(entity, categories);
  const maxMonthly = Math.max(...Object.values(monthly), 1);
  const categoryRows = Object.entries(categories)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const panelRef = useRef<HTMLDivElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    backButtonRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [entity.name, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[90] bg-slate-950"
      role="dialog"
      aria-modal="true"
      aria-label={`${entity.name} competitor intelligence profile`}
    >
      <div
        ref={panelRef}
        className="relative h-screen w-full overflow-y-auto bg-slate-950"
      >
        <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                ref={backButtonRef}
                type="button"
                onClick={onClose}
                className="rounded-lg border border-blue-400/40 bg-blue-500/15 px-3 py-2 text-xs font-black text-blue-100 hover:bg-blue-500/25 focus:outline-none focus:ring-2 focus:ring-wmt-blue/70"
              >
                ← Back to Competitor Intelligence
              </button>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-wmt-yellow font-black">Competitor dossier</p>
                <h2 className="text-2xl font-black text-white mt-1">{entity.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {entity.event_count} indexed events · {entity.threat_level} threat · top signal: {category}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
            >
              Close ✕
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl p-5 space-y-6 pb-24">
          <div className="rounded-2xl border border-blue-400/25 bg-gradient-to-br from-blue-500/15 via-white/[0.04] to-yellow-400/10 p-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-wmt-yellow font-black">Start here</p>
                <h3 className="text-xl font-black text-white mt-1">{entity.name} intelligence snapshot</h3>
                <p className="text-sm text-slate-300 leading-relaxed mt-2">
                  This profile summarizes the competitor signal pattern, provides the likely Walmart owner path,
                  and filters the event feed to {entity.name}. Use the back button above to return to the main
                  Competitor Intelligence page at any time.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300 leading-relaxed">
                <p className="font-black text-white mb-1">Next best action</p>
                <p>{recommendedAction(entity, category)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <StatTile label="Events" value={entity.event_count} />
            <StatTile label="Cyber" value={entity.cyber_count} tone="text-red-300" />
            <StatTile label="ORC/Theft" value={entity.orc_count} tone="text-yellow-200" />
            <StatTile label="Recalls" value={entity.recall_count} tone="text-orange-300" />
            <StatTile label="Legal" value={entity.legal_count} tone="text-slate-200" />
            <StatTile label="Strategic" value={entity.strategic_count} tone="text-blue-200" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 lg:col-span-2">
              <h3 className="text-sm font-black text-white mb-3">Analyst readout</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs leading-relaxed">
                <div>
                  <p className="text-slate-500 uppercase tracking-wider font-bold mb-1">Dominant theme</p>
                  <p className="text-slate-200">{category}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase tracking-wider font-bold mb-1">Likely owner</p>
                  <p className="text-slate-200">{CATEGORY_OWNER[category] || 'Intel Triage'}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase tracking-wider font-bold mb-1">Recommended action</p>
                  <p className="text-slate-200">{recommendedAction(entity, category)}</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-400/10 p-3">
                <p className="text-[10px] uppercase tracking-wider text-blue-200 font-bold mb-1">Why Walmart cares</p>
                <p className="text-xs text-slate-300 leading-relaxed">{walmartAngle(category)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="text-sm font-black text-white mb-3">Category mix</h3>
              <div className="space-y-2">
                {categoryRows.map(([name, count]) => (
                  <div key={name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-semibold">{name}</span>
                      <span className="text-slate-500">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-wmt-blue" style={{ width: `${Math.max(6, (count / entity.event_count) * 100)}%` }} />
                    </div>
                  </div>
                ))}
                {categoryRows.length === 0 && <p className="text-xs text-slate-500">No category distribution available.</p>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h3 className="text-sm font-black text-white mb-3">Monthly signal movement</h3>
            <div className="flex items-end gap-2 h-24">
              {Object.entries(monthly).map(([month, count]) => (
                <div key={month} className="flex-1 min-w-[42px] text-center">
                  <div
                    className="mx-auto w-full max-w-[44px] rounded-t-lg bg-gradient-to-t from-wmt-blue to-wmt-yellow"
                    style={{ height: `${Math.max(6, (count / maxMonthly) * 78)}px` }}
                    title={`${month}: ${count} events`}
                  />
                  <p className="text-[10px] text-slate-500 mt-1 truncate">{month.replace(' 202', ' ’2')}</p>
                </div>
              ))}
              {Object.keys(monthly).length === 0 && <p className="text-xs text-slate-500">No monthly trend data available.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h3 className="text-sm font-black text-white mb-1">Signal feed for {entity.name}</h3>
            <p className="text-xs text-slate-500 mb-4">Filtered to this competitor. Click a row to expand source context, Walmart relevance, owner, and correlation details.</p>
            <CompetitorEventTable key={entity.name} lockedCompetitor={entity.name} />
          </div>
        </div>

        <div className="sticky bottom-0 z-20 border-t border-white/10 bg-slate-950/95 px-5 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <p className="hidden sm:block text-xs text-slate-500">
              Viewing {entity.name} dossier · return to the main Competitor Intelligence page when finished.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-lg bg-wmt-blue px-4 py-2 text-xs font-black text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-wmt-blue/70"
            >
              ← Back to Competitor Intelligence
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
