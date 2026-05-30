import React, { useState } from 'react';
import { Tone } from './signalLogic';

// ---------------------------------------------------------------------------
// Shared presentational primitives for the Executive Intelligence module.
// Extracted from ExecutiveIntelPortfolio.tsx to keep that file under the
// 600-line ceiling and to follow DRY (these were duplicated inline).
// ---------------------------------------------------------------------------

const TONE_STYLES: Record<Tone, { background: string; color: string; border: string }> = {
  blue: { background: 'rgba(0,83,226,0.12)', color: '#0053E2', border: 'rgba(0,83,226,0.28)' },
  green: { background: 'rgba(42,135,3,0.12)', color: '#2A8703', border: 'rgba(42,135,3,0.28)' },
  yellow: { background: 'rgba(255,194,32,0.16)', color: '#995213', border: 'rgba(255,194,32,0.5)' },
  red: { background: 'rgba(234,17,0,0.12)', color: '#EA1100', border: 'rgba(234,17,0,0.28)' },
  gray: { background: 'var(--s-input-bg)', color: 'var(--s-text-dim)', border: 'var(--s-border-mid)' },
};

export function Badge({ children, tone = 'gray', title }: { children: React.ReactNode; tone?: Tone; title?: string }) {
  const s = TONE_STYLES[tone];
  return (
    <span
      title={title}
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em]"
      style={{ background: s.background, color: s.color, border: '1px solid ' + s.border }}
    >
      {children}
    </span>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={'rounded-2xl border p-5 shadow-sm ' + className}
      style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}
    >
      {children}
    </section>
  );
}

export function StatCard({ label, value, helper, tone }: { label: string; value: React.ReactNode; helper?: string; tone?: Tone }) {
  const valueColor = tone ? TONE_STYLES[tone].color : 'var(--s-text)';
  return (
    <Card className="p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--s-text-dim)' }}>{label}</div>
      <div className="mt-2 text-2xl font-black" style={{ color: valueColor }}>{value}</div>
      {helper && <div className="mt-1 text-xs" style={{ color: 'var(--s-text-dim)' }}>{helper}</div>}
    </Card>
  );
}

// Horizontal labelled bar for category / distribution breakdowns.
export function MiniBar({ label, count, max, tone = 'blue' }: { label: string; count: number; max: number; tone?: Tone }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 shrink-0 truncate text-xs font-semibold" style={{ color: 'var(--s-text-dim)' }} title={label}>{label}</div>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--s-input-bg)' }}>
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: pct + '%', background: TONE_STYLES[tone].color }} />
      </div>
      <div className="w-8 shrink-0 text-right text-xs font-black" style={{ color: 'var(--s-text)' }}>{count}</div>
    </div>
  );
}

// Deterministic gradient palette for letter-avatar fallback (no external calls).
const AVATAR_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ['#0053E2', '#2A6FF0'], ['#995213', '#C8821F'], ['#2A8703', '#3EA821'],
  ['#6D28D9', '#8B5CF6'], ['#BE185D', '#E11D74'], ['#0E7490', '#0EA5C4'],
  ['#B91C1C', '#EA1100'], ['#475569', '#64748B'],
];

export function initialsOf(name: string): string {
  const parts = (name || '?').replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function gradientFor(name: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export function ExecutiveAvatar({ name, photoUrl, size = 44 }: { name: string; photoUrl?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const dim = { width: size, height: size };
  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt={name + ' headshot'}
        onError={() => setFailed(true)}
        className="rounded-xl object-cover flex-shrink-0"
        style={{ ...dim, border: '1px solid var(--s-border)' }}
      />
    );
  }
  const [from, to] = gradientFor(name);
  return (
    <div
      aria-label={name + ' (no photo)'}
      role="img"
      className="rounded-xl flex items-center justify-center flex-shrink-0 font-black text-white"
      style={{ ...dim, background: 'linear-gradient(135deg, ' + from + ', ' + to + ')', fontSize: size * 0.36 }}
    >
      {initialsOf(name)}
    </div>
  );
}
