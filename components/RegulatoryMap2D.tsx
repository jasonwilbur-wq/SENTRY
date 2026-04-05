/**
 * RegulatoryMap2D — Interactive SVG world map with force-based de-clustering.
 *
 * D3-geo Natural Earth projection + world-atlas TopoJSON.
 * Markers sized by obligation count, colored by RAG status.
 * D3 force simulation pushes overlapping markers apart.
 * Click to filter, hover for details, scroll to zoom, drag to pan.
 */
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { JURISDICTION_COORDS } from '../data/regulatoryGeoData';
import { fetchRegulatoryGeo, type RegulatoryGeoJurisdiction } from '../services/api';

// ── Colors ───────────────────────────────────────────────────────────
const RAG_FILL: Record<string, string> = {
  Red: '#ea1100', Amber: '#f97316', Yellow: '#FFC220', Green: '#22c55e',
};
const RAG_GLOW: Record<string, string> = {
  Red: '#ff6b6b', Amber: '#fb923c', Yellow: '#ffe066', Green: '#4ade80',
};

interface Props {
  selectedJurisdiction?: string | null;
  onJurisdictionClick?: (jurisdiction: string | null) => void;
}

interface MapNode {
  jurisdiction: string;
  label: string;
  lat: number;
  lon: number;
  geo: RegulatoryGeoJurisdiction;
}

/** Node position after force simulation. */
interface PlacedNode extends MapNode {
  ox: number; oy: number; // original projected position
  x: number;  y: number;  // displaced position after force sim
  r: number;              // marker radius
}

// ── Force simulation (runs once, synchronously) ──────────────────────
function deCluster(
  nodes: MapNode[],
  projection: d3.GeoProjection,
  rScale: (count: number) => number,
): PlacedNode[] {
  const simNodes: PlacedNode[] = nodes.map(n => {
    const [px, py] = projection([n.lon, n.lat]) ?? [0, 0];
    const r = rScale(n.geo.total);
    return { ...n, ox: px, oy: py, x: px, y: py, r };
  });

  // Aggressive collision avoidance — generous padding between markers,
  // weak pull-back so they can spread far from origin, many iterations.
  const sim = d3.forceSimulation(simNodes as d3.SimulationNodeDatum[] as any)
    .force('collide', d3.forceCollide<PlacedNode>().radius(d => d.r + 8).strength(1).iterations(4))
    .force('x', d3.forceX<PlacedNode>(d => d.ox).strength(0.15))
    .force('y', d3.forceY<PlacedNode>(d => d.oy).strength(0.15))
    .stop();

  for (let i = 0; i < 200; i++) sim.tick();

  return simNodes;
}

export const RegulatoryMap2D: React.FC<Props> = ({
  selectedJurisdiction = null,
  onJurisdictionClick,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [worldGeo, setWorldGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [clusterMenu, setClusterMenu] = useState<{
    nodes: PlacedNode[];
    screenX: number;
    screenY: number;
  } | null>(null);

  // ── Load data ──────────────────────────────────────────────────────
  useEffect(() => {
    const loadWorld = import('world-atlas/countries-110m.json').then(mod => {
      const topo = (mod.default ?? mod) as unknown as Topology<{ countries: GeometryCollection }>;
      setWorldGeo(topojson.feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection);
    });
    const loadRegs = fetchRegulatoryGeo().then(({ jurisdictions }) => {
      setNodes(jurisdictions
        .map(g => {
          const c = JURISDICTION_COORDS[g.jurisdiction];
          return c ? { jurisdiction: g.jurisdiction, label: c.label, lat: c.lat, lon: c.lon, geo: g } : null;
        })
        .filter((n): n is MapNode => n !== null));
    });
    Promise.all([loadWorld, loadRegs]).catch(err => console.warn('Map load failed', err));
  }, []);

  // ── Projection + force layout ──────────────────────────────────────
  const W = 960, H = 500;

  const projection = useMemo(() => {
    if (!worldGeo) return null;
    return d3.geoNaturalEarth1().fitSize([W - 60, H - 40], worldGeo).translate([W / 2, H / 2]);
  }, [worldGeo]);

  const maxCount = useMemo(() => Math.max(...nodes.map(n => n.geo.total), 1), [nodes]);
  const rScale = useCallback((count: number) => 3 + (count / maxCount) * 10, [maxCount]);

  const placedNodes = useMemo(() => {
    if (!projection || nodes.length === 0) return [];
    return deCluster(nodes, projection, rScale);
  }, [nodes, projection, rScale]);

  const pathGen = useMemo(() => projection ? d3.geoPath(projection) : null, [projection]);
  const graticule = useMemo(() => d3.geoGraticule10(), []);

  // ── D3 Zoom ────────────────────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !worldGeo) return;
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .filter((event) => {
        // Let marker clicks pass through to React — only zoom on
        // background clicks, scroll, or drag on non-marker elements.
        const target = event.target as SVGElement;
        if (event.type === 'wheel') return true; // always zoom on scroll
        if (target.closest('g[tabindex]')) return false; // marker area — skip zoom
        return true;
      })
      .on('zoom', (event) => {
        setTransform({ k: event.transform.k, x: event.transform.x, y: event.transform.y });
        setClusterMenu(null);
      });
    d3.select(svg).call(zoom);
    return () => { d3.select(svg).on('.zoom', null); };
  }, [worldGeo]);

  // ── Tooltip ────────────────────────────────────────────────────────
  const showTip = useCallback((e: React.MouseEvent, node: PlacedNode) => {
    const tip = tipRef.current;
    const wrap = wrapRef.current;
    if (!tip || !wrap) return;
    setHoveredNode(node.jurisdiction);
    // Hide tooltip if cluster menu is open (avoid visual clash)
    if (clusterMenu) return;
    const wr = wrap.getBoundingClientRect();
    const mx = e.clientX - wr.left;
    const my = e.clientY - wr.top;
    const ragColor = RAG_GLOW[node.geo.worst_rag] || '#4ade80';
    const { red, amber, yellow, green, total, techs } = node.geo;

    tip.innerHTML = `
      <div style="font-weight:800;font-size:14px;margin-bottom:4px;color:#fff">${node.label}</div>
      <div style="font-size:11px;color:${ragColor};font-weight:700;margin-bottom:6px">
        ${node.geo.worst_rag.toUpperCase()} RISK · ${total} obligation${total !== 1 ? 's' : ''}
      </div>
      <div style="display:flex;gap:10px;font-size:11px;margin-bottom:6px">
        ${red   ? `<span style="color:#ff6b6b">● ${red} Red</span>` : ''}
        ${amber ? `<span style="color:#fb923c">● ${amber} Amb</span>` : ''}
        ${yellow? `<span style="color:#ffe066">● ${yellow} Yel</span>` : ''}
        ${green ? `<span style="color:#4ade80">● ${green} Grn</span>` : ''}
      </div>
      <div style="font-size:10px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.15);padding-top:5px">
        ${techs.slice(0, 4).join(' · ')}${techs.length > 4 ? ` +${techs.length - 4}` : ''}
      </div>
      <div style="font-size:10px;color:#64748b;margin-top:3px">Click to filter ↓</div>
    `;
    tip.style.display = 'block';
    tip.style.left = `${Math.min(mx + 14, wr.width - 240)}px`;
    tip.style.top  = `${Math.max(8, my - 100)}px`;
  }, []);

  const hideTip = useCallback(() => {
    setHoveredNode(null);
    if (tipRef.current) tipRef.current.style.display = 'none';
  }, []);

  // ── Cluster-aware click ────────────────────────────────────────────
  const PROXIMITY_PX = 30; // SVG viewBox pixels

  const handleClick = useCallback((e: React.MouseEvent, node: PlacedNode) => {
    // Find all markers within proximity radius
    const nearby = placedNodes.filter(n => {
      const dx = n.x - node.x;
      const dy = n.y - node.y;
      return Math.hypot(dx, dy) <= PROXIMITY_PX;
    });

    if (nearby.length <= 1) {
      // Isolated marker → direct select/deselect
      setClusterMenu(null);
      onJurisdictionClick?.(selectedJurisdiction === node.jurisdiction ? null : node.jurisdiction);
    } else {
      // Multiple nearby → show cluster picker at click position
      const wrap = wrapRef.current;
      if (!wrap) return;
      const wr = wrap.getBoundingClientRect();
      // Sort: worst RAG first (Red > Amber > Yellow > Green), then by count desc
      const ragOrder: Record<string, number> = { Red: 0, Amber: 1, Yellow: 2, Green: 3 };
      const sorted = [...nearby].sort((a, b) => {
        const ra = ragOrder[a.geo.worst_rag] ?? 4;
        const rb = ragOrder[b.geo.worst_rag] ?? 4;
        return ra !== rb ? ra - rb : b.geo.total - a.geo.total;
      });
      setClusterMenu({
        nodes: sorted,
        screenX: e.clientX - wr.left,
        screenY: e.clientY - wr.top,
      });
    }
  }, [placedNodes, onJurisdictionClick, selectedJurisdiction]);

  const selectFromCluster = useCallback((jurisdiction: string) => {
    setClusterMenu(null);
    onJurisdictionClick?.(selectedJurisdiction === jurisdiction ? null : jurisdiction);
  }, [onJurisdictionClick, selectedJurisdiction]);

  // Close cluster menu on outside click or scroll
  useEffect(() => {
    if (!clusterMenu) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-cluster-menu]')) setClusterMenu(null);
    };
    const closeScroll = () => setClusterMenu(null);
    window.addEventListener('click', close, { capture: true });
    window.addEventListener('wheel', closeScroll, { passive: true });
    return () => {
      window.removeEventListener('click', close, { capture: true });
      window.removeEventListener('wheel', closeScroll);
    };
  }, [clusterMenu]);

  // ── Loading ────────────────────────────────────────────────────────
  if (!worldGeo || !pathGen) {
    return (
      <div ref={wrapRef} className="w-full h-full flex items-center justify-center" style={{ background: '#000B28' }}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs" style={{ color: '#64748b' }}>Loading map…</span>
        </div>
      </div>
    );
  }

  // ── Helper: should we show connector line? ─────────────────────────
  const CONNECTOR_THRESHOLD = 3; // pixels

  return (
    <div ref={wrapRef} className="w-full h-full relative select-none" style={{ background: '#000B28' }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full" style={{ display: 'block', cursor: 'grab' }}
        aria-label="Interactive regulatory map — scroll to zoom, drag to pan, click markers to filter">
        <defs>
          <filter id="marker-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="marker-glow-strong" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="text-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.9" />
          </filter>
        </defs>

        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {/* Ocean background */}
          <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#000B28" />

          {/* Graticule */}
          <path d={pathGen(graticule) ?? ''} fill="none" stroke="rgba(0,83,226,0.2)" strokeWidth={0.4} />

          {/* Country outlines */}
          {worldGeo.features.map((feat, i) => (
            <path key={i} d={pathGen(feat) ?? ''} fill="#0f2847" stroke="#1e4a8a" strokeWidth={0.6} />
          ))}

          {/* Globe rim */}
          <path d={pathGen({ type: 'Sphere' }) ?? ''} fill="none" stroke="#1e4a8a" strokeWidth={1.2} />

          {/* ── Connector lines (displaced → origin) ────────── */}
          {placedNodes.map(node => {
            const dx = node.x - node.ox;
            const dy = node.y - node.oy;
            if (Math.hypot(dx, dy) < CONNECTOR_THRESHOLD) return null;
            const glow = RAG_GLOW[node.geo.worst_rag] ?? '#4ade80';
            return (
              <line key={`c-${node.jurisdiction}`}
                x1={node.ox} y1={node.oy} x2={node.x} y2={node.y}
                stroke={glow} strokeWidth={0.6} opacity={0.35}
                strokeDasharray="2 2" style={{ pointerEvents: 'none' }}
              />
            );
          })}

          {/* ── Origin dots (tiny dot at true geo position) ──── */}
          {placedNodes.map(node => {
            const dx = node.x - node.ox;
            const dy = node.y - node.oy;
            if (Math.hypot(dx, dy) < CONNECTOR_THRESHOLD) return null;
            const fill = RAG_FILL[node.geo.worst_rag] ?? '#22c55e';
            return (
              <circle key={`o-${node.jurisdiction}`}
                cx={node.ox} cy={node.oy} r={2}
                fill={fill} opacity={0.5} style={{ pointerEvents: 'none' }}
              />
            );
          })}

          {/* ── Markers (at displaced positions) ────────────── */}
          {placedNodes.map(node => {
            const { x, y, r } = node;
            const fill = RAG_FILL[node.geo.worst_rag] ?? '#22c55e';
            const glow = RAG_GLOW[node.geo.worst_rag] ?? '#4ade80';
            const isSelected = selectedJurisdiction === node.jurisdiction;
            const isHovered = hoveredNode === node.jurisdiction;
            const isRed = node.geo.worst_rag === 'Red';
            const isAmber = node.geo.worst_rag === 'Amber';
            const active = isSelected || isHovered;
            const showLabel = node.geo.total >= 5 || isSelected || isHovered || isRed;

            return (
              <g key={node.jurisdiction} style={{ cursor: 'pointer' }}
                onClick={ev => { ev.stopPropagation(); handleClick(ev, node); }}
                onMouseEnter={e => showTip(e, node)}
                onMouseMove={e => showTip(e, node)}
                onMouseLeave={hideTip}
                tabIndex={0}
                aria-label={`${node.label}: ${node.geo.total} obligations, ${node.geo.worst_rag} risk`}
                onKeyDown={e => { if (e.key === 'Enter') handleClick(e as unknown as React.MouseEvent, node); }}>

                {/* Pulse ring on active */}
                {active && (
                  <circle cx={x} cy={y} r={r * 2.5} fill="none"
                    stroke={isSelected ? '#FFC220' : glow} strokeWidth={1.5} opacity={0.4}>
                    <animate attributeName="r" from={r * 1.5} to={r * 3} dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Glow aura */}
                <circle cx={x} cy={y} r={r * 1.4}
                  fill={glow}
                  opacity={active ? 0.3 : isRed ? 0.15 : isAmber ? 0.1 : 0.06}
                  filter={active ? 'url(#marker-glow-strong)' : undefined}
                />

                {/* Main circle */}
                <circle cx={x} cy={y} r={active ? r * 1.25 : r}
                  fill={fill} opacity={active ? 1 : 0.9}
                  stroke={isSelected ? '#FFC220' : active ? '#fff' : glow}
                  strokeWidth={isSelected ? 3 : active ? 2 : 1}
                  filter={(isRed || isAmber || active) ? 'url(#marker-glow)' : undefined}
                />

                {/* Count badge */}
                {(node.geo.total >= 8 || active) && (
                  <text x={x} y={y + 4} textAnchor="middle" fill="#fff"
                    fontSize={active ? 11 : 9} fontWeight={800}
                    style={{ pointerEvents: 'none' }} filter="url(#text-shadow)">
                    {node.geo.total}
                  </text>
                )}

                {/* Label */}
                {showLabel && (
                  <text x={x} y={y - (active ? r * 1.25 : r) - 5}
                    textAnchor="middle"
                    fill={isSelected ? '#FFC220' : active ? '#fff' : '#cbd5e1'}
                    fontSize={active ? 12 : 10} fontWeight={active ? 800 : 600}
                    style={{ pointerEvents: 'none' }} filter="url(#text-shadow)">
                    {node.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      <div ref={tipRef} style={{
        display: 'none', position: 'absolute', pointerEvents: 'none',
        padding: '12px 16px', borderRadius: '12px', color: '#fff',
        background: 'rgba(0,8,30,0.95)', border: '1px solid rgba(0,83,226,0.6)',
        backdropFilter: 'blur(12px)', whiteSpace: 'nowrap', zIndex: 30,
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)', maxWidth: '240px',
      }} />

      {/* Cluster picker dropdown */}
      {clusterMenu && (
        <div
          data-cluster-menu
          style={{
            position: 'absolute',
            left: Math.min(clusterMenu.screenX, (wrapRef.current?.clientWidth ?? 400) - 260),
            top: Math.min(clusterMenu.screenY + 8, (wrapRef.current?.clientHeight ?? 400) - clusterMenu.nodes.length * 38 - 50),
            zIndex: 40,
            background: 'rgba(0,8,30,0.96)',
            border: '1px solid rgba(0,83,226,0.5)',
            borderRadius: '12px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
            padding: '6px 0',
            minWidth: '220px',
            maxHeight: '320px',
            overflowY: 'auto',
          }}
        >
          <div style={{
            padding: '8px 14px 6px',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#64748b',
            borderBottom: '1px solid rgba(0,83,226,0.2)',
          }}>
            {clusterMenu.nodes.length} jurisdictions in this area
          </div>
          {clusterMenu.nodes.map(n => {
            const ragColor = RAG_FILL[n.geo.worst_rag] ?? '#22c55e';
            const glowColor = RAG_GLOW[n.geo.worst_rag] ?? '#4ade80';
            const isActive = selectedJurisdiction === n.jurisdiction;
            return (
              <button
                key={n.jurisdiction}
                onClick={(ev) => { ev.stopPropagation(); selectFromCluster(n.jurisdiction); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '8px 14px',
                  border: 'none',
                  background: isActive ? 'rgba(255,194,32,0.12)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                  borderLeft: isActive ? '3px solid #FFC220' : '3px solid transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = isActive ? 'rgba(255,194,32,0.18)' : 'rgba(0,83,226,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = isActive ? 'rgba(255,194,32,0.12)' : 'transparent')}
              >
                {/* RAG dot */}
                <span style={{
                  width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                  background: ragColor, boxShadow: `0 0 6px ${glowColor}`,
                }} />
                {/* Label */}
                <span style={{
                  flex: 1, fontSize: '12px', fontWeight: 600,
                  color: isActive ? '#FFC220' : '#e2e8f0',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {n.label}
                </span>
                {/* RAG badge */}
                <span style={{
                  fontSize: '9px', fontWeight: 700, padding: '2px 6px',
                  borderRadius: '9999px', textTransform: 'uppercase',
                  background: `${ragColor}22`, color: glowColor,
                }}>
                  {n.geo.worst_rag}
                </span>
                {/* Count */}
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

      {/* Legend */}
      <div className="absolute bottom-3 left-3 pointer-events-none rounded-lg px-3 py-2"
        style={{ background: 'rgba(0,8,30,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,83,226,0.2)' }}>
        <div className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>Risk Level</div>
        {([
          ['Red', '#ff6b6b', 'Critical (19-25)'],
          ['Amber', '#fb923c', 'High (13-18)'],
          ['Yellow', '#ffe066', 'Medium (7-12)'],
          ['Green', '#4ade80', 'Low (1-6)'],
        ] as const).map(([label, color, desc]) => (
          <div key={label} className="flex items-center gap-2 py-0.5">
            <span className="w-3 h-3 rounded-full shrink-0"
              style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <span className="text-[10px] font-bold" style={{ color }}>{label}</span>
            <span className="text-[10px]" style={{ color: '#64748b' }}>{desc}</span>
          </div>
        ))}
        <div className="text-[9px] mt-1 pt-1" style={{ color: '#475569', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          Circle size = obligation count
        </div>
      </div>

      {/* Zoom hint */}
      <div className="absolute bottom-3 right-3 pointer-events-none rounded-lg px-3 py-2"
        style={{ background: 'rgba(0,8,30,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,83,226,0.2)' }}>
        <div className="text-[10px] font-semibold" style={{ color: '#64748b' }}>
          🖱️ Scroll to zoom · Drag to pan
        </div>
        <div className="text-[10px]" style={{ color: '#475569' }}>
          Click a marker to filter table ↓
        </div>
      </div>

      {/* Reset zoom */}
      {transform.k > 1.05 && (
        <div className="absolute top-3 right-3">
          <button
            onClick={() => {
              const svg = svgRef.current;
              if (svg) d3.select(svg).transition().duration(300).call(
                d3.zoom<SVGSVGElement, unknown>().transform as any, d3.zoomIdentity);
              setTransform({ k: 1, x: 0, y: 0 });
            }}
            className="px-3 py-1.5 rounded-full text-[10px] font-bold transition-all hover:scale-105"
            style={{ background: 'rgba(0,83,226,0.3)', border: '1px solid rgba(0,83,226,0.5)',
              color: '#60a5fa', backdropFilter: 'blur(8px)' }}>
            ⟲ Reset zoom ({transform.k.toFixed(1)}×)
          </button>
        </div>
      )}
    </div>
  );
};
