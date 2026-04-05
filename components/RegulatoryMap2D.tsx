/**
 * RegulatoryMap2D — Interactive SVG world map with force-based de-clustering.
 *
 * D3-geo Natural Earth projection + world-atlas TopoJSON.
 * Markers sized by obligation count, colored by RAG status.
 * D3 force simulation pushes overlapping markers apart.
 * Click shows detail popover; hover for tooltip; scroll to zoom; drag to pan.
 */
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { JURISDICTION_COORDS } from '../data/regulatoryGeoData';
import { fetchRegulatoryGeo, type RegulatoryGeoJurisdiction } from '../services/api';
import { MapDetailPopover, RAG_FILL, RAG_GLOW, type PopoverState } from './MapDetailPopover';

const RAG_ORDER: Record<string, number> = { Red: 0, Amber: 1, Yellow: 2, Green: 3 };

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
  ox: number; oy: number;
  x: number;  y: number;
  r: number;
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

  const sim = d3.forceSimulation(simNodes as d3.SimulationNodeDatum[] as any)
    .force('collide', d3.forceCollide<PlacedNode>().radius(d => d.r + 8).strength(1).iterations(4))
    .force('x', d3.forceX<PlacedNode>(d => d.ox).strength(0.15))
    .force('y', d3.forceY<PlacedNode>(d => d.oy).strength(0.15))
    .stop();

  for (let i = 0; i < 200; i++) sim.tick();
  return simNodes;
}

// ── Convert screen coords → SVG viewBox coords ──────────────────────
function screenToSvg(
  screenX: number, screenY: number,
  svg: SVGSVGElement, transform: { k: number; x: number; y: number },
): { svgX: number; svgY: number } {
  // Use the SVG's own matrix to handle viewBox + preserveAspectRatio
  const pt = svg.createSVGPoint();
  pt.x = screenX;
  pt.y = screenY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { svgX: 0, svgY: 0 };
  const svgPt = pt.matrixTransform(ctm.inverse());
  // Undo the D3 pan+zoom transform
  const svgX = (svgPt.x - transform.x) / transform.k;
  const svgY = (svgPt.y - transform.y) / transform.k;
  return { svgX, svgY };
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
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;

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
  const placedRef = useRef(placedNodes);
  placedRef.current = placedNodes;

  const pathGen = useMemo(() => projection ? d3.geoPath(projection) : null, [projection]);
  const graticule = useMemo(() => d3.geoGraticule10(), []);

  // ── D3 Zoom (only handles zoom/pan — no click logic) ──────────────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !worldGeo) return;
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        setTransform({ k: event.transform.k, x: event.transform.x, y: event.transform.y });
      });
    d3.select(svg).call(zoom);
    return () => { d3.select(svg).on('.zoom', null); };
  }, [worldGeo]);

  // ── Click detection on wrapper div (bypasses D3 zoom entirely) ─────
  const HIT_RADIUS = 25; // SVG viewBox px — generous click target
  const CLUSTER_RADIUS = 30;

  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) return;

    let startX = 0, startY = 0;

    const onDown = (e: PointerEvent) => {
      startX = e.clientX;
      startY = e.clientY;
    };

    // Use pointerup instead of click — D3 zoom intercepts click events
    // with stopImmediatePropagation(), but never touches pointer events.
    const onUp = (e: PointerEvent) => {
      // Ignore if this was a drag/pan gesture (moved > 5px)
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 5) return;

      // Ignore clicks on the popover itself or control buttons
      const target = e.target as HTMLElement;
      if (target.closest('[data-popover]') || target.closest('button')) return;

      const { svgX, svgY } = screenToSvg(e.clientX, e.clientY, svg, transformRef.current);
      const placed = placedRef.current;

      // Find clicked marker (nearest within hit radius)
      let closest: PlacedNode | null = null;
      let closestDist = Infinity;
      for (const n of placed) {
        const d = Math.hypot(n.x - svgX, n.y - svgY);
        if (d <= HIT_RADIUS && d < closestDist) {
          closest = n;
          closestDist = d;
        }
      }

      if (!closest) {
        setPopover(null);
        return;
      }

      // Gather nearby markers within cluster radius
      const nearby = placed
        .filter(n => Math.hypot(n.x - closest!.x, n.y - closest!.y) <= CLUSTER_RADIUS)
        .sort((a, b) => {
          const ra = RAG_ORDER[a.geo.worst_rag] ?? 4;
          const rb = RAG_ORDER[b.geo.worst_rag] ?? 4;
          return ra !== rb ? ra - rb : b.geo.total - a.geo.total;
        });

      const wr = wrap.getBoundingClientRect();
      // Hide tooltip before showing popover
      if (tipRef.current) tipRef.current.style.display = 'none';
      setHoveredNode(null);
      setPopover({
        nodes: nearby,
        screenX: e.clientX - wr.left,
        screenY: e.clientY - wr.top,
      });
    };

    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('pointerup', onUp);
    return () => {
      wrap.removeEventListener('pointerdown', onDown);
      wrap.removeEventListener('pointerup', onUp);
    };
  }, [worldGeo]); // stable — uses refs for dynamic data

  // Close popover on scroll/zoom
  useEffect(() => {
    if (!popover) return;
    const close = () => setPopover(null);
    window.addEventListener('wheel', close, { passive: true });
    return () => window.removeEventListener('wheel', close);
  }, [popover]);

  // ── Tooltip (hover only) ───────────────────────────────────────────
  const showTip = useCallback((e: React.MouseEvent, node: PlacedNode) => {
    const tip = tipRef.current;
    const wrap = wrapRef.current;
    if (!tip || !wrap || popover) return; // hide tooltip when popover is open
    setHoveredNode(node.jurisdiction);
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
      <div style="font-size:10px;color:#64748b;margin-top:3px">Click for details</div>
    `;
    tip.style.display = 'block';
    tip.style.left = `${Math.min(mx + 14, wr.width - 240)}px`;
    tip.style.top  = `${Math.max(8, my - 100)}px`;
  }, [popover]);

  const hideTip = useCallback(() => {
    setHoveredNode(null);
    if (tipRef.current) tipRef.current.style.display = 'none';
  }, []);

  // ── Select from popover ────────────────────────────────────────────
  const selectJurisdiction = useCallback((jurisdiction: string) => {
    setPopover(null);
    onJurisdictionClick?.(selectedJurisdiction === jurisdiction ? null : jurisdiction);
  }, [onJurisdictionClick, selectedJurisdiction]);

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

  const CONNECTOR_THRESHOLD = 3;

  return (
    <div ref={wrapRef} className="w-full h-full relative select-none" style={{ background: '#000B28' }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full" style={{ display: 'block', cursor: 'grab' }}
        aria-label="Interactive regulatory map — scroll to zoom, drag to pan, click markers for details">
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
          <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#000B28" />
          <path d={pathGen(graticule) ?? ''} fill="none" stroke="rgba(0,83,226,0.2)" strokeWidth={0.4} />
          {worldGeo.features.map((feat, i) => (
            <path key={i} d={pathGen(feat) ?? ''} fill="#0f2847" stroke="#1e4a8a" strokeWidth={0.6} />
          ))}
          <path d={pathGen({ type: 'Sphere' }) ?? ''} fill="none" stroke="#1e4a8a" strokeWidth={1.2} />

          {/* Connector lines */}
          {placedNodes.map(node => {
            if (Math.hypot(node.x - node.ox, node.y - node.oy) < CONNECTOR_THRESHOLD) return null;
            return (
              <line key={`c-${node.jurisdiction}`}
                x1={node.ox} y1={node.oy} x2={node.x} y2={node.y}
                stroke={RAG_GLOW[node.geo.worst_rag] ?? '#4ade80'} strokeWidth={0.6} opacity={0.35}
                strokeDasharray="2 2" style={{ pointerEvents: 'none' }}
              />
            );
          })}

          {/* Origin dots */}
          {placedNodes.map(node => {
            if (Math.hypot(node.x - node.ox, node.y - node.oy) < CONNECTOR_THRESHOLD) return null;
            return (
              <circle key={`o-${node.jurisdiction}`}
                cx={node.ox} cy={node.oy} r={2}
                fill={RAG_FILL[node.geo.worst_rag] ?? '#22c55e'} opacity={0.5}
                style={{ pointerEvents: 'none' }}
              />
            );
          })}

          {/* Markers — no onClick (handled by wrapper div) */}
          {placedNodes.map(node => {
            const { x, y, r } = node;
            const fill = RAG_FILL[node.geo.worst_rag] ?? '#22c55e';
            const glow = RAG_GLOW[node.geo.worst_rag] ?? '#4ade80';
            const isSelected = selectedJurisdiction === node.jurisdiction;
            const isHovered = hoveredNode === node.jurisdiction;
            const isPopoverTarget = popover?.nodes.some(n => n.jurisdiction === node.jurisdiction) ?? false;
            const isRed = node.geo.worst_rag === 'Red';
            const isAmber = node.geo.worst_rag === 'Amber';
            const active = isSelected || isHovered || isPopoverTarget;
            const showLabel = node.geo.total >= 5 || active || isRed;

            return (
              <g key={node.jurisdiction} style={{ pointerEvents: 'none' }}
                onMouseEnter={e => showTip(e, node)}
                onMouseMove={e => showTip(e, node)}
                onMouseLeave={hideTip}>

                {active && (
                  <circle cx={x} cy={y} r={r * 2.5} fill="none"
                    stroke={isSelected ? '#FFC220' : glow} strokeWidth={1.5} opacity={0.4}>
                    <animate attributeName="r" from={r * 1.5} to={r * 3} dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}

                <circle cx={x} cy={y} r={r * 1.4}
                  fill={glow}
                  opacity={active ? 0.3 : isRed ? 0.15 : isAmber ? 0.1 : 0.06}
                  filter={active ? 'url(#marker-glow-strong)' : undefined}
                />

                <circle cx={x} cy={y} r={active ? r * 1.25 : r}
                  fill={fill} opacity={active ? 1 : 0.9}
                  stroke={isSelected ? '#FFC220' : active ? '#fff' : glow}
                  strokeWidth={isSelected ? 3 : active ? 2 : 1}
                  filter={(isRed || isAmber || active) ? 'url(#marker-glow)' : undefined}
                  style={{ pointerEvents: 'visiblePainted', cursor: 'pointer' }}
                />

                {(node.geo.total >= 8 || active) && (
                  <text x={x} y={y + 4} textAnchor="middle" fill="#fff"
                    fontSize={active ? 11 : 9} fontWeight={800}
                    filter="url(#text-shadow)">
                    {node.geo.total}
                  </text>
                )}

                {showLabel && (
                  <text x={x} y={y - (active ? r * 1.25 : r) - 5}
                    textAnchor="middle"
                    fill={isSelected ? '#FFC220' : active ? '#fff' : '#cbd5e1'}
                    fontSize={active ? 12 : 10} fontWeight={active ? 800 : 600}
                    filter="url(#text-shadow)">
                    {node.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip (hover) */}
      <div ref={tipRef} style={{
        display: 'none', position: 'absolute', pointerEvents: 'none',
        padding: '12px 16px', borderRadius: '12px', color: '#fff',
        background: 'rgba(0,8,30,0.95)', border: '1px solid rgba(0,83,226,0.6)',
        backdropFilter: 'blur(12px)', whiteSpace: 'nowrap', zIndex: 30,
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)', maxWidth: '240px',
      }} />

      {/* Detail popover (click) */}
      {popover && (
        <MapDetailPopover
          popover={popover}
          wrapWidth={wrapRef.current?.clientWidth ?? 600}
          wrapHeight={wrapRef.current?.clientHeight ?? 400}
          selectedJurisdiction={selectedJurisdiction}
          onSelect={selectJurisdiction}
          onClose={() => setPopover(null)}
        />
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
          Click a marker for details
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

