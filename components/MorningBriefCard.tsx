/**
 * MorningBrief — Live intel digest card for the Home Dashboard.
 *
 * Shows: critical incidents, regulatory red flags, stale vendor assessments,
 * and competitor event count. Pulled fresh from /api/morning-brief.
 */
import React, { useEffect, useState } from 'react';
import type { MorningBrief } from '../types';
import { fetchMorningBrief } from '../services/api';
import { ViewState } from '../types';

interface Props {
  onNavigate: (v: ViewState) => void;
}

const SEV_COLOR: Record<string, string> = {
  Critical: '#ff6b6b',
  High:     '#fb923c',
  Medium:   '#FFC220',
  Low:      '#4ade80',
};

function BriefRow({ icon, label, value, color }: {
  icon: string; label: string; value: string | number; color: string;
}) {
  return (
    <div className="flex items-center justify-between py-2"
      style={{ borderBottom: '1px solid var(--s-border)' }}>
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-xs" style={{ color: 'var(--s-text-muted)' }}>{label}</span>
      </div>
      <span className="text-sm font-black" style={{ color }}>{value}</span>
    </div>
  );
}

export function MorningBriefCard({ onNavigate }: Props) {
  const [brief, setBrief]     = useState<MorningBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    fetchMorningBrief()
      .then(setBrief)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const ts = brief
    ? new Date(brief.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--s-card)', borderColor: 'var(--s-border-mid)' }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(90deg, rgba(234,17,0,0.08), rgba(0,83,226,0.08))' }}>
        <div>
          <h3 className="text-sm font-black tracking-wide" style={{ color: 'var(--s-text)' }}>
            📨 Morning Intel Brief
          </h3>
          {ts && (
            <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--s-text-dim)' }}>
              Updated {ts} UTC
            </p>
          )}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
          style={{ background: 'rgba(234,17,0,0.12)', color: '#ff6b6b', border: '1px solid rgba(234,17,0,0.3)' }}>
          LIVE
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-3">
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 rounded animate-pulse" style={{ background: 'var(--s-border)' }} />
            ))}
          </div>
        )}

        {error && !loading && (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--s-text-dim)' }}>
            Backend offline — start the FastAPI server to see the brief.
          </p>
        )}

        {brief && !loading && (
          <>
            <BriefRow icon="🔴" label="Critical Incidents"
              value={brief.incidents.critical}
              color={brief.incidents.critical > 0 ? '#ff6b6b' : '#4ade80'} />
            <BriefRow icon="🛡️" label="Total Incidents Tracked"
              value={brief.incidents.total}
              color="#FFC220" />
            <BriefRow icon="⚖️" label="Red Regulatory Obligations"
              value={brief.regulatory.red}
              color={brief.regulatory.red > 0 ? '#ff6b6b' : '#4ade80'} />
            <BriefRow icon="🟠" label="Amber Obligations"
              value={brief.regulatory.amber}
              color="#fb923c" />
            <BriefRow icon="👁️" label="Competitor Events"
              value={brief.competitors.total_events}
              color="#60a5fa" />
            <BriefRow icon="⏳" label="Stale Vendor Assessments (>180d)"
              value={brief.vendors.stale_assessments.length}
              color={brief.vendors.stale_assessments.length > 0 ? '#fb923c' : '#4ade80'} />

            {/* Recent incidents preview */}
            {brief.incidents.recent.length > 0 && (
              <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--s-border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--s-text-dim)' }}>Recent Incidents</p>
                {brief.incidents.recent.slice(0, 3).map((inc, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5">
                    <span className="shrink-0 text-[10px] font-black mt-0.5"
                      style={{ color: SEV_COLOR[inc.severity ?? 'Medium'] ?? '#FFC220' }}>
                      {inc.severity?.slice(0, 4).toUpperCase()}
                    </span>
                    <p className="text-[11px] leading-snug" style={{ color: 'var(--s-text-muted)' }}>
                      {inc.summary?.slice(0, 80)}{(inc.summary?.length ?? 0) > 80 ? '…' : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer CTA */}
      <div className="px-5 pb-4 pt-2 flex gap-2">
        <button
          onClick={() => onNavigate(ViewState.INCIDENT_INTEL)}
          className="flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-colors"
          style={{ background: 'rgba(234,17,0,0.10)', color: '#ff6b6b', border: '1px solid rgba(234,17,0,0.3)' }}>
          View Incidents
        </button>
        <button
          onClick={() => onNavigate(ViewState.REGULATORY_INTEL)}
          className="flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-colors"
          style={{ background: 'rgba(0,83,226,0.10)', color: '#60a5fa', border: '1px solid rgba(0,83,226,0.3)' }}>
          Regulatory
        </button>
      </div>
    </div>
  );
}
