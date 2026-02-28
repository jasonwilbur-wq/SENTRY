/**
 * CompetitorOrbital3D
 * ====================
 * Three.js stellar-orbital scene:
 *  · Walmart = glowing blue core with Spark-Yellow equatorial ring
 *  · Competitor satellites orbit at radii proportional to rank
 *    (size ∝ event_count, colour = threat level)
 *  · Animated pulse arcs from satellites toward the core
 *  · Mouse drag + inertia; hover tooltip
 *  · Starfield particle cloud
 */
import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { CompetitorEntity } from '../services/api';

const THREAT_COLOR: Record<string, number> = {
  High:   0xEA1100,
  Medium: 0xFFC220,
  Low:    0x2A8703,
};
const WM_BLUE   = 0x0053E2;
const WM_YELLOW = 0xFFC220;

interface Props {
  entities: CompetitorEntity[];
  onHover?: (name: string | null) => void;
}

export const CompetitorOrbital3D: React.FC<Props> = ({ entities, onHover }) => {
  const mountRef   = useRef<HTMLDivElement>(null);
  const tipRef     = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef<string | null>(null);

  const handleHover = useCallback((name: string | null) => {
    if (hoveredRef.current === name) return;
    hoveredRef.current = name;
    onHover?.(name);
  }, [onHover]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth  || 900;
    const H = el.clientHeight || 440;

    // ── Renderer ─────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // ── Scene + Camera ────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 2000);
    camera.position.set(0, 22, 105);
    camera.lookAt(0, 0, 0);

    // ── Lighting ──────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x0a1a3a, 1.4));
    const coreLight = new THREE.PointLight(WM_BLUE, 3.5, 220);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);
    const sparkLight = new THREE.PointLight(WM_YELLOW, 0.9, 120);
    sparkLight.position.set(40, 30, 30);
    scene.add(sparkLight);

    // ── Walmart core sphere ───────────────────────────────────────────
    const coreGeo = new THREE.SphereGeometry(8.5, 64, 64);
    const coreMat = new THREE.MeshPhongMaterial({
      color: WM_BLUE, emissive: 0x001a55, emissiveIntensity: 0.6,
      shininess: 120, transparent: true, opacity: 0.95,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Core wireframe shell
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(8.7, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0x1a5ce2, wireframe: true, transparent: true, opacity: 0.12 }),
    ));

    // Atmosphere glow
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(12, 32, 32),
      new THREE.MeshBasicMaterial({ color: WM_BLUE, transparent: true, opacity: 0.07, side: THREE.BackSide }),
    ));

    // Spark Yellow equatorial ring
    const eqRing = new THREE.Mesh(
      new THREE.TorusGeometry(13.5, 0.28, 8, 100),
      new THREE.MeshBasicMaterial({ color: WM_YELLOW, transparent: true, opacity: 0.55 }),
    );
    eqRing.rotation.x = Math.PI / 2;
    scene.add(eqRing);

    // ── Satellites ────────────────────────────────────────────────────
    const TOP     = Math.min(entities.length, 12);
    const RADII   = [22, 28, 33, 37, 41, 45, 49, 52, 55, 58, 61, 64];
    const SPEEDS  = [0.009, 0.007, 0.0055, 0.0045, 0.004, 0.0035, 0.003, 0.0028, 0.0026, 0.0024, 0.0022, 0.002];
    const TILTS   = [0.18, -0.14, 0.28, -0.08, 0.22, -0.18, 0.12, -0.25, 0.16, -0.06, 0.20, -0.12];

    const satMeshes: THREE.Mesh[]         = [];
    const satData: {
      mesh: THREE.Mesh; radius: number; speed: number;
      angle: number; tilt: number; name: string; threat: string;
      count: number; topCat: string;
    }[] = [];

    entities.slice(0, TOP).forEach((comp, i) => {
      const radius  = RADII[i];
      const size    = Math.max(1.5, Math.min(4.2, 1.3 + comp.event_count / 100));
      const colHex  = THREAT_COLOR[comp.threat_level] ?? 0x64748b;

      // Orbit ring (decorative)
      const orbitGeo = new THREE.TorusGeometry(radius, 0.14, 8, 128);
      const orbitMat = new THREE.MeshBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.22 });
      const orbitRing = new THREE.Mesh(orbitGeo, orbitMat);
      orbitRing.rotation.x = Math.PI / 2 + TILTS[i] * 0.5;
      scene.add(orbitRing);

      // Satellite body
      const satGeo  = new THREE.SphereGeometry(size, 32, 32);
      const satMat  = new THREE.MeshPhongMaterial({
        color: colHex, emissive: colHex, emissiveIntensity: 0.3,
        shininess: 80, transparent: true, opacity: 0.92,
      });
      const satMesh = new THREE.Mesh(satGeo, satMat);
      const angle0  = (i / TOP) * Math.PI * 2;
      satMesh.position.set(
        Math.cos(angle0) * radius,
        Math.sin(TILTS[i]) * radius * 0.25,
        Math.sin(angle0) * radius,
      );
      scene.add(satMesh);

      // Satellite glow halo
      satMesh.add(new THREE.Mesh(
        new THREE.SphereGeometry(size * 1.6, 16, 16),
        new THREE.MeshBasicMaterial({ color: colHex, transparent: true, opacity: 0.06, side: THREE.BackSide }),
      ));

      satMeshes.push(satMesh);
      satData.push({
        mesh: satMesh, radius, speed: SPEEDS[i], angle: angle0,
        tilt: TILTS[i], name: comp.name, threat: comp.threat_level,
        count: comp.event_count, topCat: comp.top_category ?? 'N/A',
      });
    });

    // ── Starfield ─────────────────────────────────────────────────────
    const STAR_COUNT = 320;
    const starPos    = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT * 3; i++)
      starPos[i] = (Math.random() - 0.5) * 420;
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo,
      new THREE.PointsMaterial({ size: 0.8, color: 0x94a3b8, transparent: true, opacity: 0.45 })));

    // ── Pulse arcs ────────────────────────────────────────────────────
    const pulses: { line: THREE.Line; life: number }[] = [];

    function spawnPulse() {
      if (satData.length === 0) return;
      const sat = satData[Math.floor(Math.random() * satData.length)];
      const origin = sat.mesh.position.clone();
      const dest   = new THREE.Vector3(0, 0, 0);
      const mid    = origin.clone().add(dest).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(mid.length() + origin.distanceTo(dest) * 0.35);
      const curve  = new THREE.QuadraticBezierCurve3(origin, mid, dest);
      const pts    = curve.getPoints(40);
      const geo    = new THREE.BufferGeometry().setFromPoints(pts);
      const col    = THREAT_COLOR[sat.threat] ?? 0x0053e2;
      const mat    = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.7 });
      const line   = new THREE.Line(geo, mat);
      galaxy.add(line);
      pulses.push({ line, life: 1.0 });
    }
    const pulseTimer = setInterval(spawnPulse, 1100);

    // ── Raycaster for hover ────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2(-9999, -9999);
    const tip       = tipRef.current;

    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      if (tip) {
        tip.style.left = (e.clientX - rect.left + 14) + 'px';
        tip.style.top  = (e.clientY - rect.top  - 10) + 'px';
      }
    };
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // ── Drag / inertia ────────────────────────────────────────────────
    let isDragging = false;
    let prevMouse  = { x: 0, y: 0 };
    let velX = 0.0012, velY = 0.0002;
    const scene3 = { rotY: 0, rotX: 0 };

    const onDown = (e: MouseEvent) => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; };
    const onUp   = () => { isDragging = false; };
    const onDrag = (e: MouseEvent) => {
      if (!isDragging) return;
      velX = (e.clientX - prevMouse.x) * 0.003;
      velY = (e.clientY - prevMouse.y) * 0.002;
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    renderer.domElement.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onDrag);

    // ── Galaxy group (orbitable content lives here for drag rotation) ──
    const galaxy = new THREE.Group();
    scene.add(galaxy);
    // Re-parent core + atmosphere + ring + satellites + orbit rings into galaxy
    [coreMesh, eqRing, ...satMeshes].forEach(m => {
      scene.remove(m);
      galaxy.add(m);
    });
    // Also move the wireframe shell and atmosphere glow (children 3,4 after lights)
    const toMove = scene.children.filter(
      c => c !== galaxy && c !== coreLight && c !== sparkLight
        && !(c instanceof THREE.Points)
    );
    toMove.forEach(c => { scene.remove(c); galaxy.add(c); });

    // ── Animation loop ────────────────────────────────────────────────
    let t = 0;
    let rafId: number;

    // Expose reset function to parent or button
    (mountRef.current as any).__resetView = () => {
      scene3.rotX = 0;
      scene3.rotY = 0;
      velX = 0.0012;
      velY = 0.0002;
    };

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      t += 0.007;

      // Core pulse
      coreMat.emissiveIntensity = 0.5 + Math.sin(t * 1.5) * 0.15;

      // Scene-level drag rotation via galaxy group
      if (!isDragging) {
        velX += (0.0012 - velX) * 0.04;
        velY += (0.0002 - velY) * 0.04;
      }
      galaxy.rotation.y += velX;
      galaxy.rotation.x = Math.max(-0.5, Math.min(0.5, galaxy.rotation.x + velY));

      // Orbit satellites within the group (local coords)
      satData.forEach(sat => {
        sat.angle += sat.speed;
        sat.mesh.position.set(
          Math.cos(sat.angle) * sat.radius,
          Math.sin(sat.tilt + t * 0.18) * sat.radius * 0.18,
          Math.sin(sat.angle) * sat.radius,
        );
        sat.mesh.rotation.y += 0.012;
      });
      coreMesh.rotation.y += 0.004;
      eqRing.rotation.y   += 0.003;

      // Camera gentle drift
      camera.position.x = Math.sin(t * 0.05) * 10;
      camera.lookAt(0, 0, 0);

      // Pulse arc fadeout
      for (let i = pulses.length - 1; i >= 0; i--) {
        pulses[i].life -= 0.016;
        (pulses[i].line.material as THREE.LineBasicMaterial).opacity =
          Math.max(0, pulses[i].life * 0.7);
        if (pulses[i].life <= 0) {
          galaxy.remove(pulses[i].line);
          pulses.splice(i, 1);
        }
      }

      // Hover detection
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(satMeshes);
      if (hits.length) {
        const hitData = satData.find(s => s.mesh === hits[0].object);
        if (hitData) {
          handleHover(hitData.name);
          if (tip) {
            tip.style.display = 'block';
            tip.innerHTML =
              `<strong style="color:#fff">${hitData.name}</strong><br>` +
              `Events: <span style="color:#FFC220">${hitData.count}</span><br>` +
              `Top: ${hitData.topCat}<br>` +
              `<span style="color:${
                hitData.threat==='High'?'#f87171':
                hitData.threat==='Medium'?'#fbbf24':'#4ade80'
              }">${hitData.threat} Threat</span>`;
          }
        }
      } else {
        handleHover(null);
        if (tip) tip.style.display = 'none';
      }

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ────────────────────────────────────────────────────────
    const onResize = () => {
      if (!el) return;
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(pulseTimer);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousedown', onDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [entities, handleHover]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
      {/* Reset Button */}
      <button
        onClick={() => (mountRef.current as any)?.__resetView?.()}
        className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-600
                   text-[10px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors uppercase tracking-wider"
        style={{ backdropFilter: 'blur(4px)' }}
      >
        Reset View
      </button>

      {/* Hover tooltip */}
      <div
        ref={tipRef}
        style={{
          display: 'none',
          position: 'absolute',
          pointerEvents: 'none',
          background: 'var(--s-card)',
          border: '1px solid rgba(0,83,226,0.5)',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '12px',
          color: '#cbd5e1',
          lineHeight: '1.7',
          backdropFilter: 'blur(12px)',
          zIndex: 10,
          maxWidth: '180px',
        }}
      />
    </div>
  );
};