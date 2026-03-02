/**
 * MarketGlobe — Three.js 3D cyber-globe for the Market Analysis hero.
 *
 * Renders a rotating wireframe sphere with glowing tech-category nodes
 * and animated arc paths — high-quality graphics, no external textures.
 * 
 * v2.0 - Enhanced with sharper materials, better lighting, and cleaner visuals.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface NodeDef {
  lat: number;
  lon: number;
  label: string;
  color: string;
}

const NODES: NodeDef[] = [
  { lat: 40,  lon: -95,  label: 'Identity',     color: '#0053e2' },
  { lat: 35,  lon: -120, label: 'Bot Defense',   color: '#FFC220' },
  { lat: 51,  lon: 0,    label: 'EPCIS/DPP',     color: '#22c55e' },
  { lat: -34, lon: 151,  label: 'OT/Robotics',   color: '#f97316' },
  { lat: 22,  lon: 114,  label: 'RFID',          color: '#a78bfa' },
  { lat: 55,  lon: 37,   label: 'CV/AI',         color: '#f43f5e' },
  { lat: -23, lon: -43,  label: 'Returns Fraud', color: '#06b6d4' },
  { lat: 1,   lon: 104,  label: 'Shrink Analytics', color: '#FFC220' },
  { lat: 48,  lon: 2,    label: 'Drone Det.',    color: '#0053e2' },
  { lat: -33, lon: 18,   label: 'ML Governance', color: '#22c55e' },
];

function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta),
  );
}

function makeArc(
  from: THREE.Vector3,
  to: THREE.Vector3,
  color: string,
  segments = 60, // Increased for smoother curves
): THREE.Line {
  const mid    = from.clone().add(to).multiplyScalar(0.5);
  const height = from.distanceTo(to) * 0.42;
  mid.normalize().multiplyScalar(mid.length() + height);

  const curve  = new THREE.QuadraticBezierCurve3(from, mid, to);
  const pts    = curve.getPoints(segments);
  const geo    = new THREE.BufferGeometry().setFromPoints(pts);
  const mat    = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.55,
    linewidth: 1.5, // Note: Only works in certain renderers
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Line(geo, mat);
}

export function MarketGlobe({ className = '' }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth  || 320;
    const H = el.clientHeight || 380;
    const R = Math.min(W, H) * 0.36;

    // ── Renderer (Enhanced Quality) ────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'highp',
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    el.appendChild(renderer.domElement);

    // ── Scene + Camera ─────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0008); // Subtle depth fog
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000);
    camera.position.set(0, 0, R * 3.1);

    // ── Enhanced Lighting Setup ────────────────────────────────────────────
    // Ambient - softer base light
    scene.add(new THREE.AmbientLight(0x0a1e4a, 0.4));
    
    // Main key light (blue - Walmart brand)
    const keyLight = new THREE.PointLight(0x0053e2, 3.5, R * 12);
    keyLight.position.set(R * 1.5, R * 2, R * 2.5);
    scene.add(keyLight);
    
    // Fill light (gold - accent)
    const fillLight = new THREE.PointLight(0xffc220, 1.8, R * 10);
    fillLight.position.set(-R * 1.2, -R * 0.8, R * 1.5);
    scene.add(fillLight);
    
    // Rim light (cyan - edge definition)
    const rimLight = new THREE.PointLight(0x22c55e, 1.2, R * 8);
    rimLight.position.set(0, -R * 2, -R);
    scene.add(rimLight);

    // ── Globe sphere (High-Quality PBR Material) ───────────────────────────
    const sphereGeo = new THREE.SphereGeometry(R, 96, 96); // Higher resolution
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x002060,
      emissive: 0x0040a0,
      emissiveIntensity: 0.35,
      metalness: 0.6,
      roughness: 0.3,
      transparent: true,
      opacity: 0.92,
    });
    scene.add(new THREE.Mesh(sphereGeo, sphereMat));

    // ── Wireframe lat/lon grid (Sharper, Multi-Layer) ──────────────────────
    // Primary grid (bright, thin)
    const wireGeo1 = new THREE.SphereGeometry(R * 1.004, 40, 40);
    const wireMat1 = new THREE.MeshBasicMaterial({
      color: 0x2080ff, 
      wireframe: true, 
      transparent: true, 
      opacity: 0.18,
    });
    scene.add(new THREE.Mesh(wireGeo1, wireMat1));
    
    // Secondary grid (subtle depth)
    const wireGeo2 = new THREE.SphereGeometry(R * 1.007, 32, 32);
    const wireMat2 = new THREE.MeshBasicMaterial({
      color: 0x0053e2, 
      wireframe: true, 
      transparent: true, 
      opacity: 0.08,
    });
    scene.add(new THREE.Mesh(wireGeo2, wireMat2));

    // ── Atmosphere Glow Layers (Cleaner, More Realistic) ───────────────────
    // Outer atmosphere (blue glow)
    const atmosGeo = new THREE.SphereGeometry(R * 1.14, 48, 48);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x0066ff, 
      transparent: true, 
      opacity: 0.055, 
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Mid-layer glow (cyan accent)
    const glowGeo = new THREE.SphereGeometry(R * 1.08, 48, 48);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x0099ff, 
      transparent: true, 
      opacity: 0.045, 
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.Mesh(glowGeo, glowMat));
    
    // Inner shimmer
    const shimmerGeo = new THREE.SphereGeometry(R * 1.02, 48, 48);
    const shimmerMat = new THREE.MeshBasicMaterial({
      color: 0x00aaff, 
      transparent: true, 
      opacity: 0.025, 
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.Mesh(shimmerGeo, shimmerMat));

    // ── Group that rotates ──────────────────────────────────────────────────
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // ── Node Dots (Sharper, Higher Quality) ────────────────────────────────
    const nodeVecs = NODES.map(n => latLonToVec3(n.lat, n.lon, R));
    const pulseRings: THREE.Mesh[] = []; // Track rings for animation
    const nodeHalos: THREE.Mesh[] = []; // Track halos for animation
    
    nodeVecs.forEach((v, i) => {
      const nodeColor = new THREE.Color(NODES[i].color);
      
      // Main dot (high-res sphere with glow)
      const dotGeo = new THREE.SphereGeometry(R * 0.032, 20, 20);
      const dotMat = new THREE.MeshStandardMaterial({ 
        color: nodeColor,
        emissive: nodeColor,
        emissiveIntensity: 0.8,
        metalness: 0.2,
        roughness: 0.3,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(v);
      globeGroup.add(dot);
      
      // Glow halo around node
      const haloGeo = new THREE.SphereGeometry(R * 0.045, 16, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: nodeColor,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(v);
      globeGroup.add(halo);
      nodeHalos.push(halo);

      // Pulse ring (cleaner)
      const ringGeo = new THREE.RingGeometry(R * 0.038, R * 0.055, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: nodeColor,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(v);
      ring.lookAt(0, 0, 0);
      globeGroup.add(ring);
      pulseRings.push(ring);
    });

    // Arc connections (select pairs)
    const ARC_PAIRS = [[0,1],[1,2],[2,5],[3,4],[4,6],[5,7],[0,8],[6,9],[1,7],[0,3]];
    ARC_PAIRS.forEach(([a, b]) => {
      const arc = makeArc(nodeVecs[a], nodeVecs[b], NODES[a].color);
      globeGroup.add(arc);
    });

    // ── Star particles (Sharper, More Varied) ───────────────────────────────
    const starGeo = new THREE.BufferGeometry();
    const starCount = 800;
    const starArr = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    
    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      starArr[idx]     = (Math.random() - 0.5) * R * 12;
      starArr[idx + 1] = (Math.random() - 0.5) * R * 12;
      starArr[idx + 2] = (Math.random() - 0.5) * R * 12;
      starSizes[i] = Math.random() * R * 0.01 + R * 0.003;
    }
    
    starGeo.setAttribute('position', new THREE.BufferAttribute(starArr, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
    
    const starMat = new THREE.PointsMaterial({
      color: 0xaaccff,
      size: R * 0.008,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // ── Equatorial ring (Sharper, Dual-Layer) ──────────────────────────────
    // Main ring
    const ringGeoEq = new THREE.TorusGeometry(R * 1.16, R * 0.01, 12, 100);
    const ringMatEq = new THREE.MeshStandardMaterial({
      color: 0xffc220,
      emissive: 0xffc220,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.35,
    });
    const equatorRing = new THREE.Mesh(ringGeoEq, ringMatEq);
    equatorRing.rotation.x = Math.PI / 2;
    scene.add(equatorRing);
    
    // Glow ring (additive)
    const ringGlowGeo = new THREE.TorusGeometry(R * 1.16, R * 0.018, 8, 80);
    const ringGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffc220,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    });
    const equatorGlow = new THREE.Mesh(ringGlowGeo, ringGlowMat);
    equatorGlow.rotation.x = Math.PI / 2;
    scene.add(equatorGlow);

    // ── Mouse/touch drag ────────────────────────────────────────────────────
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let velX = 0.0015;
    let velY = 0.0003;

    const getXY = (e: MouseEvent | TouchEvent) =>
      'touches' in e
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };

    const onDown = (e: MouseEvent | TouchEvent) => { isDragging = true; prevMouse = getXY(e); };
    const onUp   = () => { isDragging = false; };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const { x, y } = getXY(e);
      velX = (x - prevMouse.x) * 0.003;
      velY = (y - prevMouse.y) * 0.002;
      prevMouse = { x, y };
    };
    renderer.domElement.addEventListener('mousedown', onDown as any);
    renderer.domElement.addEventListener('touchstart', onDown as any, { passive: true });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('touchmove',  onMove as any, { passive: true });

    // ── Animation loop (Enhanced with Subtle Effects) ──────────────────────
    let rafId: number;
    let time = 0;
    
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      time += 0.01;
      
      // Auto-rotation with drag override
      if (!isDragging) {
        velX += (0.0015 - velX) * 0.04;   // restore auto-spin
        velY += (0.0003 - velY) * 0.04;
      }
      globeGroup.rotation.y += velX;
      globeGroup.rotation.x += velY;
      globeGroup.rotation.x = Math.max(-0.6, Math.min(0.6, globeGroup.rotation.x));
      
      // Pulse node rings (staggered)
      pulseRings.forEach((ring, i) => {
        const phase = time + i * 0.6;
        const pulse = 0.5 + Math.sin(phase * 1.2) * 0.25;
        ring.scale.set(1 + pulse * 0.15, 1 + pulse * 0.15, 1);
        if (ring.material instanceof THREE.MeshBasicMaterial) {
          ring.material.opacity = 0.3 + pulse * 0.2;
        }
      });
      
      // Breathe node halos
      nodeHalos.forEach((halo, i) => {
        const phase = time * 0.8 + i * 0.4;
        const breathe = 0.5 + Math.sin(phase) * 0.25;
        if (halo.material instanceof THREE.MeshBasicMaterial) {
          halo.material.opacity = 0.2 + breathe * 0.15;
        }
      });
      
      // Rotate equatorial rings slowly
      equatorRing.rotation.z = time * 0.05;
      equatorGlow.rotation.z = time * 0.05;
      
      // Gentle atmosphere breathing
      const atmosPulse = 1.0 + Math.sin(time * 0.4) * 0.02;
      if (atmosMat instanceof THREE.MeshBasicMaterial) {
        atmosMat.opacity = 0.055 * atmosPulse;
      }
      if (glowMat instanceof THREE.MeshBasicMaterial) {
        glowMat.opacity = 0.045 * atmosPulse;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ─────────────────────────────────────────────────────────────
    const onResize = () => {
      if (!el) return;
      const nw = el.clientWidth;
      const nh = el.clientHeight;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('touchmove',  onMove as any);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={`w-full h-full ${className}`} style={{ cursor: 'grab' }} />;
}