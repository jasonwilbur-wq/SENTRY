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
import { OrbitControls, Html } from '@react-three/drei';
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

const RISK_Y: Record<string, number> = {
  Low:      0,
  Medium:   2.8,
  High:     5.6,
  Critical: 8.4,
};

const RISK_RADIUS: Record<string, number> = {
  Low:      1.8,
  Medium:   3.2,
  High:     4.8,
  Critical: 6.2,
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

      const radiusJitter = (seededRandom(v.id, 2) - 0.5) * 0.9;
      const r            = baseR + radiusJitter;

      const yJitter  = (seededRandom(v.id, 3) - 0.5) * 0.9;
      const y        = baseY + yJitter;

      const scale    = 0.12 + (Math.max(0, Math.min(5, v.overall_rating)) / 5) * 0.24;

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
  vendor: PlacedVendor;
  onHover: (v: PlacedVendor | null) => void;
  onClick: (v: PlacedVendor) => void;
  reducedMotion: boolean;
}

const Orb: React.FC<OrbProps> = ({ vendor, onHover, onClick, reducedMotion }) => {
  const meshRef   = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (!meshRef.current || reducedMotion) return;
    // Gentle float
    const t = performance.now() * 0.001;
    meshRef.current.position.y = vendor.position[1] + Math.sin(t + vendor.position[0]) * 0.05;
    // Scale on hover
    const target = hovered ? vendor.scale * 2.2 : vendor.scale;
    meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), delta * 8);
  });

  const hex = parseInt(vendor.color.replace('#', ''), 16);

  return (
    <mesh
      ref={meshRef}
      position={vendor.position}
      scale={vendor.scale}
      onPointerOver={e => { e.stopPropagation(); setHovered(true);  onHover(vendor); document.body.style.cursor = 'pointer'; }}
      onPointerOut={e  => { e.stopPropagation(); setHovered(false); onHover(null);   document.body.style.cursor = 'auto'; }}
      onClick={e        => { e.stopPropagation(); onClick(vendor); }}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color={hex}
        emissive={hex}
        emissiveIntensity={hovered ? 1.2 : 0.5}
        roughness={0.3}
        metalness={0.4}
      />
    </mesh>
  );
};

// ── Ring label (floating text at each risk tier) ──────────────────────────────

const RingLabel: React.FC<{ label: string; y: number; color: string }> = ({ label, y, color }) => (
  <Html position={[7.4, y, 0]} center>
    <div
      style={{
        background: 'rgba(4,8,22,0.82)',
        border: `1px solid ${color}55`,
        borderLeft: `3px solid ${color}`,
        color,
        padding: '3px 10px',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      {label}
    </div>
  </Html>
);

// ── Scene ─────────────────────────────────────────────────────────────────────

const Scene: React.FC<{
  vendors: PlacedVendor[];
  onHover: (v: PlacedVendor | null) => void;
  onSelect: (v: PlacedVendor) => void;
  reducedMotion: boolean;
}> = ({ vendors, onHover, onSelect, reducedMotion }) => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(12, 6, 14);
    camera.lookAt(0, 4, 0);
  }, [camera]);

  // Slow galaxy rotation
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!groupRef.current || reducedMotion) return;
    groupRef.current.rotation.y += delta * 0.04;
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 12, 0]}  intensity={1.2} color="#4d9fff" />
      <pointLight position={[-8, 0, 8]}  intensity={0.6} color="#FFC220" />
      <pointLight position={[8, 8, -8]}  intensity={0.5} color="#ef4444" />

      {/* Risk level ring labels */}
      {Object.entries(RISK_Y).map(([risk, y]) => (
        <RingLabel key={risk} label={risk} y={y} color={RISK_COLORS[risk]} />
      ))}

      {/* Central axis */}
      <mesh position={[0, 4.2, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 9.6, 8]} />
        <meshStandardMaterial color="#0053E2" emissive="#0053E2" emissiveIntensity={0.6} opacity={0.4} transparent />
      </mesh>

      {/* Rotating vendor orbs */}
      <group ref={groupRef}>
        {vendors.map(v => (
          <Orb
            key={v.id}
            vendor={v}
            onHover={onHover}
            onClick={onSelect}
            reducedMotion={reducedMotion}
          />
        ))}
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={28}
        target={[0, 4, 0]}
      />
    </>
  );
};

// ── Tooltip / Info card ───────────────────────────────────────────────────────

const VendorCard: React.FC<{ vendor: PlacedVendor; onClose: () => void }> = ({ vendor, onClose }) => (
  <div
    className="rounded-xl overflow-hidden"
    style={{
      width: 240,
      background: 'rgba(4,8,22,0.96)',
      border: `1px solid ${vendor.color}55`,
      boxShadow: `0 0 30px ${vendor.color}22`,
      animation: 'slideUp 0.2s ease-out both',
    }}
    role="dialog"
    aria-label={`Vendor details: ${vendor.company_name}`}
  >
    <div className="px-4 py-3" style={{ borderBottom: `1px solid ${vendor.color}33` }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-white leading-tight">{vendor.company_name}</p>
        <button
          onClick={onClose}
          aria-label="Close vendor detail"
          className="shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded opacity-50 hover:opacity-100"
          style={{ color: 'var(--s-text-muted)' }}
        >✕</button>
      </div>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--s-text-dim)' }}>{vendor.category}</p>
    </div>
    <div className="px-4 py-3 space-y-2">
      {[
        { label: 'Risk Level',  value: vendor.risk_level,                       color: vendor.color },
        { label: 'Rating',      value: `${vendor.overall_rating.toFixed(1)} / 5`, color: '#FFC220' },
        { label: 'Status',      value: vendor.vendor_status,                    color: '#94a3b8' },
      ].map(({ label, value, color }) => (
        <div key={label} className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>{label}</span>
          <span className="text-[11px] font-bold" style={{ color }}>{value}</span>
        </div>
      ))}
    </div>
  </div>
);

// ── Main page component ───────────────────────────────────────────────────────

const VendorRiskMap3D: React.FC = () => {
  const { reducedMotion } = useTheme();
  const [vendors, setVendors]     = useState<Vendor[]>([]);
  const [loading, setLoading]     = useState(true);
  const [hovered, setHovered]     = useState<PlacedVendor | null>(null);
  const [selected, setSelected]   = useState<PlacedVendor | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>('All');

  useEffect(() => {
    (async () => {
      try {
        // Fetch up to 300 vendors (covers all of SENTRY's vendor DB)
        const res = await fetchVendors({ page: 1, page_size: 300 });
        setVendors(res.vendors as unknown as Vendor[]);
      } catch { /* silently degrade */ }
      finally { setLoading(false); }
    })();
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
    <div className="flex flex-col gap-4 h-full" style={{ minHeight: 600 }}>

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

      {/* 3D Canvas */}
      <div
        className="relative flex-1 rounded-2xl overflow-hidden"
        style={{
          minHeight: 460,
          background: 'radial-gradient(ellipse at 40% 40%, rgba(0,20,60,0.9) 0%, #000B28 70%)',
          border: '1px solid var(--s-border-mid)',
        }}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs" style={{ color: 'var(--s-text-dim)' }}>Plotting vendor galaxy…</p>
            </div>
          </div>
        ) : (
          <Canvas
            aria-label={`3D galaxy showing ${placed.length} vendors distributed by risk level. Use mouse to orbit and zoom. Click a sphere to see vendor details.`}
            role="img"
            dpr={[1, Math.min(window.devicePixelRatio, 2)]}
            gl={{ antialias: true, alpha: true }}
            style={{ width: '100%', height: '100%' }}
          >
            <Scene
              vendors={visibleVendors}
              onHover={setHovered}
              onSelect={handleSelect}
              reducedMotion={reducedMotion}
            />
          </Canvas>
        )}

        {/* Hover tooltip — top-left */}
        {hovered && !selected && (
          <div
            className="absolute top-3 left-3 px-3 py-2 rounded-lg pointer-events-none"
            style={{
              background: 'rgba(4,8,22,0.9)',
              border: `1px solid ${hovered.color}44`,
              maxWidth: 200,
            }}
            aria-live="polite"
          >
            <p className="text-xs font-bold text-white truncate">{hovered.company_name}</p>
            <p className="text-[10px] mt-0.5" style={{ color: hovered.color }}>{hovered.risk_level} Risk · {hovered.overall_rating.toFixed(1)}/5</p>
          </div>
        )}

        {/* Selected info card — bottom-right */}
        {selected && (
          <div className="absolute bottom-4 right-4">
            <VendorCard vendor={selected} onClose={handleClose} />
          </div>
        )}

        {/* Interaction hint */}
        {!loading && !selected && (
          <div
            className="absolute bottom-3 left-3 text-[9px] uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.2)', pointerEvents: 'none' }}
            aria-hidden="true"
          >
            Drag to orbit · Scroll to zoom · Click orb for details
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorRiskMap3D;