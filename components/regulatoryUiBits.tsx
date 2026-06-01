import React from 'react';
import type { RegTopAction } from '../types';
import type { RegulatoryGeoJurisdiction } from '../services/api';

export const RAG_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Red:    { bg: 'rgba(234,17,0,0.12)',   text: '#ff6b6b', border: 'rgba(234,17,0,0.35)',   dot: '#ea1100' },
  Amber:  { bg: 'rgba(251,146,60,0.12)', text: '#fb923c', border: 'rgba(251,146,60,0.35)', dot: '#f97316' },
  Yellow: { bg: 'rgba(255,194,32,0.12)', text: '#FFC220', border: 'rgba(255,194,32,0.35)', dot: '#FFC220' },
  Green:  { bg: 'rgba(42,135,3,0.12)',   text: '#4ade80', border: 'rgba(42,135,3,0.35)',   dot: '#2a8703' },
};

interface SparklinePoint {
  period: string;
  count: number;
}

export const SparklineTrend: React.FC<{
  title: string;
  points: SparklinePoint[];
  color: string;
}> = ({ title, points, color }) => {
  const width = 320;
  const height = 80;
  const max = Math.max(...points.map((p) => p.count), 1);

  const path = points
    .map((point, idx) => {
      const x = points.length <= 1 ? 0 : (idx / (points.length - 1)) * width;
      const y = height - (point.count / max) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}>
      <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--s-text)' }}>{title}</h3>
      <div className="h-[100px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" role="img" aria-label={`${title} sparkline`}>
          <polyline points={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-1">
        {points.slice(-4).map((point) => (
          <div key={point.period} className="text-[10px] flex items-center justify-between"
            style={{ color: 'var(--s-text-dim)' }}>
            <span>{point.period}</span>
            <span>{point.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const HotspotChips: React.FC<{
  hotspots: RegulatoryGeoJurisdiction[];
  activeJurisdiction: string | null;
  onSelect: (jurisdiction: string) => void;
}> = ({ hotspots, activeJurisdiction, onSelect }) => (
  <div className="flex flex-wrap gap-2 mt-2">
    {hotspots.slice(0, 6).map((hotspot) => {
      const selected = activeJurisdiction === hotspot.jurisdiction;
      return (
        <button
          key={hotspot.jurisdiction}
          onClick={() => onSelect(hotspot.jurisdiction)}
          className="px-2 py-1 rounded-full text-[10px] border transition-all"
          style={{
            background: selected ? 'rgba(255,194,32,0.18)' : 'rgba(0,83,226,0.1)',
            borderColor: selected ? 'rgba(255,194,32,0.45)' : 'rgba(0,83,226,0.3)',
            color: selected ? '#FFC220' : '#9BB7DF',
          }}
          aria-label={`Filter by hotspot ${hotspot.jurisdiction}`}
          title={`${hotspot.jurisdiction} · ${hotspot.total} obligations`}
        >
          {hotspot.jurisdiction} ({hotspot.total})
        </button>
      );
    })}
  </div>
);

export const TECH_ICONS: Record<string, string> = {
  AI: '🧠', 'Data Privacy': '🔒', Biometrics: '📷', 'ALPR/LPR': '🚗',
  'Drones/UAS': '🚁', Surveillance: '📹', ORC: '🛒',
  'Weapons Detection': '🚨', Robotics: '🤖', Other: '⚖️',
};

const E_CAL  = '📅';
const E_USER = '👤';

export const KpiCard: React.FC<{ label: string; value: number | string; sub?: string; rag?: string }> = ({ label, value, sub, rag }) => {
  const c = rag ? RAG_COLORS[rag] : null;
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1 border min-w-0"
      style={{ background: c ? c.bg : 'var(--s-card)', borderColor: c ? c.border : 'var(--s-border)' }}>
      <span className="text-[10px] uppercase tracking-widest truncate" style={{ color: 'var(--s-text-dim)' }}>{label}</span>
      <span className="text-2xl lg:text-3xl font-black" style={{ color: c ? c.text : 'var(--s-text)' }}>{value}</span>
      {sub && <span className="text-[10px] truncate" style={{ color: 'var(--s-text-dim)' }}>{sub}</span>}
    </div>
  );
};

export const RagBadge: React.FC<{ rag: string; score?: number }> = ({ rag, score }) => {
  const c = RAG_COLORS[rag] ?? RAG_COLORS.Green;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border whitespace-nowrap"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
      {rag}{score !== undefined ? ` · ${score}` : ''}
    </span>
  );
};

export const TechPill: React.FC<{ tech: string }> = ({ tech }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap"
    style={{ background: 'rgba(0,83,226,0.12)', color: '#60a5fa', border: '1px solid rgba(0,83,226,0.25)' }}>
    {TECH_ICONS[tech] ?? '⚖️'} {tech}
  </span>
);

export const ActionCard: React.FC<{ action: RegTopAction; idx: number }> = ({ action, idx }) => {
  const pColor = action.priority === 'High' ? '#ff6b6b' : action.priority === 'Med' ? '#fb923c' : '#4ade80';
  return (
    <div className="flex gap-3 p-3 rounded-lg border min-w-0" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black"
        style={{ background: 'rgba(0,83,226,0.18)', color: '#60a5fa' }}>{idx + 1}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5 min-w-0">
          <span className="text-sm font-bold truncate" style={{ color: 'var(--s-text)' }}>{action.title}</span>
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0" style={{ background: `${pColor}1a`, color: pColor }}>{action.priority}</span>
        </div>
        <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--s-text-dim)' }}>{action.description}</p>
        <div className="flex gap-3 mt-1 text-[10px]" style={{ color: 'var(--s-text-dim)' }}>
          <span>{E_CAL} {action.eta}</span>
          <span>{E_USER} {action.owner}</span>
        </div>
      </div>
    </div>
  );
};
