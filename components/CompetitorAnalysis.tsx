import React, { useMemo } from 'react';
import { PROCESSED_VENDORS } from '../utils/dataProcessor';
import { RiskLevel } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { ChatAssistant } from './ChatAssistant';

export const CompetitorAnalysis: React.FC = () => {
  // Prepare data for charts using PROCESSED_VENDORS
  const riskDistribution = useMemo(() => {
    const counts = { [RiskLevel.LOW]: 0, [RiskLevel.MEDIUM]: 0, [RiskLevel.HIGH]: 0, [RiskLevel.CRITICAL]: 0 };
    PROCESSED_VENDORS.forEach(v => {
      if (counts[v.riskLevel] !== undefined) {
        counts[v.riskLevel]++;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, []);

  const ratingData = useMemo(() => {
    return PROCESSED_VENDORS.map(v => ({
      name: v.companyName.substring(0, 10),
      rating: v.overallRating,
      risk: v.riskLevel,
      full: v.companyName
    })).sort((a, b) => b.rating - a.rating);
  }, []);

  // Mock data for Radar chart (Category Average)
  const categoryData = useMemo(() => {
    const cats: Record<string, {total: number, count: number}> = {};
    PROCESSED_VENDORS.forEach(v => {
        if (!cats[v.category]) cats[v.category] = {total: 0, count: 0};
        cats[v.category].total += v.overallRating;
        cats[v.category].count += 1;
    });
    return Object.entries(cats).map(([subject, data]) => ({
        subject: subject.split(' ')[0], // Shorten
        A: Math.round(data.total / data.count),
        fullCategory: subject
    })).slice(0, 6); // Take top 6 for radar
  }, []);

  const COLORS = {
    [RiskLevel.LOW]: '#4ade80',
    [RiskLevel.MEDIUM]: '#fbbf24',
    [RiskLevel.HIGH]: '#f87171',
    [RiskLevel.CRITICAL]: '#ef4444'
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fadeIn">
      
      {/* Left Column: Visual Analytics */}
      <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Risk Distribution Chart */}
            <div className="bg-sentry-card p-4 rounded-lg border border-slate-700 shadow-lg">
              <h3 className="text-lg font-bold text-sentry-accent mb-4 border-b border-slate-700 pb-2">Risk Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name as RiskLevel]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Performance Radar */}
            <div className="bg-sentry-card p-4 rounded-lg border border-slate-700 shadow-lg">
              <h3 className="text-lg font-bold text-sentry-accent mb-4 border-b border-slate-700 pb-2">Category Performance</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={categoryData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Avg Rating"
                      dataKey="A"
                      stroke="#38bdf8"
                      fill="#38bdf8"
                      fillOpacity={0.3}
                    />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Top 20 Ratings Bar Chart */}
          <div className="bg-sentry-card p-4 rounded-lg border border-slate-700 shadow-lg">
            <h3 className="text-lg font-bold text-sentry-accent mb-4 border-b border-slate-700 pb-2">Top 20 Vendor Rankings</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingData.slice(0, 20)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} angle={-45} textAnchor="end" height={60} />
                  <YAxis stroke="#94a3b8" domain={[0, 100]} />
                  <Tooltip 
                    cursor={{fill: '#334155', opacity: 0.2}}
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                    itemStyle={{ color: '#38bdf8' }}
                  />
                  <Bar dataKey="rating" fill="#38bdf8" radius={[4, 4, 0, 0]} activeBar={{ fill: '#4ade80' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
      </div>

      {/* Right Column: AI Assistant */}
      <div className="xl:col-span-1 h-full">
         <div className="h-full flex flex-col">
            <div className="mb-4">
                <h3 className="text-xl font-bold text-white">AI Market Analyst</h3>
                <p className="text-sm text-slate-400">Ask SENTRY-AI to compare specific vendors or analyze trends.</p>
            </div>
            <div className="flex-grow">
               <ChatAssistant />
            </div>
         </div>
      </div>

    </div>
  );
};