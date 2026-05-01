/**
 * VendorRiskMap3D — Interactive 3D scatter galaxy of all SENTRY vendors.
 *
 * Layout:
 *  - Y axis  : risk level (Low=0, Medium=2.5, High=5, Critical=7.5)
 *  - Radius  : risk level ring distance from center axis
 *  - Angle   : seeded per-vendor (deterministic — same vendor, same spot)
 *  - Scale   : overall_rating / 5 → sphere size 0.12 – 0.36
 *  - Color   : risk-level hue (green → yellow → orange → red)
 *
 * Interactions:
 *  - OrbitControls: rotate / zoom / pan
 *  - Hover: sphere scales up + tooltip
 *  - Click: info card locks open
 */
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { fetchVendors } from '../services/api';
import { useTheme } from '../context/ThemeContext';

// ── Types ────────────────────────────────────────────────────────────────────

interface Vendor {
  id: string;
  company_name: string;
  category: string;
  overall_rating: number;
  risk_level: string;
  vendor_status: string;
}

interface PlacedVendor extends Vendor {
  position: [number, number, number];
  color: string;
  scale: number;
}

// ── Colour map ───────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  Low:      '#22c55e',
  Medium:   '#FFC220',
  High:     '#f97316',
  Critical: '#ef4444',
};

// Y bands are 4 units apart so tiers never bleed into each other
const RISK_Y: Record<string, number> = {
  Low:      0,
  Medium:   4.0,
  High:     8.0,
  Critical: 12.0,
};

// Wider rings — more breathing room between the 400+ vendors per tier
const RISK_RADIUS: Record<string, number> = {
  Low:      3.5,
  Medium:   5.5,
  High:     7.5,
  Critical: 9.5,
};

/** Deterministic pseudo-random from a string seed */
function seededRandom(seed: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 0x9e3779b9);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 0xffffffff;
}

// ── Layout builder ───────────────────────────────────────────────────────────

function placeVendors(vendors: Vendor[]): PlacedVendor[] {
  // Group by risk level to distribute angles evenly within each ring
  const byRisk: Record<string, Vendor[]> = { Low: [], Medium: [], High: [], Critical: [] };
  vendors.forEach(v => {
    const key = v.risk_level in byRisk ? v.risk_level : 'Medium';
    byRisk[key].push(v);
  });

  const placed: PlacedVendor[] = [];

  Object.entries(byRisk).forEach(([risk, group]) => {
    const baseY  = RISK_Y[risk]      ?? 0;
    const baseR  = RISK_RADIUS[risk]  ?? 3;
    const color    = RISK_COLORS[risk] ?? '#94a3b8';
    const count    = group.length;

    group.forEach((v, i) => {
      // Even angular spread + small random jitter per vendor
      const baseAngle  = (i / count) * Math.PI * 2;
      const jitterAng  = (seededRandom(v.id, 1) - 0.5) * 0.4;
      const angle      = baseAngle + jitterAng;

      // More radius spread so dense tiers don't pile on top of each other
      const radiusJitter = (seededRandom(v.id, 2) - 0.5) * 1.8;
      const r            = baseR + radiusJitter;

      // Tighter Y jitter — tiers are now 4 units apart so 1.2 is safe
      const yJitter  = (seededRandom(v.id, 3) - 0.5) * 1.2;
      const y        = baseY + yJitter;

      // Orbs: 0.28 (unrated) → 0.55 (5-star) — actually visible at any zoom
      const rating   = typeof v.overall_rating === 'number' ? v.overall_rating : 0;
      const scale    = 0.28 + (Math.max(0, Math.min(5, rating)) / 5) * 0.27;

      placed.push({
        ...v,
        position: [r * Math.cos(angle), y, r * Math.sin(angle)],
        color,
        scale,
      });
    });
  });

  return placed;
}

// ── Orb ──────────────────────────────────────────────────────────────────────

interface OrbProps {
  vendor:       PlacedVendor;
  isSelected:   boolean;
  onHover:      (v: PlacedVendor | null) => void;
  onSelect:     (v: PlacedVendor) => void;
  reducedMotion: boolean;
}

const Orb: React.FC<OrbProps> = ({ vendor, isSelected, onHover, onSelect, reducedMotion }) => {
  const groupRef   = useRef<THREE.Group>(null);
  const coreRef    = useRef<THREE.Mesh>(null);
  const haloRef    = useRef<THREE.Mesh>(null);
  const ringRef    = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Track pointer-down position so we can distinguish a click from a drag.
  // OrbitControls can suppress `onClick` even with 1-2 px of movement.
  const pointerDown = useRef<{ x: number; y: number } | null>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Gentle vertical float — phase offset by X position for variety
    if (!reducedMotion) {
      const t = performance.now() * 0.0008;
      groupRef.current.position.y =
        vendor.position[1] + Math.sin(t + vendor.position[0] * 1.3) * 0.12;
    }

    // Scale: selected > hovered > normal
    const targetS = isSelected ? vendor.scale * 2.2 : hovered ? vendor.scale * 1.75 : vendor.scale;
    groupRef.current.scale.lerp(new THREE.Vector3(targetS, targetS, targetS), delta * 10);

    // Halo opacity
    if (haloRef.current) {
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      const targetO = isSelected ? 0.55 : hovered ? 0.38 : 0.13;
      mat.opacity += (targetO - mat.opacity) * delta * 8;
    }

    // Core emissive
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      const targetE = isSelected ? 5.0 : hovered ? 3.8 : 2.0;
      mat.emissiveIntensity += (targetE - mat.emissiveIntensity) * delta * 8;
    }

    // Selection ring: spin + fade in
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * (isSelected ? 1.2 : 0.3);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity += ((isSelected ? 0.9 : 0) - mat.opacity) * delta * 10;
    }
  });

  const hex = parseInt(vendor.color.replace('#', ''), 16);

  return (
    <group
      ref={groupRef}
      position={vendor.position}
      scale={vendor.scale}
      onPointerOver={e => {
        e.stopPropagation();
        setHovered(true);
        onHover(vendor);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={e => {
        e.stopPropagation();
        setHovered(false);
        onHover(null);
        document.body.style.cursor = 'auto';
      }}
      onPointerDown={e => {
        e.stopPropagation();
        pointerDown.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={e => {
        e.stopPropagation();
        if (!pointerDown.current) return;
        const dx = e.clientX - pointerDown.current.x;
        const dy = e.clientY - pointerDown.current.y;
        // Only fire if pointer moved < 6 px (true click, not a drag)
        if (Math.sqrt(dx * dx + dy * dy) < 6) onSelect(vendor);
        pointerDown.current = null;
      }}
    >
      {/* Core orb */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[1, 22, 22]} />
        <meshStandardMaterial
          color={hex}
          emissive={hex}
          emissiveIntensity={2.0}
          roughness={0.15}
          metalness={0.6}
        />
      </mesh>

      {/* Soft halo bloom */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[1.7, 14, 14]} />
        <meshBasicMaterial color={hex} transparent opacity={0.13} depthWrite={false} />
      </mesh>

      {/* Selection ring — spins and appears when selected */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.9, 0.06, 8, 48]} />
        <meshBasicMaterial color={hex} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
};

// ── Ring label — always faces camera, never occluded by rotation ──────────────
const RingLabel: React.FC<{ label: string; y: number; color: string }> = ({ label, y, color }) => (
  // prepend=false keeps it in the canvas DOM order (above Three canvas)
  // transform=false means it uses CSS 2-D positioning — no 3-D rotation weirdness
  <Html position={[0, y, 0]} center prepend={false} transform={false} zIndexRange={[10, 20]}>
    <div
      style={{
        background: 'rgba(4,8,22,0.92)',
        border: `1px solid ${color}66`,
        borderLeft: `3px solid ${color}`,
        color,
        padding: '3px 10px',
        borderRadius: 5,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        textShadow: `0 0 6px ${color}`,
        // translate right so it sits outside the ring (rings are 3.5–9.5 r)
        transform: 'translateX(calc(50% + 160px))',
      }}
    >
      {label}
    </div>
  </Html>
);

// ── Scene ─────────────────────────────────────────────────────────────────────

// Faint orbital ring at each risk tier — gives the galaxy structure
const OrbitRing: React.FC<{ y: number; radius: number; color: string }> = ({ y, radius, color }) => {
  const hex = parseInt(color.replace('#', ''), 16);
  return (
    <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.025, 8, 120]} />
      <meshBasicMaterial color={hex} transparent opacity={0.18} depthWrite={false} />
    </mesh>
  );
};

const Scene: React.FC<{
  vendors:      PlacedVendor[];
  selectedId:   string | null;
  onHover:      (v: PlacedVendor | null) => void;
  onSelect:     (v: PlacedVendor) => void;
  reducedMotion: boolean;
}> = ({ vendors, selectedId, onHover, onSelect, reducedMotion }) => {
  const { camera } = useThree();

  // Camera is initialised via the Canvas `camera` prop — no useEffect needed.
  // We still call lookAt so OrbitControls has the right initial target reference.
  useEffect(() => {
    camera.lookAt(0, 6, 0);
  }, [camera]);

  // Slow galaxy rotation
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!groupRef.current || reducedMotion) return;
    groupRef.current.rotation.y += delta * 0.035;
  });

  return (
    <>
      {/* Starfield background for depth */}
      <Stars radius={80} depth={60} count={3000} factor={3} fade speed={0.5} />

      {/* Lighting — bright ambient so orbs are always readable + coloured fills */}
      <ambientLight intensity={1.2} />
      <hemisphereLight args={[0x223366, 0x000b28, 0.8]} />
      <pointLight position={[0, 20, 0]}   intensity={60}  color="#4d9fff" />
      <pointLight position={[-14, 4, 14]} intensity={40}  color="#FFC220" />
      <pointLight position={[14, 12, -14]} intensity={35} color="#ef4444" />
      <pointLight position={[0, -4, 0]}   intensity={25}  color="#22c55e" />

      {/* Orbital rings — one thin torus per risk tier */}
      {Object.entries(RISK_Y).map(([risk, y]) => (
        <OrbitRing
          key={risk}
          y={y}
          radius={RISK_RADIUS[risk]}
          color={RISK_COLORS[risk]}
        />
      ))}

      {/* Risk level labels */}
      {Object.entries(RISK_Y).map(([risk, y]) => (
        <RingLabel key={risk} label={risk} y={y} color={RISK_COLORS[risk]} />
      ))}

      {/* Central axis — full height of the Y range */}
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 14, 8]} />
        <meshStandardMaterial
          color="#0053E2"
          emissive="#0053E2"
          emissiveIntensity={1.2}
          opacity={0.5}
          transparent
        />
      </mesh>

      {/* Rotating vendor orbs */}
      <group ref={groupRef}>
        {vendors.map(v => (
          <Orb
            key={v.id}
            vendor={v}
            isSelected={v.id === selectedId}
            onHover={onHover}
            onSelect={onSelect}
            reducedMotion={reducedMotion}
          />
        ))}
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.07}
        minDistance={6}
        maxDistance={50}
        target={[0, 6, 0]}
      />
    </>
  );
};

// ── Vendor detail panel ───────────────────────────────────────────────────────
// Rendered as a DOM overlay (not inside Three.js) so it always reads clearly.

const RATING_STARS = (r: number) => {
  const filled = Math.round(r);
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} style={{ color: i < filled ? '#FFC220' : '#334155', fontSize: 13 }}>★</span>
  ));
};

const STATUS_COLOR: Record<string, string> = {
  Active:   '#22c55e',
  Inactive: '#ef4444',
  Pending:  '#FFC220',
  Review:   '#f97316',
};

const VendorCard: React.FC<{ vendor: PlacedVendor; onClose: () => void }> = ({ vendor, onClose }) => {
  const statusColor = STATUS_COLOR[vendor.vendor_status] ?? '#94a3b8';
  const rating      = vendor.overall_rating ?? 0;

  return (
    <div
      role="dialog"
      aria-label={`Vendor details: ${vendor.company_name}`}
      style={{
        width: 280,
        background: 'rgba(4,8,22,0.97)',
        border: `1px solid ${vendor.color}55`,
        borderTop: `3px solid ${vendor.color}`,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: `0 8px 40px rgba(0,0,0,0.7), 0 0 24px ${vendor.color}22`,
        animation: 'slideUp 0.22s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${vendor.color}22` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: 200 }}>
              {vendor.company_name}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 10, color: '#94a3b8', letterSpacing: '0.04em' }}>
              {vendor.category}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              flexShrink: 0, width: 22, height: 22, borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: '#94a3b8', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}
          >✕</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Risk badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Risk Level</span>
          <span style={{
            fontSize: 11, fontWeight: 800, color: vendor.color,
            background: `${vendor.color}18`, border: `1px solid ${vendor.color}44`,
            padding: '2px 8px', borderRadius: 99, letterSpacing: '0.06em',
          }}>
            {vendor.risk_level}
          </span>
        </div>

        {/* Rating stars */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rating</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#FFC220', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {rating.toFixed(1)}
            </span>
            <span style={{ display: 'flex' }}>{RATING_STARS(rating)}</span>
          </div>
        </div>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>{vendor.vendor_status || '—'}</span>
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />

        {/* Press ESC or click elsewhere hint */}
        <p style={{ margin: 0, fontSize: 9, color: '#475569', textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Click the orb again or ✕ to dismiss
        </p>
      </div>
    </div>
  );
};

// ── Main page component ───────────────────────────────────────────────────────

const VendorRiskMap3D: React.FC = () => {
  const { reducedMotion } = useTheme();
  const [vendors, setVendors]       = useState<Vendor[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [hovered, setHovered]       = useState<PlacedVendor | null>(null);
  const [selected, setSelected]     = useState<PlacedVendor | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>('All');

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      try {
        setError(null);
        // Fetch page 1 to discover total_pages, then fan out for the rest.
        // Using page_size=100 (backend hard cap) — all pages fire in parallel.
        const PAGE_SZ = 100;
        const first = await fetchVendors({ page: 1, page_size: PAGE_SZ });
        if (cancelled) return;

        let all = [...first.vendors];

        if (first.total_pages > 1) {
          const rest = await Promise.all(
            Array.from({ length: first.total_pages - 1 }, (_, i) =>
              fetchVendors({ page: i + 2, page_size: PAGE_SZ })
            )
          );
          if (cancelled) return;
          rest.forEach(r => all.push(...r.vendors));
        }

        setVendors(all);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Unknown error loading vendors';
          console.error('[VendorRiskMap3D] Failed to load vendors:', err);
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAll();
    return () => { cancelled = true; };
  }, []);

  const placed = useMemo(() => placeVendors(vendors), [vendors]);

  const visibleVendors = useMemo(() =>
    riskFilter === 'All' ? placed : placed.filter(v => v.risk_level === riskFilter),
  [placed, riskFilter]);

  const handleSelect = useCallback((v: PlacedVendor) => {
    setSelected(p => p?.id === v.id ? null : v);
  }, []);

  const handleClose = useCallback(() => setSelected(null), []);

  const RISK_LEVELS = ['All', 'Critical', 'High', 'Medium', 'Low'];

  // Summary counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    placed.forEach(v => { if (v.risk_level in c) c[v.risk_level]++; });
    return c;
  }, [placed]);

  return (
    <div className="flex flex-col gap-4" style={{ height: '100%', minHeight: 600 }}>

      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black tracking-wide" style={{ color: 'var(--s-text)' }}>
            Vendor Risk Galaxy
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--s-text-dim)' }}>
            {placed.length} vendors · orbit to explore · click an orb for details
          </p>
        </div>

        {/* KPI chips */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(counts).map(([risk, count]) => (
            <div
              key={risk}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{
                background: `${RISK_COLORS[risk]}18`,
                border: `1px solid ${RISK_COLORS[risk]}40`,
                color: RISK_COLORS[risk],
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: RISK_COLORS[risk] }} />
              {count} {risk}
            </div>
          ))}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by risk level">
        {RISK_LEVELS.map(lvl => (
          <button
            key={lvl}
            onClick={() => setRiskFilter(lvl)}
            aria-pressed={riskFilter === lvl}
            className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-150"
            style={{
              background: riskFilter === lvl
                ? (lvl === 'All' ? 'rgba(0,83,226,0.25)' : `${RISK_COLORS[lvl]}25`)
                : 'var(--s-modal-inner)',
              border: riskFilter === lvl
                ? (lvl === 'All' ? '1px solid rgba(0,83,226,0.5)' : `1px solid ${RISK_COLORS[lvl]}60`)
                : '1px solid var(--s-border)',
              color: riskFilter === lvl
                ? (lvl === 'All' ? '#4d9fff' : RISK_COLORS[lvl])
                : 'var(--s-text-muted)',
            }}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* 3D Canvas — flex-1 + min-h-0 lets it consume remaining space without overflowing */}
      <div
        className="relative flex-1 min-h-0 rounded-2xl overflow-hidden"
        style={{
          minHeight: 460,
          background: 'radial-gradient(ellipse at 50% 50%, #000d2e 0%, #000408 100%)',
          border: '1px solid var(--s-border-mid)',
          boxShadow: 'inset 0 0 60px rgba(0,83,226,0.08)',
        }}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs" style={{ color: 'var(--s-text-dim)' }}>Plotting vendor galaxy…</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3 max-w-xs">
              <div className="w-10 h-10 mx-auto rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>Could not load vendor data</p>
              <p className="text-[10px] font-mono break-all" style={{ color: 'var(--s-text-dim)' }}>{error}</p>
              <p className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Is the SENTRY backend running?</p>
            </div>
          </div>
        ) : (
          <Canvas
            aria-label={`3D galaxy showing ${placed.length} vendors distributed by risk level. Use mouse to orbit and zoom. Click a sphere to see vendor details.`}
            role="img"
            camera={{ position: [20, 9, 18], fov: 55, near: 0.1, far: 500 }}
            dpr={[1, Math.min(window.devicePixelRatio, 2)]}
            gl={{ antialias: true, alpha: true }}
            style={{ width: '100%', height: '100%' }}
            onPointerMissed={() => handleClose()}
          >
            <Scene
              vendors={visibleVendors}
              selectedId={selected?.id ?? null}
              onHover={setHovered}
              onSelect={handleSelect}
              reducedMotion={reducedMotion}
            />
          </Canvas>
        )}

        {/* Hover name tag — follows the mouse into top-left corner */}
        {hovered && !selected && (
          <div
            className="absolute top-3 left-3 pointer-events-none"
            aria-live="polite"
            style={{
              background: 'rgba(4,8,22,0.94)',
              border: `1px solid ${hovered.color}55`,
              borderLeft: `3px solid ${hovered.color}`,
              borderRadius: 6,
              padding: '6px 12px',
              maxWidth: 220,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#f1f5f9',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hovered.company_name}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: hovered.color, fontWeight: 600 }}>
              {hovered.risk_level} Risk &nbsp;·&nbsp;
              <span style={{ color: '#FFC220' }}>{(hovered.overall_rating ?? 0).toFixed(1)} ★</span>
            </p>
          </div>
        )}

        {/* Selected vendor panel — bottom-right, always on top of canvas */}
        {selected && (
          <div
            className="absolute bottom-4 right-4"
            style={{ zIndex: 10 }}
          >
            <VendorCard vendor={selected} onClose={handleClose} />
          </div>
        )}

        {/* Interaction hint — bottom-left, hidden once something is selected */}
        {!loading && !error && !selected && (
          <div
            className="absolute bottom-3 left-3 pointer-events-none"
            aria-hidden="true"
            style={{
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.22)',
            }}
          >
            Drag to orbit · Scroll to zoom · Click an orb for details
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorRiskMap3D;