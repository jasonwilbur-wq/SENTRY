/**
 * TechAssessmentTab — Phase 2B component.
 *
 * Shows the vendor's Assessment Pipeline progress:
 * Pre-Assessment → Initial Assessment → Technical Assessment → VAR Complete
 *
 * Data comes from vendor_highlights table (imported from monthly CSVs).
 */
import React, { useEffect, useState } from 'react';
import { fetchVendorTechPipeline, TechPipeline, TechProduct } from '../services/api';

const STAGE_LABELS = [
  'Not Started',
  'Pre-Assessment',
  'Initial Assessment',
  'Technical Assessment',
  'VAR Complete',
];

const STAGE_COLORS = [
  'bg-gray-700 text-gray-400',
  'bg-blue-900 text-blue-300',
  'bg-yellow-900 text-yellow-300',
  'bg-purple-900 text-purple-300',
  'bg-green-900 text-green-300',
];

const IA_COLOR: Record<string, string> = {
  pass:  'text-green-400',
  yes:   'text-green-400',
  fail:  'text-red-400',
  no:    'text-red-400',
  '':    'text-gray-500',
};

function iaColor(val: string) {
  return IA_COLOR[val.toLowerCase()] ?? 'text-gray-400';
}

function PipelineStepper({ stage }: { stage: number }) {
  const steps = ['Pre', 'Initial', 'Technical', 'VAR'];
  return (
    <div className="flex items-center gap-0 mt-1">
      {steps.map((label, i) => {
        const stepStage = i + 1;
        const active    = stage >= stepStage;
        return (
          <React.Fragment key={label}>
            <div className={`flex flex-col items-center`}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  active
                    ? 'bg-blue-600 border-blue-400 text-white'
                    : 'bg-gray-800 border-gray-600 text-gray-500'
                }`}
              >
                {active ? '✓' : stepStage}
              </div>
              <span className={`text-[9px] mt-0.5 ${ active ? 'text-blue-300' : 'text-gray-600'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-8 mb-3 ${ stage > stepStage ? 'bg-blue-500' : 'bg-gray-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 text-center flex-1">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-gray-400 text-xs mt-0.5">{label}</div>
    </div>
  );
}

function ProductRow({ p }: { p: TechProduct }) {
  const stageLabel = STAGE_LABELS[p.pipeline_stage] ?? 'Unknown';
  const stageColor = STAGE_COLORS[p.pipeline_stage] ?? '';
  const iaVal      = p.initial_assessment || '—';
  const taVal      = p.technical_assessment === 'Yes' ? '✔ Yes' : (p.technical_assessment || '—');

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
      <td className="py-2 px-3 text-sm text-gray-200 max-w-xs">
        <div className="truncate" title={p.product_name}>{p.product_name}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">{p.source_file.replace('_updated.csv', '')} · {p.assessment_date}</div>
      </td>
      <td className="py-2 px-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageColor}`}>
          {stageLabel}
        </span>
      </td>
      <td className="py-2 px-3">
        <PipelineStepper stage={p.pipeline_stage} />
      </td>
      <td className={`py-2 px-3 text-sm font-medium ${iaColor(p.initial_assessment)}`}>
        {iaVal}
      </td>
      <td className={`py-2 px-3 text-sm font-medium ${ p.technical_assessment === 'Yes' ? 'text-green-400' : 'text-gray-500'}`}>
        {taVal}
      </td>
      <td className="py-2 px-3 text-sm text-gray-400">
        {p.maturity_level || '—'}
      </td>
    </tr>
  );
}

interface Props {
  vendorId: string;
}

export function TechAssessmentTab({ vendorId }: Props) {
  const [data,    setData]    = useState<TechPipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    fetchVendorTechPipeline(vendorId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [vendorId]);

  if (loading) {
    return <div className="text-gray-400 text-sm py-8 text-center">Loading pipeline data…</div>;
  }
  if (error) {
    return <div className="text-red-400 text-sm py-8 text-center">{error}</div>;
  }
  if (!data || !data.has_pipeline_data) {
    return (
      <div className="text-gray-500 text-sm py-8 text-center">
        No assessment pipeline data found for this vendor.
      </div>
    );
  }

  const { summary, products } = data;
  const maxStage = summary.max_pipeline_stage;

  return (
    <div className="space-y-5">
      {/* ─ Pipeline Banner ─ */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
            Assessment Pipeline
          </h4>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STAGE_COLORS[maxStage] ?? ''}`}>
            Highest Stage: {STAGE_LABELS[maxStage]}
          </span>
        </div>
        {/* Full-width stepper */}
        <div className="flex items-center gap-0">
          {['Pre-Assessment', 'Initial', 'Technical', 'VAR Complete'].map((label, i) => {
            const stepStage = i + 1;
            const active = maxStage >= stepStage;
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center flex-none">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    active ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/50' : 'bg-gray-800 border-gray-600 text-gray-500'
                  }`}>
                    {active ? '✓' : stepStage}
                  </div>
                  <span className={`text-xs mt-1.5 font-medium ${ active ? 'text-blue-300' : 'text-gray-600'}`}>
                    {label}
                  </span>
                </div>
                {i < 3 && (
                  <div className={`h-0.5 flex-1 mb-4 ${ maxStage > stepStage ? 'bg-blue-500' : 'bg-gray-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ─ Summary Cards ─ */}
      <div className="flex gap-3">
        <SummaryCard label="Products" value={summary.total_products} color="text-white" />
        <SummaryCard label="Initial Pass" value={summary.initial_pass} color="text-green-400" />
        <SummaryCard label="Initial Fail" value={summary.initial_fail} color="text-red-400" />
        <SummaryCard label="Tech Assessed" value={summary.technically_assessed} color="text-purple-400" />
      </div>

      {/* ─ Product Table ─ */}
      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
              <th className="py-2 px-3">Product</th>
              <th className="py-2 px-3">Stage</th>
              <th className="py-2 px-3">Pipeline</th>
              <th className="py-2 px-3">Initial Assess.</th>
              <th className="py-2 px-3">Tech Assess.</th>
              <th className="py-2 px-3">Maturity</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <ProductRow key={p.product_name} p={p} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
