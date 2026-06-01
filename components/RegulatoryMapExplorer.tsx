import React, { useEffect, useMemo, useState } from 'react';
import type { RegulatoryGeoJurisdiction } from '../services/api';
import { RegulatoryMap2D } from './RegulatoryMap2D';

interface RegulatoryMapExplorerProps {
  geoScope: 'all' | 'us' | 'global';
  filterJur: string | null;
  onScopeChange: (scope: 'all' | 'us' | 'global') => void;
  onJurisdictionSelect: (jurisdiction: string | null) => void;
  openSignal?: number;
  showInlineOpenButton?: boolean;
}

const SCOPE_OPTIONS = [
  ['all', 'All'],
  ['us', 'US'],
  ['global', 'Global'],
] as const;

const RAG_OPTIONS = ['Red', 'Amber', 'Yellow', 'Green'] as const;

export const RegulatoryMapExplorer: React.FC<RegulatoryMapExplorerProps> = ({
  geoScope,
  filterJur,
  onScopeChange,
  onJurisdictionSelect,
  openSignal = 0,
  showInlineOpenButton = true,
}) => {
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [activeRags, setActiveRags] = useState<Array<'Red' | 'Amber' | 'Yellow' | 'Green'>>(['Red', 'Amber', 'Yellow', 'Green']);
  const [minObligations, setMinObligations] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [showConnectors, setShowConnectors] = useState(true);
  const [maxVisible, setMaxVisible] = useState(200);
  const [visibleJurisdictions, setVisibleJurisdictions] = useState<RegulatoryGeoJurisdiction[]>([]);

  useEffect(() => {
    if (openSignal <= 0) return;
    setExplorerOpen(true);
  }, [openSignal]);

  useEffect(() => {
    if (!explorerOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExplorerOpen(false);
    };

    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [explorerOpen]);

  useEffect(() => {
    if (!explorerOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [explorerOpen]);

  const scopeLabel = useMemo(() => {
    if (geoScope === 'us') return 'US + Federal';
    if (geoScope === 'global') return 'Global / International';
    return 'All Jurisdictions';
  }, [geoScope]);

  const topVisible = useMemo(
    () => visibleJurisdictions.slice(0, 10),
    [visibleJurisdictions],
  );

  const toggleRag = (rag: 'Red' | 'Amber' | 'Yellow' | 'Green') => {
    setActiveRags((prev) => {
      if (prev.includes(rag)) {
        const next = prev.filter((value) => value !== rag);
        return next.length > 0 ? next : prev;
      }
      return [...prev, rag];
    });
  };

  const filterControls = (
    <div className="px-4 py-3 flex flex-wrap items-center gap-3"
      style={{ background: 'rgba(0, 11, 40, 0.78)', borderBottom: '1px solid var(--s-border)' }}>
      <input
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="Search jurisdiction or tech…"
        className="px-3 py-2 rounded-lg text-xs min-w-[220px]"
        style={{ background: '#00122f', color: '#e2e8f0', border: '1px solid rgba(0,83,226,0.45)' }}
      />

      <label className="text-[10px] font-bold flex items-center gap-2" style={{ color: '#cbd5e1' }}>
        Min obligations
        <input
          type="range"
          min={1}
          max={50}
          value={minObligations}
          onChange={(e) => setMinObligations(Number(e.target.value))}
        />
        <span style={{ color: '#9BB7DF' }}>{minObligations}+</span>
      </label>

      <label className="text-[10px] font-bold flex items-center gap-2" style={{ color: '#cbd5e1' }}>
        Max markers
        <input
          type="number"
          min={25}
          max={500}
          step={25}
          value={maxVisible}
          onChange={(e) => setMaxVisible(Math.max(25, Math.min(500, Number(e.target.value) || 25)))}
          className="w-16 px-2 py-1 rounded"
          style={{ background: '#00122f', color: '#e2e8f0', border: '1px solid rgba(0,83,226,0.45)' }}
        />
      </label>

      <label className="text-[10px] font-bold flex items-center gap-1" style={{ color: '#cbd5e1' }}>
        <input type="checkbox" checked={showConnectors} onChange={(e) => setShowConnectors(e.target.checked)} />
        Show origin lines
      </label>

      <div className="flex items-center gap-1">
        {RAG_OPTIONS.map((rag) => {
          const active = activeRags.includes(rag);
          return (
            <button
              key={rag}
              onClick={() => toggleRag(rag)}
              className="px-2 py-1 rounded-full text-[10px] font-bold"
              style={{
                background: active ? '#0053e2' : 'rgba(255,255,255,0.06)',
                color: active ? '#fff' : '#cbd5e1',
                border: active ? '1px solid #0053e2' : '1px solid rgba(148,163,184,0.3)',
              }}
            >
              {rag}
            </button>
          );
        })}
      </div>
    </div>
  );

  const visibleList = (
    <div className="px-4 py-2" style={{ borderTop: '1px solid var(--s-border)', background: 'rgba(0, 11, 40, 0.6)' }}>
      <p className="text-[10px] font-bold mb-2" style={{ color: '#9BB7DF' }}>Top visible jurisdictions</p>
      <div className="flex flex-wrap gap-1 max-h-[70px] overflow-auto pr-1">
        {topVisible.map((item) => (
          <button
            key={item.jurisdiction}
            onClick={() => onJurisdictionSelect(item.jurisdiction)}
            className="px-2 py-1 rounded text-[10px]"
            style={{
              background: filterJur === item.jurisdiction ? 'rgba(255,194,32,0.2)' : 'rgba(255,255,255,0.06)',
              color: filterJur === item.jurisdiction ? '#FFC220' : '#cbd5e1',
              border: '1px solid rgba(148,163,184,0.3)',
            }}
            title={`${item.total} obligations · ${item.worst_rag}`}
          >
            {item.jurisdiction} ({item.total})
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="rounded-2xl overflow-hidden border relative" style={{ borderColor: 'var(--s-border)' }}>
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
          style={{ background: 'var(--s-card)', borderBottom: '1px solid var(--s-border)' }}>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--s-text)' }}>Regulatory Map Explorer</p>
            <p className="text-[11px]" style={{ color: 'var(--s-text-dim)' }}>
              Click markers to filter obligations. Scope: {scopeLabel}
            </p>
            <p className="text-[10px] font-bold mt-1" style={{ color: '#60a5fa' }}>
              Showing {visibleCount} jurisdictions
            </p>
          </div>
          {showInlineOpenButton && (
            <button
              onClick={() => setExplorerOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: '#0053e2', color: '#fff', border: '1px solid #0053e2' }}
              aria-label="Open fullscreen map explorer"
            >
              Open full map
            </button>
          )}
        </div>

        {filterControls}

        <div style={{ height: '420px' }}>
          <RegulatoryMap2D
            selectedJurisdiction={filterJur}
            onJurisdictionClick={onJurisdictionSelect}
            geoScope={geoScope}
            onVisibleCountChange={setVisibleCount}
            activeRags={activeRags}
            minObligations={minObligations}
            searchText={searchText}
            maxVisible={maxVisible}
            showConnectors={showConnectors}
            onVisibleJurisdictionsChange={setVisibleJurisdictions}
          />
        </div>
        {visibleList}
      </div>

      {explorerOpen && (
        <div className="fixed inset-0 z-[70]"
          style={{ background: 'rgba(0, 8, 30, 0.88)', backdropFilter: 'blur(4px)' }}>
          <div className="w-screen h-screen border overflow-hidden flex flex-col"
            style={{ background: 'var(--s-sidebar)', borderColor: 'var(--s-border)' }}>
            <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3"
              style={{ borderBottom: '1px solid var(--s-border)', background: 'var(--s-header)' }}>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--s-text)' }}>Regulatory Map Explorer</h3>
                <p className="text-[11px]" style={{ color: 'var(--s-text-dim)' }}>
                  Pan, zoom, and click markers to isolate jurisdictional obligations. Scope: {scopeLabel}
                </p>
                <p className="text-[10px] font-bold mt-1" style={{ color: '#60a5fa' }}>
                  Showing {visibleCount} jurisdictions
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="rounded-full p-1 flex gap-1"
                  style={{ background: 'rgba(0, 11, 40, 0.78)', border: '1px solid rgba(0,83,226,0.35)' }}>
                  {SCOPE_OPTIONS.map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => onScopeChange(value)}
                      className="px-3 py-1.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: geoScope === value ? '#0053e2' : 'transparent',
                        color: geoScope === value ? '#fff' : '#cbd5e1',
                        border: geoScope === value ? '1px solid #0053e2' : '1px solid transparent',
                      }}
                      aria-label={`Map scope ${label}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {filterJur && (
                  <button
                    onClick={() => onJurisdictionSelect(null)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(255,194,32,0.15)', color: '#FFC220', border: '1px solid rgba(255,194,32,0.3)' }}
                  >
                    🌍 {filterJur} ✕
                  </button>
                )}

                <button
                  onClick={() => setExplorerOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid var(--s-border)' }}
                  aria-label="Close fullscreen map explorer"
                >
                  Close
                </button>
              </div>
            </div>

            {filterControls}

            <div className="flex-1 min-h-0">
              <RegulatoryMap2D
                selectedJurisdiction={filterJur}
                onJurisdictionClick={onJurisdictionSelect}
                geoScope={geoScope}
                onVisibleCountChange={setVisibleCount}
                activeRags={activeRags}
                minObligations={minObligations}
                searchText={searchText}
                maxVisible={maxVisible}
                showConnectors={showConnectors}
                onVisibleJurisdictionsChange={setVisibleJurisdictions}
              />
            </div>
            {visibleList}
          </div>
        </div>
      )}
    </>
  );
};
