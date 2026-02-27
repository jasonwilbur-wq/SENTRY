import React, { useState } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell 
} from 'recharts';
import { Vendor, getDownloadUrl } from '../services/api';

interface VendorDetailModalProps {
  vendor: Vendor;
  onClose: () => void;
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'risk' | 'tech' | 'docs';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'risk',     label: 'Risk & Scores' },
  { id: 'tech',     label: 'Technology' },
  { id: 'docs',     label: 'Documents' },
];

// ── Helper: Map risk level to color ──────────────────────────────────────────
const RISK_COLOR: Record<string, string> = {
  Low: '#22c55e', Medium: '#eab308', High: '#f97316', Critical: '#ef4444',
};

export const VendorDetailModal: React.FC<VendorDetailModalProps> = ({ vendor, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Prepare Radar Data from var_scores
  const radarData = vendor.var_scores ? [
    { subject: 'Compliance', A: vendor.var_scores.Compliance || 0, fullMark: 5 },
    { subject: 'Risk',       A: vendor.var_scores.Risk || 0,       fullMark: 5 },
    { subject: 'Maturity',   A: vendor.var_scores.Maturity || 0,   fullMark: 5 },
    { subject: 'Integration',A: vendor.var_scores.Integration || 0,fullMark: 5 },
    { subject: 'ROI',        A: vendor.var_scores.ROI || 0,        fullMark: 5 },
    { subject: 'Viability',  A: vendor.var_scores.Viability || 0,  fullMark: 5 },
  ] : [];

  const riskColor = RISK_COLOR[vendor.risk_level] || '#64748b';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-fadeIn">
      {/* Backdrop — deep glassmorphism */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
        style={{
          background: 'rgba(0,6,20,0.75)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        }}
      />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          background: 'rgba(8, 14, 32, 0.96)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 0 0 1px rgba(0,83,226,0.12), 0 32px 80px rgba(0,0,0,0.7)',
        }}
      >
        
        {/* ── Header ───────────────────────────────────────────────────────────── */}
        <div
          className="shrink-0 px-8 py-6 flex items-start justify-between relative overflow-hidden"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: `linear-gradient(135deg, ${riskColor}10 0%, rgba(0,83,226,0.06) 50%, transparent 100%)`,
          }}
        >
          {/* Gradient mesh banner */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 60% 80% at 0% 50%, ${riskColor}12, transparent 60%)`,
            }}
            aria-hidden="true"
          />

          <div className="flex items-start gap-4 relative z-10">
            {/* Logo / Initials badge */}
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-lg shrink-0"
              style={{
                background: `linear-gradient(135deg, ${riskColor}33, ${riskColor}18)`,
                border: `1px solid ${riskColor}44`,
                boxShadow: `0 0 24px ${riskColor}33`,
              }}
            >
              {vendor.company_name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{vendor.company_name}</h2>
              <div className="flex items-center gap-3 mt-1.5">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {vendor.category}
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                  style={{ borderColor: riskColor, color: riskColor, backgroundColor: `${riskColor}14`, border: `1px solid ${riskColor}44` }}
                >
                  {vendor.risk_level} Risk
                </span>
                {vendor.has_var && (
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
                  >
                    VAR Assessed
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="relative z-10 p-2 rounded-full transition-all"
            aria-label="Close"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = '#f1f5f9'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
          >
            ✕
          </button>
        </div>

        {/* ── Tabs Navigation ─────────────────────────────────────────────── */}
        <div
          className="shrink-0 px-8 flex gap-8"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative py-4 text-sm font-semibold transition-colors"
              style={{
                color: activeTab === tab.id ? '#ffffff' : '#475569',
                borderBottom: activeTab === tab.id ? '2px solid #0053E2' : '2px solid transparent',
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #0053E2, #4d9fff)',
                    boxShadow: '0 0 8px rgba(0,83,226,0.6)',
                    animation: 'tab-slide 0.2s ease-out both',
                    transformOrigin: 'left',
                  }}
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>

        {/* ── Scrollable Content Area ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-8" style={{ background: 'rgba(4, 8, 20, 0.4)' }}>
          
          {/* ── TAB: OVERVIEW ───────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Description Column */}
              <div className="lg:col-span-2 space-y-8">
                <section>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">About</h3>
                  <p className="text-slate-300 leading-relaxed">
                    {vendor.description || "No detailed description available for this vendor yet. This information is typically extracted from RFI responses or public profiles."}
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Products Assessed</h3>
                  <div className="space-y-3">
                    {(vendor.all_products || []).map((prod, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                         <div>
                           <p className="font-semibold text-white">{prod.technology_product || "Unknown Product"}</p>
                           <p className="text-xs text-slate-500">Last Assessed: {prod.last_assessed || "Pending"}</p>
                         </div>
                         <div className="text-right">
                           <span className={`text-sm font-bold ${prod.overall_rating >= 4 ? 'text-green-400' : 'text-yellow-400'}`}>
                             {prod.overall_rating.toFixed(1)} / 5.0
                           </span>
                         </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Side Metadata Column */}
              <div className="space-y-6">
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Headquarters</p>
                    <p className="text-white font-medium">{vendor.hq_location || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Founded</p>
                    <p className="text-white font-medium">{vendor.founded_year || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Company URL</p>
                    <a 
                      href={vendor.company_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-wmt-blue hover:underline text-sm truncate block"
                    >
                      {vendor.company_url || "N/A"}
                    </a>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                  <h4 className="text-sm font-bold text-white mb-2">Walmart Stakeholders</h4>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Business Owner</p>
                    <p className="text-white font-medium">{vendor.business_owner || "TBD"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Sourcing Manager</p>
                    <p className="text-white font-medium">{vendor.sourcing_manager || "TBD"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Status</p>
                    <span className="inline-block mt-1 px-2 py-1 rounded bg-blue-900/30 text-blue-300 text-xs font-bold border border-blue-800">
                      {vendor.deployment_status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: RISK & SCORES ──────────────────────────────────────────── */}
          {activeTab === 'risk' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              <div className="flex flex-col items-center justify-center bg-slate-900/50 rounded-2xl border border-slate-800 p-6 relative">
                 <h3 className="absolute top-6 left-6 text-sm font-bold text-slate-400 uppercase tracking-widest">VAR Score Profile</h3>
                 {radarData.length > 0 ? (
                   <ResponsiveContainer width="100%" height={350}>
                     <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                       <PolarGrid stroke="#334155" />
                       <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                       <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                       <Radar
                         name={vendor.company_name}
                         dataKey="A"
                         stroke="#0053E2"
                         strokeWidth={3}
                         fill="#0053E2"
                         fillOpacity={0.3}
                       />
                       <Tooltip 
                         contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                         itemStyle={{ color: '#f1f5f9' }}
                       />
                     </RadarChart>
                   </ResponsiveContainer>
                 ) : (
                   <div className="text-center text-slate-500">
                     <p className="text-lg">No VAR Score Data Available</p>
                     <p className="text-sm">Run an assessment to generate this profile.</p>
                   </div>
                 )}
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Detailed Metrics</h3>
                {vendor.var_scores ? (
                  <div className="space-y-3">
                  {Object.entries(vendor.var_scores).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-4">
                       <span className="w-32 text-sm text-slate-400 text-right font-medium tracking-wide">{key}</span>
                       <div className="flex-1 h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                         <div 
                           className={`h-full rounded-full transition-all duration-1000 ${ (val || 0) < 3 ? 'bg-red-500' : (val || 0) < 4 ? 'bg-yellow-500' : 'bg-green-500' }`}
                           style={{ width: `${((val || 0) / 5) * 100}%` }}
                         />
                       </div>
                       <span className="w-10 text-sm font-bold text-white text-right">{Number(val).toFixed(1)}</span>
                    </div>
                  ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No metrics found.</p>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: TECHNOLOGY ─────────────────────────────────────────────── */}
          {activeTab === 'tech' && (
            <div className="space-y-8">
               <div className="grid grid-cols-2 gap-4">
                 <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
                    <h4 className="text-slate-500 text-xs uppercase mb-1">Hosting Model</h4>
                    <p className="text-xl font-semibold text-white">{vendor.hosting_type || "Unknown"}</p>
                 </div>
                 <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
                    <h4 className="text-slate-500 text-xs uppercase mb-1">Data Classification</h4>
                    <p className="text-xl font-semibold text-white">{vendor.data_classification}</p>
                 </div>
               </div>

                 <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
                 <h4 className="text-slate-500 text-xs uppercase mb-4">System Architecture</h4>
                 <div
                   className="h-48 flex flex-col items-center justify-center rounded-lg gap-2"
                   style={{ border: '2px dashed rgba(255,255,255,0.06)', background: 'rgba(0,83,226,0.03)' }}
                 >
                   <svg className="w-8 h-8" style={{ color: '#1e293b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                   </svg>
                   <p className="text-xs" style={{ color: '#1e293b' }}>Architecture diagram not yet uploaded</p>
                   <p className="text-[10px]" style={{ color: '#0f172a' }}>Upload via the Admin panel after an RFI is completed</p>
                 </div>
               </div>
            </div>
          )}

          {/* ── TAB: DOCUMENTS ──────────────────────────────────────────────── */}
          {activeTab === 'docs' && (
            <div className="space-y-4">
              {/* VAR Report Download */}
              {vendor.has_var && vendor.latest_var_id ? (
                <a 
                  href={getDownloadUrl(vendor.latest_var_id)}
                  download
                  className="block p-4 bg-slate-900 border border-slate-700 hover:border-wmt-blue hover:shadow-[0_0_15px_rgba(0,83,226,0.2)] rounded-xl group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-900/20 border border-blue-900/50 flex items-center justify-center text-blue-400 shrink-0">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-white group-hover:text-wmt-blue transition-colors text-sm">
                          Vendor Assessment Report (VAR)
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-xs text-slate-500">Version 1.0</span>
                           <span className="text-slate-700">•</span>
                           <span className="text-xs text-slate-500">{vendor.last_assessed || 'Recent'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 group-hover:text-wmt-blue transition-colors">
                      <span className="text-xs font-semibold uppercase tracking-wider">Download</span>
                      <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                  </div>
                </a>
              ) : (
                <div className="p-6 bg-slate-900/50 border border-dashed border-slate-800 rounded-xl text-center">
                    <p className="text-slate-400 font-medium mb-1">No VAR Report Found</p>
                    <p className="text-slate-600 text-xs">This vendor has not been fully assessed yet.</p>
                </div>
              )}
              
              {/* Placeholder for NDA/Contracts */}
              <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-slate-400 text-sm">Non-Disclosure Agreement (NDA)</p>
                      <p className="text-xs text-slate-600">Status: Unknown</p>
                    </div>
                 </div>
                 <span className="text-xs text-slate-600 italic px-3 py-1 bg-slate-800 rounded-full">Not Linked</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};