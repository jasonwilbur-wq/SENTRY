/**
 * RegulatoryMap2D — A flat, reliable, fully interactive SVG world map.
 *
 * Uses D3-geo (Natural Earth projection) + world-atlas TopoJSON for
 * country outlines. Jurisdiction markers are sized by obligation count
 * and colored by worst RAG status. Click to filter, hover for details.
 *
 * Zero WebGL — pure SVG, works everywhere, WCAG-friendly.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { JURISDICTION_COORDS } from '../data/regulatoryGeoData';
import { fetchRegulatoryGeo, type RegulatoryGeoJurisdiction } from '../services/api';

// ── RAG colors ───────────────────────────────────────────────────────
const RAG_FILL: Record<string, string> = {
  Red: '#ea1100', Amber: '#f97316', Yellow: '#FFC220', Green: '#22c55e',
};
const RAG_GLOW: Record<string, string> = {
  Red: '#ff6b6b', Amber: '#fb923c', Yellow: '#FFC220', Green: '#4ade80',
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

export const RegulatoryMap2D: React.FC<Props> = ({
  selectedJurisdiction = null,
  onJurisdictionClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [worldGeo, setWorldGeo] = useState<GeoJSON.FeatureCollection | null>(null);

  // Load world topology + regulatory data in parallel
  useEffect(() => {
    const loadWorld = import('world-atlas/countries-110m.json').then(mod => {
      const topo = (mod.default ?? mod) as unknown as Topology<{ countries: GeometryCollection }>;
      const geo = topojson.feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
      setWorldGeo(geo);
    });

    const loadRegs = fetchRegulatoryGeo().then(({ jurisdictions }) => {
      const mapped: MapNode[] = jurisdictions
        .map(geo => {
          const coord = JURISDICTION_COORDS[geo.jurisdiction];
          if (!coord) return null;
          return {
            jurisdiction: geo.jurisdiction,
            label: coord.label,
            lat: coord.lat,
            lon: coord.lon,
            geo,
          };
        })
        .filter((n): n is MapNode => n !== null);
      setNodes(mapped);
    });

    Promise.all([loadWorld, loadRegs]).catch(err =>
      console.warn('RegulatoryMap2D: data load failed', err),
    );
  }, []);

  // Tooltip handlers
  const showTip = useCallback((e: React.MouseEvent, node: MapNode) => {
    const tip = tipRef.current;
    const wrap = wrapRef.current;
    if (!tip || !wrap) return;
    const wr = wrap.getBoundingClientRect();
    const x = e.clientX - wr.left;
    const y = e.clientY - wr.top;

    const ragColor = RAG_GLOW[node.geo.worst_rag] || '#4ade80';
    const { red, amber, yellow, green, total, techs } = node.geo;

    tip.innerHTML = `
      <div style="font-weight:800;font-size:13px;margin-bottom:4px">${node.label}</div>
      <div style="font-size:10px;color:${ragColor};font-weight:700;margin-bottom:6px">
        ${node.geo.worst_rag.toUpperCase()} RISK · ${total} obligation${total !== 1 ? 's' : ''}
      </div>
      <div style="display:flex;gap:8px;font-size:10px;margin-bottom:4px">
        ${red   ? `<span style="color:#ff6b6b">● ${red} Red</span>` : ''}
        ${amber ? `<span style="color:#fb923c">● ${amber} Amb</span>` : ''}
        ${yellow? `<span style="color:#FFC220">● ${yellow} Yel</span>` : ''}
        ${green ? `<span style="color:#4ade80">● ${green} Grn</span>` : ''}
      </div>
      <div style="font-size:9px;color:#64748b;border-top:1px solid rgba(255,255,255,0.1);padding-top:4px">
        ${techs.slice(0, 3).join(' · ')}${techs.length > 3 ? ` +${techs.length - 3}` : ''}
      </div>
      <div style="font-size:9px;color:#475569;margin-top:2px">Click to filter table ↓</div>
    `;
    tip.style.display = 'block';
    // Keep tip within bounds
    const tipW = 200;
    tip.style.left = `${Math.min(x, wr.width - tipW)}px`;
    tip.style.top = `${Math.max(0, y - 120)}px`;
  }, []);

  const hideTip = useCallback(() => {
    if (tipRef.current) tipRef.current.style.display = 'none';
  }, []);

  const handleClick = useCallback((node: MapNode) => {
    if (!onJurisdictionClick) return;
    onJurisdictionClick(
      selectedJurisdiction === node.jurisdiction ? null : node.jurisdiction,
    );
  }, [onJurisdictionClick, selectedJurisdiction]);

  // Render map
  if (!worldGeo) {
    return (
      <div ref={wrapRef} className="w-full h-full flex items-center justify-center"
        style={{ background: 'var(--s-card)' }}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Loading map…</span>
        </div>
      </div>
    );
  }

  // Dynamic sizing
  const W = 960;
  const H = 480;
  const projection = d3.geoNaturalEarth1()
    .fitSize([W - 40, H - 40], worldGeo)
    .translate([W / 2, H / 2]);
  const path = d3.geoPath(projection);
  const graticule = d3.geoGraticule10();

  // Size circles by obligation count
  const maxCount = Math.max(...nodes.map(n => n.geo.total), 1);
  const rScale = (count: number) => 4 + (count / maxCount) * 14;

  return (
    <div ref={wrapRef} className="w-full h-full relative" style={{ background: '#000B28' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full"
        style={{ display: 'block' }}
        role="img"
        aria-label="World map showing regulatory obligations by jurisdiction"
      >
        <defs>
          {/* Glow filter for selected/red nodes */}
          <filter id="reg-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="reg-glow-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ocean background */}
        <rect width={W} height={H} fill="#000B28" />

        {/* Graticule grid */}
        <path
          d={path(graticule) ?? ''}
          fill="none"
          stroke="rgba(0,83,226,0.12)"
          strokeWidth={0.5}
        />

        {/* Country outlines */}
        {worldGeo.features.map((feat, i) => (
          <path
            key={i}
            d={path(feat) ?? ''}
            fill="#0a1628"
            stroke="rgba(0,83,226,0.25)"
            strokeWidth={0.5}
          />
        ))}

        {/* Globe outline */}
        <path
          d={path({ type: 'Sphere' }) ?? ''}
          fill="none"
          stroke="rgba(0,83,226,0.2)"
          strokeWidth={1}
        />

        {/* Jurisdiction markers */}
        {nodes.map(node => {
          const [x, y] = projection([node.lon, node.lat]) ?? [0, 0];
          const r = rScale(node.geo.total);
          const fill = RAG_FILL[node.geo.worst_rag] ?? '#22c55e';
          const glow = RAG_GLOW[node.geo.worst_rag] ?? '#4ade80';
          const isSelected = selectedJurisdiction === node.jurisdiction;
          const isRed = node.geo.worst_rag === 'Red';

          return (
            <g
              key={node.jurisdiction}
              className="cursor-pointer transition-transform"
              onClick={() => handleClick(node)}
              onMouseEnter={e => showTip(e, node)}
              onMouseMove={e => showTip(e, node)}
              onMouseLeave={hideTip}
              role="button"
              tabIndex={0}
              aria-label={`${node.label}: ${node.geo.total} obligations, ${node.geo.worst_rag} risk`}
              onKeyDown={e => { if (e.key === 'Enter') handleClick(node); }}
            >
              {/* Glow ring */}
              <circle
                cx={x} cy={y} r={r * 2}
                fill={glow}
                opacity={isSelected ? 0.25 : isRed ? 0.12 : 0.06}
                filter={isSelected ? 'url(#reg-glow-strong)' : undefined}
              />
              {/* Main circle */}
              <circle
                cx={x} cy={y} r={r}
                fill={fill}
                opacity={isSelected ? 1.0 : 0.85}
                stroke={isSelected ? '#FFC220' : glow}
                strokeWidth={isSelected ? 2.5 : 1}
                filter={isRed || isSelected ? 'url(#reg-glow)' : undefined}
              />
              {/* Label — only for larger nodes */}
              {(node.geo.total >= 8 || isSelected) && (
                <text
                  x={x} y={y - r - 4}
                  textAnchor="middle"
                  fill={isSelected ? '#FFC220' : '#94a3b8'}
                  fontSize={isSelected ? 11 : 9}
                  fontWeight={isSelected ? 800 : 600}
                  style={{ pointerEvents: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                >
                  {node.label}
                </text>
              )}
              {/* Count badge — for larger markers */}
              {node.geo.total >= 15 && (
                <text
                  x={x} y={y + 3.5}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={9}
                  fontWeight={800}
                  style={{ pointerEvents: 'none' }}
                >
                  {node.geo.total}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip overlay */}
      <div
        ref={tipRef}
        style={{
          display: 'none',
          position: 'absolute',
          pointerEvents: 'none',
          padding: '10px 14px',
          borderRadius: '10px',
          color: '#fff',
          background: 'rgba(0,5,20,0.94)',
          border: '1px solid rgba(0,83,226,0.5)',
          backdropFilter: 'blur(8px)',
          whiteSpace: 'nowrap',
          zIndex: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          maxWidth: '220px',
        }}
      />

      {/* Legend */}
      <div className="absolute bottom-3 left-3 pointer-events-none flex flex-col gap-0.5">
        {([
          ['Red', '#ff6b6b', 'Critical (19-25)'],
          ['Amber', '#fb923c', 'High (13-18)'],
          ['Yellow', '#FFC220', 'Medium (7-12)'],
          ['Green', '#4ade80', 'Low (1-6)'],
        ] as const).map(([label, color, desc]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
            <span className="text-[9px] font-semibold" style={{ color }}>{label}</span>
            <span className="text-[9px]" style={{ color: '#475569' }}>{desc}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px]" style={{ color: '#334155' }}>
            Circle size = obligation count
          </span>
        </div>
      </div>

      {/* Interaction hint */}
      <div className="absolute bottom-3 right-3 pointer-events-none">
        <span className="text-[9px]" style={{ color: '#334155' }}>
          Click a marker to filter the table below
        </span>
      </div>
    </div>
  );
};
