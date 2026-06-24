import React from 'react';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { grade, isScored } from '../../utils/grade';
import { VendorRiskTabProps } from './types';

export function VendorRiskTab({
  modalBaseId,
  vendor,
  isHydratingVar,
  hasVarScoreData,
  hasResolvedVarScore,
  scoreSourceLabel,
  scoreProfileData,
  hasScoreProfileData,
  varStatusMeta,
  primaryPostureScore,
  riskSummaryCards,
  decisionBand,
  decisionPath,
  detailedPostureMetrics,
  uniqueConcernItems,
}: VendorRiskTabProps) {
  return (
    <div id={`${modalBaseId}-panel-risk`} role="tabpanel" aria-labelledby={`${modalBaseId}-tab-risk`} className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      <div className="flex flex-col items-center justify-center bg-slate-900/50 rounded-2xl border border-slate-800 p-6 relative">
        <div className="absolute top-6 left-6 right-6 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Security Posture Profile</h3>
            <p className="mt-1 text-[11px] text-slate-500">
              {hasVarScoreData ? 'Structured VAR score dimensions' : 'Directory-derived posture proxy until VAR extraction is complete'}
            </p>
          </div>
          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-700 text-slate-300 bg-slate-800/80">
            {scoreSourceLabel}
          </span>
        </div>
        {hasScoreProfileData ? (
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart cx="50%" cy="54%" outerRadius="65%" data={scoreProfileData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
              <Radar name={vendor.company_name} dataKey="A" stroke="#0053E2" strokeWidth={3} fill="#0053E2" fillOpacity={0.3} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} itemStyle={{ color: '#f1f5f9' }} />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-slate-500">
            {isHydratingVar ? (
              <>
                <p className="text-lg text-slate-300">Pulling latest VAR metrics…</p>
                <p className="text-sm">Syncing security posture from the linked Vendor Assessment Report.</p>
              </>
            ) : (
              <>
                <p className="text-lg">No posture data available</p>
                <p className="text-sm">Attach a directory rating, evidence inventory, or structured VAR score to populate this profile.</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {varStatusMeta && !hasResolvedVarScore && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-amber-300">Score Extraction Pending</h4>
            <p className="text-sm text-slate-300">{varStatusMeta.helper}</p>
            <p className="text-xs text-slate-400">Security Posture is using the linked Vendor Assessment Report status and directory rating until weighted scoring fields are extracted.</p>
          </div>
        )}

        {(vendor.has_var || primaryPostureScore != null) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {riskSummaryCards.map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{card.label}</p>
                <p className="mt-2 text-lg font-black" style={{ color: card.accent }}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {(vendor.has_var || primaryPostureScore != null) && (
          <div className="p-4 rounded-xl border border-blue-900/40 bg-blue-950/20 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-blue-300">{hasVarScoreData ? 'VAR Decision Annotation' : 'Directory Posture Annotation'}</h4>
              <span className="text-[10px] text-slate-400">{vendor.last_assessed || 'Latest'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-1 rounded text-xs font-bold border border-blue-700/40 bg-blue-900/20 text-blue-200">
                {hasVarScoreData ? 'Weight Score' : 'Directory Rating'}: {primaryPostureScore !== null ? `${Number(primaryPostureScore).toFixed(1)} / 5.0` : 'N/A'}
              </span>
              {isScored(primaryPostureScore) && (
                <span
                  className="px-2 py-1 rounded text-xs font-black border"
                  style={{
                    color: grade(primaryPostureScore).colorHex,
                    borderColor: `${grade(primaryPostureScore).colorHex}66`,
                    background: `${grade(primaryPostureScore).colorHex}1a`,
                  }}
                  title={`Grade ${grade(primaryPostureScore).letter} — ${grade(primaryPostureScore).label}`}
                >
                  Grade {grade(primaryPostureScore).letter}
                </span>
              )}
              <span className="px-2 py-1 rounded text-xs font-bold border" style={{ borderColor: 'rgba(255,194,32,0.45)', background: 'rgba(255,194,32,0.12)', color: '#ffc220' }}>
                Decision Band: {decisionBand || 'Pending'}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              {decisionPath ||
                (hasVarScoreData
                  ? 'Decision path will appear after score extraction completes.'
                  : 'Directory-derived annotation: use this as a triage view until structured VAR score extraction is complete.')}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Detailed Metrics</h3>
          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-900/40 text-blue-300 bg-blue-900/20">
            {hasVarScoreData ? `VAR Source: ${vendor.last_assessed || 'Latest'}` : 'Proxy Source: Directory + Evidence'}
          </span>
        </div>
        {detailedPostureMetrics.length > 0 ? (
          <div className="space-y-3">
            {detailedPostureMetrics.map(([key, value]) => (
              <div key={String(key)} className="flex items-center gap-4">
                <span className="w-36 text-sm text-slate-400 text-right font-medium tracking-wide">{String(key)}</span>
                <div className="flex-1 h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${(Number(value) || 0) < 3 ? 'bg-red-500' : (Number(value) || 0) < 4 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${((Number(value) || 0) / 5) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-sm font-bold text-white text-right">{Number(value).toFixed(1)}</span>
              </div>
            ))}
            {!hasVarScoreData && (
              <p className="pt-2 text-[11px] leading-relaxed text-slate-500">
                Proxy metrics are derived from the directory rating, document inventory, and captured technology context. They should be replaced by structured VAR scores when extraction is complete.
              </p>
            )}
          </div>
        ) : (
          <p className="text-slate-500 italic">No posture metrics found.</p>
        )}

        {vendor.has_var && uniqueConcernItems.length > 0 && (
          <div className="mt-8 p-5 rounded-xl bg-red-900/10 border border-red-900/30">
            <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-3">VAR Concern Annotations</h4>
            <div className="space-y-2">
              {uniqueConcernItems.map((item, index) => (
                <div key={`${item.text}-${index}`} className="flex items-start gap-2">
                  <span className="text-red-400 text-sm mt-0.5">⚠</span>
                  <p className="text-slate-300 text-sm leading-relaxed">{item.text}</p>
                  <span
                    className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      item.source === 'VAR' ? 'border-blue-900/40 text-blue-300 bg-blue-900/20' : 'border-slate-700 text-slate-400 bg-slate-900/40'
                    }`}
                  >
                    {item.source}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
