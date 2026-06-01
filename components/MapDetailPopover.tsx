/**
 * MapDetailPopover — Detail popover shown on marker click.
 *
 * Shows either a single jurisdiction's full details (RAG status, tech
 * categories, filter button) or a cluster picker list when multiple
 * jurisdictions are near the click point.
 */
import React from 'react';

// ── Colors ───────────────────────────────────────────────────────────
const RAG_FILL: Record<string, string> = {
  Red: '#ea1100', Amber: '#f97316', Yellow: '#FFC220', Green: '#22c55e',
};
const RAG_GLOW: Record<string, string> = {
  Red: '#ff6b6b', Amber: '#fb923c', Yellow: '#ffe066', Green: '#4ade80',
};

// Re-export for the map to use too
export { RAG_FILL, RAG_GLOW };

export interface PopoverNode {
  jurisdiction: string;
  label: string;
  geo: {
    worst_rag: string;
    total: number;
    red: number;
    amber: number;
    yellow: number;
    green: number;
    techs: string[];
  };
}

export interface PopoverState {
  nodes: PopoverNode[];
  screenX: number;
  screenY: number;
}

interface Props {
  popover: PopoverState;
  wrapWidth: number;
  wrapHeight: number;
  selectedJurisdiction: string | null;
  onSelect: (jurisdiction: string) => void;
  onClose: () => void;
}

export const MapDetailPopover: React.FC<Props> = ({
  popover, wrapWidth, wrapHeight, selectedJurisdiction, onSelect, onClose,
}) => {
  const isCluster = popover.nodes.length > 1;
  const primary = popover.nodes[0];
  const ragColor = RAG_FILL[primary.geo.worst_rag] ?? '#22c55e';
  const glowColor = RAG_GLOW[primary.geo.worst_rag] ?? '#4ade80';

  return (
    <div
      data-popover
      style={{
        position: 'absolute',
        left: Math.min(popover.screenX + 12, wrapWidth - 290),
        top: Math.min(popover.screenY - 20, wrapHeight - 300),
        zIndex: 40,
        background: 'rgba(0,8,30,0.96)',
        border: '1px solid rgba(0,83,226,0.5)',
        borderRadius: '14px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
        width: '270px',
        maxHeight: '380px',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 14px 8px',
        borderBottom: '1px solid rgba(0,83,226,0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>
            {isCluster
              ? `${popover.nodes.length} jurisdictions in this area`
              : 'Jurisdiction Detail'}
          </div>
          {!isCluster && (
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
              {primary.label}
            </div>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#64748b', fontSize: '16px',
          cursor: 'pointer', padding: '0 2px', lineHeight: 1,
        }} aria-label="Close popover">✕</button>
      </div>

      {/* Single jurisdiction detail */}
      {!isCluster && (
        <div style={{ padding: '10px 14px 12px' }}>
          {/* RAG status banner */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '10px', padding: '8px 10px', borderRadius: '8px',
            background: `${ragColor}15`, border: `1px solid ${ragColor}30`,
          }}>
            <span style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: ragColor, boxShadow: `0 0 8px ${glowColor}`,
            }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: glowColor }}>
              {primary.geo.worst_rag.toUpperCase()} RISK
            </span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginLeft: 'auto' }}>
              {primary.geo.total} obligation{primary.geo.total !== 1 ? 's' : ''}
            </span>
          </div>

          {/* RAG breakdown pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {primary.geo.red > 0 && <RagPill label="Red" count={primary.geo.red} color="#ff6b6b" />}
            {primary.geo.amber > 0 && <RagPill label="Amber" count={primary.geo.amber} color="#fb923c" />}
            {primary.geo.yellow > 0 && <RagPill label="Yellow" count={primary.geo.yellow} color="#ffe066" />}
            {primary.geo.green > 0 && <RagPill label="Green" count={primary.geo.green} color="#4ade80" />}
          </div>

          {/* Tech categories */}
          {primary.geo.techs.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                Technology Categories
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {primary.geo.techs.map(t => (
                  <span key={t} style={{
                    fontSize: '10px', padding: '2px 7px', borderRadius: '6px',
                    background: 'rgba(0,83,226,0.15)', color: '#9BB7DF', fontWeight: 600,
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Filter button */}
          <button
            onClick={() => onSelect(primary.jurisdiction)}
            style={{
              width: '100%', padding: '8px', borderRadius: '8px', border: 'none',
              background: selectedJurisdiction === primary.jurisdiction
                ? 'rgba(255,194,32,0.2)' : 'rgba(0,83,226,0.25)',
              color: selectedJurisdiction === primary.jurisdiction ? '#FFC220' : '#60a5fa',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {selectedJurisdiction === primary.jurisdiction
              ? '✓ Selected — click to deselect'
              : '↓ Filter table to this jurisdiction'}
          </button>
        </div>
      )}

      {/* Cluster list */}
      {isCluster && (
        <div>
          {popover.nodes.map(n => {
            const rc = RAG_FILL[n.geo.worst_rag] ?? '#22c55e';
            const gc = RAG_GLOW[n.geo.worst_rag] ?? '#4ade80';
            const isActive = selectedJurisdiction === n.jurisdiction;
            return (
              <button
                key={n.jurisdiction}
                onClick={() => onSelect(n.jurisdiction)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', padding: '9px 14px', border: 'none',
                  background: isActive ? 'rgba(255,194,32,0.12)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                  borderLeft: isActive ? '3px solid #FFC220' : '3px solid transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = isActive ? 'rgba(255,194,32,0.18)' : 'rgba(0,83,226,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = isActive ? 'rgba(255,194,32,0.12)' : 'transparent')}
              >
                <span style={{
                  width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                  background: rc, boxShadow: `0 0 6px ${gc}`,
                }} />
                <span style={{
                  flex: 1, fontSize: '12px', fontWeight: 600,
                  color: isActive ? '#FFC220' : '#e2e8f0',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {n.label}
                </span>
                <span style={{
                  fontSize: '9px', fontWeight: 700, padding: '2px 6px',
                  borderRadius: '9999px', textTransform: 'uppercase',
                  background: `${rc}22`, color: gc,
                }}>
                  {n.geo.worst_rag}
                </span>
                <span style={{
                  fontSize: '11px', fontWeight: 800, color: '#94a3b8',
                  minWidth: '24px', textAlign: 'right',
                }}>
                  {n.geo.total}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Tiny RAG pill sub-component ──────────────────────────────────────
const RagPill: React.FC<{ label: string; count: number; color: string }> = ({ label, count, color }) => (
  <span style={{
    fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '8px',
    background: `${color}20`, color, display: 'inline-flex', gap: '4px', alignItems: 'center',
  }}>
    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
    {count} {label}
  </span>
);
