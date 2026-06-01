import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════
// EST Lifecycle Timeline — SENTRY Visual Edition
// 8 standardised phase gates · Walmart Global Security EST Process
// ═══════════════════════════════════════════════════════════════════════

export interface NdaEntry {
  nda_number: string;
  vendor: string;
  status: string;
  note: string;
}

export interface ComplianceEntry {
  vendor: string;
  number: string;
  status: string;
  note: string;
}

export interface ComplianceFields {
  nda_numbers:  NdaEntry[];
  apm_entries:  ComplianceEntry[];
  erpa_entries: ComplianceEntry[];
  ssp_entries:  ComplianceEntry[];
  compliance_notes: string;
}

const EST_PHASES = [
  {
    index: 1, short: 'VAR', icon: '📋',
    name: 'Vendor Assessment Report',
    objective: 'Rapid triage — validate the problem statement and establish an initial risk and capability profile before any resources are committed.',
    artifacts: ['VAR Score (0.0–5.0)', 'Weighted scorecard', 'Problem statement', 'Initial risk flag'],
    sla: '10 bd',
    exits: ['Advance', 'Conditional', 'Defer', 'Reject'],
  },
  {
    index: 2, short: 'Engage', icon: '🤝',
    name: 'Vendor Engagement',
    objective: 'Validate technical feasibility and identify the full architectural footprint required for integration with Walmart systems.',
    artifacts: ['API documentation review', 'Architecture diagram', 'Integration complexity assessment', 'Data flow mapping'],
    sla: '5 bd',
    exits: ['Go', 'Go with Conditions', 'No-Go'],
  },
  {
    index: 3, short: 'NDA', icon: '⚖️',
    name: 'NDA & Legal Gating',
    objective: 'Establish legal protections before any sensitive data or IP is shared. Define explicit data-sharing scope and system-of-record obligations.',
    artifacts: ['Executed NDA', 'Data Sharing Scope document', 'System of Record log', 'Legal review sign-off'],
    sla: undefined,
    exits: ['Go', 'Go with Conditions', 'No-Go'],
  },
  {
    index: 4, short: 'ROM', icon: '🏗️',
    name: 'ROM & Technical Assessment',
    objective: 'Estimate total cost of ownership and conduct a deep-dive architectural review aligned to NIST CSF 2.0 and ISO/IEC 27001.',
    artifacts: ['Rough Order of Magnitude (ROM)', 'NIST CSF 2.0 mapping', 'ISO/IEC 27001 control mapping', 'Architecture review board sign-off'],
    sla: undefined,
    exits: ['Go', 'Go with Conditions', 'No-Go'],
  },
  {
    index: 5, short: 'Lab Test', icon: '🔬',
    name: 'Lab Testing (PoT / PoC)',
    objective: 'Validate vendor claims and assess interoperability with zero production impact using fully isolated lab environments and synthetic data.',
    artifacts: ['Isolated lab provisioned', 'Test plan (synthetic data only)', 'Formal Lab Testing Report', 'Security scan results'],
    sla: '15 bd',
    exits: ['Go', 'Go with Conditions', 'No-Go'],
  },
  {
    index: 6, short: 'Compliance', icon: '🛡️',
    name: 'APM / ERPA / SSP',
    objective: 'Formalize enterprise risk acceptance, address data privacy obligations, and document all security controls before any production access.',
    artifacts: ['APM Registration', 'ERPA review (OneTrust)', 'System Security Plan (SSP)', 'DCaaS completion cert'],
    sla: undefined,
    exits: ['Go', 'Go with Conditions', 'No-Go'],
  },
  {
    index: 7, short: 'Pilot', icon: '🚀',
    name: 'Pilot — Limited Auth to Operate',
    objective: 'Execute a live, time-boxed deployment at limited scope to measure real-world performance against defined KPIs with a clear rollback plan.',
    artifacts: ['Limited Authorization to Operate (LAO)', 'KPI tracking dashboard', 'Rollback plan', 'Stakeholder go/no-go review'],
    sla: '90 bd max',
    exits: ['Go', 'Go with Conditions', 'No-Go'],
  },
  {
    index: 8, short: 'BAU', icon: '✅',
    name: 'Pilot → BAU / Full Program',
    objective: 'Formalize operational ownership, complete workforce training, and establish continuous health monitoring before full business-as-usual handoff.',
    artifacts: ['Runbooks & SOPs', 'Training completion records', 'SIEM/SOAR monitoring configured', 'Operational Acceptance Document (OAD)'],
    sla: undefined,
    exits: ['Complete', 'Complete with Conditions', 'Not Complete'],
  },
];

type PhaseState = 'complete' | 'current' | 'blocked' | 'upcoming';

function getPhaseState(phaseIndex: number, currentPhase: number, health: string): PhaseState {
  if (phaseIndex < currentPhase) return 'complete';
  if (phaseIndex === currentPhase) return health.toLowerCase() === 'red' ? 'blocked' : 'current';
  return 'upcoming';
}

const STATE_COLORS: Record<PhaseState, string> = {
  complete: '#0053e2',
  current:  '#ffc220',
  blocked:  '#ea1100',
  upcoming: 'rgba(255,255,255,0.12)',
};

const STATE_GLOW: Record<PhaseState, string> = {
  complete: '0 0 20px rgba(0,83,226,0.5)',
  current:  '0 0 24px rgba(255,194,32,0.6)',
  blocked:  '0 0 20px rgba(234,17,0,0.5)',
  upcoming: 'none',
};

const STATE_LABEL: Record<PhaseState, string> = {
  complete: '✓  Complete',
  current:  '▶  In Progress',
  blocked:  '✕  Blocked',
  upcoming: '◦  Upcoming',
};

const COMPLIANCE_COLORS: Record<string, string> = {
  complete:    '#22c55e',
  completed:   '#22c55e',
  executed:    '#22c55e',
  in_progress: '#ffc220',
  under_review:'#ffc220',
  pending:     '#ffc220',
  not_started: 'rgba(255,255,255,0.25)',
};

// ─── Sub-components ───────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
    marginBottom: 10,
  }}>
    {children}
  </div>
);

const ComplianceBadge: React.FC<{ label: string; value: string; status: string }> = ({ label, value, status }) => {
  const color = COMPLIANCE_COLORS[status] ?? '#9BB7DF';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: `${color}10`, border: `1px solid ${color}40`,
      borderRadius: 8, padding: '6px 12px',
    }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span style={{
        fontSize: 12, fontWeight: 700, fontFamily: 'monospace',
        color: value ? color : 'rgba(255,255,255,0.2)',
      }}>
        {value || 'TBD'}
      </span>
      {value && (
        <span style={{
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          padding: '1px 6px', borderRadius: 20,
          background: `${color}20`, color,
        }}>
          {status.replace('_', ' ')}
        </span>
      )}
    </div>
  );
};

const ArtifactChip: React.FC<{ label: string; isComplete: boolean }> = ({ label, isComplete }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 10px', borderRadius: 8,
    background: isComplete ? 'rgba(0,83,226,0.12)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${isComplete ? 'rgba(0,83,226,0.35)' : 'rgba(255,255,255,0.08)'}`,
  }}>
    <span style={{ fontSize: 10, color: isComplete ? '#0053e2' : 'rgba(255,255,255,0.2)' }}>
      {isComplete ? '●' : '○'}
    </span>
    <span style={{ fontSize: 11, color: isComplete ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)' }}>
      {label}
    </span>
  </div>
);

const ExitGateChip: React.FC<{ label: string }> = ({ label }) => {
  const isNeg  = label.includes('No-Go') || label.includes('Reject') || label.includes('Not Complete');
  const isCond = label.includes('Condition');
  const color  = isNeg ? '#ea1100' : isCond ? '#ffc220' : '#22c55e';
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
      background: `${color}15`, color, border: `1px solid ${color}35`,
    }}>
      {label}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────

interface ESTLifecycleTimelineProps {
  estPhaseIndex: number;
  health: string;
  compliance: ComplianceFields;
}

const ESTLifecycleTimeline: React.FC<ESTLifecycleTimelineProps> = ({
  estPhaseIndex, health, compliance,
}) => {
  const [activePhase, setActivePhase] = useState<number>(estPhaseIndex || 1);
  const activeDetail = EST_PHASES.find(p => p.index === activePhase)!;
  const activeState  = getPhaseState(activePhase, estPhaseIndex, health);
  const activeColor  = STATE_COLORS[activeState];

  const phaseCompliance: Record<number, { label: string; value: string; status: string }[]> = {
    3: compliance.nda_numbers.map(n => ({
      label: 'NDA',
      value: n.nda_number ? `${n.nda_number}${n.vendor ? ` · ${n.vendor}` : ''}` : '',
      status: n.status,
    })),
    6: [
      ...compliance.apm_entries.map(e => ({
        label: 'APM',
        value: e.number ? `${e.number}${e.vendor ? ` · ${e.vendor}` : ''}` : '',
        status: e.status,
      })),
      ...compliance.erpa_entries.map(e => ({
        label: 'ERPA',
        value: e.number ? `${e.number}${e.vendor ? ` · ${e.vendor}` : ''}` : '',
        status: e.status,
      })),
      ...compliance.ssp_entries.map(e => ({
        label: 'SSP',
        value: e.number ? `${e.number}${e.vendor ? ` · ${e.vendor}` : ''}` : '',
        status: e.status,
      })),
    ],
  };

  const hasCompliance = phaseCompliance[activePhase]?.some(c => c.value);

  return (
    <div>
      {/* ── Progress bar above stepper ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            EST Progress
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, color: activeColor }}>
            Phase {estPhaseIndex} of 8 — {EST_PHASES[estPhaseIndex - 1]?.name}
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((estPhaseIndex - 1) / 7) * 100}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              height: '100%', borderRadius: 99,
              background: `linear-gradient(90deg, #0053e2, ${STATE_COLORS[getPhaseState(estPhaseIndex, estPhaseIndex, health)]})`,
              boxShadow: `0 0 12px ${activeColor}80`,
            }}
          />
        </div>
      </div>

      {/* ── Phase stepper nodes ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, paddingBottom: 4 }}>
        {EST_PHASES.map((phase, i) => {
          const state  = getPhaseState(phase.index, estPhaseIndex, health);
          const col    = STATE_COLORS[state];
          const isActive = activePhase === phase.index;

          return (
            <React.Fragment key={phase.index}>
              {/* Node column */}
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 52, cursor: 'pointer' }}
                onClick={() => setActivePhase(phase.index)}
              >
                {/* Circle */}
                <div style={{ position: 'relative', marginBottom: 6 }}>
                  {/* Pulsing ring for current phase */}
                  {state === 'current' && (
                    <motion.div
                      animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      style={{
                        position: 'absolute', inset: -6, borderRadius: '50%',
                        border: `2px solid ${col}`, pointerEvents: 'none',
                      }}
                    />
                  )}
                  <motion.div
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      width: 40, height: 40, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: state === 'complete' ? 16 : 14,
                      fontWeight: 800,
                      background:
                        state === 'complete' ? `linear-gradient(135deg, #0053e2, #0044bb)` :
                        state === 'current'  ? `linear-gradient(135deg, #ffc22030, #ffc22008)` :
                        state === 'blocked'  ? `linear-gradient(135deg, #ea110030, #ea110008)` :
                        'rgba(255,255,255,0.04)',
                      border: `2px solid ${col}`,
                      boxShadow: isActive ? STATE_GLOW[state] : (state !== 'upcoming' ? `0 0 10px ${col}40` : 'none'),
                      outline: isActive ? `2px solid ${col}` : 'none',
                      outlineOffset: 3,
                      color: state === 'upcoming' ? 'rgba(255,255,255,0.3)' : '#fff',
                      transition: 'box-shadow 0.2s, outline 0.2s',
                      position: 'relative', zIndex: 1,
                    }}
                  >
                    {state === 'complete' ? '✓' : state === 'blocked' ? '✕' : phase.icon}
                  </motion.div>
                </div>

                {/* Label */}
                <span style={{
                  fontSize: 9, fontWeight: 700, textAlign: 'center',
                  maxWidth: 48, lineHeight: 1.2,
                  color: isActive ? col : state === 'upcoming' ? 'rgba(255,255,255,0.2)' : `${col}bb`,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  transition: 'color 0.2s',
                }}>
                  {phase.short}
                </span>
              </div>

              {/* Connector */}
              {i < EST_PHASES.length - 1 && (
                <div style={{
                  flex: 1, height: 2, marginTop: 19, minWidth: 4, position: 'relative',
                  background: 'rgba(255,255,255,0.07)', borderRadius: 99,
                  overflow: 'hidden',
                }}>
                  {getPhaseState(phase.index, estPhaseIndex, health) === 'complete' && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                      style={{
                        height: '100%', background: '#0053e2',
                        boxShadow: '0 0 8px rgba(0,83,226,0.6)',
                      }}
                    />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Detail card ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activePhase}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{ marginTop: 20 }}
        >
          {/* Header strip */}
          <div style={{
            background: `linear-gradient(135deg, ${activeColor}1a 0%, rgba(0,0,0,0) 60%)`,
            border: `1px solid ${activeColor}30`,
            borderBottom: 'none',
            borderRadius: '14px 14px 0 0',
            padding: '16px 20px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Big phase icon */}
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26,
                background: `linear-gradient(135deg, ${activeColor}25, ${activeColor}08)`,
                border: `1px solid ${activeColor}40`,
                boxShadow: STATE_GLOW[activeState],
              }}>
                {activeDetail.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>
                    PHASE {activeDetail.index} / 8
                  </span>
                  {/* Status pill */}
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 99,
                    background: `${activeColor}20`, color: activeColor,
                    border: `1px solid ${activeColor}40`,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>
                    {STATE_LABEL[activeState]}
                  </span>
                  {/* SLA pill */}
                  {activeDetail.sla && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                      ⏱ SLA {activeDetail.sla}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                  {activeDetail.name}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{
            background: 'rgba(4,8,20,0.55)',
            border: `1px solid ${activeColor}30`,
            borderTop: `1px solid rgba(255,255,255,0.05)`,
            borderRadius: '0 0 14px 14px',
            padding: '16px 20px 18px',
            backdropFilter: 'blur(12px)',
          }}>
            {/* Objective */}
            <p style={{
              fontSize: 13, color: 'rgba(255,255,255,0.72)',
              lineHeight: 1.7, marginBottom: 18,
              borderLeft: `3px solid ${activeColor}50`,
              paddingLeft: 12,
            }}>
              {activeDetail.objective}
            </p>

            {/* Artifacts + Compliance IDs in two columns when both exist */}
            <div style={{ display: 'grid', gridTemplateColumns: hasCompliance ? '1fr 1fr' : '1fr', gap: 20, marginBottom: 16 }}>
              {/* Artifacts */}
              <div>
                <SectionLabel>Required Artifacts</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeDetail.artifacts.map(a => (
                    <ArtifactChip key={a} label={a} isComplete={activeState === 'complete'} />
                  ))}
                </div>
              </div>

              {/* Compliance IDs — only for phases 3 & 6 */}
              {hasCompliance && (
                <div>
                  <SectionLabel>Compliance IDs</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {phaseCompliance[activePhase].map((item, i) => (
                      <ComplianceBadge key={i} label={item.label} value={item.value} status={item.status} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Exit gates */}
            <div>
              <SectionLabel>Phase Gate Exit Decisions</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {activeDetail.exits.map(e => <ExitGateChip key={e} label={e} />)}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ESTLifecycleTimeline;
