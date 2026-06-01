import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { PROJECTS, summarizePortfolio, loadProjects, type Project } from '../data/projectsData';
import ESTLifecycleTimeline, { type ComplianceFields } from './ESTLifecycleTimeline';
import { estPhaseIndex } from '../utils/estPhase';

// Empty compliance scaffold — project data does not yet carry NDA/APM/ERPA/SSP
// records, so the EST timeline renders the gate roadmap with placeholders.
const EMPTY_COMPLIANCE: ComplianceFields = {
  nda_numbers: [], apm_entries: [], erpa_entries: [], ssp_entries: [], compliance_notes: '',
};

// ═══════════════════════════════════════════════════════════════════════
// 3D Project Dashboard — SENTRY Epic Edition
// Walmart Global Security · Emerging Technology
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// 3D Project Orb — Floating Sphere with Health Colors
// ═══════════════════════════════════════════════════════════════════════

interface ProjectOrbProps {
  project: Project;
  position: [number, number, number];
  onClick: () => void;
}

const ProjectOrb: React.FC<ProjectOrbProps> = ({ project, position, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      if (hovered) {
        meshRef.current.scale.lerp(new THREE.Vector3(1.4, 1.4, 1.4), 0.1);
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }
  });

  const getHealthColor = (health: string): string => {
    const h = health.toLowerCase().trim();
    if (h === 'green') return '#22c55e'; // Walmart green
    if (h === 'yellow') return '#ffc220'; // Walmart yellow
    if (h === 'red') return '#ef4444'; // Red
    return '#64748b'; // Gray fallback
  };

  const color = getHealthColor(project.health);

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <group position={position}>
        {/* Main Sphere - Larger and more visible */}
        <mesh
          ref={meshRef}
          onClick={onClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <sphereGeometry args={[1.2, 64, 64]} />
          <MeshDistortMaterial
            color={color}
            attach="material"
            distort={0.3}
            speed={1.5}
            roughness={0.1}
            metalness={0.9}
            emissive={color}
            emissiveIntensity={hovered ? 0.8 : 0.5}
            transparent={false}
          />
        </mesh>

        {/* Outer Glow Ring */}
        <mesh scale={hovered ? 1.6 : 1.4}>
          <sphereGeometry args={[1.2, 32, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={hovered ? 0.3 : 0.15}
            wireframe
          />
        </mesh>

        {/* Project Name Label (Always Visible) */}
        <Html
          position={[0, 2, 0]}
          center
          distanceFactor={8}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            className="px-3 py-1.5 rounded-lg backdrop-blur-xl font-semibold text-center whitespace-nowrap"
            style={{
              background: `linear-gradient(135deg, ${color}40, rgba(0, 11, 40, 0.95))`,
              border: `2px solid ${color}`,
              color: '#ffffff',
              boxShadow: `0 4px 20px ${color}60, 0 0 40px ${color}40`,
              fontSize: hovered ? '14px' : '12px',
              maxWidth: '200px',
              transition: 'all 0.3s ease',
            }}
          >
            {project.project_name.length > 30
              ? project.project_name.substring(0, 30) + '...'
              : project.project_name}
          </div>
        </Html>

        {/* Progress Badge (Below sphere) */}
        <Html
          position={[0, -2, 0]}
          center
          distanceFactor={10}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            className="px-2 py-1 rounded font-bold text-xs"
            style={{
              background: `${color}30`,
              border: `1px solid ${color}`,
              color: color,
              boxShadow: `0 2px 10px ${color}40`,
            }}
          >
            {project.progress_pct || 0}%
          </div>
        </Html>

        {/* Hover Info Card */}
        {hovered && (
          <Html
            position={[0, -3.5, 0]}
            center
            distanceFactor={6}
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            <div
              className="px-4 py-2 rounded-lg backdrop-blur-xl"
              style={{
                background: 'rgba(0, 11, 40, 0.95)',
                border: `1px solid ${color}`,
                color: '#ffffff',
                boxShadow: `0 4px 20px ${color}60`,
                minWidth: '200px',
                maxWidth: '250px',
              }}
            >
              <p className="text-xs text-slate-400 mb-1">Phase: {project.current_phase}</p>
              <p className="text-xs text-slate-400 mb-1">State: {project.lifecycle_state}</p>
              <p className="text-xs font-semibold" style={{ color }}>
                Click for details
              </p>
            </div>
          </Html>
        )}
      </group>
    </Float>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 3D Scene — Orbital Project Visualization
// ═══════════════════════════════════════════════════════════════════════

interface OrbitalSceneProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
}

const OrbitalScene: React.FC<OrbitalSceneProps> = ({ projects, onProjectClick }) => {
  // Organize projects by health status in concentric rings
  const projectPositions = useMemo(() => {
    const greenProjects = projects.filter(p => p.health.toLowerCase() === 'green');
    const yellowProjects = projects.filter(p => p.health.toLowerCase() === 'yellow');
    const redProjects = projects.filter(p => p.health.toLowerCase() === 'red');
    const unknownProjects = projects.filter(p => {
      const h = p.health.toLowerCase();
      return h !== 'green' && h !== 'yellow' && h !== 'red';
    });

    const positions: Map<string, [number, number, number]> = new Map();

    // Inner ring: Green projects (radius 8)
    greenProjects.forEach((project, index) => {
      const radius = 8;
      const angle = (index / greenProjects.length) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 0;
      positions.set(project.project_id, [x, y, z]);
    });

    // Middle ring: Yellow projects (radius 12)
    yellowProjects.forEach((project, index) => {
      const radius = 12;
      const angle = (index / yellowProjects.length) * Math.PI * 2 + Math.PI / 4; // Offset by 45 degrees
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 2;
      positions.set(project.project_id, [x, y, z]);
    });

    // Outer ring: Red projects (radius 16)
    redProjects.forEach((project, index) => {
      const radius = 16;
      const angle = (index / redProjects.length) * Math.PI * 2 + Math.PI / 6; // Offset by 30 degrees
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = -2;
      positions.set(project.project_id, [x, y, z]);
    });

    // Unknown projects: scattered above
    unknownProjects.forEach((project, index) => {
      const radius = 10;
      const angle = (index / unknownProjects.length) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 4;
      positions.set(project.project_id, [x, y, z]);
    });

    return projects.map(p => (positions.get(p.project_id) || [0, 0, 0]) as [number, number, number]);
  }, [projects]);

  return (
    <>
      {/* Enhanced Lighting for Better Visibility */}
      <ambientLight intensity={0.6} />
      <pointLight position={[15, 15, 15]} intensity={2} color="#0053E2" />
      <pointLight position={[-15, -15, -15]} intensity={1.5} color="#FFC220" />
      <pointLight position={[0, 20, 0]} intensity={1.5} color="#ffffff" />
      <pointLight position={[0, -10, 0]} intensity={0.8} color="#9BB7DF" />
      <spotLight position={[0, 15, 0]} intensity={1.5} angle={0.8} penumbra={1} color="#ffffff" />

      {/* Central Core Sphere - Larger and more prominent */}
      <Float speed={0.5} rotationIntensity={0.2} floatIntensity={0.3}>
        <group>
          {/* Inner Core */}
          <Sphere args={[2.5, 64, 64]} position={[0, 0, 0]}>
            <MeshDistortMaterial
              color="#0053E2"
              attach="material"
              distort={0.2}
              speed={1}
              roughness={0.0}
              metalness={1}
              emissive="#0053E2"
              emissiveIntensity={0.6}
            />
          </Sphere>

          {/* Outer Glow */}
          <Sphere args={[3.5, 32, 32]} position={[0, 0, 0]}>
            <meshBasicMaterial
              color="#0053E2"
              transparent
              opacity={0.15}
              wireframe
            />
          </Sphere>

          {/* SENTRY Label */}
          <Html center distanceFactor={6}>
            <div
              className="font-black text-2xl tracking-widest"
              style={{
                color: '#FFC220',
                textShadow: '0 0 20px #0053E2, 0 0 40px #0053E2',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              SENTRY
            </div>
          </Html>
        </group>
      </Float>

      {/* Ring Guides (Visual helpers) */}
      {[8, 12, 16].map((radius, idx) => {
        const points = [];
        for (let i = 0; i <= 64; i++) {
          const angle = (i / 64) * Math.PI * 2;
          points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
        }
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const color = idx === 0 ? '#22c55e' : idx === 1 ? '#ffc220' : '#ef4444';
        return (
          <lineSegments key={`ring-${idx}`} geometry={lineGeometry}>
            <lineBasicMaterial attach="material" color={color} opacity={0.15} transparent />
          </lineSegments>
        );
      })}

      {/* Project Orbs */}
      {projects.map((project, index) => (
        <ProjectOrb
          key={project.project_id}
          project={project}
          position={projectPositions[index]}
          onClick={() => onProjectClick(project)}
        />
      ))}

      {/* Legend */}
      <Html
        position={[0, -8, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          className="flex gap-4 px-4 py-2 rounded-lg backdrop-blur-xl"
          style={{
            background: 'rgba(0, 11, 40, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
            <span className="text-xs text-white font-semibold">Green (Inner)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#ffc220' }} />
            <span className="text-xs text-white font-semibold">Yellow (Middle)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
            <span className="text-xs text-white font-semibold">Red (Outer)</span>
          </div>
        </div>
      </Html>

      {/* Instructions */}
      <Html
        position={[0, 10, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          className="px-3 py-1.5 rounded text-center"
          style={{
            background: 'rgba(0, 83, 226, 0.3)',
            border: '1px solid #0053E2',
            color: '#60a5fa',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          🖱️ Drag to Rotate • Scroll to Zoom • Click Sphere for Details
        </div>
      </Html>

      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        autoRotate
        autoRotateSpeed={0.3}
        maxDistance={40}
        minDistance={10}
      />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// Project Card 3D — Glass Morphism Card with Progress Ring
// ═══════════════════════════════════════════════════════════════════════

interface ProjectCard3DProps {
  project: Project;
  onClick: () => void;
}

const ProjectCard3D: React.FC<ProjectCard3DProps> = ({ project, onClick }) => {
  const getHealthColor = (health: string): string => {
    const h = health.toLowerCase().trim();
    if (h === 'green') return '#22c55e';
    if (h === 'yellow') return '#ffc220';
    if (h === 'red') return '#ef4444';
    return '#64748b';
  };

  const getHealthBg = (health: string): string => {
    const h = health.toLowerCase().trim();
    if (h === 'green') return 'rgba(34, 197, 94, 0.1)';
    if (h === 'yellow') return 'rgba(255, 194, 32, 0.1)';
    if (h === 'red') return 'rgba(239, 68, 68, 0.1)';
    return 'rgba(100, 116, 139, 0.1)';
  };

  const getStatusIcon = (health: string): string => {
    const h = health.toLowerCase().trim();
    if (h === 'green') return '✓';
    if (h === 'yellow') return '⚠';
    if (h === 'red') return '✕';
    return '○';
  };

  const color = getHealthColor(project.health);
  const bgColor = getHealthBg(project.health);
  const progress = project.progress_pct || 0;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className="relative cursor-pointer"
    >
      {/* Glass Card */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl border"
        style={{
          background: `linear-gradient(135deg, ${bgColor}, rgba(12, 18, 36, 0.88))`,
          borderColor: color,
          borderWidth: '2px',
          boxShadow: `0 8px 32px ${color}40, 0 0 40px ${color}20`,
        }}
      >
        {/* Animated Background Gradient */}
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{
            background: [
              `radial-gradient(circle at 0% 0%, ${color}, transparent)`,
              `radial-gradient(circle at 100% 100%, ${color}, transparent)`,
              `radial-gradient(circle at 0% 0%, ${color}, transparent)`,
            ],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{ backgroundColor: color, color: '#000' }}
                >
                  {getStatusIcon(project.health)}
                </div>
                <span
                  className="text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded"
                  style={{ backgroundColor: bgColor, color }}
                >
                  {project.health}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">
                {project.project_name}
              </h3>
              <p className="text-xs text-slate-400 mb-2">{project.project_id}</p>
            </div>

            {/* Progress Ring */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="transform -rotate-90 w-24 h-24">
                {/* Background Circle */}
                <circle
                  cx="48"
                  cy="48"
                  r="45"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="6"
                  fill="none"
                />
                {/* Progress Circle */}
                <motion.circle
                  cx="48"
                  cy="48"
                  r="45"
                  stroke={color}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  strokeLinecap="round"
                  style={{
                    filter: `drop-shadow(0 0 8px ${color})`,
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{progress}%</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <p className="text-sm text-slate-300 mb-4 line-clamp-3">{project.summary}</p>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Phase</p>
              <p className="text-sm font-semibold text-white">{project.current_phase}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Risk Score</p>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: i < project.risk_score ? color : 'rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-400">State</p>
              <p className="text-sm font-semibold text-white">{project.lifecycle_state}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Blockers</p>
              <p
                className="text-sm font-semibold"
                style={{ color: project.blockers_count > 0 ? '#ef4444' : '#22c55e' }}
              >
                {project.blockers_count || 0}
              </p>
            </div>
          </div>

          {/* Next Milestone */}
          {project.next_milestone && (
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <p className="text-xs text-slate-400 mb-1">Next Milestone</p>
              <p className="text-sm font-semibold text-white mb-1">{project.next_milestone}</p>
              {project.next_due_date && (
                <p className="text-xs text-slate-400">Due: {new Date(project.next_due_date).toLocaleDateString()}</p>
              )}
            </div>
          )}

          {/* Tags */}
          {project.tags && (
            <div className="flex flex-wrap gap-1 mt-3">
              {project.tags.split(';').slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    backgroundColor: 'rgba(0, 83, 226, 0.2)',
                    color: '#60a5fa',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Glow Effect */}
        <div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${color}20, transparent)`,
          }}
        />
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// Main Dashboard Component
// ═══════════════════════════════════════════════════════════════════════

const ProjectDashboard3D: React.FC = () => {
  // Live data from GET /api/projects, with the typed static PROJECTS array as a
  // graceful offline fallback (handled inside loadProjects()).
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [dataSource, setDataSource] = useState<'api' | 'fallback' | 'loading'>('loading');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'orbital'>('grid');
  const [filterHealth, setFilterHealth] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    loadProjects(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setProjects(result.projects);
      setDataSource(result.source);
      if (result.source === 'fallback') {
        console.warn('[ProjectPortfolio] Using static fallback data:', result.error);
      }
    });
    return () => controller.abort();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesHealth = filterHealth === 'all' || project.health.toLowerCase() === filterHealth;
      const matchesSearch = searchQuery === '' || 
        project.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.project_id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesHealth && matchesSearch;
    });
  }, [projects, filterHealth, searchQuery]);

  const stats = useMemo(() => summarizePortfolio(projects), [projects]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--s-bg)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50 backdrop-blur-xl border-b"
        style={{
          backgroundColor: 'var(--s-header)',
          borderColor: 'var(--s-border)',
        }}
      >
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                <span
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #0053E2, #FFC220)',
                    boxShadow: '0 0 30px rgba(0, 83, 226, 0.5)',
                  }}
                >
                  🚀
                </span>
                SENTRY Project Portfolio
              </h1>
              <p className="text-sm text-slate-400 flex items-center gap-2">
                Walmart Global Security · Emerging Technology
                {dataSource === 'api' && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-400" title="Live data from /api/projects">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
                  </span>
                )}
                {dataSource === 'fallback' && (
                  <span className="inline-flex items-center gap-1 text-xs text-yellow-400" title="Backend unreachable — showing built-in snapshot">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> Offline snapshot
                  </span>
                )}
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  viewMode === 'grid' ? 'text-white' : 'text-slate-400 hover:text-white'
                }`}
                style={{
                  backgroundColor: viewMode === 'grid' ? '#0053E2' : 'rgba(255,255,255,0.05)',
                  boxShadow: viewMode === 'grid' ? '0 0 20px rgba(0, 83, 226, 0.5)' : 'none',
                }}
              >
                📊 Grid View
              </button>
              <button
                onClick={() => setViewMode('orbital')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  viewMode === 'orbital' ? 'text-white' : 'text-slate-400 hover:text-white'
                }`}
                style={{
                  backgroundColor: viewMode === 'orbital' ? '#0053E2' : 'rgba(255,255,255,0.05)',
                  boxShadow: viewMode === 'orbital' ? '0 0 20px rgba(0, 83, 226, 0.5)' : 'none',
                }}
              >
                🌐 3D Orbital
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Total Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl backdrop-blur-xl border"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 83, 226, 0.1), rgba(12, 18, 36, 0.88))',
              borderColor: '#0053E2',
              boxShadow: '0 4px 24px rgba(0, 83, 226, 0.2)',
            }}
          >
            <p className="text-sm text-slate-400 mb-2">Total Projects</p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </motion.div>

          {/* Green Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl backdrop-blur-xl border cursor-pointer"
            onClick={() => setFilterHealth('green')}
            whileHover={{ scale: 1.05 }}
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(12, 18, 36, 0.88))',
              borderColor: filterHealth === 'green' ? '#22c55e' : 'rgba(34, 197, 94, 0.3)',
              boxShadow: filterHealth === 'green' ? '0 4px 24px rgba(34, 197, 94, 0.3)' : 'none',
            }}
          >
            <p className="text-sm text-slate-400 mb-2">🟢 Green</p>
            <p className="text-3xl font-bold text-green-400">{stats.green}</p>
          </motion.div>

          {/* Yellow Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl backdrop-blur-xl border cursor-pointer"
            onClick={() => setFilterHealth('yellow')}
            whileHover={{ scale: 1.05 }}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 194, 32, 0.1), rgba(12, 18, 36, 0.88))',
              borderColor: filterHealth === 'yellow' ? '#ffc220' : 'rgba(255, 194, 32, 0.3)',
              boxShadow: filterHealth === 'yellow' ? '0 4px 24px rgba(255, 194, 32, 0.3)' : 'none',
            }}
          >
            <p className="text-sm text-slate-400 mb-2">🟡 Yellow</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.yellow}</p>
          </motion.div>

          {/* Red Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl backdrop-blur-xl border cursor-pointer"
            onClick={() => setFilterHealth('red')}
            whileHover={{ scale: 1.05 }}
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(12, 18, 36, 0.88))',
              borderColor: filterHealth === 'red' ? '#ef4444' : 'rgba(239, 68, 68, 0.3)',
              boxShadow: filterHealth === 'red' ? '0 4px 24px rgba(239, 68, 68, 0.3)' : 'none',
            }}
          >
            <p className="text-sm text-slate-400 mb-2">🔴 Red</p>
            <p className="text-3xl font-bold text-red-400">{stats.red}</p>
          </motion.div>

          {/* Active Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 rounded-xl backdrop-blur-xl border"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 83, 226, 0.1), rgba(12, 18, 36, 0.88))',
              borderColor: 'rgba(0, 83, 226, 0.3)',
            }}
          >
            <p className="text-sm text-slate-400 mb-2">⚡ Active</p>
            <p className="text-3xl font-bold text-white">{stats.active}</p>
          </motion.div>

          {/* Blockers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-4 rounded-xl backdrop-blur-xl border"
            style={{
              background: 'linear-gradient(135deg, rgba(153, 82, 19, 0.12), rgba(12, 18, 36, 0.88))',
              borderColor: stats.blockers > 0 ? 'rgba(234, 17, 0, 0.45)' : 'rgba(255, 194, 32, 0.3)',
            }}
          >
            <p className="text-sm text-slate-400 mb-2">🚧 Blockers</p>
            <p className={`text-3xl font-bold ${stats.blockers > 0 ? 'text-red-400' : 'text-slate-300'}`}>{stats.blockers}</p>
          </motion.div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-4 mt-6">
          <input
            type="text"
            placeholder="🔍 Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg backdrop-blur-xl border text-white placeholder-slate-400 focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--s-input-bg)',
              borderColor: 'var(--s-border)',
            }}
          />
          {filterHealth !== 'all' && (
            <button
              onClick={() => setFilterHealth('all')}
              className="px-4 py-3 rounded-lg font-semibold text-white hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: '#0053E2',
                boxShadow: '0 0 20px rgba(0, 83, 226, 0.3)',
              }}
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 pb-12">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.project_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ProjectCard3D project={project} onClick={() => setSelectedProject(project)} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="orbital"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-[800px] rounded-2xl overflow-hidden backdrop-blur-xl border"
              style={{
                backgroundColor: 'var(--s-card)',
                borderColor: 'var(--s-border)',
              }}
            >
              <Canvas camera={{ position: [0, 10, 25], fov: 65 }}>
                <OrbitalScene projects={filteredProjects} onProjectClick={setSelectedProject} />
              </Canvas>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Project Detail Modal - portaled to <body> so position:fixed centers
          relative to the viewport (a 3D-transformed ancestor would otherwise
          become the containing block and push it off-screen). */}
      {createPortal(
        <AnimatePresence>
          {selectedProject && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6"
              style={{ backgroundColor: 'var(--s-modal-back)' }}
              onClick={() => setSelectedProject(null)}
            >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl backdrop-blur-xl border p-8"
              style={{
                backgroundColor: 'var(--s-modal-card)',
                borderColor: getHealthColor(selectedProject.health),
                boxShadow: `0 20px 60px ${getHealthColor(selectedProject.health)}40`,
              }}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white mb-2">{selectedProject.project_name}</h2>
                  <p className="text-slate-400">{selectedProject.project_id}</p>
                </div>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">Summary</h3>
                  <p className="text-white">{selectedProject.summary}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Phase</h3>
                    <p className="text-white font-semibold">{selectedProject.current_phase}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Lifecycle State</h3>
                    <p className="text-white font-semibold">{selectedProject.lifecycle_state}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Managing Unit</h3>
                    <p className="text-white font-semibold">{selectedProject.managing_unit}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Sensitivity</h3>
                    <p className="text-white font-semibold uppercase">{selectedProject.sensitivity}</p>
                  </div>
                </div>

                {selectedProject.next_milestone && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Next Milestone</h3>
                    <p className="text-white font-semibold mb-1">{selectedProject.next_milestone}</p>
                    {selectedProject.next_due_date && (
                      <p className="text-slate-400 text-sm">Due: {new Date(selectedProject.next_due_date).toLocaleDateString()}</p>
                    )}
                  </div>
                )}

                {selectedProject.tags && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.tags.split(';').map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded text-sm"
                          style={{
                            backgroundColor: 'rgba(0, 83, 226, 0.2)',
                            color: '#60a5fa',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* EST 8-gate phase roadmap - shows where this project sits */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-3">EST Phase Roadmap</h3>
                  <ESTLifecycleTimeline
                    estPhaseIndex={estPhaseIndex(selectedProject.current_phase)}
                    health={selectedProject.health}
                    compliance={EMPTY_COMPLIANCE}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">Last Updated</h3>
                  <p className="text-white">
                    {new Date(selectedProject.last_update_at).toLocaleString()} by {selectedProject.last_update_by}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};

// Helper function (defined outside component)
function getHealthColor(health: string): string {
  const h = health.toLowerCase().trim();
  if (h === 'green') return '#22c55e';
  if (h === 'yellow') return '#ffc220';
  if (h === 'red') return '#ef4444';
  return '#64748b';
}

export default ProjectDashboard3D;
