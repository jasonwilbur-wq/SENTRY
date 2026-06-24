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
 *
 * v2.0 - Enhanced with PBR materials, professional lighting, and visual effects
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

    // ── Renderer (Enhanced Quality) ──────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'highp',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    el.appendChild(renderer.domElement);

    // ── Scene + Camera ─────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0015); // Depth fog
    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 2000);
    camera.position.set(0, 22, 105);
    camera.lookAt(0, 0, 0);

    // ── Enhanced Lighting (4-Point Setup) ───────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x0a1a3a, 0.9));
    
    // Core light (Walmart blue - main illumination)
    const coreLight = new THREE.PointLight(WM_BLUE, 4.5, 250);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);
    
    // Spark light (accent)
    const sparkLight = new THREE.PointLight(WM_YELLOW, 1.2, 140);
    sparkLight.position.set(40, 30, 30);
    scene.add(sparkLight);
    
    // Rim light (edge definition)
    const rimLight = new THREE.PointLight(0x22c55e, 0.8, 120);
    rimLight.position.set(-30, -20, 40);
    scene.add(rimLight);
    
    // Fill light (subtle)
    const fillLight = new THREE.PointLight(0x60a5fa, 0.6, 100);
    fillLight.position.set(0, 50, -30);
    scene.add(fillLight);

    // ── Walmart core sphere (PBR Material) ─────────────────────────────────────
    const coreGeo = new THREE.SphereGeometry(8.5, 96, 96); // Higher resolution
    const coreMat = new THREE.MeshStandardMaterial({
      color: WM_BLUE, 
      emissive: 0x002060, 
      emissiveIntensity: 0.7,
      metalness: 0.5,
      roughness: 0.2,
      transparent: true, 
      opacity: 0.96,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Core wireframe shell (dual-layer)
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(8.8, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x2080ff, wireframe: true, transparent: true, opacity: 0.16 }),
    ));
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(9.0, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x1a5ce2, wireframe: true, transparent: true, opacity: 0.10 }),
    ));

    // Multi-layer atmosphere glow
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(13.5, 48, 48),
      new THREE.MeshBasicMaterial({ 
        color: WM_BLUE, 
        transparent: true, 
        opacity: 0.08, 
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      }),
    ));
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(11, 48, 48),
      new THREE.MeshBasicMaterial({ 
        color: 0x0099ff, 
        transparent: true, 
        opacity: 0.05, 
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      }),
    ));

    // Spark Yellow equatorial ring (dual-layer)
    const eqRing = new THREE.Mesh(
      new THREE.TorusGeometry(13.5, 0.32, 12, 120),
      new THREE.MeshStandardMaterial({ 
        color: WM_YELLOW, 
        emissive: WM_YELLOW,
        emissiveIntensity: 0.6,
        metalness: 0.7,
        roughness: 0.2,
        transparent: true, 
        opacity: 0.65,
      }),
    );
    eqRing.rotation.x = Math.PI / 2;
    scene.add(eqRing);
    
    // Ring glow layer
    const eqRingGlow = new THREE.Mesh(
      new THREE.TorusGeometry(13.5, 0.45, 8, 100),
      new THREE.MeshBasicMaterial({ 
        color: WM_YELLOW, 
        transparent: true, 
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
      }),
    );
    eqRingGlow.rotation.x = Math.PI / 2;
    scene.add(eqRingGlow);

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

      // Orbit ring (decorative, enhanced)
      const orbitGeo = new THREE.TorusGeometry(radius, 0.16, 10, 140);
      const orbitMat = new THREE.MeshBasicMaterial({ 
        color: 0x2060a0, 
        transparent: true, 
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
      });
      const orbitRing = new THREE.Mesh(orbitGeo, orbitMat);
      orbitRing.rotation.x = Math.PI / 2 + TILTS[i] * 0.5;
      scene.add(orbitRing);

      // Satellite body (PBR material)
      const satGeo  = new THREE.SphereGeometry(size, 48, 48); // Higher resolution
      const satMat  = new THREE.MeshStandardMaterial({
        color: colHex, 
        emissive: colHex, 
        emissiveIntensity: 0.5,
        metalness: 0.3,
        roughness: 0.4,
        transparent: true, 
        opacity: 0.94,
      });
      const satMesh = new THREE.Mesh(satGeo, satMat);
      const angle0  = (i / TOP) * Math.PI * 2;
      satMesh.position.set(
        Math.cos(angle0) * radius,
        Math.sin(TILTS[i]) * radius * 0.25,
        Math.sin(angle0) * radius,
      );
      scene.add(satMesh);

      // Satellite glow halo (enhanced)
      satMesh.add(new THREE.Mesh(
        new THREE.SphereGeometry(size * 1.8, 20, 20),
        new THREE.MeshBasicMaterial({ 
          color: colHex, 
          transparent: true, 
          opacity: 0.08, 
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
        }),
      ));

      satMeshes.push(satMesh);
      satData.push({
        mesh: satMesh, radius, speed: SPEEDS[i], angle: angle0,
        tilt: TILTS[i], name: comp.name, threat: comp.threat_level,
        count: comp.event_count, topCat: comp.top_category ?? 'N/A',
      });
    });

    // ── Starfield (Enhanced) ──────────────────────────────────────────────────
    const STAR_COUNT = 500; // More stars
    const starPos    = new Float32Array(STAR_COUNT * 3);
    const starSizes  = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      const idx = i * 3;
      starPos[idx]     = (Math.random() - 0.5) * 500;
      starPos[idx + 1] = (Math.random() - 0.5) * 500;
      starPos[idx + 2] = (Math.random() - 0.5) * 500;
      starSizes[i] = Math.random() * 1.2 + 0.4;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
    scene.add(new THREE.Points(starGeo,
      new THREE.PointsMaterial({ 
        size: 1.0, 
        color: 0xaaccff, 
        transparent: true, 
        opacity: 0.55,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
      })));

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
      const pts    = curve.getPoints(50); // Smoother arcs
      const geo    = new THREE.BufferGeometry().setFromPoints(pts);
      const col    = THREAT_COLOR[sat.threat] ?? 0x0053e2;
      const mat    = new THREE.LineBasicMaterial({ 
        color: col, 
        transparent: true, 
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      });
      const line   = new THREE.Line(geo, mat);
      galaxy.add(line);
      pulses.push({ line, life: 1.0 });
    }
    const pulseTimer = setInterval(spawnPulse, 1000); // Slightly faster

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
    // Re-parent core + atmosphere + rings + satellites + orbit rings into galaxy
    [coreMesh, eqRing, eqRingGlow, ...satMeshes].forEach(m => {
      scene.remove(m);
      galaxy.add(m);
    });
    // Also move the wireframe shells and atmosphere glows
    const toMove = scene.children.filter(
      c => c !== galaxy && c !== coreLight && c !== sparkLight && c !== rimLight && c !== fillLight
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

      // Core pulse (enhanced)
      coreMat.emissiveIntensity = 0.6 + Math.sin(t * 1.4) * 0.2;
      
      // Ring glow pulse
      if (eqRingGlow.material instanceof THREE.MeshBasicMaterial) {
        eqRingGlow.material.opacity = 0.2 + Math.sin(t * 1.8) * 0.08;
      }

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
        
        // Pulse satellite halos
        const halo = sat.mesh.children[0];
        if (halo && halo instanceof THREE.Mesh && halo.material instanceof THREE.MeshBasicMaterial) {
          halo.material.opacity = 0.06 + Math.sin(t * 2 + sat.angle) * 0.03;
        }
      });
      
      coreMesh.rotation.y += 0.004;
      eqRing.rotation.y   += 0.003;
      eqRingGlow.rotation.y += 0.003;

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
            tip.textContent = `${hitData.name} • Events: ${hitData.count} • Top: ${hitData.topCat} • ${hitData.threat} Threat`;
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