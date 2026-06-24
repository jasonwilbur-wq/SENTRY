/**
 * CompetitorIntel — Competitor Intelligence hub page.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  CompetitorEntity,
  CompetitorEvent,
  CompetitorStats,
  fetchCompetitorCSOCandidates,
  fetchCompetitorEntities,
  fetchCompetitorHeatmap,
  fetchCompetitorMonthly,
  fetchCompetitorStats,
} from '../services/api';
import { CompetitorEventTable } from './CompetitorEventTable';
import { CompetitorLocationMap } from './CompetitorLocationMap';
import { CompetitorProfileModal } from './CompetitorProfileModal';
import { GlassCard3D } from './GlassCard3D';
import {
  CompetitorActionCenterSection,
  CompetitorHeatmapSection,
  CompetitorHeroSection,
  CompetitorMonthlyTrendSection,
  CompetitorProfilesSection,
  CompetitorSectionHeading,
  CompetitorStrategicReadout,
  genInsights,
  inferOwner,
} from './competitorIntel/CompetitorIntelSections';

export const CompetitorIntel: React.FC = () => {
  const [stats, setStats] = useState<CompetitorStats | null>(null);
  const [entities, setEntities] = useState<CompetitorEntity[]>([]);
  const [monthly, setMonthly] = useState<{ months: string[]; series: Record<string, number[]> } | null>(null);
  const [heatmap, setHeatmap] = useState<{ competitors: string[]; categories: string[]; matrix: number[][] } | null>(null);
  const [csoCandidates, setCsoCandidates] = useState<CompetitorEvent[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorEntity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCompetitorStats(),
      fetchCompetitorEntities(20),
      fetchCompetitorMonthly(5),
      fetchCompetitorHeatmap(10),
      fetchCompetitorCSOCandidates(8),
    ])
      .then(([nextStats, nextEntities, nextMonthly, nextHeatmap, nextCandidates]) => {
        setStats(nextStats);
        setEntities(nextEntities.entities);
        setMonthly(nextMonthly);
        setHeatmap(nextHeatmap);
        setCsoCandidates(nextCandidates.events);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const insights = useMemo(() => {
    if (!stats || !entities.length) return [];
    return genInsights(stats, entities);
  }, [stats, entities]);

  const trendData = useMemo(() => {
    if (!monthly) return [];
    return monthly.months.map((month, index) => {
      const point: Record<string, string | number> = { month };
      Object.entries(monthly.series).forEach(([name, arr]) => {
        point[name] = arr[index] ?? 0;
      });
      return point;
    });
  }, [monthly]);

  const top5Names = useMemo(() => {
    if (!monthly) return [];
    return Object.keys(monthly.series);
  }, [monthly]);

  const activitySpikes = useMemo(() => {
    if (!monthly || monthly.months.length < 2) return [];
    const latestIndex = monthly.months.length - 1;
    const previousIndex = latestIndex - 1;

    return Object.entries(monthly.series)
      .map(([name, values]) => {
        const latest = values[latestIndex] ?? 0;
        const previous = values[previousIndex] ?? 0;
        const delta = latest - previous;
        const pct = previous > 0 ? Math.round((delta / previous) * 100) : latest > 0 ? 100 : 0;
        return { name, latest, previous, delta, pct };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.latest - a.latest)
      .slice(0, 4);
  }, [monthly]);

  const ownerRoutes = useMemo(() => {
    const counts = new Map<string, number>();
    csoCandidates.forEach((eventItem) => {
      const owner = inferOwner(eventItem);
      counts.set(owner, (counts.get(owner) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([owner, count]) => ({ owner, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [csoCandidates]);

  const readiness = useMemo(
    () => ({
      briefReady: csoCandidates.filter((eventItem) => eventItem.is_brief_ready).length,
      highRelevance: csoCandidates.filter((eventItem) => (eventItem.walmart_relevance_score ?? 0) >= 55).length,
      correlated: csoCandidates.filter((eventItem) => eventItem.correlation_status === 'MATCHED' || (eventItem.linked_active_projects_count ?? 0) > 0).length,
      needsReview: csoCandidates.filter((eventItem) => !eventItem.is_brief_ready).length,
    }),
    [csoCandidates],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500 animate-pulse-slow">Loading Competitor Intelligence…</p>
      </div>
    );
  }

  return (
    <div className="space-y-0 pb-8">
      <CompetitorHeroSection entities={entities} stats={stats} />

      <CompetitorActionCenterSection
        csoCandidates={csoCandidates}
        readiness={readiness}
        activitySpikes={activitySpikes}
        ownerRoutes={ownerRoutes}
      />

      <CompetitorStrategicReadout insights={insights} />

      <section id="competitor-location-map" className="mb-10 scroll-mt-6">
        <CompetitorSectionHeading
          title="Competitor Location Map"
          subtitle="Workspace-sourced store and facility footprint by state — filter by competitor"
        />
        <CompetitorLocationMap />
      </section>

      <CompetitorProfilesSection entities={entities} onOpenCompetitor={setSelectedCompetitor} />

      {monthly && <CompetitorMonthlyTrendSection trendData={trendData} topNames={top5Names} />}

      {heatmap && <CompetitorHeatmapSection heatmap={heatmap} />}

      <section id="competitor-signal-feed" className="scroll-mt-6">
        <CompetitorSectionHeading
          title="Live Event Intelligence Feed"
          subtitle="Filter by competitor, category, month, or keyword — click any row to expand"
        />
        <GlassCard3D glowColor="#0053E2" intensity={3} className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5" style={{ backdropFilter: 'blur(12px)' }}>
          <CompetitorEventTable competitors={entities.map((entity) => entity.name)} />
        </GlassCard3D>
      </section>

      <div className="text-center py-4 border-t border-slate-800 mt-10">
        <p className="text-[10px] text-slate-600">
          Source: Walmart Competitor Analysis Dataset · Jason Wilbur, Sr. Security Manager – EST · Sep 2025 – Feb 2026 · {stats?.total?.toLocaleString()} events · {stats?.competitor_count} competitors · Internal Use Only
        </p>
      </div>

      {selectedCompetitor && <CompetitorProfileModal entity={selectedCompetitor} onClose={() => setSelectedCompetitor(null)} />}
    </div>
  );
};
