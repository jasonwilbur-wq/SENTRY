/**
 * MarketGlobe — Three.js 3D cyber-globe for the Market Analysis hero.
 *
 * Renders a rotating wireframe sphere with glowing tech-category nodes
 * and animated arc paths — no external textures needed.
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
  segments = 40,
): THREE.Line {
  const mid    = from.clone().add(to).multiplyScalar(0.5);
  const height = from.distanceTo(to) * 0.4;
  mid.normalize().multiplyScalar(mid.length() + height);

  const curve  = new THREE.QuadraticBezierCurve3(from, mid, to);
  const pts    = curve.getPoints(segments);
  const geo    = new THREE.BufferGeometry().setFromPoints(pts);
  const mat    = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.45,
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

    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);

    // ── Scene + Camera ─────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000);
    camera.position.set(0, 0, R * 3.1);

    // ── Ambient light ──────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x1a2a6c, 0.6));
    const pt = new THREE.PointLight(0x0053e2, 2.5, R * 10);
    pt.position.set(R, R * 1.5, R * 2);
    scene.add(pt);
    const pt2 = new THREE.PointLight(0xffc220, 1.2, R * 8);
    pt2.position.set(-R, -R, R);
    scene.add(pt2);

    // ── Globe sphere — multi-layer for depth ────────────────────────────────
    const sphereGeo = new THREE.SphereGeometry(R, 64, 64);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0x001e60,
      emissive: 0x003090,
      emissiveIntensity: 0.30,
      specular: 0x0053e2,
      shininess: 40,
      transparent: true,
      opacity: 0.90,
    });
    scene.add(new THREE.Mesh(sphereGeo, sphereMat));

    // ── Wireframe lat/lon grid ──────────────────────────────────────────────
    const wireGeo = new THREE.SphereGeometry(R * 1.003, 28, 28);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x1a5ce2, wireframe: true, transparent: true, opacity: 0.12,
    });
    scene.add(new THREE.Mesh(wireGeo, wireMat));

    // ── Outer atmosphere glow (large, BackSide) ─────────────────────────────
    const atmosGeo = new THREE.SphereGeometry(R * 1.12, 32, 32);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x0053e2, transparent: true, opacity: 0.06, side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmosGeo, atmosMat));

    // ── Inner glow shell ────────────────────────────────────────────────────
    const glowGeo = new THREE.SphereGeometry(R * 1.06, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x0a8aff, transparent: true, opacity: 0.035, side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(glowGeo, glowMat));

    // ── Group that rotates ──────────────────────────────────────────────────
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Node dots
    const nodeVecs = NODES.map(n => latLonToVec3(n.lat, n.lon, R));
    nodeVecs.forEach((v, i) => {
      const dotGeo = new THREE.SphereGeometry(R * 0.028, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(NODES[i].color) });
      const dot    = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(v);
      globeGroup.add(dot);

      // Pulse ring
      const ringGeo = new THREE.RingGeometry(R * 0.035, R * 0.05, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(NODES[i].color),
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(v);
      ring.lookAt(0, 0, 0);
      globeGroup.add(ring);
    });

    // Arc connections (select pairs)
    const ARC_PAIRS = [[0,1],[1,2],[2,5],[3,4],[4,6],[5,7],[0,8],[6,9],[1,7],[0,3]];
    ARC_PAIRS.forEach(([a, b]) => {
      const arc = makeArc(nodeVecs[a], nodeVecs[b], NODES[a].color);
      globeGroup.add(arc);
    });

    // ── Star particles ──────────────────────────────────────────────────────
    const starGeo = new THREE.BufferGeometry();
    const starArr = new Float32Array(600 * 3);
    for (let i = 0; i < starArr.length; i++)
      starArr[i] = (Math.random() - 0.5) * R * 12;
    starGeo.setAttribute('position', new THREE.BufferAttribute(starArr, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x8888ff,
      size: R * 0.006,
      transparent: true,
      opacity: 0.55,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // ── Equatorial ring ─────────────────────────────────────────────────────
    const ringGeoEq = new THREE.TorusGeometry(R * 1.15, R * 0.008, 8, 80);
    const ringMatEq = new THREE.MeshBasicMaterial({
      color: 0xffc220, transparent: true, opacity: 0.25,
    });
    const equatorRing = new THREE.Mesh(ringGeoEq, ringMatEq);
    equatorRing.rotation.x = Math.PI / 2;
    scene.add(equatorRing);

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

    // ── Animation loop ──────────────────────────────────────────────────────
    let rafId: number;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (!isDragging) {
        velX += (0.0015 - velX) * 0.04;   // restore auto-spin
        velY += (0.0003 - velY) * 0.04;
      }
      globeGroup.rotation.y += velX;
      globeGroup.rotation.x += velY;
      globeGroup.rotation.x = Math.max(-0.6, Math.min(0.6, globeGroup.rotation.x));
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