/**
 * HistoryTab — monthly assessment highlights inside VendorDetailModal.
 */
import React from 'react';
import { Highlight } from '../../services/api';
import { bandStyle } from './shared';

interface Props {
  highlights: Highlight[];
  loading: boolean;
}

export function HistoryTab({ highlights, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-slate-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!highlights.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <p className="text-lg font-medium">No assessment history</p>
        <p className="text-sm mt-1">
          Highlights are populated from the monthly CSV imports.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {highlights.map(h => (
        <div
          key={h.id}
          className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <span className="text-xs font-mono text-slate-400">
              {h.source_file.replace('_updated.csv', '')}
            </span>
            {h.assessment_date && (
              <span className="text-xs text-wmt-yellow">{h.assessment_date}</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Product</p>
              <p className="text-xs text-slate-300 truncate">{h.product_name || '\u2014'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Score</p>
              <p
                className="text-xs font-bold"
                style={{
                  color: h.pre_assessment_score != null
                    ? (h.pre_assessment_score >= 4 ? '#2A8703'
                      : h.pre_assessment_score >= 3 ? '#0053E2'
                      : h.pre_assessment_score >= 2 ? '#F59E0B' : '#EA1100')
                    : '#9E9E9E',
                }}
              >
                {h.pre_assessment_score?.toFixed(2) ?? '\u2014'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Decision</p>
              <p className="text-xs">
                {h.pre_assessment_decision ? (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${bandStyle(h.pre_assessment_decision)}`}>
                    {h.pre_assessment_decision}
                  </span>
                ) : '\u2014'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Maturity</p>
              <p className="text-xs text-slate-300">{h.maturity_level || '\u2014'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
