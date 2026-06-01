/**
 * ExecutivePostureCard - the CSO "walk-into-the-boardroom" widget.
 *
 * Presentational + pure: give it a list of vendors and it renders the
 * portfolio risk posture (overall grade, A-F band distribution, elevated-risk
 * count, assessment coverage, decision-band mix). All math lives in
 * utils/portfolio.ts so this stays a thin, testable view.
 *
 * WCAG: meaningful aria-labels on the grade + counts, 3:1+ contrast accents.
 */
import React, { useMemo, useEffect, useState } from 'react';
import { summarizePosture, type ScorableVendor } from '../utils/portfolio';
import { grade, type LetterGrade } from '../utils/grade';
import { fetchPortfolioPosture, type PortfolioPostureResponse } from '../services/api';

const BAND_ORDER: LetterGrade[] = ['A', 'B', 'C', 'D', 'F'];

interface ExecutivePostureCardProps {
  vendors: ScorableVendor[];
  /** Optional label clarifying the scope (e.g. "current view" vs "portfolio"). */
  scopeLabel?: string;
}

function Stat({ label, value, sub, colorHex }: {
  label: string; value: React.ReactNode; sub?: string; colorHex?: string;
}) {
  return (
    <div className="bg-slate-800/40 rounded-xl p-4 border border-white/5">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</div>
      <div className="text-2xl font-black mt-1" style={colorHex ? { color: colorHex } : undefined}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export const ExecutivePostureCard: React.FC<ExecutivePostureCardProps> = ({ vendors, scopeLabel = 'current view' }) => {
  const local = useMemo(() => summarizePosture(vendors), [vendors]);
  const [api, setApi] = useState<PortfolioPostureResponse | null>(null);
  const [scope, setScope] = useState(scopeLabel);

  useEffect(() => {
    let alive = true;
    fetchPortfolioPosture()
      .then((d) => {
        if (!alive) return;
        setApi(d);
        setScope('entire portfolio');
      })
      .catch(() => { /* keep local fallback */ });
    return () => { alive = false; };
  }, []);

  // Unified view shape from either the full-portfolio API or the local list.
  const view = useMemo(() => {
    if (api) {
      return {
        total: api.total,
        scored: api.scored,
        coveragePct: api.coverage_pct,
        meanScore: api.mean_score,
        portfolioGrade: (api.portfolio_grade || 'F') as LetterGrade,
        gradeBands: {
          A: api.grade_bands.A || 0, B: api.grade_bands.B || 0, C: api.grade_bands.C || 0,
          D: api.grade_bands.D || 0, F: api.grade_bands.F || 0,
        } as Record<LetterGrade, number>,
        elevatedRisk: api.elevated_risk,
        decisionBands: api.decision_bands,
      };
    }
    return {
      total: local.total, scored: local.scored, coveragePct: local.coveragePct,
      meanScore: local.meanScore, portfolioGrade: local.portfolioGrade,
      gradeBands: local.gradeBands, elevatedRisk: local.elevatedRisk,
      decisionBands: local.decisionBands,
    };
  }, [api, local]);

  const posture = view;
  const gradeInfo = grade(posture.meanScore);
  const maxBand = Math.max(1, ...BAND_ORDER.map((b) => posture.gradeBands[b]));

  return (
    <section
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 to-slate-950/70 p-6"
      aria-label="Executive risk posture"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Executive Risk Posture</h2>
          <p className="text-xs text-slate-500">Across {posture.total} vendors &middot; {scope}</p>
        </div>
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl font-black"
          style={{ color: gradeInfo.colorHex, border: `2px solid ${gradeInfo.colorHex}66`, background: `${gradeInfo.colorHex}1a` }}
          title={`Portfolio grade ${posture.portfolioGrade} - ${gradeInfo.label}`}
          aria-label={`Portfolio grade ${posture.portfolioGrade}, ${gradeInfo.label}`}
        >
          {posture.portfolioGrade}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat label="Mean Score" value={posture.meanScore !== null ? posture.meanScore.toFixed(2) : '\u2014'} sub="out of 5.0" colorHex={gradeInfo.colorHex} />
        <Stat label="Coverage" value={`${posture.coveragePct}%`} sub={`${posture.scored}/${posture.total} scored`} />
        <Stat label="Elevated Risk" value={posture.elevatedRisk} sub="High + Critical" colorHex={posture.elevatedRisk > 0 ? '#EA1100' : undefined} />
        <Stat label="Advance" value={posture.decisionBands['Advance'] || 0} sub="decision band" colorHex="#2A8703" />
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Grade Distribution</div>
        <div className="space-y-1.5">
          {BAND_ORDER.map((band) => {
            const count = posture.gradeBands[band];
            const pct = (count / maxBand) * 100;
            const c = grade(band === 'A' ? 5 : band === 'B' ? 4 : band === 'C' ? 3 : band === 'D' ? 2 : 0).colorHex;
            return (
              <div key={band} className="flex items-center gap-3" aria-label={`Grade ${band}: ${count} vendors`}>
                <span className="w-4 text-xs font-bold" style={{ color: c }}>{band}</span>
                <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: c }} />
                </div>
                <span className="w-8 text-right text-xs text-slate-400">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
