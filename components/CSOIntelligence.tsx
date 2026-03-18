import { useState } from 'react';
import { CSORadar3D } from './CSORadar3D';
import { CSO_PROFILES, THREAT_COUNTS, type Finding, type ExecutiveProfile } from '../data/csoProfiles';

// ── Risk colour helpers ───────────────────────────────────────────────────────
const RISK_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  RED:    { bg: 'rgba(234,17,0,0.18)',    text: '#ff6b6b', border: 'rgba(234,17,0,0.5)'    },
  ORANGE: { bg: 'rgba(249,115,22,0.18)', text: '#fb923c', border: 'rgba(249,115,22,0.5)'  },
  YELLOW: { bg: 'rgba(255,194,32,0.18)', text: '#FFC220', border: 'rgba(255,194,32,0.5)'  },
  GREEN:  { bg: 'rgba(42,135,3,0.18)',   text: '#4ade80', border: 'rgba(42,135,3,0.5)'    },
};
const THREAT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'rgba(234,17,0,0.18)',    text: '#ff6b6b', border: 'rgba(234,17,0,0.5)'    },
  HIGH:     { bg: 'rgba(249,115,22,0.18)', text: '#fb923c', border: 'rgba(249,115,22,0.5)'  },
  MEDIUM:   { bg: 'rgba(255,194,32,0.18)', text: '#FFC220', border: 'rgba(255,194,32,0.5)'  },
  LOW:      { bg: 'rgba(42,135,3,0.18)',   text: '#4ade80', border: 'rgba(42,135,3,0.5)'    },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function ProfileAvatar({ src, name }: { src: string; name: string }) {
  const [broken, setBroken] = useState(false);
  const initials = name.split(' ').map(n => n[0]).join('');
  if (broken) {
    return (
      <div className="w-20 h-20 rounded-full border-4 flex items-center justify-center text-2xl font-black shrink-0"
        style={{ borderColor: '#0053e2', background: 'linear-gradient(135deg,#0053e2,#7c3aed)' }}>
        {initials}
      </div>
    );
  }
  return (
    <img src={src} alt={name} onError={() => setBroken(true)}
      className="w-20 h-20 rounded-full border-4 object-cover object-top shrink-0"
      style={{ borderColor: '#0053e2' }} />
  );
}

function ThreatBadge({ level }: { level: string }) {
  const s = THREAT_STYLES[level] ?? THREAT_STYLES.LOW;
  return (
    <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider shrink-0"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {level}
    </span>
  );
}

function FindingCard({ finding, isOpen, onToggle }: { finding: Finding; isOpen: boolean; onToggle: () => void }) {
  const rs = RISK_STYLES[finding.riskColor] ?? RISK_STYLES.GREEN;
  return (
    <div onClick={onToggle}
      className="rounded-xl border transition-all duration-200 cursor-pointer"
      style={{ background: 'var(--s-modal-inner)', borderColor: isOpen ? '#0053e2' : 'var(--s-border-mid)' }}>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }}>
            {finding.riskColor} · {finding.impactScore}/25
          </span>
          <span className="px-2 py-0.5 rounded text-[10px]" style={{ background: 'rgba(0,83,226,0.18)', color: '#60a5fa' }}>
            {finding.type.replace(/_/g, ' ')}
          </span>
          <span className="text-[10px] text-slate-500">{finding.date}</span>
        </div>
        <p className="text-sm font-semibold text-blue-300 leading-snug">{finding.headline}</p>
      </div>
      {isOpen && (
        <div className="px-4 pb-4 pt-0 space-y-3" style={{ borderTop: '1px solid var(--s-border)' }}>
          <div className="pt-3">
            <p className="text-[10px] font-bold text-wmt-yellow uppercase tracking-widest mb-1">Summary</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--s-text-muted)' }}>{finding.summary}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Why It Matters</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--s-text-muted)' }}>{finding.whyItMatters}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Sources</p>
            <div className="space-y-1">
              {finding.sources.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-200 transition-colors">
                  <span className="shrink-0">↗</span>
                  <span className="truncate">{s.publisher}</span>
                  <span className="shrink-0 text-slate-600">· {s.date}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="px-4 pb-2 text-[10px]" style={{ color: 'var(--s-text-dim)' }}>{isOpen ? '▲ collapse' : '▼ expand'}</div>
    </div>
  );
}

function ExecutiveCard({ exec, isSelected, onToggle }: {
  exec: ExecutiveProfile; isSelected: boolean; onToggle: () => void;
}) {
  const ts = THREAT_STYLES[exec.threatLevel] ?? THREAT_STYLES.LOW;
  const orangeCount = exec.keyFindings.filter(f => f.riskColor === 'ORANGE' || f.riskColor === 'RED').length;
  return (
    <div onClick={onToggle} className="rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-[1.01] shadow-xl overflow-hidden"
      style={{
        background: 'var(--s-card)',
        borderColor: isSelected ? '#0053e2' : 'var(--s-border-mid)',
        boxShadow: isSelected ? '0 0 30px rgba(0,83,226,0.2)' : undefined,
      }}>
      {/* Header */}
      <div className="p-5 flex items-start gap-4">
        <ProfileAvatar src={exec.profileImage} name={exec.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h2 className="text-lg font-black leading-tight" style={{ color: 'var(--s-text)' }}>{exec.name}</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--s-text-muted)' }}>{exec.title}</p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: '#60a5fa' }}>{exec.company}</p>
            </div>
            <ThreatBadge level={exec.threatLevel} />
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mt-2">{exec.bio}</p>
        </div>
      </div>
      {/* Stats bar */}
      <div className="grid grid-cols-3 border-t px-5 py-3 gap-2" style={{ borderColor: 'var(--s-border)', background: 'var(--s-modal-inner)' }}>
        <div className="text-center">
          <div className="text-xl font-black" style={{ color: '#60a5fa' }}>{exec.keyFindings.length}</div>
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--s-text-dim)' }}>Findings</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-black" style={{ color: orangeCount > 0 ? '#fb923c' : '#64748b' }}>{orangeCount}</div>
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--s-text-dim)' }}>High-Impact</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-black" style={{ color: ts.text }}>{exec.recentActivity.length}</div>
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--s-text-dim)' }}>Activities</div>
        </div>
      </div>
      <div className="text-center py-2 text-[10px]" style={{ borderTop: '1px solid var(--s-border)', color: 'var(--s-text-dim)' }}>
        {isSelected ? '▲ collapse' : '▼ expand full intelligence'}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CSOIntelligence() {
  const [selectedExec, setSelectedExec]       = useState<string | null>(null);
  const [openFinding, setOpenFinding]         = useState<string | null>(null);

  const active = CSO_PROFILES.find(e => e.id === selectedExec);

  const toggleExec = (id: string) => {
    setSelectedExec(prev => prev === id ? null : id);
    setOpenFinding(null);
  };

  return (
    <div className="min-h-screen p-4 sm:p-8"
      style={{ background: 'var(--s-bg)', color: 'var(--s-text)' }}>

      {/* ── 3D Hero ──────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="cso-hero-bg relative rounded-2xl overflow-hidden"
          style={{ height: 400, border: '1px solid var(--s-border)' }}>
          {/* Grid overlay */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ opacity: 0.05,
              backgroundImage: 'linear-gradient(rgba(0,83,226,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(0,83,226,.6) 1px,transparent 1px)',
              backgroundSize: '48px 48px' }} />
          <div className="absolute inset-0 z-0"><CSORadar3D /></div>
          {/* Threat ring legend */}
          <div className="absolute bottom-5 left-6 z-10 flex flex-col gap-1.5">
            {(['CRITICAL','HIGH','MEDIUM','LOW'] as const).map(l => (
              <div key={l} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: THREAT_STYLES[l].text, boxShadow: `0 0 6px ${THREAT_STYLES[l].text}` }} />
                <span className="text-[10px] font-bold tracking-wider" style={{ color: THREAT_STYLES[l].text }}>{l}</span>
              </div>
            ))}
          </div>
          {/* Hero text */}
          <div className="relative z-10 h-full flex flex-col items-center justify-start pt-8 text-center px-6">
            <p className="text-[10px] font-bold text-wmt-yellow tracking-[0.2em] uppercase mb-2">
              Enterprise Security &nbsp;•&nbsp; Executive Threat Intelligence
            </p>
            <h1 className="text-4xl lg:text-5xl font-black mb-2 leading-tight"
              style={{ background: 'linear-gradient(135deg,#60a5fa 0%,#0053E2 50%,#FFC220 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              CSO Intelligence
            </h1>
            <p className="text-sm max-w-xl mb-5" style={{ color: 'var(--s-text-muted)' }}>
              Competitor executive tracking — security leadership threat posture, org changes &amp; strategic risk.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border"
                style={{ background: 'rgba(234,17,0,0.15)', color: '#ff6b6b', borderColor: 'rgba(234,17,0,0.4)' }}>
                🔴 ORANGE Findings: {THREAT_COUNTS.critical}
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border"
                style={{ background: 'rgba(255,194,32,0.15)', color: '#FFC220', borderColor: 'rgba(255,194,32,0.4)' }}>
                🟡 YELLOW Findings: {THREAT_COUNTS.high}
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border"
                style={{ background: 'rgba(0,83,226,0.15)', color: '#60a5fa', borderColor: 'rgba(0,83,226,0.4)' }}>
                {CSO_PROFILES.length} Executives · Updated {THREAT_COUNTS.updated}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Executive Card Grid ───────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {CSO_PROFILES.map(exec => (
          <ExecutiveCard key={exec.id} exec={exec}
            isSelected={selectedExec === exec.id}
            onToggle={() => toggleExec(exec.id)} />
        ))}
      </div>

      {/* ── Expanded Detail Panel ─────────────────────────────────────────── */}
      {active && (
        <div className="max-w-7xl mx-auto rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'var(--s-card)', border: '2px solid #0053e2' }}>
          <div className="p-6 sm:p-8">
            <h2 className="text-2xl font-black mb-6 pb-4" style={{ borderBottom: '1px solid var(--s-border)', color: 'var(--s-text)' }}>
              🔍 Intelligence Detail — {active.name}
            </h2>

            {/* Strategic Threats */}
            <section className="mb-8">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">⚠️ Strategic Threats to Walmart</h3>
              <div className="space-y-2">
                {active.strategicThreats.map((t, i) => (
                  <div key={i} className="p-3 rounded-lg text-sm"
                    style={{ background: 'rgba(234,17,0,0.06)', borderLeft: '3px solid rgba(234,17,0,0.4)', color: 'var(--s-text-muted)' }}>{t}</div>
                ))}
              </div>
            </section>

            {/* Key Findings */}
            <section className="mb-8">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">📊 Key Intelligence Findings</h3>
              <div className="space-y-3">
                {active.keyFindings.map(f => (
                  <FindingCard key={f.id} finding={f}
                    isOpen={openFinding === f.id}
                    onToggle={() => setOpenFinding(prev => prev === f.id ? null : f.id)} />
                ))}
              </div>
            </section>

            {/* Activity Timeline */}
            <section className="mb-8">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">📅 Recent Activity Timeline</h3>
              <div className="space-y-3">
                {active.recentActivity.map((a, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="shrink-0 w-24 text-right">
                      <span className="text-xs text-slate-500">{a.date}</span>
                    </div>
                    <div className="shrink-0 w-px bg-blue-600 rounded-full" />
                    <div className="flex-1 rounded-lg p-3" style={{ background: 'var(--s-modal-inner)', border: '1px solid var(--s-border)' }}>
                      <p className="text-sm font-bold mb-1" style={{ color: 'var(--s-text)' }}>{a.title}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(0,83,226,0.2)', color: '#60a5fa' }}>{a.type}</span>
                      <p className="text-xs mt-1.5" style={{ color: 'var(--s-text-muted)' }}>{a.impact}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recommendations */}
            <section>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">🎯 Recommended Actions for Jerrad</h3>
              <div className="space-y-2">
                {active.recommendations.map((r, i) => (
                  <div key={i} className="p-3 rounded-lg text-sm"
                    style={{ background: 'linear-gradient(90deg,rgba(0,83,226,0.08),rgba(124,58,237,0.06))', borderLeft: '3px solid #FFC220', color: 'var(--s-text-muted)' }}>{r}</div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
