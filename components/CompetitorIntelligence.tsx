import { useState, useEffect } from 'react';
import { fetchCompetitorStats, fetchCompetitorEntities, fetchCompetitorEvents } from '../services/api';

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

// Color palette for letter avatars
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-yellow-500 p-1 rounded-lg">
          <div className="bg-gray-900 p-6 rounded-lg">
            <h1 className="text-4xl font-bold mb-2">🏢 Competitor Intelligence Hub</h1>
            <p className="text-gray-300">Live threat tracking across {competitors.length} competitors — {stats?.total ?? 350} events indexed</p>
            <div className="mt-4 flex gap-4 text-sm flex-wrap">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/50">📊 {stats?.total ?? 350} Total Events</span>
              <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full border border-red-500/50">🔴 {stats?.cyber ?? 35} Cyber</span>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full border border-yellow-500/50">🟡 {stats?.orc ?? 56} ORC/Theft</span>
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/50">🟣 {stats?.recall ?? 18} Recalls</span>
              <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full">📅 Jan–Feb 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="max-w-7xl mx-auto mb-8">
        <h2 className="text-2xl font-bold mb-4">💡 Executive Intelligence</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-lg border-l-4 border-yellow-500 border border-gray-700">
            <p className="text-gray-200 text-sm leading-relaxed">
              🔥 <strong>Amazon dominates</strong>: {competitors.find(c => c.name === 'Amazon')?.totalEvents || 147} events ({Math.round(((competitors.find(c => c.name === 'Amazon')?.totalEvents || 147) / (stats?.total || 350)) * 100)}% of all activity) - 3x more than nearest competitor. Technology and Strategic categories show aggressive innovation.
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-lg border-l-4 border-yellow-500 border border-gray-700">
            <p className="text-gray-200 text-sm leading-relaxed">
              ⚠️ <strong>ORC/Theft epidemic</strong>: {stats?.orc || 56} events across all competitors (16% of activity). Target, Kroger, and Costco show concentrated regional organized crime.
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-lg border-l-4 border-yellow-500 border border-gray-700">
            <p className="text-gray-200 text-sm leading-relaxed">
              🔐 <strong>Cyber threats rising</strong>: {stats?.cyber || 35} cyber events (10% of activity). Amazon, Kroger, and Target are primary targets. Digital security posture gaps vs Amazon\'s advanced controls.
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-lg border-l-4 border-yellow-500 border border-gray-700">
            <p className="text-gray-200 text-sm leading-relaxed">
              📦 <strong>Recall pressure</strong>: {stats?.recall || 18} recall events, primarily food safety. Costco leads with supply chain quality control challenges.
            </p>
          </div>
        </div>
      </div>

      {/* Competitor Cards - All Competitors */}
      <div className="max-w-7xl mx-auto mb-8">
        <h2 className="text-2xl font-bold mb-4">🎯 All Competitors ({competitors.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {competitors.map(comp => {
            const avatarColor = getAvatarColor(comp.name);
            const initials = getInitials(comp.name);
            const isExpanded = selectedCompetitor === comp.name;
            
            return (
              <div
                key={comp.name}
                onClick={() => handleCardClick(comp.name)}
                className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border transition-all duration-300 cursor-pointer transform hover:scale-105 shadow-xl ${
                  isExpanded ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-gray-700 hover:border-blue-500'
                }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-start gap-3 mb-3">
                    {/* Letter Avatar */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarColor.bg} border-2 ${avatarColor.border} flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-sm font-black ${avatarColor.text}`}>{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-sm truncate" title={comp.name}>
                        {comp.name}
                      </h3>
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold border mt-1 ${
                        comp.threatLevel === 'HIGH' ? 'bg-red-500/20 text-red-300 border-red-500' :
                        comp.threatLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500' :
                        'bg-green-500/20 text-green-300 border-green-500'
                      }`}>
                        {comp.threatLevel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-gray-900/50 text-center text-xs">
                  <div>
                    <div className="text-lg font-bold text-white">{comp.totalEvents}</div>
                    <div className="text-[10px] text-gray-400">Events</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-400">{comp.cyberEvents}</div>
                    <div className="text-[10px] text-gray-400">Cyber</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-400">{comp.techEvents}</div>
                    <div className="text-[10px] text-gray-400">Tech</div>
                  </div>
                </div>

                {/* Top Category */}
                <div className="px-3 py-2 border-t border-gray-700">
                  <span className="text-[10px] text-gray-500">Top: </span>
                  <span className="text-[10px] text-blue-300 font-medium">{comp.topCategory}</span>
                </div>

                {/* Expand Indicator */}
                <div className="p-2 text-center text-[10px] text-gray-500 border-t border-gray-700">
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
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border-2 border-blue-500 shadow-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6 border-b border-gray-700 pb-4">
                {(() => {
                  const avatarColor = getAvatarColor(selectedCompetitor);
                  const initials = getInitials(selectedCompetitor);
                  return (
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${avatarColor.bg} border-2 ${avatarColor.border} flex items-center justify-center`}>
                      <span className={`text-xl font-black ${avatarColor.text}`}>{initials}</span>
                    </div>
                  );
                })()}
                <div>
                  <h2 className="text-3xl font-bold">{selectedCompetitor}</h2>
                  <p className="text-gray-400">Detailed Intelligence Report</p>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                {(() => {
                  const comp = getCompetitor(selectedCompetitor);
                  if (!comp) return null;
                  return (
                    <>
                      <div className="bg-gray-900/70 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-white">{comp.totalEvents}</div>
                        <div className="text-xs text-gray-400">Total Events</div>
                      </div>
                      <div className="bg-gray-900/70 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-400">{comp.cyberEvents}</div>
                        <div className="text-xs text-gray-400">Cyber</div>
                      </div>
                      <div className="bg-gray-900/70 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-yellow-400">{comp.orcEvents}</div>
                        <div className="text-xs text-gray-400">ORC/Theft</div>
                      </div>
                      <div className="bg-gray-900/70 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-purple-400">{comp.recallEvents}</div>
                        <div className="text-xs text-gray-400">Recalls</div>
                      </div>
                      <div className="bg-gray-900/70 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-400">{comp.legalEvents}</div>
                        <div className="text-xs text-gray-400">Legal</div>
                      </div>
                      <div className="bg-gray-900/70 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-teal-400">{comp.techEvents}</div>
                        <div className="text-xs text-gray-400">Technology</div>
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
                  <div className="text-center py-8 text-gray-500">
                    <p className="animate-pulse">Loading recent events...</p>
                  </div>
                ) : recentEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No recent events found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentEvents.map((event) => (
                      <div key={event.id} className="bg-gray-900/70 p-5 rounded-lg border border-gray-700">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <span className="text-xs text-gray-400">
                              {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'N/A'}
                            </span>
                            <h4 className="font-bold text-white mt-1">{event.event_title}</h4>
                          </div>
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs ml-2">
                            {event.category}
                          </span>
                        </div>
                        {event.detailed_description && (
                          <p className="text-sm text-gray-400 mt-2">
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
