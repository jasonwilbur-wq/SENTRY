/**
 * CommandPalette — Cmd/Ctrl+K fuzzy-search navigation overlay.
 * Military-trust aesthetic: dark glass, snappy, keyboard-first.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ViewState } from '../types';

interface PaletteEntry {
  view: ViewState;
  label: string;
  description: string;
  group: string;
  keywords: string;
}

const ENTRIES: PaletteEntry[] = [
  { view: ViewState.HOME,              label: 'Command Center',      description: 'Mission control — KPIs and module overview',        group: 'Operations',    keywords: 'home dashboard command center kpi' },
  { view: ViewState.DIRECTORY,         label: 'Vendor Directory',    description: 'All assessed emerging technology vendors',          group: 'Operations',    keywords: 'vendors directory list search' },
  { view: ViewState.PROJECTS,          label: 'Project Portfolio',   description: '3D view of 14 active projects, $5.05M portfolio',   group: 'Operations',    keywords: 'projects portfolio 3d cost health' },
  { view: ViewState.REQUEST_ASSESSMENT,label: 'Security Assessment', description: 'Initiate a new GRC vendor review workflow',          group: 'Operations',    keywords: 'assessment request grc review' },
  { view: ViewState.REQUEST_LAB_VISIT, label: 'Emerging Tech Lab',   description: 'Schedule hands-on lab evaluation time',             group: 'Operations',    keywords: 'lab visit schedule booking' },
  { view: ViewState.COMPETITOR_INTEL,  label: 'Competitor Intel',    description: '1,113 analyst-enriched competitor events',          group: 'Intelligence',  keywords: 'competitor intel events amazon target costco' },
  { view: ViewState.CSO_INTELLIGENCE,  label: 'CSO Intelligence',    description: 'Executive security leadership competitive analysis',  group: 'Intelligence',  keywords: 'cso leadership executive security' },
  { view: ViewState.REGULATORY_INTEL,  label: 'Regulatory Intel',    description: '362 obligations — AI, Biometrics, ALPR, UAS, Privacy', group: 'Intelligence', keywords: 'regulatory compliance ai biometrics alpr uas privacy' },
  { view: ViewState.COMPETITOR_ANALYSIS,label:'Market Analysis',     description: 'Risk metrics and vendor performance comparison',    group: 'Intelligence',  keywords: 'market analysis charts risk metrics' },
  { view: ViewState.RISK_MAP,          label: 'Risk Map 3D',         description: 'Vendors plotted in 3D space by risk and category',  group: 'Intelligence',  keywords: 'risk map 3d scatter vendors globe' },
  { view: ViewState.ARCHITECTURE,      label: 'Architecture',        description: 'GCP four-phase framework hierarchy',                group: 'System',        keywords: 'architecture gcp framework' },
  { view: ViewState.ADMIN,             label: 'VAR Admin',           description: 'Manage VAR reports, scores, and vendor linkage',    group: 'System',        keywords: 'admin var reports scores' },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: ViewState) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onNavigate }) => {
  const [query, setQuery]           = useState('');
  const [activeIdx, setActiveIdx]   = useState(0);
  const inputRef                    = useRef<HTMLInputElement>(null);
  const listRef                     = useRef<HTMLUListElement>(null);

  const filtered = query.trim()
    ? ENTRIES.filter(e =>
        `${e.label} ${e.description} ${e.keywords}`.toLowerCase().includes(query.toLowerCase())
      )
    : ENTRIES;

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Clamp active index when filtered list shrinks
  useEffect(() => {
    setActiveIdx(i => Math.min(i, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const commit = useCallback((view: ViewState) => {
    onNavigate(view);
    onClose();
  }, [onNavigate, onClose]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape')     { onClose(); return; }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); return; }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter' && filtered[activeIdx]) { commit(filtered[activeIdx].view); }
  };

  if (!open) return null;

  const groupedFiltered = ENTRIES
    .filter(e => filtered.includes(e))
    .reduce<Record<string, PaletteEntry[]>>((acc, e) => {
      (acc[e.group] ??= []).push(e);
      return acc;
    }, {});

  const flatFiltered = Object.values(groupedFiltered).flat();
  let globalIdx = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: 'rgba(0,6,20,0.72)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
        className="fixed left-1/2 top-[18vh] z-[61] w-full"
        style={{ maxWidth: 560, transform: 'translateX(-50%)', animation: 'slideUp 0.2s cubic-bezier(0.16,1,0.3,1) both' }}
        onKeyDown={onKeyDown}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(4,8,22,0.97)',
            border: '1px solid rgba(0,83,226,0.35)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,83,226,0.12), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid rgba(0,83,226,0.2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4d9fff" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
              placeholder="Jump to any module…"
              aria-label="Search SENTRY modules"
              aria-autocomplete="list"
              aria-activedescendant={filtered[activeIdx] ? `cp-item-${filtered[activeIdx].view}` : undefined}
              className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-600"
              style={{ color: 'var(--s-text)', fontFamily: 'var(--font-sans)' }}
            />
            <kbd
              className="text-[10px] font-mono px-2 py-1 rounded"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              ESC
            </kbd>
          </div>

          {/* Results */}
          <ul
            ref={listRef}
            role="listbox"
            aria-label="Navigation options"
            className="overflow-y-auto"
            style={{ maxHeight: 360 }}
          >
            {flatFiltered.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm" style={{ color: 'var(--s-text-dim)' }}>
                No modules match &ldquo;{query}&rdquo;
              </li>
            ) : (
              Object.entries(groupedFiltered).map(([group, items]) => (
                <div key={group}>
                  <p
                    className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.15em]"
                    style={{ color: 'var(--s-text-dim)' }}
                    aria-hidden="true"
                  >
                    {group}
                  </p>
                  {items.map(item => {
                    const idx = flatFiltered.indexOf(item);
                    const isActive = idx === activeIdx;
                    return (
                      <li
                        key={item.view}
                        id={`cp-item-${item.view}`}
                        role="option"
                        aria-selected={isActive}
                        onClick={() => commit(item.view)}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                        style={{
                          background: isActive ? 'rgba(0,83,226,0.18)' : 'transparent',
                          borderLeft: isActive ? '2px solid #0053E2' : '2px solid transparent',
                        }}
                        onMouseEnter={() => setActiveIdx(idx)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: isActive ? '#fff' : 'var(--s-text-muted)' }}>
                            {item.label}
                          </p>
                          <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--s-text-dim)' }}>
                            {item.description}
                          </p>
                        </div>
                        {isActive && (
                          <kbd className="shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,83,226,0.3)', color: '#93c5fd', border: '1px solid rgba(0,83,226,0.4)' }}>
                            ↵
                          </kbd>
                        )}
                      </li>
                    );
                  })}
                </div>
              ))
            )}
          </ul>

          {/* Footer hint */}
          <div className="px-4 py-2 flex items-center gap-4" style={{ borderTop: '1px solid rgba(0,83,226,0.12)' }}>
            {[['↑↓', 'Navigate'], ['↵', 'Open'], ['ESC', 'Close']].map(([key, hint]) => (
              <div key={key} className="flex items-center gap-1.5">
                <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b', border: '1px solid rgba(255,255,255,0.1)' }}>{key}</kbd>
                <span className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>{hint}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};