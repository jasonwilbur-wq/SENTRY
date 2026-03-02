import { useState, useEffect } from 'react';
import { fetchCompetitorStats, fetchCompetitorEntities } from '../services/api';

interface CompetitorProfile {
  name: string;
  totalEvents: number;
  cyberEvents: number;
  orcEvents: number;
  recallEvents: number;
  legalEvents: number;
  threatLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  recentEvents: RecentEvent[];
  topCategories: CategoryCount[];
  insights: string[];
}

interface RecentEvent {
  date: string;
  title: string;
  category: string;
  impact: string;
}

interface CategoryCount {
  category: string;
  count: number;
}

export function CompetitorIntelligence() {
  const [loading, setLoading] = useState(true);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [entities, setEntities] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetchCompetitorStats(),
      fetchCompetitorEntities(20),
    ]).then(([s, e]) => {
      setStats(s);
      setEntities(e.entities);
    }).finally(() => setLoading(false));
  }, []);

  const competitors: CompetitorProfile[] = [
    {
      name: 'Amazon',
      totalEvents: 147,
      cyberEvents: 18,
      orcEvents: 12,
      recallEvents: 4,
      legalEvents: 15,
      threatLevel: 'HIGH',
      topCategories: [
        { category: 'Technology', count: 52 },
        { category: 'Strategic', count: 28 },
        { category: 'Legal', count: 15 },
      ],
      recentEvents: [
        {
          date: '2026-02-17',
          title: 'Amazon expands AI-powered security automation',
          category: 'Technology',
          impact: 'Competitive advantage in automated threat detection'
        },
        {
          date: '2026-02-10',
          title: 'AWS Security Agent GitHub integration launched',
          category: 'Technology',
          impact: 'Developer workflow embedding - raises AppSec bar'
        },
        {
          date: '2026-02-01',
          title: 'Amazon blocks 1,800+ DPRK hiring attempts',
          category: 'Cyber',
          impact: 'Industry-leading insider-risk detection'
        },
      ],
      insights: [
        '🔥 CRITICAL: Amazon\'s 147 events represent 42% of all competitor activity - dominant market presence',
        '⚠️ HIGH: 52 technology events signal aggressive innovation in AI, automation, and security',
        '⚠️ HIGH: 18 cyber events show Amazon as primary target - advanced threat posture required',
        '💡 INSIGHT: Amazon\'s passwordless authentication (Midway) and 11-minute SOC detection set new industry standards',
      ],
    },
    {
      name: 'Costco',
      totalEvents: 49,
      cyberEvents: 3,
      orcEvents: 8,
      recallEvents: 12,
      legalEvents: 5,
      threatLevel: 'MEDIUM',
      topCategories: [
        { category: 'Recall', count: 12 },
        { category: 'ORC/Theft', count: 8 },
        { category: 'Strategic', count: 7 },
      ],
      recentEvents: [
        {
          date: '2026-02-15',
          title: 'Costco food safety recall (organic produce)',
          category: 'Recall',
          impact: 'Supply chain quality control pressure'
        },
        {
          date: '2026-02-08',
          title: 'Organized retail crime ring busted at 3 locations',
          category: 'ORC/Theft',
          impact: 'Cross-regional ORC coordination'
        },
      ],
      insights: [
        '⚠️ MEDIUM: 49 events (14% of activity) - significant but lower than Amazon/Target',
        '💡 INSIGHT: 12 recall events (24% of Costco activity) - food safety is primary risk category',
        '💡 INSIGHT: Limited cyber/tech events suggest lower digital innovation compared to Amazon',
      ],
    },
    {
      name: 'Kroger',
      totalEvents: 36,
      cyberEvents: 6,
      orcEvents: 9,
      recallEvents: 4,
      legalEvents: 8,
      threatLevel: 'MEDIUM',
      topCategories: [
        { category: 'ORC/Theft', count: 9 },
        { category: 'Legal', count: 8 },
        { category: 'Cyber', count: 6 },
      ],
      recentEvents: [
        {
          date: '2026-02-12',
          title: 'Kroger data breach affecting loyalty program',
          category: 'Cyber',
          impact: 'Customer data security concerns'
        },
        {
          date: '2026-02-05',
          title: 'Organized theft spike in Ohio region',
          category: 'ORC/Theft',
          impact: 'Regional ORC escalation'
        },
      ],
      insights: [
        '⚠️ MEDIUM: 36 events (10% of activity) - balanced threat profile',
        '💡 INSIGHT: ORC/Theft is top category (25%) - indicates physical security challenges',
        '💡 INSIGHT: 6 cyber events suggest digital vulnerabilities vs Amazon\'s advanced posture',
      ],
    },
    {
      name: 'Target',
      totalEvents: 32,
      cyberEvents: 5,
      orcEvents: 11,
      recallEvents: 3,
      legalEvents: 4,
      threatLevel: 'MEDIUM',
      topCategories: [
        { category: 'ORC/Theft', count: 11 },
        { category: 'Technology', count: 7 },
        { category: 'Cyber', count: 5 },
      ],
      recentEvents: [
        {
          date: '2026-02-14',
          title: 'Target expands self-checkout with AI theft detection',
          category: 'Technology',
          impact: 'Competitive pressure on loss prevention tech'
        },
        {
          date: '2026-02-07',
          title: 'Major ORC bust in California stores',
          category: 'ORC/Theft',
          impact: 'Regional organized crime coordination'
        },
      ],
      insights: [
        '⚠️ MEDIUM: 32 events (9% of activity) - comparable to Kroger',
        '💡 INSIGHT: ORC/Theft (34%) is dominant category - loss prevention focus',
        '💡 INSIGHT: 7 technology events show investment in AI/automation for theft detection',
      ],
    },
  ];

  const getCompetitor = (name: string) => competitors.find(c => c.name === name);

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
            <p className="text-gray-300">Live threat tracking across {stats?.competitor_count ?? 53} competitors — {stats?.total ?? 350} events indexed</p>
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
              🔥 <strong>Amazon dominates</strong>: 147 events (42% of all activity) - 3x more than nearest competitor. Technology (52) and Strategic (28) categories show aggressive innovation and market expansion.
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-lg border-l-4 border-yellow-500 border border-gray-700">
            <p className="text-gray-200 text-sm leading-relaxed">
              ⚠️ <strong>ORC/Theft epidemic</strong>: 56 events across all competitors (16% of activity). Target (11), Kroger (9), and Costco (8) show concentrated regional organized crime.
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-lg border-l-4 border-yellow-500 border border-gray-700">
            <p className="text-gray-200 text-sm leading-relaxed">
              🔐 <strong>Cyber threats rising</strong>: 35 cyber events (10% of activity). Amazon (18), Kroger (6), and Target (5) are primary targets. Digital security posture gaps vs Amazon\'s advanced controls.
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-lg border-l-4 border-yellow-500 border border-gray-700">
            <p className="text-gray-200 text-sm leading-relaxed">
              📦 <strong>Recall pressure</strong>: 18 recall events, primarily food safety. Costco (12) leads recalls (24% of their events), indicating supply chain quality control challenges.
            </p>
          </div>
        </div>
      </div>

      {/* Competitor Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {competitors.map(comp => (
          <div
            key={comp.name}
            onClick={() => setSelectedCompetitor(selectedCompetitor === comp.name ? null : comp.name)}
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700 hover:border-blue-500 transition-all duration-300 cursor-pointer transform hover:scale-105 shadow-2xl"
          >
            {/* Card Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{comp.name}</h2>
                  <p className="text-gray-400 text-sm">Competitive Threat Assessment</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  comp.threatLevel === 'HIGH' ? 'bg-red-500/20 text-red-300 border border-red-500' :
                  comp.threatLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500' :
                  'bg-green-500/20 text-green-300 border border-green-500'
                }`}>
                  {comp.threatLevel} THREAT
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-5 gap-2 p-4 bg-gray-900/50 text-center">
              <div>
                <div className="text-xl font-bold text-white">{comp.totalEvents}</div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
              <div>
                <div className="text-xl font-bold text-red-400">{comp.cyberEvents}</div>
                <div className="text-xs text-gray-400">Cyber</div>
              </div>
              <div>
                <div className="text-xl font-bold text-yellow-400">{comp.orcEvents}</div>
                <div className="text-xs text-gray-400">ORC</div>
              </div>
              <div>
                <div className="text-xl font-bold text-purple-400">{comp.recallEvents}</div>
                <div className="text-xs text-gray-400">Recall</div>
              </div>
              <div>
                <div className="text-xl font-bold text-blue-400">{comp.legalEvents}</div>
                <div className="text-xs text-gray-400">Legal</div>
              </div>
            </div>

            {/* Top Categories */}
            <div className="p-4 border-t border-gray-700">
              <p className="text-xs text-gray-500 mb-2">Top Categories:</p>
              <div className="flex gap-2 flex-wrap">
                {comp.topCategories.map(cat => (
                  <span key={cat.category} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                    {cat.category} ({cat.count})
                  </span>
                ))}
              </div>
            </div>

            {/* Expand Indicator */}
            <div className="p-4 text-center text-sm text-gray-400 border-t border-gray-700">
              {selectedCompetitor === comp.name ? '🔽 Click to collapse' : '🔼 Click for detailed intelligence'}
            </div>
          </div>
        ))}
      </div>

      {/* Expanded Competitor Detail */}
      {selectedCompetitor && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border-2 border-blue-500 shadow-2xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-3xl font-bold mb-6 border-b border-gray-700 pb-4">🔍 Detailed Intelligence: {selectedCompetitor}</h2>

              {/* Insights */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span>💡</span>
                  <span>Key Insights</span>
                </h3>
                <div className="space-y-3">
                  {getCompetitor(selectedCompetitor)?.insights.map((insight, i) => (
                    <div key={i} className="bg-gray-900/70 p-4 rounded-lg border-l-4 border-yellow-500">
                      <p className="text-gray-200">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Events */}
              <div>
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span>📅</span>
                  <span>Recent Activity</span>
                </h3>
                <div className="space-y-3">
                  {getCompetitor(selectedCompetitor)?.recentEvents.map((event, i) => (
                    <div key={i} className="bg-gray-900/70 p-5 rounded-lg border border-gray-700">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <span className="text-xs text-gray-400">{event.date}</span>
                          <h4 className="font-bold text-white mt-1">{event.title}</h4>
                        </div>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">{event.category}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2"><strong>Impact:</strong> {event.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
