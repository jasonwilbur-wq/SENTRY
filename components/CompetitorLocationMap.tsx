import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CompetitorLocationsResponse,
  CompetitorLocationSample,
  CompetitorLocationSummary,
  CompetitorStateLocationSummary,
  fetchCompetitorLocations,
} from '../services/api';
import { GlassCard3D } from './GlassCard3D';

/**
 * Professional competitor footprint map.
 *
 * Choice: Leaflet + OpenStreetMap tiles.
 * - Full interactive pan/zoom with synchronized SENTRY overlays.
 * - No API key / no account / no token management.
 * - Avoids Mapbox/MapTiler commercial-key risk for an internal app.
 *
 * Note: Most source CSVs contain addresses but not lat/lng. Until we add a
 * cached geocoding pipeline, the map uses accurate state-level aggregates and
 * overlays exact points only where source rows include coordinates.
 */

const STATE_CENTERS: Record<string, { name: string; lat: number; lng: number }> = {
  AL: { name: 'Alabama', lat: 32.8, lng: -86.8 }, AK: { name: 'Alaska', lat: 64.2, lng: -149.5 },
  AZ: { name: 'Arizona', lat: 34.3, lng: -111.7 }, AR: { name: 'Arkansas', lat: 35.0, lng: -92.4 },
  CA: { name: 'California', lat: 37.2, lng: -119.7 }, CO: { name: 'Colorado', lat: 39.0, lng: -105.5 },
  CT: { name: 'Connecticut', lat: 41.6, lng: -72.7 }, DE: { name: 'Delaware', lat: 39.0, lng: -75.5 },
  FL: { name: 'Florida', lat: 28.1, lng: -82.0 }, GA: { name: 'Georgia', lat: 32.7, lng: -83.4 },
  HI: { name: 'Hawaii', lat: 20.9, lng: -157.5 }, ID: { name: 'Idaho', lat: 44.2, lng: -114.5 },
  IL: { name: 'Illinois', lat: 40.0, lng: -89.2 }, IN: { name: 'Indiana', lat: 40.0, lng: -86.1 },
  IA: { name: 'Iowa', lat: 42.0, lng: -93.4 }, KS: { name: 'Kansas', lat: 38.5, lng: -98.0 },
  KY: { name: 'Kentucky', lat: 37.5, lng: -85.3 }, LA: { name: 'Louisiana', lat: 31.0, lng: -92.0 },
  ME: { name: 'Maine', lat: 45.3, lng: -69.0 }, MD: { name: 'Maryland', lat: 39.0, lng: -76.7 },
  MA: { name: 'Massachusetts', lat: 42.3, lng: -71.8 }, MI: { name: 'Michigan', lat: 44.3, lng: -85.6 },
  MN: { name: 'Minnesota', lat: 46.3, lng: -94.2 }, MS: { name: 'Mississippi', lat: 32.7, lng: -89.7 },
  MO: { name: 'Missouri', lat: 38.4, lng: -92.5 }, MT: { name: 'Montana', lat: 46.9, lng: -110.4 },
  NE: { name: 'Nebraska', lat: 41.5, lng: -99.8 }, NV: { name: 'Nevada', lat: 39.3, lng: -116.6 },
  NH: { name: 'New Hampshire', lat: 43.7, lng: -71.6 }, NJ: { name: 'New Jersey', lat: 40.1, lng: -74.7 },
  NM: { name: 'New Mexico', lat: 34.5, lng: -106.1 }, NY: { name: 'New York', lat: 42.9, lng: -75.5 },
  NC: { name: 'North Carolina', lat: 35.5, lng: -79.4 }, ND: { name: 'North Dakota', lat: 47.5, lng: -100.5 },
  OH: { name: 'Ohio', lat: 40.3, lng: -82.8 }, OK: { name: 'Oklahoma', lat: 35.6, lng: -97.5 },
  OR: { name: 'Oregon', lat: 44.0, lng: -120.6 }, PA: { name: 'Pennsylvania', lat: 40.9, lng: -77.8 },
  RI: { name: 'Rhode Island', lat: 41.7, lng: -71.6 }, SC: { name: 'South Carolina', lat: 33.8, lng: -80.9 },
  SD: { name: 'South Dakota', lat: 44.4, lng: -100.2 }, TN: { name: 'Tennessee', lat: 35.8, lng: -86.4 },
  TX: { name: 'Texas', lat: 31.0, lng: -99.9 }, UT: { name: 'Utah', lat: 39.3, lng: -111.7 },
  VT: { name: 'Vermont', lat: 44.1, lng: -72.7 }, VA: { name: 'Virginia', lat: 37.6, lng: -78.7 },
  WA: { name: 'Washington', lat: 47.4, lng: -120.7 }, WV: { name: 'West Virginia', lat: 38.6, lng: -80.6 },
  WI: { name: 'Wisconsin', lat: 44.6, lng: -89.6 }, WY: { name: 'Wyoming', lat: 43.0, lng: -107.6 },
  DC: { name: 'District of Columbia', lat: 38.9, lng: -77.0 },
};

const BRAND_COLORS = ['#0053E2', '#C62828', '#FFC220', '#2A8703', '#7893B8', '#D95F02', '#001E60'];
const LEAFLET_CSS_URL = '/vendor/leaflet/leaflet.css';
const LEAFLET_JS_URL = '/vendor/leaflet/leaflet.js';

type CompetitorMapPoint = CompetitorLocationSample & { competitor: string };

declare global {
  interface Window {
    L?: any;
    __sentryLeafletLoader?: Promise<any>;
  }
}

function loadLeaflet(): Promise<any> {
  if (window.L) return Promise.resolve(window.L);
  if (window.__sentryLeafletLoader) return window.__sentryLeafletLoader;

  window.__sentryLeafletLoader = new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS_URL;
      document.head.appendChild(link);
    }

    const timeout = window.setTimeout(() => {
      reject(new Error('Leaflet did not initialize within 10 seconds'));
    }, 10000);

    const finish = () => {
      if (!window.L) return;
      window.clearTimeout(timeout);
      resolve(window.L);
    };

    const existingScript = document.getElementById('leaflet-js') as HTMLScriptElement | null;
    if (existingScript) {
      finish();
      existingScript.addEventListener('load', finish, { once: true });
      existingScript.addEventListener('error', () => {
        window.clearTimeout(timeout);
        reject(new Error('Unable to load Leaflet map library'));
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.onload = finish;
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('Unable to load Leaflet map library'));
    };
    document.body.appendChild(script);
  });

  return window.__sentryLeafletLoader;
}

function formatCount(value: number): string {
  return value.toLocaleString();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char] ?? char));
}

function topCompetitorName(state: CompetitorStateLocationSummary): string {
  return Object.entries(state.competitors).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
}

function statePopup(state: CompetitorStateLocationSummary): string {
  const competitorRows = Object.entries(state.competitors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => `<div><span>${escapeHtml(name)}</span><strong>${formatCount(count)}</strong></div>`)
    .join('');

  return `
    <div class="sentry-map-tooltip">
      <div class="sentry-map-tooltip-title">${escapeHtml(state.state_name)}</div>
      <div class="sentry-map-tooltip-total">${formatCount(state.total_locations)} locations</div>
      <div class="sentry-map-tooltip-list">${competitorRows}</div>
    </div>
  `;
}

function locationPopup(location: CompetitorMapPoint): string {
  const address = [location.street_address, location.city, location.state, location.zip].filter(Boolean).join(', ');
  const coordinateLabel = location.coordinate_source === 'source'
    ? 'Source latitude/longitude'
    : 'Coordinate unavailable';
  return `
    <div class="sentry-map-tooltip">
      <div class="sentry-map-tooltip-title">${escapeHtml(location.name || 'Location')}</div>
      <div class="sentry-map-tooltip-total">${escapeHtml(location.competitor)}</div>
      <div class="sentry-map-tooltip-muted">${escapeHtml(address)}</div>
      <div class="sentry-map-tooltip-muted">${escapeHtml(location.source_file)}</div>
      <div class="sentry-map-tooltip-coordinate">${escapeHtml(coordinateLabel)}</div>
    </div>
  `;
}

type PointCluster = {
  lat: number;
  lng: number;
  count: number;
  competitors: Map<string, number>;
  examples: CompetitorMapPoint[];
};

function clusterPopup(cluster: PointCluster): string {
  const competitorRows = Array.from(cluster.competitors.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `<div><span>${escapeHtml(name)}</span><strong>${formatCount(count)}</strong></div>`)
    .join('');
  const examples = cluster.examples
    .slice(0, 4)
    .map(location => `<div class="sentry-map-tooltip-muted">${escapeHtml(location.name || 'Location')} · ${escapeHtml([location.city, location.state].filter(Boolean).join(', '))}</div>`)
    .join('');

  return `
    <div class="sentry-map-tooltip">
      <div class="sentry-map-tooltip-title">${formatCount(cluster.count)} mapped locations</div>
      <div class="sentry-map-tooltip-total">Click cluster to zoom in</div>
      <div class="sentry-map-tooltip-list">${competitorRows}</div>
      <div style="height:1px;background:rgba(148,163,184,0.18);margin:8px 0"></div>
      ${examples}
    </div>
  `;
}

function LocationStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-bold">{label}</p>
      <p className="text-lg font-black text-white mt-0.5">{value}</p>
    </div>
  );
}

interface RealLeafletMapProps {
  stateRows: CompetitorStateLocationSummary[];
  exactLocations: CompetitorMapPoint[];
  selectedCompetitor: CompetitorLocationSummary | null;
  showExactPoints: boolean;
  maxCount: number;
  totalShown: number;
  hovered: CompetitorStateLocationSummary | null;
  onHoverState: (state: CompetitorStateLocationSummary | null) => void;
}

function RealLeafletCompetitorMap({
  stateRows,
  exactLocations,
  selectedCompetitor,
  showExactPoints,
  maxCount,
  totalShown,
  hovered,
  onHoverState,
}: RealLeafletMapProps) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const aggregateLayerRef = useRef<any>(null);
  const exactLayerRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('Loading interactive OpenStreetMap…');
  const [mapZoom, setMapZoom] = useState(4);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then(() => {
        if (!cancelled) setStatus('ready');
      })
      .catch(err => {
        if (!cancelled) {
          setStatus('error');
          setMessage(err instanceof Error ? err.message : 'Unable to load interactive map');
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !mapElRef.current || mapRef.current || !window.L) return;

    const L = window.L;
    const map = L.map(mapElRef.current, {
      zoomControl: false,
      preferCanvas: true,
      minZoom: 3,
      maxZoom: 14,
      worldCopyJump: true,
    }).setView([39.5, -98.35], 4);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map);

    aggregateLayerRef.current = L.layerGroup().addTo(map);
    exactLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapZoom(map.getZoom());

    const syncZoom = () => setMapZoom(map.getZoom());
    map.on('zoomend', syncZoom);

    const invalidate = () => map.invalidateSize({ animate: false });
    const resizeObserver = new ResizeObserver(invalidate);
    resizeObserver.observe(mapElRef.current);
    [0, 100, 300, 700, 1200].forEach(delay => window.setTimeout(invalidate, delay));

    return () => {
      resizeObserver.disconnect();
      map.off('zoomend', syncZoom);
      map.remove();
      mapRef.current = null;
      aggregateLayerRef.current = null;
      exactLayerRef.current = null;
    };
  }, [status]);

  useEffect(() => {
    if (status !== 'ready' || !window.L || !mapRef.current || !aggregateLayerRef.current || !exactLayerRef.current) return;

    const L = window.L;
    const aggregateLayer = aggregateLayerRef.current;
    const exactLayer = exactLayerRef.current;
    aggregateLayer.clearLayers();
    exactLayer.clearLayers();

    const map = mapRef.current;
    const bounds = L.latLngBounds([]);
    const shouldClusterExactPoints = showExactPoints && exactLocations.length > 0 && mapZoom >= 5;
    const shouldRenderIndividualPins = mapZoom >= 8;

    if (!shouldClusterExactPoints) {
      stateRows.forEach(state => {
        const center = STATE_CENTERS[state.state];
        if (!center) return;

        const zoomTrim = Math.max(0, mapZoom - 4) * 2.4;
        const marker = L.circleMarker([center.lat, center.lng], {
          radius: Math.max(8, 9 + Math.sqrt(state.total_locations / maxCount) * 25 - zoomTrim),
          color: selectedCompetitor ? '#fde68a' : '#9BB7DF',
          weight: hovered?.state === state.state ? 3 : 1.5,
          fillColor: selectedCompetitor ? '#FFC220' : '#0053E2',
          fillOpacity: hovered?.state === state.state ? 0.58 : 0.38,
          opacity: 0.95,
        });

        marker.bindTooltip(statePopup(state), {
          direction: 'top',
          opacity: 1,
          sticky: true,
          className: 'sentry-leaflet-tooltip',
        });
        marker.on('mouseover', () => onHoverState(state));
        marker.on('mouseout', () => onHoverState(null));
        marker.on('click', () => map.flyTo([center.lat, center.lng], Math.max(map.getZoom() + 2, 6), { duration: 0.7 }));
        marker.addTo(aggregateLayer);
        bounds.extend([center.lat, center.lng]);
      });
    } else {
      const gridSize = mapZoom < 6 ? 112 : mapZoom < 7 ? 86 : mapZoom < 8 ? 58 : 34;
      const clusters = new Map<string, {
        x: number;
        y: number;
        count: number;
        competitors: Map<string, number>;
        examples: CompetitorMapPoint[];
      }>();

      exactLocations.forEach(location => {
        if (typeof location.lat !== 'number' || typeof location.lng !== 'number') return;
        const projected = map.project([location.lat, location.lng], mapZoom);
        const key = shouldRenderIndividualPins
          ? `${location.competitor}:${location.lat.toFixed(4)}:${location.lng.toFixed(4)}:${location.name}`
          : `${Math.floor(projected.x / gridSize)}:${Math.floor(projected.y / gridSize)}`;
        const cluster = clusters.get(key) ?? {
          x: 0,
          y: 0,
          count: 0,
          competitors: new Map<string, number>(),
          examples: [],
        };
        cluster.x += projected.x;
        cluster.y += projected.y;
        cluster.count += 1;
        cluster.competitors.set(location.competitor, (cluster.competitors.get(location.competitor) ?? 0) + 1);
        if (cluster.examples.length < 5) cluster.examples.push(location);
        clusters.set(key, cluster);
      });

      clusters.forEach(cluster => {
        const centerPoint = L.point(cluster.x / cluster.count, cluster.y / cluster.count);
        const center = map.unproject(centerPoint, mapZoom);
        const clusterInfo: PointCluster = {
          lat: center.lat,
          lng: center.lng,
          count: cluster.count,
          competitors: cluster.competitors,
          examples: cluster.examples,
        };
        const isSinglePin = shouldRenderIndividualPins && cluster.count === 1;
        const markerSize = Math.min(58, Math.max(30, 22 + Math.sqrt(cluster.count) * 7));
        const marker = isSinglePin
          ? L.circleMarker(center, {
              radius: selectedCompetitor ? 4.5 : 3.4,
              color: '#ffffff',
              weight: 0.75,
              fillColor: '#0053E2',
              fillOpacity: 0.74,
              opacity: 0.92,
            })
          : L.marker(center, {
              icon: L.divIcon({
                className: 'sentry-location-cluster-icon',
                html: `<span>${formatCount(cluster.count)}</span>`,
                iconSize: [markerSize, markerSize],
                iconAnchor: [markerSize / 2, markerSize / 2],
              }),
              keyboard: true,
              title: `${formatCount(cluster.count)} mapped competitor locations`,
            });

        marker
          .bindTooltip(isSinglePin ? locationPopup(cluster.examples[0]) : clusterPopup(clusterInfo), {
            direction: 'top',
            opacity: 1,
            sticky: true,
            className: 'sentry-leaflet-tooltip',
          })
          .on('click', () => {
            if (!isSinglePin) map.flyTo(center, Math.min(map.getZoom() + 2, 11), { duration: 0.65 });
          })
          .addTo(exactLayer);
        bounds.extend(center);
      });
    }
  }, [exactLocations, hovered?.state, mapZoom, maxCount, onHoverState, selectedCompetitor, showExactPoints, stateRows, status]);

  useEffect(() => {
    if (status !== 'ready' || !window.L || !mapRef.current || !selectedCompetitor) return;
    const bounds = window.L.latLngBounds([]);
    stateRows.forEach(state => {
      const center = STATE_CENTERS[state.state];
      if (center) bounds.extend([center.lat, center.lng]);
    });
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds.pad(0.28), { animate: true, maxZoom: 6 });
    }
  }, [selectedCompetitor, stateRows, status]);

  const activeMapMode = !showExactPoints || exactLocations.length === 0 || mapZoom < 5
    ? 'State aggregate totals'
    : mapZoom < 8
      ? 'Verified coordinate clusters'
      : 'Verified individual locations';

  return (
    <div className="relative rounded-xl border border-white/10 overflow-hidden bg-slate-950" style={{ height: 'clamp(420px, 58vh, 560px)', minHeight: 420 }}>
      <style>{`
        .sentry-leaflet-map .leaflet-tile {
          filter: grayscale(1) invert(0.9) hue-rotate(180deg) brightness(0.76) contrast(1.05);
        }
        .sentry-leaflet-map .leaflet-control-attribution {
          background: rgba(2, 6, 23, 0.78);
          color: #94a3b8;
          border-radius: 8px 0 0 0;
          font-size: 10px;
        }
        .sentry-leaflet-map .leaflet-control-attribution a { color: #9BB7DF; }
        .sentry-leaflet-map .leaflet-control-zoom a {
          background: rgba(15, 23, 42, 0.94);
          color: #e2e8f0;
          border-color: rgba(148, 163, 184, 0.22);
        }
        .sentry-leaflet-tooltip {
          background: rgba(2, 6, 23, 0.94);
          border: 1px solid rgba(148, 163, 184, 0.28);
          border-radius: 12px;
          box-shadow: 0 18px 45px rgba(0,0,0,0.45);
          color: #e2e8f0;
          padding: 0;
        }
        .sentry-leaflet-tooltip::before { display: none; }
        .sentry-location-cluster-icon {
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.22), rgba(255,194,32,0.82) 42%, rgba(0,83,226,0.74) 100%);
          border: 1px solid rgba(253,230,138,0.9);
          box-shadow: 0 0 0 4px rgba(0,83,226,0.16), 0 14px 34px rgba(0,0,0,0.42);
          color: #fff;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: -0.02em;
        }
        .sentry-location-cluster-icon span {
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.65));
        }
        .sentry-map-tooltip { min-width: 190px; padding: 10px 12px; }
        .sentry-map-tooltip-title { color: #fff; font-size: 13px; font-weight: 900; margin-bottom: 2px; }
        .sentry-map-tooltip-total { color: #facc15; font-size: 12px; font-weight: 800; margin-bottom: 8px; }
        .sentry-map-tooltip-muted { color: #94a3b8; font-size: 11px; line-height: 1.35; }
        .sentry-map-tooltip-coordinate { color: #facc15; font-size: 10px; font-weight: 800; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.08em; }
        .sentry-map-tooltip-list { display: grid; gap: 3px; }
        .sentry-map-tooltip-list div { display: flex; justify-content: space-between; gap: 16px; color: #cbd5e1; font-size: 11px; }
        .sentry-map-tooltip-list strong { color: #fff; }
      `}</style>
      <div ref={mapElRef} className="absolute inset-0 h-full w-full sentry-leaflet-map" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,83,226,0.12),transparent_42%),linear-gradient(180deg,rgba(2,6,23,0.04),rgba(2,6,23,0.22))]" />
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/84 backdrop-blur-sm">
          <div className="rounded-xl border border-white/10 bg-slate-900/90 px-5 py-4 text-center shadow-2xl">
            <p className={status === 'error' ? 'text-sm font-bold text-red-300' : 'text-sm font-bold text-slate-200 animate-pulse'}>{message}</p>
            {status === 'error' && <p className="mt-2 text-xs text-slate-500">Leaflet assets are expected at /vendor/leaflet.</p>}
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-white/10 bg-slate-950/82 px-4 py-3 shadow-2xl backdrop-blur-md">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Active Layer</p>
        <p className="text-sm font-black text-white">{selectedCompetitor?.name ?? 'All Competitors'}</p>
        <p className="text-xs text-slate-400">{formatCount(totalShown)} locations · {stateRows.length} states</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">Zoom {mapZoom.toFixed(1)} · {activeMapMode}</p>
      </div>
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/75 px-4 py-2 backdrop-blur-md">
        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-bold">State totals show all records; pins show only verified source coordinates</span>
        <a
          href="https://www.openstreetmap.org/#map=4/39.5/-98.35"
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-blue-300 hover:text-white transition-colors"
        >
          Open full map ↗
        </a>
      </div>
    </div>
  );
}

export const CompetitorLocationMap: React.FC = () => {
  const [data, setData] = useState<CompetitorLocationsResponse | null>(null);
  const [selected, setSelected] = useState<string>('All');
  const [hovered, setHovered] = useState<CompetitorStateLocationSummary | null>(null);
  const [showExactPoints, setShowExactPoints] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    fetchCompetitorLocations()
      .then(payload => { if (!cancelled) setData(payload); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load competitor locations'); });
    return () => { cancelled = true; };
  }, []);

  const selectedCompetitor = useMemo(() => {
    if (!data || selected === 'All') return null;
    return data.competitors.find(c => c.name === selected) ?? null;
  }, [data, selected]);

  const stateRows = useMemo(() => {
    if (!data) return [];
    return data.states
      .map(state => ({
        ...state,
        total_locations: selectedCompetitor ? (selectedCompetitor.by_state[state.state] ?? 0) : state.total_locations,
      }))
      .filter(state => state.total_locations > 0);
  }, [data, selectedCompetitor]);

  const exactLocations = useMemo(() => {
    if (!data) return [];
    const competitors = selectedCompetitor ? [selectedCompetitor] : data.competitors;
    return competitors.flatMap(competitor => (competitor.map_points ?? competitor.sample_locations)
      .filter(location => typeof location.lat === 'number' && typeof location.lng === 'number')
      .map(location => ({ ...location, competitor: competitor.name })));
  }, [data, selectedCompetitor]);

  const maxCount = Math.max(...stateRows.map(s => s.total_locations), 1);
  const totalShown = stateRows.reduce((sum, state) => sum + state.total_locations, 0);
  const topStates = stateRows.slice().sort((a, b) => b.total_locations - a.total_locations).slice(0, 6);
  const topCompetitors = (data?.competitors ?? []).slice(0, 7);
  const renderedExactPins = exactLocations.length;
  const sourceGeocodedCount = selectedCompetitor
    ? selectedCompetitor.geocoded_locations
    : (data?.competitors ?? []).reduce((sum, competitor) => sum + competitor.geocoded_locations, 0);
  const unmappedPointCount = selectedCompetitor
    ? (selectedCompetitor.unmapped_locations ?? Math.max(0, selectedCompetitor.total_locations - selectedCompetitor.geocoded_locations))
    : (data?.competitors ?? []).reduce(
      (sum, competitor) => sum + (competitor.unmapped_locations ?? Math.max(0, competitor.total_locations - competitor.geocoded_locations)),
      0,
    );

  if (error) {
    return <p className="text-sm text-red-300">Location map unavailable: {error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-slate-500 animate-pulse">Loading competitor location intelligence…</p>;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
      <div
        className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/70 p-4 shadow-[0_20px_70px_rgba(0,83,226,0.12)]"
        style={{ backdropFilter: 'blur(12px)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-wmt-yellow">Location Intelligence</p>
            <h4 className="text-white font-black text-lg">Competitor Store & Facility Footprint</h4>
            <p className="text-xs text-slate-500">Interactive OpenStreetMap + Leaflet · synchronized SENTRY competitor overlays</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={showExactPoints}
                onChange={(event) => setShowExactPoints(event.target.checked)}
                className="accent-wmt-blue"
              />
              Accurate pins
            </label>
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-wmt-blue"
            >
              <option value="All">All competitors</option>
              {data.competitors.map(competitor => (
                <option key={competitor.name} value={competitor.name}>{competitor.name}</option>
              ))}
            </select>
          </div>
        </div>

        <RealLeafletCompetitorMap
          stateRows={stateRows}
          exactLocations={exactLocations}
          selectedCompetitor={selectedCompetitor}
          showExactPoints={showExactPoints}
          maxCount={maxCount}
          totalShown={totalShown}
          hovered={hovered}
          onHoverState={setHovered}
        />
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <LocationStat label="Shown" value={formatCount(totalShown)} />
          <LocationStat label="States" value={stateRows.length} />
          <LocationStat label="Accurate Pins" value={formatCount(renderedExactPins)} />
          <LocationStat label="Sources" value={selectedCompetitor?.files.length ?? data.competitors.length} />
        </div>

        {hovered && (
          <GlassCard3D glowColor="#FFC220" intensity={3} className="rounded-2xl border border-yellow-500/20 bg-slate-900/80 p-4">
            <p className="text-xs font-black text-white">{hovered.state_name}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {formatCount(hovered.total_locations)} locations · top competitor: {topCompetitorName(hovered)}
            </p>
          </GlassCard3D>
        )}

        <GlassCard3D glowColor="#FFC220" intensity={3} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <p className="text-xs font-black text-white mb-1">Coordinate Coverage</p>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
            {formatCount(sourceGeocodedCount)} source lat/lng points · {formatCount(unmappedPointCount)} records need verified coordinates. Unverified estimated points are intentionally hidden to prevent inaccurate placement.
          </p>
          <p className="text-xs font-black text-white mb-3">Top States</p>
          <div className="space-y-2">
            {topStates.map(state => (
              <div key={state.state}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300 font-semibold">{state.state_name}</span>
                  <span className="text-slate-500">{formatCount(state.total_locations)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-wmt-blue to-wmt-yellow" style={{ width: `${Math.max(5, state.total_locations * 100 / maxCount)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard3D>

        <GlassCard3D glowColor="#0053E2" intensity={3} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <p className="text-xs font-black text-white mb-3">Competitor Coverage</p>
          <div className="space-y-2">
            {topCompetitors.map((competitor: CompetitorLocationSummary, index) => (
              <button
                key={competitor.name}
                onClick={() => setSelected(selected === competitor.name ? 'All' : competitor.name)}
                className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.04] transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: BRAND_COLORS[index % BRAND_COLORS.length] }} />
                  <span className="text-xs text-slate-300 truncate">{competitor.name}</span>
                </span>
                <span className="text-xs font-bold text-white">{formatCount(competitor.total_locations)}</span>
              </button>
            ))}
          </div>
        </GlassCard3D>
      </div>
    </div>
  );
};
