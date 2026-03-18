import { useState, useEffect } from 'react';
import { fetchCompetitorStats, fetchCompetitorEntities, fetchCompetitorEvents } from '../services/api';
import { CompetitorThreat3D, type ThreatNode } from './CompetitorThreat3D';

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

interface CompetitorEvent {
  id: number;
  event_date: string;
  event_title: string;
  category: string;
  detailed_description?: string;
  security_implication?: string;
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
  { bg: 'from-blue-600 to-blue-800', border: 'border-blue-500', text: 'text-blue-100' },
  { bg: 'from-purple-600 to-purple-800', border: 'border-purple-500', text: 'text-purple-100' },
  { bg: 'from-red-600 to-red-800', border: 'border-red-500', text: 'text-red-100' },
  { bg: 'from-yellow-600 to-yellow-800', border: 'border-yellow-500', text: 'text-yellow-100' },
  { bg: 'from-green-600 to-green-800', border: 'border-green-500', text: 'text-green-100' },
  { bg: 'from-pink-600 to-pink-800', border: 'border-pink-500', text: 'text-pink-100' },
  { bg: 'from-indigo-600 to-indigo-800', border: 'border-indigo-500', text: 'text-indigo-100' },
  { bg: 'from-teal-600 to-teal-800', border: 'border-teal-500', text: 'text-teal-100' },
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

  // Load initial stats and competitors
  useEffect(() => {
    Promise.all([
      fetchCompetitorStats(),
      fetchCompetitorEntities(100), // Get all competitors
    ]).then(([s, e]) => {
      setStats(s);
      setCompetitors(e.entities.map((ent: any) => ({
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
    }).finally(() => setLoading(false));
  }, []);

  // Load recent events when a competitor is selected
  useEffect(() => {
    if (selectedCompetitor) {
      setLoadingEvents(true);
      fetchCompetitorEvents({
        competitor: selectedCompetitor,
        page: 1,
        page_size: 5,
      }).then(response => {
        setRecentEvents(response.events);
      }).finally(() => setLoadingEvents(false));
    } else {
      setRecentEvents([]);
    }
  }, [selectedCompetitor]);

  const getCompetitor = (name: string) => competitors.find(c => c.name === name);

  const handleCardClick = (name: string) => {
    setSelectedCompetitor(prev => prev === name ? null : name);
  };

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
                background: 'linear-gradient(135deg, #60a5fa 0%, #0053E2 50%, #FFC220 100%)',
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
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border" style={{ background: 'rgba(0,83,226,0.15)', color: '#60a5fa', borderColor: 'rgba(0,83,226,0.4)' }}>{stats?.total ?? 0} Events</span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border" style={{ background: 'rgba(234,17,0,0.15)', color: '#ff6b6b', borderColor: 'rgba(234,17,0,0.4)' }}>{stats?.cyber ?? 0} Cyber</span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border" style={{ background: 'rgba(255,194,32,0.15)', color: '#FFC220', borderColor: 'rgba(255,194,32,0.4)' }}>{stats?.orc ?? 0} ORC/Theft</span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderColor: 'rgba(139,92,246,0.4)' }}>{stats?.recall ?? 0} Recalls</span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', borderColor: 'rgba(34,197,94,0.4)' }}>Jan–Feb 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="max-w-7xl mx-auto mb-8">
        <h2 className="text-2xl font-bold mb-4">💡 Executive Intelligence</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            `🔥 Amazon dominates: ${competitors.find(c => c.name === 'Amazon')?.totalEvents || 147} events (${Math.round(((competitors.find(c => c.name === 'Amazon')?.totalEvents || 147) / (stats?.total || 337)) * 100)}% of all activity) — 3× more than nearest competitor. Technology and Strategic categories show aggressive innovation.`,
            `⚠️ ORC/Theft epidemic: ${stats?.orc || 52} events across all competitors (15% of activity). Target, Kroger, and Costco show concentrated regional organized crime.`,
            `🔐 Cyber threats rising: ${stats?.cyber || 33} cyber events (10% of activity). Amazon, Kroger, and Target are primary targets. Digital security posture gaps vs Amazon's advanced controls.`,
            `📦 Recall pressure: ${stats?.recall || 18} recall events, primarily food safety. Costco leads with supply chain quality control challenges.`,
          ].map((text, i) => (
            <div key={i} className="p-5 rounded-lg border-l-4 border" style={{ background: 'var(--s-card)', borderLeftColor: '#FFC220', borderColor: 'var(--s-border)' }}>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--s-text-muted)' }}>{text}</p>
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
                    <div className="text-lg font-bold text-purple-400">{comp.techEvents}</div>
                    <div className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Tech</div>
                  </div>
                </div>

                {/* Top Category */}
                <div className="px-3 py-2" style={{ borderTop: '1px solid var(--s-border)' }}>
                  <span className="text-[10px]" style={{ color: 'var(--s-text-dim)' }}>Top: </span>
                  <span className="text-[10px] font-medium" style={{ color: '#60a5fa' }}>{comp.topCategory}</span>
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

      {/* Expanded Competitor Detail */}
      {selectedCompetitor && (
        <div className="max-w-7xl mx-auto mb-8">
          <div className="rounded-lg border-2 shadow-2xl overflow-hidden" style={{ background: 'var(--s-card)', borderColor: '#0053e2' }}>
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6 pb-4" style={{ borderBottom: '1px solid var(--s-border)' }}>
                <CompetitorLogo name={selectedCompetitor} size="lg" />
                <div>
                  <h2 className="text-3xl font-bold" style={{ color: 'var(--s-text)' }}>{selectedCompetitor}</h2>
                  <p style={{ color: 'var(--s-text-muted)' }}>Detailed Intelligence Report</p>
                </div>
              </div>

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
                        <div className="text-2xl font-bold text-purple-400">{comp.recallEvents}</div>
                        <div className="text-xs" style={{ color: 'var(--s-text-dim)' }}>Recalls</div>
                      </div>
                      <div className="p-4 rounded-lg text-center" style={{ background: 'var(--s-modal-inner)' }}>
                        <div className="text-2xl font-bold text-blue-400">{comp.legalEvents}</div>
                        <div className="text-xs" style={{ color: 'var(--s-text-dim)' }}>Legal</div>
                      </div>
                      <div className="p-4 rounded-lg text-center" style={{ background: 'var(--s-modal-inner)' }}>
                        <div className="text-2xl font-bold text-teal-400">{comp.techEvents}</div>
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
                    {recentEvents.map((event) => (
                      <div key={event.id} className="p-5 rounded-lg border" style={{ background: 'var(--s-modal-inner)', borderColor: 'var(--s-border)' }}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <span className="text-xs" style={{ color: 'var(--s-text-dim)' }}>
                              {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'N/A'}
                            </span>
                            <h4 className="font-bold mt-1" style={{ color: 'var(--s-text)' }}>{event.event_title}</h4>
                          </div>
                          <span className="px-2 py-1 rounded text-xs ml-2" style={{ background: 'rgba(0,83,226,0.15)', color: '#60a5fa' }}>
                            {event.category}
                          </span>
                        </div>
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
                    ))}
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
