import React, { useEffect, useRef } from 'react';
import { RegObligation } from '../types';

interface Props {
  obligation: RegObligation;
  onClose: () => void;
}

const RAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Red:    { bg: 'rgba(234,17,0,0.12)',   text: '#ff6b6b', border: 'rgba(234,17,0,0.4)' },
  Amber:  { bg: 'rgba(251,146,60,0.12)', text: '#fb923c', border: 'rgba(251,146,60,0.4)' },
  Yellow: { bg: 'rgba(255,194,32,0.12)', text: '#FFC220', border: 'rgba(255,194,32,0.4)' },
  Green:  { bg: 'rgba(42,135,3,0.12)',   text: '#4ade80', border: 'rgba(42,135,3,0.4)' },
};

// Emoji constants
const E_USER = String.fromCodePoint(0x1F464);
const E_CAL  = String.fromCodePoint(0x1F4C5);
const E_LINK = String.fromCodePoint(0x1F517);


const ScoreBar: React.FC<{ label: string; value: number; max?: number; color?: string }> = ({
  label, value, max = 5, color = '#0053E2',
}) => (
  <div>
    <div className="flex justify-between text-[10px] mb-0.5">
      <span style={{ color: 'var(--s-text-dim)' }}>{label}</span>
      <span className="font-bold" style={{ color: 'var(--s-text)' }}>{value}/{max}</span>
    </div>
    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  </div>
);

export const RegulatoryObligationModal: React.FC<Props> = ({ obligation: ob, onClose }) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const c = RAG_COLORS[ob.risk.rag] ?? RAG_COLORS.Green;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === backdropRef.current) onClose(); }}
      role="dialog" aria-modal="true" aria-label={ob.title}
    >
      <div
        className="relative h-full w-full max-w-2xl overflow-y-auto"
        style={{ background: 'var(--s-sidebar)', borderLeft: '1px solid var(--s-border)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex items-start justify-between gap-4"
          style={{ background: 'var(--s-header)', borderBottom: '1px solid var(--s-border)', backdropFilter: 'blur(16px)' }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border"
                style={{ background: c.bg, color: c.text, borderColor: c.border }}>
                {ob.risk.rag} · Score {ob.risk.score}/25
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase"
                style={{ background: ob.status === 'Enacted' ? 'rgba(42,135,3,0.2)' : 'rgba(255,194,32,0.12)',
                         color: ob.status === 'Enacted' ? '#4ade80' : '#FFC220' }}>
                {ob.status}
              </span>
            </div>
            <h2 className="text-base font-black text-white leading-snug">{ob.title}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--s-text-dim)' }}>{ob.jurisdiction} &middot; {ob.tech_category}</p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Risk scoring */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--s-text-dim)' }}>Risk Assessment</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border" style={{ background: c.bg, borderColor: c.border }}>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: c.text }}>Composite Score</div>
                <div className="text-3xl font-black" style={{ color: c.text }}>{ob.risk.score}<span className="text-base font-medium">/25</span></div>
              </div>
              <div className="space-y-2 p-3 rounded-lg border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <ScoreBar label="Impact" value={ob.risk.impact} color="#ea1100" />
                <ScoreBar label="Likelihood" value={ob.risk.likelihood} color="#0053E2" />
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--s-text-dim)' }}>
              <span className="font-bold text-white">Reason: </span>{ob.risk.reason}
            </p>
          </section>

          {/* Full description */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--s-text-dim)' }}>Scope &amp; Key Provisions</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--s-text)' }}>{ob.full_description}</p>
          </section>

          {/* Key dates */}
          {(ob.effective_date || ob.deadline) && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--s-text-dim)' }}>Key Dates</h3>
              <div className="grid grid-cols-2 gap-3">
                {ob.effective_date && (
                  <div className="p-3 rounded-lg border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="text-[10px] text-slate-500 mb-0.5">Effective / Enacted</div>
                    <div className="text-sm font-bold text-white">{ob.effective_date}</div>
                  </div>
                )}
                {ob.deadline && (
                  <div className="p-3 rounded-lg border" style={{ background: 'rgba(234,17,0,0.08)', borderColor: 'rgba(234,17,0,0.3)' }}>
                    <div className="text-[10px] text-red-400 mb-0.5">Compliance Deadline</div>
                    <div className="text-sm font-bold text-red-300">{ob.deadline}</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Evidence & controls */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--s-text-dim)' }}>Controls &amp; Evidence</h3>
            <div className="mb-2">
              <span className="text-[10px] px-2 py-0.5 rounded font-medium"
                style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}>
                Evidence Status: {ob.evidence_status}
              </span>
            </div>
            <div className="space-y-2">
              {ob.controls.map((ctrl, i) => (
                <div key={i} className="p-3 rounded-lg border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold font-mono" style={{ color: '#9BB7DF' }}>{ctrl.control_id}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                      style={{ background: ctrl.status === 'Compliant' ? 'rgba(42,135,3,0.2)' : ctrl.status === 'Partial' ? 'rgba(251,146,60,0.15)' : 'rgba(234,17,0,0.15)',
                               color: ctrl.status === 'Compliant' ? '#4ade80' : ctrl.status === 'Partial' ? '#fb923c' : '#ff6b6b' }}>
                      {ctrl.status}
                    </span>
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--s-text-dim)' }}>{ctrl.description}</p>
                  <div className="flex gap-3 mt-1 text-[10px]" style={{ color: 'var(--s-text-dim)' }}>
                    <span>{E_USER} {ctrl.owner}</span>
                    <span>{E_CAL} Reviewed: {ctrl.last_reviewed}</span>
                  </div>
                  {ctrl.evidence_link && (
                    <a href={ctrl.evidence_link} target="_blank" rel="noopener noreferrer"
                      className="mt-1 text-[10px] text-blue-400 hover:underline block truncate">
                      {E_LINK} {ctrl.evidence_link}
                    </a>
                  )}
                </div>
              ))}
            </div>
            {ob.evidence_links.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--s-text-dim)' }}>Source Links</p>
                {ob.evidence_links.map((link, i) => (
                  <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                    className="block text-[11px] text-blue-400 hover:underline truncate">
                    {link}
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* Provenance */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--s-text-dim)' }}>Provenance</h3>
            <div className="flex flex-wrap gap-1.5">
              {ob.provenance.map((p, i) => (
                <span key={i} className="text-[9px] px-2 py-0.5 rounded font-mono"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--s-text-dim)', border: '1px solid rgba(255,255,255,0.08)' }}>{p}</span>
              ))}
            </div>
            <p className="mt-2 text-[9px]" style={{ color: 'var(--s-text-dim)' }}>Obligation ID: <code>{ob.id}</code></p>
          </section>
        </div>
      </div>
    </div>
  );
};