/**
 * RegulatoryGlobe3D — Interactive 3D globe for regulatory intelligence.
 *
 * DATA-DRIVEN: Fetches jurisdiction aggregation from /api/regulatory/geo
 * and maps each jurisdiction to lat/lon via regulatoryGeoData.ts.
 *
 * Features:
 *  - US states rendered as distinct labeled pillars rising from the globe
 *  - International jurisdictions as sphere markers
 *  - RAG color-coding (Red/Amber/Yellow/Green)
 *  - Click-to-filter: clicking a node fires onJurisdictionClick
 *  - Hover tooltips with RAG breakdown
 *  - Pulsing animations for critical (Red) nodes
 *  - Connection arcs between high-risk hubs
 *  - US Focus button to zoom into continental US
 *  - selectedJurisdiction prop highlights the active node
 *
 * Raw Three.js — consistent with existing SENTRY 3D patterns.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  JURISDICTION_COORDS, latLonToVec3, RAG_HEX, RAG_CSS,
  type JurisdictionCoord,
} from '../data/regulatoryGeoData';
import { fetchRegulatoryGeo, type RegulatoryGeoJurisdiction } from '../services/api';

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  selectedJurisdiction?: string | null;
  onJurisdictionClick?: (jurisdiction: string | null) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────
const US_CENTER: [number, number] = [39.5, -98.5];
const GLOBE_CAM_POS  = (R: number): [number, number, number] => [0, R * 0.4, R * 2.0];
const US_CAM_POS     = (R: number): [number, number, number] => {
  const [x, y, z] = latLonToVec3(US_CENTER[0], US_CENTER[1], R * 1.1);
  return [x * 1.6, y + R * 0.2, z * 1.6];
};
const US_CAM_LOOK    = (R: number): [number, number, number] => latLonToVec3(US_CENTER[0], US_CENTER[1], R);

// ── Merged node = geo data + coordinate ──────────────────────────────────────
interface GlobeNode {
  jurisdiction: string;
  coord: JurisdictionCoord;
  geo: RegulatoryGeoJurisdiction;
}

// ── Component ────────────────────────────────────────────────────────────────
export const RegulatoryGlobe3D: React.FC<Props> = ({
  selectedJurisdiction = null,
  onJurisdictionClick,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const tipRef   = useRef<HTMLDivElement>(null);
  const usFocusRef = useRef(false);
  const selectedRef = useRef(selectedJurisdiction);
  selectedRef.current = selectedJurisdiction;

  // Animation target refs for smooth camera transitions
  const camTargetPos  = useRef(new THREE.Vector3());
  const camTargetLook = useRef(new THREE.Vector3(0, 0, 0));
  const autoRotate    = useRef(true);

  const toggleUSFocus = useCallback(() => {
    usFocusRef.current = !usFocusRef.current;
  }, []);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let destroyed = false;
    const W = el.clientWidth || 900;
    const H = el.clientHeight || 500;
    const R = Math.min(W, H) * 0.32;
    const RS = R / 160;

    // ── Renderer ─────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: true, powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    el.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000);
    const [cx, cy, cz] = GLOBE_CAM_POS(R);
    camera.position.set(cx, cy, cz);
    camera.lookAt(0, 0, 0);
    camTargetPos.current.set(cx, cy, cz);

    // ── Starfield ────────────────────────────────────────────────────
    const starCount = 3000;
    const sPos = new Float32Array(starCount * 3);
    for (let i = 0; i < sPos.length; i++) sPos[i] = (Math.random() - 0.5) * R * 14;
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({
      color: 0x60a5fa, size: R * 0.003, transparent: true, opacity: 0.35,
    })));

    // ── Lighting ─────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x0a0f20, 3.0));
    const kl = new THREE.PointLight(0x3060ff, 4, R * 10);
    kl.position.set(R * 1.5, R * 1.2, R * 1.8);
    scene.add(kl);
    const fl = new THREE.PointLight(0x002288, 2, R * 8);
    fl.position.set(-R * 1.2, -R * 0.8, -R);
    scene.add(fl);

    // ── Globe group ──────────────────────────────────────────────────
    const globeG = new THREE.Group();
    scene.add(globeG);

    // Solid inner sphere
    globeG.add(new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      new THREE.MeshStandardMaterial({
        color: 0x020c28, emissive: 0x000820,
        emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.7,
        transparent: true, opacity: 0.92,
      }),
    ));

    // Wireframe overlay
    globeG.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.005, 36, 24),
      new THREE.MeshBasicMaterial({
        color: 0x1a3a8f, wireframe: true, transparent: true, opacity: 0.06,
      }),
    ));

    // Atmosphere glow
    globeG.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.08, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0x0053e2, transparent: true, opacity: 0.04,
        side: THREE.BackSide, blending: THREE.AdditiveBlending,
      }),
    ));

    // Latitude lines (every 30°)
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts: THREE.Vector3[] = [];
      for (let lon = -180; lon <= 180; lon += 4) {
        const [x, y, z] = latLonToVec3(lat, lon, R * 1.003);
        pts.push(new THREE.Vector3(x, y, z));
      }
      globeG.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x0053e2, transparent: true, opacity: 0.06 }),
      ));
    }

    // ── Data loading ─────────────────────────────────────────────────
    const nodeMeshes: THREE.Mesh[] = [];
    const nodeData: GlobeNode[] = [];
    const glowMeshes: THREE.Mesh[] = [];
    const pillarMeshes: THREE.Mesh[] = [];   // US state pillars
    const labelSprites: THREE.Sprite[] = []; // US state labels
    const selectionRings: THREE.Mesh[] = [];

    fetchRegulatoryGeo().then(({ jurisdictions }) => {
      if (destroyed) return;

      const nodes: GlobeNode[] = jurisdictions
        .map(geo => {
          const coord = JURISDICTION_COORDS[geo.jurisdiction];
          return coord ? { jurisdiction: geo.jurisdiction, coord, geo } : null;
        })
        .filter((n): n is GlobeNode => n !== null);

      nodes.forEach(node => {
        const { coord, geo } = node;
        const ragKey = geo.worst_rag;
        const col = RAG_HEX[ragKey] ?? 0x22c55e;
        const isUS = coord.region === 'us-state' || coord.region === 'us-federal';
        const isCity = coord.region === 'us-city';
        const isRed = ragKey === 'Red';

        // Scale by obligation count (clamped)
        const countScale = Math.min(Math.max(geo.total / 20, 0.4), 2.0);
        const baseSize = RS * 4.5 * countScale;

        const surfacePos = latLonToVec3(coord.lat, coord.lon, R * 1.012);
        const pos = new THREE.Vector3(...surfacePos);

        if (isUS && !isCity) {
          // ── US state: pillar (cylinder) rising from surface ─────
          const pillarHeight = baseSize * 3.5;
          const pillarR = baseSize * 0.6;
          const pillarGeo = new THREE.CylinderGeometry(pillarR, pillarR * 1.3, pillarHeight, 8);
          const pillarMat = new THREE.MeshStandardMaterial({
            color: col, emissive: col,
            emissiveIntensity: isRed ? 0.8 : 0.4,
            metalness: 0.3, roughness: 0.5,
            transparent: true, opacity: 0.9,
          });
          const pillar = new THREE.Mesh(pillarGeo, pillarMat);

          // Position: align pillar to radiate outward from globe center
          const normal = pos.clone().normalize();
          pillar.position.copy(pos).addScaledVector(normal, pillarHeight * 0.5);
          pillar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

          globeG.add(pillar);
          pillarMeshes.push(pillar);
          nodeMeshes.push(pillar);
          nodeData.push(node);

          // Cap sphere on top of pillar
          const capPos = pos.clone().addScaledVector(normal, pillarHeight);
          const cap = new THREE.Mesh(
            new THREE.SphereGeometry(pillarR * 1.1, 12, 12),
            new THREE.MeshStandardMaterial({
              color: col, emissive: col,
              emissiveIntensity: isRed ? 1.0 : 0.6,
              metalness: 0.2, roughness: 0.4,
            }),
          );
          cap.position.copy(capPos);
          globeG.add(cap);

          // Glow around cap
          const glow = new THREE.Mesh(
            new THREE.SphereGeometry(pillarR * 3.0, 12, 12),
            new THREE.MeshBasicMaterial({
              color: col, transparent: true,
              opacity: isRed ? 0.2 : 0.08,
              side: THREE.BackSide, blending: THREE.AdditiveBlending,
            }),
          );
          glow.position.copy(capPos);
          globeG.add(glow);
          glowMeshes.push(glow);

          // Selection ring
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(pillarR * 2.5, pillarR * 0.2, 8, 24),
            new THREE.MeshBasicMaterial({
              color: 0xffc220, transparent: true, opacity: 0,
              blending: THREE.AdditiveBlending,
            }),
          );
          ring.position.copy(capPos);
          ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
          globeG.add(ring);
          selectionRings.push(ring);

          // State label sprite
          const label = makeLabel(coord.usState || coord.label, pillarR * 2);
          label.position.copy(capPos).addScaledVector(normal, pillarR * 2.5);
          globeG.add(label);
          labelSprites.push(label);

        } else {
          // ── International / city: sphere marker ────────────────
          const sz = isCity ? baseSize * 0.5 : baseSize;
          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(sz, 14, 14),
            new THREE.MeshStandardMaterial({
              color: col, emissive: col,
              emissiveIntensity: isRed ? 0.9 : 0.5,
              metalness: 0.2, roughness: 0.4,
            }),
          );
          mesh.position.copy(pos);
          globeG.add(mesh);
          nodeMeshes.push(mesh);
          nodeData.push(node);

          // Glow
          const glow = new THREE.Mesh(
            new THREE.SphereGeometry(sz * 2.8, 10, 10),
            new THREE.MeshBasicMaterial({
              color: col, transparent: true,
              opacity: isRed ? 0.2 : 0.08,
              side: THREE.BackSide, blending: THREE.AdditiveBlending,
            }),
          );
          glow.position.copy(pos);
          globeG.add(glow);
          glowMeshes.push(glow);

          // Selection ring
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(sz * 2.0, sz * 0.15, 8, 24),
            new THREE.MeshBasicMaterial({
              color: 0xffc220, transparent: true, opacity: 0,
              blending: THREE.AdditiveBlending,
            }),
          );
          ring.position.copy(pos);
          const normal = pos.clone().normalize();
          ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
          globeG.add(ring);
          selectionRings.push(ring);

          // Label for larger international nodes
          if (!isCity && geo.total >= 4) {
            const label = makeLabel(coord.label, sz * 1.8);
            label.position.copy(pos.clone().addScaledVector(pos.clone().normalize(), sz * 3));
            globeG.add(label);
            labelSprites.push(label);
          }
        }
      });

      // ── Arcs between high-risk hubs ────────────────────────────
      const redNodes = nodes.filter(n => n.geo.worst_rag === 'Red').slice(0, 8);
      for (let i = 0; i < redNodes.length - 1; i++) {
        const a = redNodes[i].coord;
        const b = redNodes[i + 1].coord;
        const arcA = new THREE.Vector3(...latLonToVec3(a.lat, a.lon, R * 1.01));
        const arcB = new THREE.Vector3(...latLonToVec3(b.lat, b.lon, R * 1.01));
        globeG.add(makeArc(arcA, arcB, RAG_HEX.Red));
      }
      const amberNodes = nodes.filter(n => n.geo.worst_rag === 'Amber').slice(0, 5);
      for (let i = 0; i < amberNodes.length - 1; i++) {
        const a = amberNodes[i].coord;
        const b = amberNodes[i + 1].coord;
        const arcA = new THREE.Vector3(...latLonToVec3(a.lat, a.lon, R * 1.01));
        const arcB = new THREE.Vector3(...latLonToVec3(b.lat, b.lon, R * 1.01));
        globeG.add(makeArc(arcA, arcB, RAG_HEX.Amber));
      }
    }).catch(err => console.warn('RegulatoryGlobe3D: geo fetch failed', err));

    // ── Hover & click ────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-9, -9);
    let hoveredIdx = -1;

    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    };
    const onClick = () => {
      if (hoveredIdx >= 0 && onJurisdictionClick) {
        const jur = nodeData[hoveredIdx].jurisdiction;
        onJurisdictionClick(selectedRef.current === jur ? null : jur);
      }
    };
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.style.cursor = 'grab';

    // ── Mouse drag rotation ──────────────────────────────────────────
    let isDragging = false;
    let prevX = 0, prevY = 0;
    const onDown = (e: MouseEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      autoRotate.current = false;
      renderer.domElement.style.cursor = 'grabbing';
    };
    const onUp = () => {
      isDragging = false;
      renderer.domElement.style.cursor = hoveredIdx >= 0 ? 'pointer' : 'grab';
      // Resume auto-rotate after 3 seconds
      setTimeout(() => { if (!isDragging) autoRotate.current = true; }, 3000);
    };
    const onDrag = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      globeG.rotation.y += dx * 0.005;
      globeG.rotation.x += dy * 0.003;
      globeG.rotation.x = Math.max(-0.5, Math.min(0.5, globeG.rotation.x));
      prevX = e.clientX;
      prevY = e.clientY;
    };
    renderer.domElement.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onDrag);

    // ── Animate ──────────────────────────────────────────────────────
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = Date.now() * 0.001;

      // Auto-rotation
      if (autoRotate.current && !isDragging) {
        globeG.rotation.y += 0.002;
      }

      // Camera smoothing (for US Focus toggle)
      if (usFocusRef.current) {
        const [tx, ty, tz] = US_CAM_POS(R);
        camTargetPos.current.set(tx, ty, tz);
        const [lx, ly, lz] = US_CAM_LOOK(R);
        camTargetLook.current.set(lx, ly, lz);
        autoRotate.current = false;
      } else {
        const [gx, gy, gz] = GLOBE_CAM_POS(R);
        camTargetPos.current.set(gx, gy, gz);
        camTargetLook.current.set(0, 0, 0);
      }
      camera.position.lerp(camTargetPos.current, 0.03);
      const lookTarget = new THREE.Vector3().copy(camTargetLook.current);
      camera.lookAt(lookTarget);

      // Pulse glows
      glowMeshes.forEach((g, i) => {
        if (i >= nodeData.length) return;
        const rag = nodeData[i]?.geo.worst_rag;
        const mat = g.material as THREE.MeshBasicMaterial;
        if (rag === 'Red') {
          g.scale.setScalar(1.0 + Math.sin(t * 2.2 + i * 0.8) * 0.35);
          mat.opacity = 0.18 + Math.sin(t * 2.2 + i * 0.8) * 0.1;
        } else if (rag === 'Amber') {
          g.scale.setScalar(1.0 + Math.sin(t * 1.5 + i) * 0.15);
        }
      });

      // Selection rings
      selectionRings.forEach((ring, i) => {
        const mat = ring.material as THREE.MeshBasicMaterial;
        const isSelected = selectedRef.current && i < nodeData.length &&
                           nodeData[i].jurisdiction === selectedRef.current;
        const targetOpacity = isSelected ? 0.7 + Math.sin(t * 3) * 0.3 : 0;
        mat.opacity += (targetOpacity - mat.opacity) * 0.1;
        if (isSelected) ring.rotation.z += 0.02;
      });

      // Hover
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(nodeMeshes);
      if (hits.length) {
        const idx = nodeMeshes.indexOf(hits[0].object as THREE.Mesh);
        hoveredIdx = idx;
        renderer.domElement.style.cursor = 'pointer';

        if (idx >= 0 && tipRef.current && wrapRef.current) {
          const nd = nodeData[idx];
          const geo = nd.geo;
          const p = hits[0].point.clone().project(camera);
          const wr = wrapRef.current.getBoundingClientRect();
          const tip = tipRef.current;
          tip.style.display = 'block';
          tip.style.left = `${(p.x * 0.5 + 0.5) * wr.width}px`;
          tip.style.top  = `${(-p.y * 0.5 + 0.5) * wr.height - 80}px`;

          const ragColor = RAG_CSS[geo.worst_rag] || '#4ade80';
          tip.innerHTML = `
            <div style="font-weight:800;font-size:13px;margin-bottom:4px">${nd.coord.label}</div>
            <div style="font-size:10px;color:${ragColor};font-weight:700;margin-bottom:6px">
              ${geo.worst_rag.toUpperCase()} RISK · ${geo.total} obligation${geo.total !== 1 ? 's' : ''}
            </div>
            <div style="display:flex;gap:8px;font-size:10px;margin-bottom:4px">
              ${geo.red   ? `<span style="color:#ff6b6b">●${geo.red} Red</span>` : ''}
              ${geo.amber ? `<span style="color:#fb923c">●${geo.amber} Amb</span>` : ''}
              ${geo.yellow? `<span style="color:#FFC220">●${geo.yellow} Yel</span>` : ''}
              ${geo.green ? `<span style="color:#4ade80">●${geo.green} Grn</span>` : ''}
            </div>
            <div style="font-size:9px;color:#64748b;border-top:1px solid rgba(255,255,255,0.1);padding-top:4px">
              ${geo.techs.slice(0, 3).join(' · ')}${geo.techs.length > 3 ? ` +${geo.techs.length - 3}` : ''}
            </div>
            <div style="font-size:9px;color:#475569;margin-top:2px">Click to filter table ↓</div>
          `;
        }
      } else {
        hoveredIdx = -1;
        if (tipRef.current) tipRef.current.style.display = 'none';
        if (!isDragging) renderer.domElement.style.cursor = 'grab';
      }

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ───────────────────────────────────────────────────────
    const onResize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onDrag);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('mousedown', onDown);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Tooltip */}
      <div
        ref={tipRef}
        style={{
          display: 'none', position: 'absolute', pointerEvents: 'none',
          padding: '10px 14px', borderRadius: '10px',
          color: '#fff', background: 'rgba(0,5,20,0.92)',
          border: '1px solid rgba(0,83,226,0.5)',
          backdropFilter: 'blur(8px)',
          transform: 'translateX(-50%)', whiteSpace: 'nowrap', zIndex: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      />

      {/* US Focus button */}
      <button
        onClick={toggleUSFocus}
        className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:opacity-90"
        style={{
          background: 'rgba(0,83,226,0.2)',
          border: '1px solid rgba(0,83,226,0.4)',
          color: '#60a5fa',
          backdropFilter: 'blur(8px)',
        }}
        title="Toggle US-focused view"
      >
        🇺🇸 US Focus
      </button>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1">
        {([
          ['Red', '#ff6b6b', 'Critical (19-25)'],
          ['Amber', '#fb923c', 'High (13-18)'],
          ['Yellow', '#FFC220', 'Medium (7-12)'],
          ['Green', '#4ade80', 'Low (1-6)'],
        ] as const).map(([label, color, desc]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0"
              style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <span className="text-[9px] font-semibold" style={{ color }}>
              {label}
            </span>
            <span className="text-[9px]" style={{ color: '#475569' }}>{desc}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-4 rounded-sm shrink-0" style={{ background: '#0053e2' }} />
          <span className="text-[9px]" style={{ color: '#475569' }}>US State (pillar height = count)</span>
        </div>
      </div>

      {/* Interaction hint */}
      <div className="absolute bottom-4 right-4 z-10">
        <span className="text-[9px]" style={{ color: '#334155' }}>
          Drag to rotate · Click node to filter · Scroll to zoom
        </span>
      </div>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeArc(a: THREE.Vector3, b: THREE.Vector3, color: number): THREE.Line {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const h = a.distanceTo(b) * 0.45;
  mid.normalize().multiplyScalar(mid.length() + h);
  const pts = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(48);
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({
      color, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending,
    }),
  );
}

function makeLabel(text: string, scale: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const size = 128;
  canvas.width = size;
  canvas.height = 48;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, 48);
  ctx.font = 'bold 24px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Shadow for readability
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(text, size / 2, 24);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, opacity: 0.85,
    depthWrite: false, blending: THREE.NormalBlending,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scale * 3, scale * 1.2, 1);
  return sprite;
}
