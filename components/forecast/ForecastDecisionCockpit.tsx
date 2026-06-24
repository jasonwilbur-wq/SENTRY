/**
 * ForecastDecisionCockpit
 *
 * Research-informed executive cockpit for using forecast data operationally:
 * delta-first, decision-linked, dual-axis scored, evidence-defensible, and
 * accountable across quarters.
 */
import React, { useMemo, useState } from 'react';
import { GlassCard3D } from '../GlassCard3D';
import {
  FORECAST_ACCOUNTABILITY_LOOP,
  FORECAST_DECISION_CARDS,
  FORECAST_LENSES,
  FORECAST_PRODUCT_MODULES,
  FORECAST_PROGRAM_PATTERNS,
  type ForecastDecisionCard,
  type ForecastLens,
} from '../../data/forecastOperatingModel';
import type { EvidenceConfidence, ExecutivePosture } from '../../data/forecastData';

const POSTURE_COLORS: Record<ExecutivePosture, string> = {
  Green: '#22c55e',
  Yellow: '#FFC220',
  Red: '#ef4444',
};

const CONFIDENCE_COLORS: Record<EvidenceConfidence, string> = {
  High: '#22c55e',
  Medium: '#FFC220',
  Low: '#f97316',
};

const STATUS_COLORS = {
  'Live now': '#22c55e',
  'Prototype now': '#FFC220',
  'Next backend hardening': '#60a5fa',
} as const;

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ color, borderColor: `${color}66`, background: `${color}14` }}
    >
      {label}
    </span>
  );
}

function DecisionCard({ card }: { card: ForecastDecisionCard }) {
  const postureColor = POSTURE_COLORS[card.posture];
  const confidenceColor = CONFIDENCE_COLORS[card.confidence];

  return (
    <GlassCard3D
      glowColor={postureColor}
      intensity={5}
      className="bg-slate-900/75 border border-slate-700 rounded-2xl p-5 flex flex-col"
      style={{ borderTopColor: postureColor, borderTopWidth: '3px', backdropFilter: 'blur(12px)' }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Pill label={card.posture === 'Green' ? 'Act Now' : card.posture === 'Yellow' ? 'Gate / Pilot' : 'Constrain'} color={postureColor} />
        <Pill label={`${card.confidence} Confidence`} color={confidenceColor} />
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{card.deltaStatus}</span>
      </div>

      <h4 className="text-white text-sm font-black leading-snug mb-2">{card.title}</h4>
      <p className="text-[11px] text-slate-400 leading-relaxed mb-4">{card.whyItMatters}</p>

      <div className="space-y-3 text-xs leading-relaxed">
        <div>
          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Decision ask</p>
          <p className="text-slate-200">{card.decisionAsk}</p>
        </div>
        <div>
          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Next action</p>
          <p className="text-slate-300">{card.nextAction}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-700/60 pt-3">
          <div>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Horizon</p>
            <p className="text-slate-300">{card.horizon}</p>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Owner lane</p>
            <p className="text-slate-300">{card.owner}</p>
          </div>
        </div>
        <details className="group rounded-xl border border-slate-700/60 bg-white/[0.03] p-3">
          <summary className="cursor-pointer list-none text-[11px] font-bold text-blue-300 group-open:text-yellow-300">
            Evidence basis and safeguards
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Source basis</p>
              <p className="text-slate-300">{card.sourceBasis}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Open unknowns</p>
              <p className="text-slate-300">{card.openUnknowns}</p>
            </div>
            <ul className="space-y-1">
              {card.safeguards.map(s => (
                <li key={s} className="flex gap-2 text-[11px] text-slate-400">
                  <span className="shrink-0 text-yellow-300">-</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>
    </GlassCard3D>
  );
}

export const ForecastDecisionCockpit: React.FC = () => {
  const [lens, setLens] = useState<ForecastLens>('All');
  const [highConfidenceOnly, setHighConfidenceOnly] = useState(false);

  const filteredCards = useMemo(() => (
    FORECAST_DECISION_CARDS.filter(card => {
      const lensMatch = lens === 'All' || card.lenses.includes(lens);
      const confidenceMatch = !highConfidenceOnly || card.confidence === 'High';
      return lensMatch && confidenceMatch;
    })
  ), [lens, highConfidenceOnly]);

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-xl font-black text-white tracking-wide">Forecast Cockpit — Decision Product</h3>
        <p className="text-slate-400 text-sm mt-1 leading-relaxed max-w-5xl">
          Research synthesis from mature forecast, intelligence, strategy, and security programs: the product wins when it converts
          forecast data into traceable executive decisions, confidence, evidence, and accountability.
        </p>
      </div>

      <GlassCard3D
        glowColor="#0053e2"
        intensity={4}
        className="bg-slate-950/80 border border-blue-500/30 rounded-2xl p-5"
        style={{ backdropFilter: 'blur(14px)' }}
      >
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {FORECAST_PROGRAM_PATTERNS.map(pattern => (
            <div key={pattern.title} className="rounded-xl border border-slate-700 bg-white/[0.03] p-4">
              <h4 className="text-white text-sm font-black mb-2">{pattern.title}</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{pattern.summary}</p>
              <p className="text-[11px] text-blue-300 leading-relaxed">SENTRY move: {pattern.sentryProductMove}</p>
            </div>
          ))}
        </div>
      </GlassCard3D>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
        <div>
          <p className="text-white font-black text-sm">Executive Decision Board</p>
          <p className="text-slate-500 text-xs mt-0.5">Filter by leadership lens and confidence. Color shows action posture; label shows evidence confidence.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FORECAST_LENSES.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setLens(item)}
              className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-all ${
                lens === item
                  ? 'border-yellow-300 bg-yellow-300/15 text-yellow-300'
                  : 'border-slate-700 bg-slate-950/60 text-slate-400 hover:border-blue-400 hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setHighConfidenceOnly(v => !v)}
            className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-all ${
              highConfidenceOnly
                ? 'border-emerald-300 bg-emerald-300/15 text-emerald-300'
                : 'border-slate-700 bg-slate-950/60 text-slate-400 hover:border-emerald-400 hover:text-white'
            }`}
          >
            High confidence only
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredCards.map(card => <DecisionCard key={card.id} card={card} />)}
      </div>

      {filteredCards.length === 0 && (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 text-center text-sm text-slate-400">
          No decision cards match this lens and confidence filter.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <GlassCard3D
          glowColor="#FFC220"
          intensity={4}
          className="bg-slate-900/70 border border-yellow-500/30 rounded-2xl p-5"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <h4 className="font-black text-yellow-300 text-sm mb-4">Forecast Accountability Loop</h4>
          <ol className="space-y-3">
            {FORECAST_ACCOUNTABILITY_LOOP.map((step, index) => (
              <li key={step} className="flex gap-3 text-xs text-slate-300 leading-relaxed">
                <span className="shrink-0 w-6 h-6 rounded-full bg-yellow-300/10 text-yellow-300 border border-yellow-300/30 flex items-center justify-center font-black text-[10px]">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </GlassCard3D>

        <GlassCard3D
          glowColor="#22c55e"
          intensity={4}
          className="bg-slate-900/70 border border-emerald-500/30 rounded-2xl p-5"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <h4 className="font-black text-emerald-300 text-sm mb-4">Productization Roadmap</h4>
          <div className="space-y-3">
            {FORECAST_PRODUCT_MODULES.map(module => (
              <div key={module.name} className="rounded-xl border border-slate-700 bg-white/[0.03] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <p className="text-white text-sm font-bold">{module.name}</p>
                  <Pill label={module.sentryStatus} color={STATUS_COLORS[module.sentryStatus]} />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{module.executiveValue}</p>
                <p className="text-[11px] text-blue-300 leading-relaxed mt-1">Output: {module.output}</p>
              </div>
            ))}
          </div>
        </GlassCard3D>
      </div>
    </section>
  );
};
