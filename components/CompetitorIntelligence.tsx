import { useState, useEffect } from 'react';
import {
  fetchCompetitorStats,
  fetchCompetitorEntities,
  fetchCompetitorEvents,
  fetchCompetitorCSOCandidates,
  type CompetitorEvent,
} from '../services/api';
import { CompetitorThreat3D, type ThreatNode } from './CompetitorThreat3D';
import { CompetitorTrendStrip } from './CompetitorTrendStrip';

interface CompetitorProfile {
  name: string;
  totalEvents: number;
  cyberEvents: number;
  orcEvents: number;
  recallEvents: number;
  legalEvents: number;
  techEvents: number;
  threatLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  topCategory: string;
  monthlyJson: string;
}


// Map competitor names to their local logo files
const COMPETITOR_LOGOS: { [key: string]: string } = {
  'Amazon': '/logos/Amazon.png',
  'ALDI': '/logos/ALDI.jpg',
  'Costco': '/logos/Costco.png',
  'Coupang': '/logos/COUPANG.jpg',
  'Home Depot': '/logos/Home Depot.png',
  'Kroger': '/logos/Kroger.png',
  'Lowe\'s': '/logos/Lowes.png',
  'Target': '/logos/Target.png',
  'Wegmans': '/logos/Wegmans.jpg',
  'Whole Foods': '/logos/Whole Foods.png',
  'Ahold Delhaize / Carrefour': '/logos/carrefour.png',
  'Amazon (AWS)': '/logos/Amazon AWS.jpg',
  'AWS': '/logos/Amazon AWS.jpg',
};

// Color palette for letter avatars (fallback)
const AVATAR_COLORS = [
  { bg: 'from-blue-700 to-blue-900', border: 'border-blue-500', text: 'text-blue-100' },
  { bg: 'from-slate-600 to-slate-800', border: 'border-slate-500', text: 'text-slate-100' },
  { bg: 'from-red-700 to-red-900', border: 'border-red-500', text: 'text-red-100' },
  { bg: 'from-yellow-600 to-yellow-800', border: 'border-yellow-500', text: 'text-yellow-100' },
  { bg: 'from-green-700 to-green-900', border: 'border-green-500', text: 'text-green-100' },
  { bg: 'from-orange-700 to-orange-900', border: 'border-orange-500', text: 'text-orange-100' },
  { bg: 'from-blue-900 to-slate-900', border: 'border-blue-700', text: 'text-blue-100' },
  { bg: 'from-slate-700 to-zinc-900', border: 'border-slate-500', text: 'text-slate-100' },
];

function getAvatarColor(name: string) {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getThreatLevel(eventCount: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (eventCount >= 30) return 'HIGH';
  if (eventCount >= 10) return 'MEDIUM';
  return 'LOW';
}

function getInitials(name: string): string {
  const words = name.split(' ').filter(w => w.length > 0);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getLogoUrl(name: string): string | null {
  // Check if we have a local logo file for this competitor
  return COMPETITOR_LOGOS[name] || null;
}

function getPriorityChip(priority?: string | null) {
  const p = (priority || '').toLowerCase();
  if (p.includes('cso')) {
    return { bg: 'rgba(234,17,0,0.15)', color: '#ff6b6b', border: 'rgba(234,17,0,0.45)' };
  }
  if (p.includes('leadership')) {
    return { bg: 'rgba(255,194,32,0.15)', color: '#FFC220', border: 'rgba(255,194,32,0.45)' };
  }
  if (p.includes('analyst')) {
    return { bg: 'rgba(0,83,226,0.15)', color: '#9BB7DF', border: 'rgba(0,83,226,0.45)' };
  }
  return { bg: 'rgba(100,116,139,0.18)', color: '#94a3b8', border: 'rgba(100,116,139,0.45)' };
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function inferOwner(event: CompetitorEvent) {
  if (event.recommended_owner) return event.recommended_owner;
  const category = (event.category || '').toLowerCase();
  if (category.includes('cyber')) return 'CISO / Cyber Defense';
  if (category.includes('orc') || category.includes('theft')) return 'Asset Protection Leadership';
  if (category.includes('legal') || category.includes('regulatory')) return 'Legal & Compliance';
  if (category.includes('strategic') || category.includes('technology')) return 'Strategy & Emerging Tech';
  return 'Competitive Intelligence';
}

function inferAction(event: CompetitorEvent) {
  const score = Math.round(event.walmart_relevance_score || 0);
  if (score >= 90) return 'Escalate in next CSO briefing cycle with cross-functional owner alignment.';
  if (score >= 80) return 'Assign owner this week and validate Walmart exposure + mitigations.';
  if (score >= 70) return 'Track in weekly intel rhythm and prepare options memo for leadership.';
  return 'Monitor signal trend; no immediate executive escalation required.';
}

function inferSoWhat(event: CompetitorEvent) {
  if (event.walmart_actionability_context) return event.walmart_actionability_context;
  if (event.why_walmart_cares) return event.why_walmart_cares;
  if (event.security_implication) return event.security_implication;
  return 'Potential downstream impact on Walmart security, trust, or operating resilience requires analyst review.';
}

function correlationSummary(event: CompetitorEvent) {
  if (event.correlation_status === 'MATCHED') {
    const vendor = event.matched_vendor_name || 'tracked vendor';
    const confidence = (event.match_label || 'MATCHED').replace(/_/g, ' ');
    const projectCount = event.linked_active_projects_count || 0;
    return `Vendor match: ${vendor} (${confidence}) · active projects: ${projectCount}`;
  }
  if (event.correlation_status === 'AMBIGUOUS') {
    const cands = (event.candidate_vendor_names || []).slice(0, 3).join(', ');
    return cands
      ? `Ambiguous vendor correlation — review candidates: ${cands}`
      : 'Ambiguous vendor correlation — analyst review required';
  }
  return 'No deterministic vendor/project linkage detected yet';
}

// Component for logo with fallback to letter avatar
function CompetitorLogo({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = getLogoUrl(name);
  const avatarColor = getAvatarColor(name);
  const initials = getInitials(name);

  const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-xl',
    lg: 'w-20 h-20 text-2xl',
  };

  // If logo URL exists and hasn't failed, try to load it
  if (logoUrl && !logoFailed) {
    return (
      <div className={`${sizeClasses[size]} rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg`} style={{ background: 'var(--s-panel)', border: '2px solid var(--s-border)' }}>
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="w-full h-full object-contain p-2"
          onError={() => setLogoFailed(true)}
        />
      </div>
    );
  }

  // Fallback to letter avatar
  return (
    <div className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br ${avatarColor.bg} border-2 ${avatarColor.border} flex items-center justify-center flex-shrink-0 shadow-lg`}>
      <span className={`font-black ${avatarColor.text}`}>{initials}</span>
    </div>
  );
}

export function CompetitorIntelligence() {
  const [loading, setLoading] = useState(true);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [competitors, setCompetitors] = useState<CompetitorProfile[]>([]);
  const [recentEvents, setRecentEvents] = useState<CompetitorEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [csoCandidates, setCsoCandidates] = useState<CompetitorEvent[]>([]);
  const [allEvents, setAllEvents] = useState<CompetitorEvent[]>([]);

  // Load initial stats and competitors
  useEffect(() => {
    Promise.allSettled([
      fetchCompetitorStats(),
      fetchCompetitorEntities(100), // Get all competitors
      fetchCompetitorCSOCandidates(6),
      fetchCompetitorEvents({ page: 1, page_size: 200 }),
    ]).then(([statsRes, entitiesRes, csoRes, eventsRes]) => {
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }

      if (entitiesRes.status === 'fulfilled') {
        setCompetitors(entitiesRes.value.entities.map((ent: any) => ({
          name: ent.name,
          totalEvents: ent.event_count,
          cyberEvents: ent.cyber_count,
          orcEvents: ent.orc_count || 0,
          recallEvents: ent.recall_count,
          legalEvents: ent.legal_count || 0,
          techEvents: ent.tech_count || 0,
          threatLevel: getThreatLevel(ent.event_count),
          topCategory: ent.top_category || 'Other',
          monthlyJson: ent.monthly_json || '{}',
        })));
      } else {
        setCompetitors([]);
      }

      if (eventsRes.status === 'fulfilled') {
        setAllEvents(eventsRes.value.events || []);
      } else {
        setAllEvents([]);
      }

      if (csoRes.status === 'fulfilled' && (csoRes.value.events || []).length > 0) {
        setCsoCandidates(csoRes.value.events || []);
      } else if (eventsRes.status === 'fulfilled') {
        const fallback = (eventsRes.value.events || [])
          .filter(e => (e.walmart_relevance_score || 0) >= 75)
          .sort((a, b) => (b.walmart_relevance_score || 0) - (a.walmart_relevance_score || 0))
          .slice(0, 6);
        setCsoCandidates(fallback);
      } else {
        setCsoCandidates([]);
      }
    }).finally(() => setLoading(false));
  }, []);

  // Load recent events when a competitor is selected
  useEffect(() => {
    if (!selectedCompetitor) {
      setRecentEvents([]);
      return;
    }

    const selectedNormalized = normalizeName(selectedCompetitor);
    setLoadingEvents(true);

    fetchCompetitorEvents({
      competitor: selectedCompetitor,
      page: 1,
      page_size: 8,
    })
      .then((response) => {
        if ((response.events || []).length > 0) {
          setRecentEvents(response.events);
          return;
        }

        return fetchCompetitorEvents({ page: 1, page_size: 200 }).then((fallback) => {
          const matches = (fallback.events || [])
            .filter((event) => normalizeName(event.competitor || '').includes(selectedNormalized)
              || selectedNormalized.includes(normalizeName(event.competitor || '')))
            .slice(0, 8);
          setRecentEvents(matches);
        });
      })
      .catch(() => {
        const matches = (allEvents || [])
          .filter((event) => normalizeName(event.competitor || '').includes(selectedNormalized)
            || selectedNormalized.includes(normalizeName(event.competitor || '')))
          .slice(0, 8);
        setRecentEvents(matches);
      })
      .finally(() => setLoadingEvents(false));
  }, [selectedCompetitor, allEvents]);

  const getCompetitor = (name: string) => competitors.find(c => c.name === name);

  const topCompetitor = competitors.length > 0
    ? [...competitors].sort((a, b) => b.totalEvents - a.totalEvents)[0]
    : null;

  const highRiskEvents = allEvents.filter((event) => (event.walmart_relevance_score || 0) >= 75);
  const highRiskShare = stats?.total ? Math.round((highRiskEvents.length / stats.total) * 100) : 0;

  const executiveBriefings = [
    {
      title: 'Competitive Concentration Risk',
      insight: topCompetitor
        ? `${topCompetitor.name} leads activity with ${topCompetitor.totalEvents} events (${Math.round((topCompetitor.totalEvents / Math.max(stats?.total || 1, 1)) * 100)}% share). Top category: ${topCompetitor.topCategory}.`
        : 'Competitor concentration data is still loading.',
      action: 'Pressure-test Walmart controls and investments against the top competitor playbook.',
      owner: 'Chief Security Office + Strategy',
    },
    {
      title: 'CSO Escalation Readiness',
      insight: `${csoCandidates.length} candidate events currently queued for executive review.${csoCandidates.length === 0 ? ' No candidates are currently crossing escalation thresholds.' : ''}`,
      action: csoCandidates.length > 0
        ? 'Lock briefing order by score and assign response owners before the next executive sync.'
        : 'Run rescore and validate calibration thresholds to avoid missed escalation signals.',
      owner: 'Competitive Intelligence Lead',
    },
    {
      title: 'High-Relevance Signal Load',
      insight: `${highRiskEvents.length} events are scored 75+ (${highRiskShare}% of indexed activity), indicating elevated cross-functional decision demand.`,
      action: 'Convert top signals into decision memos with risk, cost, and timing options.',
      owner: 'Intel PMO + Domain Analysts',
    },
    {
      title: 'Coverage & Detection Confidence',
      insight: `Tracking ${competitors.length} competitors across ${(stats?.total ?? 0).toLocaleString()} indexed events; confidence improves as scoring coverage expands.`,
      action: 'Expand source coverage and close low-confidence gaps before quarterly leadership review.',
      owner: 'Data Engineering + Intel Ops',
    },
  ];

  const handleCardClick = (name: string) => {
    setSelectedCompetitor(prev => prev === name ? null : name);
  };

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedCompetitor(null);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500 animate-pulse">Loading Competitor Intelligence…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--s-bg)', color: 'var(--s-text)' }}>
      {/* ═══ 3D HERO — Competitor Threat Constellation ══════════════════ */}
      <div className="max-w-7xl mx-auto mb-8">
        <div
          className="ci-hero-bg relative rounded-2xl overflow-hidden"
          style={{ height: '400px', border: '1px solid var(--s-border)' }}
        >
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(0,83,226,0.5) 1px,transparent 1px),'
                + 'linear-gradient(90deg,rgba(0,83,226,0.5) 1px,transparent 1px)',
              backgroundSize: '52px 52px',
            }}
          />

          {/* 3D constellation */}
          <div className="absolute inset-0 z-0">
            <CompetitorThreat3D
              nodes={competitors.slice(0, 20).map((c): ThreatNode => ({
                name: c.name,
                eventCount: c.totalEvents,
                threatLevel: c.threatLevel,
              }))}
            />
          </div>

          {/* Threat legend (bottom-left) */}
          <div className="absolute bottom-5 left-6 z-10 flex flex-col gap-1.5">
            {[
              { label: 'HIGH THREAT',   color: '#ff6b6b' },
              { label: 'MEDIUM THREAT', color: '#FFC220' },
              { label: 'LOW THREAT',    color: '#4ade80' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                <span className="text-[10px] font-bold tracking-wider" style={{ color }}>{label}</span>
              </div>
            ))}
            <span className="text-[10px] mt-1" style={{ color: 'var(--s-text-dim)' }}>Node size ∝ event count</span>
          </div>

          {/* Hover hint */}
          <div className="absolute bottom-5 right-6 z-10">
            <span className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Hover nodes to inspect competitors</span>
          </div>

          {/* Title overlay */}
          <div className="relative z-10 h-full flex flex-col items-center justify-start pt-8 text-center px-6">
            <p className="text-[10px] font-bold text-wmt-yellow tracking-[0.2em] uppercase mb-2">
              Enterprise Security &nbsp;•&nbsp; Competitor Threat Landscape
            </p>
            <h1
              className="text-4xl lg:text-5xl font-black mb-2 leading-tight"
              style={{
                background: 'linear-gradient(135deg, #D9E3F0 0%, #0053E2 48%, #FFC220 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Competitor Intelligence
            </h1>
            <p className="text-sm max-w-lg mb-5" style={{ color: 'var(--s-text-muted)' }}>
              Live threat tracking across {competitors.length} competitors &mdash; {(stats?.total ?? 0).toLocaleString()} events indexed and analyst-enriched.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border" style={{ background: 'rgba(0,83,226,0.15)', color: '#D9E3F0', borderColor: 'rgba(0,83,226,0.4)' }}>{stats?.total ?? 0} Events</span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border" style={{ background: 'rgba(234,17,0,0.15)', color: '#ff6b6b', borderColor: 'rgba(234,17,0,0.4)' }}>{stats?.cyber ?? 0} Cyber</span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border" style={{ background: 'rgba(255,194,32,0.15)', color: '#FFC220', borderColor: 'rgba(255,194,32,0.4)' }}>{stats?.orc ?? 0} ORC/Theft</span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border" style={{ background: 'rgba(217,95,2,0.15)', color: '#FDBA74', borderColor: 'rgba(217,95,2,0.4)' }}>{stats?.recall ?? 0} Recalls</span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', borderColor: 'rgba(34,197,94,0.4)' }}>Jan–Feb 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* CSO Brief Queue */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="rounded-xl border p-5" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-2xl font-bold">🚨 CSO Brief Queue</h2>
            <span className="px-3 py-1 rounded-full text-xs font-bold border" style={{ background: 'rgba(234,17,0,0.15)', color: '#ff6b6b', borderColor: 'rgba(234,17,0,0.45)' }}>
              {csoCandidates.length} Candidates
            </span>
          </div>

          {csoCandidates.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--s-text-dim)' }}>
              No high-priority candidates yet. Run rescore from admin to refresh.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {csoCandidates.map((event) => {
                const chip = getPriorityChip(event.priority_tier);
                return (
                  <div key={event.id} className="rounded-lg border p-4" style={{ background: 'var(--s-modal-inner)', borderColor: 'var(--s-border)' }}>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ background: chip.bg, color: chip.color, borderColor: chip.border }}>
                        {event.priority_tier || 'Unscored'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ background: 'rgba(0,83,226,0.15)', color: '#D9E3F0', borderColor: 'rgba(0,83,226,0.45)' }}>
                        Score: {Math.round(event.walmart_relevance_score || 0)}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>
                        {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <p className="text-sm font-bold mb-1" style={{ color: 'var(--s-text)' }}>
                      {event.competitor}: {event.event_title || 'Untitled Event'}
                    </p>
                    <p className="text-xs mb-2" style={{ color: 'var(--s-text-muted)' }}>
                      <span className="font-bold" style={{ color: '#9BB7DF' }}>So what:</span> {inferSoWhat(event)}
                    </p>
                    <p className="text-xs mb-1" style={{ color: '#FFC220' }}>
                      <span className="font-bold">Recommended action:</span> {inferAction(event)}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--s-text-dim)' }}>
                      <span className="font-bold">Proposed owner:</span> {inferOwner(event)}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: '#9BB7DF' }}>
                      {correlationSummary(event)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Trend Direction */}
      <CompetitorTrendStrip events={allEvents} />

      {/* Key Insights */}
      <div className="max-w-7xl mx-auto mb-8">
        <h2 className="text-2xl font-bold mb-4">💡 Executive Intelligence</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {executiveBriefings.map((brief, i) => (
            <div key={i} className="p-5 rounded-lg border-l-4 border" style={{ background: 'var(--s-card)', borderLeftColor: '#FFC220', borderColor: 'var(--s-border)' }}>
              <h3 className="text-sm font-extrabold mb-2" style={{ color: '#9BB7DF' }}>{brief.title}</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--s-text-muted)' }}>{brief.insight}</p>
              <p className="text-xs mb-1" style={{ color: '#FFC220' }}><span className="font-bold">Action:</span> {brief.action}</p>
              <p className="text-xs" style={{ color: 'var(--s-text-dim)' }}><span className="font-bold">Owner:</span> {brief.owner}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Competitor Cards - All Competitors */}
      <div className="max-w-7xl mx-auto mb-8">
        <h2 className="text-2xl font-bold mb-4">🎯 All Competitors ({competitors.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {competitors.map(comp => {
            const isExpanded = selectedCompetitor === comp.name;
            
            return (
              <div
                key={comp.name}
                onClick={() => handleCardClick(comp.name)}
                className="rounded-lg border transition-all duration-300 cursor-pointer transform hover:scale-105 shadow-xl"
                style={{
                  background: 'var(--s-card)',
                  borderColor: isExpanded ? '#0053e2' : 'var(--s-border)',
                  boxShadow: isExpanded ? '0 0 0 2px rgba(0,83,226,0.3)' : undefined,
                }}
              >
                {/* Card Header */}
                <div className="p-4" style={{ borderBottom: '1px solid var(--s-border)' }}>
                  <div className="flex items-start gap-3 mb-3">
                    {/* Logo or Letter Avatar */}
                    <CompetitorLogo name={comp.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm truncate" style={{ color: 'var(--s-text)' }} title={comp.name}>
                        {comp.name}
                      </h3>
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-bold border mt-1" style={{
                        background: comp.threatLevel === 'HIGH' ? 'rgba(239,68,68,0.15)' : comp.threatLevel === 'MEDIUM' ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)',
                        color:      comp.threatLevel === 'HIGH' ? '#ef4444'              : comp.threatLevel === 'MEDIUM' ? '#eab308'              : '#22c55e',
                        borderColor:comp.threatLevel === 'HIGH' ? 'rgba(239,68,68,0.5)' : comp.threatLevel === 'MEDIUM' ? 'rgba(234,179,8,0.5)' : 'rgba(34,197,94,0.5)',
                      }}>
                        {comp.threatLevel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 p-3 text-center text-xs" style={{ background: 'var(--s-modal-inner)' }}>
                  <div>
                    <div className="text-lg font-bold" style={{ color: 'var(--s-text)' }}>{comp.totalEvents}</div>
                    <div className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Events</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-400">{comp.cyberEvents}</div>
                    <div className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Cyber</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-300">{comp.techEvents}</div>
                    <div className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Tech</div>
                  </div>
                </div>

                {/* Top Category */}
                <div className="px-3 py-2" style={{ borderTop: '1px solid var(--s-border)' }}>
                  <span className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Top: </span>
                  <span className="text-[10px] font-medium" style={{ color: '#9BB7DF' }}>{comp.topCategory}</span>
                </div>

                {/* Expand Indicator */}
                <div className="p-2 text-center text-[10px]" style={{ borderTop: '1px solid var(--s-border)', color: 'var(--s-text-dim)' }}>
                  {isExpanded ? '🔽 Click to collapse' : '🔼 Click for details'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Competitor Detail Modal */}
      {selectedCompetitor && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedCompetitor} details`}
          onClick={() => setSelectedCompetitor(null)}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(2,6,23,0.72)' }} />

          <div
            className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-xl border-2 shadow-2xl"
            style={{ background: 'var(--s-card)', borderColor: '#0053e2' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ background: 'var(--s-card)', borderColor: 'var(--s-border)' }}>
              <div className="flex items-center gap-3">
                <CompetitorLogo name={selectedCompetitor} size="md" />
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: 'var(--s-text)' }}>{selectedCompetitor}</h2>
                  <p className="text-sm" style={{ color: 'var(--s-text-muted)' }}>Detailed Intelligence Report</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCompetitor(null)}
                className="px-3 py-1.5 rounded-md text-sm font-bold border"
                style={{ background: 'white', color: '#1f2937', borderColor: 'var(--s-border)' }}
              >
                Close ✕
              </button>
            </div>

            <div className="p-6">
              {/* Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                {(() => {
                  const comp = getCompetitor(selectedCompetitor);
                  if (!comp) return null;
                  return (
                    <>
                      <div className="p-4 rounded-lg text-center" style={{ background: 'var(--s-modal-inner)' }}>
                        <div className="text-2xl font-bold" style={{ color: 'var(--s-text)' }}>{comp.totalEvents}</div>
                        <div className="text-xs" style={{ color: 'var(--s-text-dim)' }}>Total Events</div>
                      </div>
                      <div className="p-4 rounded-lg text-center" style={{ background: 'var(--s-modal-inner)' }}>
                        <div className="text-2xl font-bold text-red-400">{comp.cyberEvents}</div>
                        <div className="text-xs" style={{ color: 'var(--s-text-dim)' }}>Cyber</div>
                      </div>
                      <div className="p-4 rounded-lg text-center" style={{ background: 'var(--s-modal-inner)' }}>
                        <div className="text-2xl font-bold text-yellow-400">{comp.orcEvents}</div>
                        <div className="text-xs" style={{ color: 'var(--s-text-dim)' }}>ORC/Theft</div>
                      </div>
                      <div className="p-4 rounded-lg text-center" style={{ background: 'var(--s-modal-inner)' }}>
                        <div className="text-2xl font-bold text-orange-300">{comp.recallEvents}</div>
                        <div className="text-xs" style={{ color: 'var(--s-text-dim)' }}>Recalls</div>
                      </div>
                      <div className="p-4 rounded-lg text-center" style={{ background: 'var(--s-modal-inner)' }}>
                        <div className="text-2xl font-bold text-blue-400">{comp.legalEvents}</div>
                        <div className="text-xs" style={{ color: 'var(--s-text-dim)' }}>Legal</div>
                      </div>
                      <div className="p-4 rounded-lg text-center" style={{ background: 'var(--s-modal-inner)' }}>
                        <div className="text-2xl font-bold text-blue-300">{comp.techEvents}</div>
                        <div className="text-xs" style={{ color: 'var(--s-text-dim)' }}>Technology</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Recent Events */}
              <div>
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span>📅</span>
                  <span>Recent Activity</span>
                </h3>
                {loadingEvents ? (
                  <div className="text-center py-8" style={{ color: 'var(--s-text-dim)' }}>
                    <p className="animate-pulse">Loading recent events...</p>
                  </div>
                ) : recentEvents.length === 0 ? (
                  <div className="text-center py-8" style={{ color: 'var(--s-text-dim)' }}>
                    <p>No recent events found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentEvents.map((event) => {
                      const chip = getPriorityChip(event.priority_tier);
                      return (
                        <div key={event.id} className="p-5 rounded-lg border" style={{ background: 'var(--s-modal-inner)', borderColor: 'var(--s-border)' }}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <span className="text-xs" style={{ color: 'var(--s-text-dim)' }}>
                                {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'N/A'}
                              </span>
                              <h4 className="font-bold mt-1" style={{ color: 'var(--s-text)' }}>{event.event_title}</h4>
                            </div>
                            <span className="px-2 py-1 rounded text-xs ml-2" style={{ background: 'rgba(0,83,226,0.15)', color: '#D9E3F0' }}>
                              {event.category}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ background: chip.bg, color: chip.color, borderColor: chip.border }}>
                              {event.priority_tier || 'Unscored'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ background: 'rgba(0,83,226,0.15)', color: '#D9E3F0', borderColor: 'rgba(0,83,226,0.45)' }}>
                              Score: {Math.round(event.walmart_relevance_score || 0)}
                            </span>
                            {event.signal_type && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ background: 'rgba(255,194,32,0.15)', color: '#FFC220', borderColor: 'rgba(255,194,32,0.45)' }}>
                                {event.signal_type}
                              </span>
                            )}
                          </div>

                          {(event.walmart_actionability_context || event.why_walmart_cares) && (
                            <p className="text-sm mt-2" style={{ color: '#9BB7DF' }}>
                              <strong>Why Walmart Cares:</strong> {event.walmart_actionability_context || event.why_walmart_cares}
                            </p>
                          )}

                          <p className="text-xs mt-2" style={{ color: 'var(--s-text-dim)' }}>
                            <strong>Correlation:</strong> {correlationSummary(event)}
                          </p>

                          {event.detailed_description && (
                            <p className="text-sm mt-2" style={{ color: 'var(--s-text-muted)' }}>
                              {event.detailed_description.length > 200
                                ? `${event.detailed_description.slice(0, 200)}...`
                                : event.detailed_description}
                            </p>
                          )}
                          {event.security_implication && (
                            <p className="text-sm text-yellow-400 mt-2">
                              <strong>Security Impact:</strong> {event.security_implication}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
