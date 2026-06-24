import React from 'react';
import { VendorInsightsTabProps } from './types';

export function VendorInsightsTab({
  modalBaseId,
  vendor,
  hasInsights,
  insightTakeaways,
  uniqueConcernItems,
}: VendorInsightsTabProps) {
  return (
    <div id={`${modalBaseId}-panel-insights`} role="tabpanel" aria-labelledby={`${modalBaseId}-tab-insights`} className="space-y-6">
      {vendor.vendor_highlight && (
        <div
          className="p-5 rounded-xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(0,83,226,0.08) 0%, rgba(255,194,32,0.06) 100%)',
            border: '1px solid rgba(0,83,226,0.2)',
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl" style={{ background: 'rgba(255,194,32,0.1)' }} aria-hidden />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-wmt-yellow" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <h3 className="text-sm font-bold text-wmt-yellow uppercase tracking-widest">Key Highlight</h3>
            </div>
            <p className="text-white text-sm leading-relaxed">{vendor.vendor_highlight}</p>
          </div>
        </div>
      )}

      <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">SENTRY Analyst Takeaways</h3>
            <p className="text-xs text-slate-500 mt-1">Decision-ready narrative generated from curated insight fields, assessment evidence, and score status.</p>
          </div>
          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-700 text-slate-300 bg-slate-800/80">
            {hasInsights ? 'Curated + Derived' : 'Derived from Evidence'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {insightTakeaways.map((item) => (
            <div key={item.label} className="rounded-lg bg-slate-950/60 border border-slate-800 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.label}</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-100">{item.value}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{item.helper}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {vendor.use_cases && (
            <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Use Cases</h4>
              </div>
              <div className="space-y-2">
                {vendor.use_cases.split('|').map((useCase, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-wmt-blue text-sm mt-0.5">•</span>
                    <p className="text-slate-300 text-sm leading-relaxed">{useCase.trim()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vendor.value_to_walmart && (
            <div className="p-5 rounded-xl bg-slate-900/50 border border-green-900/30">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-sm font-bold text-green-400 uppercase tracking-widest">Value to Walmart</h4>
              </div>
              <div className="space-y-2">
                {vendor.value_to_walmart.split('|').map((value, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-green-400 text-sm mt-0.5">✓</span>
                    <p className="text-slate-300 text-sm leading-relaxed">{value.trim()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vendor.maturity_level && (
            <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
              <h4 className="text-xs text-slate-500 uppercase tracking-widest mb-2">Maturity Level</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 to-green-500 rounded-full"
                    style={{ width: vendor.maturity_level.toLowerCase().includes('early') ? '33%' : vendor.maturity_level.toLowerCase().includes('growth') ? '66%' : '100%' }}
                  />
                </div>
                <span className="text-sm font-bold text-white">{vendor.maturity_level}</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {vendor.pros && (
            <div className="p-5 rounded-xl bg-green-900/10 border border-green-900/30">
              <h4 className="text-sm font-bold text-green-400 uppercase tracking-widest mb-3">Strengths</h4>
              <div className="space-y-2">
                {vendor.pros.split('|').map((pro, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-green-400 text-sm mt-0.5">+</span>
                    <p className="text-slate-300 text-sm leading-relaxed">{pro.trim()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vendor.cons && (
            <div className="p-5 rounded-xl bg-orange-900/10 border border-orange-900/30">
              <h4 className="text-sm font-bold text-orange-400 uppercase tracking-widest mb-3">Challenges</h4>
              <div className="space-y-2">
                {vendor.cons.split('|').map((con, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-orange-400 text-sm mt-0.5">−</span>
                    <p className="text-slate-300 text-sm leading-relaxed">{con.trim()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uniqueConcernItems.length > 0 && (
            <div className="p-5 rounded-xl bg-red-900/10 border border-red-900/30">
              <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-3">Security Concerns</h4>
              <div className="space-y-2">
                {uniqueConcernItems.map((item, index) => (
                  <div key={`${item.text}-${index}`} className="flex items-start gap-2">
                    <span className="text-red-400 text-sm mt-0.5">⚠</span>
                    <p className="text-slate-300 text-sm leading-relaxed">{item.text}</p>
                    <span
                      className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        item.source === 'VAR'
                          ? 'border-blue-900/40 text-blue-300 bg-blue-900/20'
                          : 'border-slate-700 text-slate-400 bg-slate-900/40'
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

      {!hasInsights && (
        <div className="py-16 text-center rounded-xl border border-dashed border-slate-700 bg-slate-900/30">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-slate-400 font-semibold mb-1">No insight narrative is attached yet</p>
          <p className="text-slate-600 text-sm">Add highlights, strengths, challenges, or use-case notes so reviewers do not have to reconstruct the story from raw files.</p>
        </div>
      )}
    </div>
  );
}
