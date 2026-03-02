/**
 * ArchitectureGraph — Architecture page wrapper.
 * Hosts the Architecture3D canvas + legend + selected-node info panel.
 */
import React, { useState, useCallback } from 'react';
import { Architecture3D, type SelectedNode } from './Architecture3D';
import { ARCH_LAYERS, ARCH_NODES, ARCH_EDGES } from '../constants';

// Layer pill component
const LayerPill: React.FC<{ label: string; color: string; count: number }> = ({ label, color, count }) => (
  <div
    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
    style={{ background: `${color}18`, border: `1px solid ${color}44`, color: '#cbd5e1' }}
  >
    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
    <span style={{ color }}>{label}</span>
    <span className="ml-auto text-slate-500">{count}</span>
  </div>
);

// Info panel shown when a node is selected
const NodeInfoPanel: React.FC<{ node: SelectedNode; onClose: () => void }> = ({ node, onClose }) => {
  const layer = ARCH_LAYERS[node.layer];
  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[min(540px,90%)] rounded-2xl p-5 shadow-2xl z-30"
      style={{
        background: 'rgba(2,8,23,0.93)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${layer.color}55`,
        boxShadow: `0 0 40px ${layer.color}22`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: layer.color, boxShadow: `0 0 10px ${layer.color}` }} />
          <div className="min-w-0">
            <p className="text-base font-bold text-white truncate">{node.label}</p>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: layer.color }}>{layer.label}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          aria-label="Close node info"
        >✕</button>
      </div>
      <p className="mt-3 text-sm text-slate-300 leading-relaxed">{node.desc}</p>
      <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-1.5">
        {node.tech.split(' · ').map(t => (
          <span
            key={t}
            className="px-2 py-0.5 text-[10px] font-mono rounded"
            style={{ background: `${layer.color}18`, color: layer.color, border: `1px solid ${layer.color}33` }}
          >{t}</span>
        ))}
      </div>
    </div>
  );
};

export const ArchitectureGraph: React.FC = () => {
  const [selected, setSelected] = useState<SelectedNode | null>(null);

  const handleSelect = useCallback((node: SelectedNode | null) => setSelected(node), []);
  const handleClose  = useCallback(() => setSelected(null), []);

  const nodeCounts = ARCH_LAYERS.map((_, li) => ARCH_NODES.filter(n => n.layer === li).length);

  return (
    <div
      className="flex flex-col h-full min-h-[700px] rounded-2xl overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 20%, #020c2a 0%, #000510 70%)',
        border: '1px solid rgba(0,83,226,0.2)',
        boxShadow: '0 0 60px rgba(0,83,226,0.08)',
      }}
    >
      {/* ─ Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0" style={{ borderBottom: '1px solid rgba(0,83,226,0.12)' }}>
        <div>
          <h2 className="text-lg font-black tracking-tight text-white">
            SENTRY&nbsp;<span style={{ color: '#FFC220' }}>3D</span>&nbsp;Architecture
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {ARCH_NODES.length} nodes &middot; {ARCH_EDGES.length} edges &middot; {ARCH_LAYERS.length} layers &middot; drag to orbit &middot; click a node to inspect
          </p>
        </div>

        {/* Hint badge */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px]"
          style={{ background: 'rgba(255,194,32,0.08)', border: '1px solid rgba(255,194,32,0.2)', color: '#FFC220' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-5h2V7h-2v8zm0 4h2v-2h-2v2z"/></svg>
          Auto-rotates · drag to control
        </div>
      </div>

      {/* ─ 3D Canvas (flex-grow) ───────────────────────────────────────────── */}
      <div className="relative flex-grow" style={{ minHeight: 480 }}>
        <Architecture3D onSelect={handleSelect} selectedId={selected?.id ?? null} />
        {selected && <NodeInfoPanel node={selected} onClose={handleClose} />}
      </div>

      {/* ─ Legend ─────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-5 py-3"
        style={{ borderTop: '1px solid rgba(0,83,226,0.12)' }}
      >
        <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-2">Layer Legend</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
          {ARCH_LAYERS.map((layer, li) => (
            <LayerPill key={layer.id} label={layer.label} color={layer.color} count={nodeCounts[li]} />
          ))}
        </div>
      </div>
    </div>
  );
};
