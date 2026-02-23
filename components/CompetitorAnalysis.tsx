import React, { useMemo } from 'react';
import { useVendors } from '../context/VendorContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { ChatAssistant } from './ChatAssistant';

const RISK_COLORS: Record<string, string> = {
  Low:      '#22c55e',  // green — keep semantic
  Medium:   '#FFC220',  // Spark Yellow
  High:     '#f87171',  // red-tint — keep semantic
  Critical: '#ef4444',  // danger red — keep semantic
};

export const CompetitorAnalysis: React.FC = () => {
  const { vendors, loading } = useVendors();

  const riskDistribution = useMemo(() => {
    const counts: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    vendors.forEach(v => { counts[v.risk_level] = (counts[v.risk_level] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [vendors]);

  // Top 20 by rating — vendors are already sorted desc from backend/dataProcessor
  const topVendors = useMemo(
    () =>
      [...vendors]
        .sort((a, b) => b.overall_rating - a.overall_rating)
        .slice(0, 20)
        .map(v => ({
          name: v.company_name.slice(0, 12),
          rating: v.overall_rating,
          full: v.company_name,
        })),
    [vendors],
  );

  // Category avg ratings for the radar chart
  const categoryData = useMemo(() => {
    const cats: Record<string, { total: number; count: number }> = {};
    vendors.forEach(v => {
      if (!cats[v.category]) cats[v.category] = { total: 0, count: 0 };
      cats[v.category].total += v.overall_rating;
      cats[v.category].count += 1;
    });
    return Object.entries(cats)
      .map(([subj, d]) => ({
        subject: subj.split(' ')[0],
        avg: +(d.total / d.count).toFixed(2),
        fullCategory: subj,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 6);
  }, [vendors]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-sentry-card rounded-lg border border-slate-700 h-80 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fadeIn">
      {/* Left column — charts */}
      <div className="xl:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Risk Distribution Pie */}
          <div className="bg-sentry-card p-4 rounded-lg border border-slate-700 shadow-lg">
            <h3 className="text-lg font-bold text-sentry-accent mb-4 border-b border-slate-700 pb-2">Risk Distribution</h3>
            <div style={{ height: 256 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={80}
                    paddingAngle={5} dataKey="value"
                  >
                    {riskDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={RISK_COLORS[entry.name] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#001E60', borderColor: '#002880', color: '#fff' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Performance Radar */}
          <div className="bg-sentry-card p-4 rounded-lg border border-slate-700 shadow-lg">
            <h3 className="text-lg font-bold text-sentry-accent mb-4 border-b border-slate-700 pb-2">Category Performance</h3>
            <div style={{ height: 256 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={categoryData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  {/* Domain 0-5 matches the actual 0-5 rating scale */}
                  <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                  <Radar name="Avg Rating" dataKey="avg" stroke="#FFC220" fill="#0053E2" fillOpacity={0.35} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#001E60', borderColor: '#002880', color: '#fff' }}
                    formatter={(val: number) => [`${val} / 5.0`, 'Avg Rating']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Top 20 Bar Chart — Y-axis domain fixed to 0-5 (was wrongly 0-100) */}
        <div className="bg-sentry-card p-4 rounded-lg border border-slate-700 shadow-lg">
          <h3 className="text-lg font-bold text-sentry-accent mb-4 border-b border-slate-700 pb-2">Top 20 Vendor Rankings</h3>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topVendors} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} angle={-45} textAnchor="end" />
                <YAxis stroke="#94a3b8" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                <Tooltip
                  cursor={{ fill: '#002880', opacity: 0.25 }}
                  contentStyle={{ backgroundColor: '#001E60', borderColor: '#002880', color: '#fff' }}
                  labelFormatter={(_val, payload) => payload?.[0]?.payload?.full ?? ''}
                  formatter={(val: number) => [`${val} / 5.0`, 'Security Rating']}
                />
                <Bar dataKey="rating" fill="#0053E2" radius={[4, 4, 0, 0]} activeBar={{ fill: '#FFC220' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Right column — SENTRY-AI */}
      <div className="xl:col-span-1">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white">AI Market Analyst</h3>
          <p className="text-sm text-slate-400">Ask SENTRY-AI to compare vendors or analyse trends.</p>
        </div>
        <ChatAssistant />
      </div>
    </div>
  );
};