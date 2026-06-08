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
] as const;

function stageLabel(stage: number, hasVarScored: boolean): string {
  if (stage === 4 && !hasVarScored) return 'VAR Linked';
  return STAGE_LABELS[stage] ?? 'Unknown';
}

function stageBadgeColor(stage: number, hasVarScored: boolean): string {
  if (stage === 4 && !hasVarScored) return 'bg-amber-900 text-amber-300';
  return [
    'bg-gray-700 text-gray-400',
    'bg-blue-900 text-blue-300',
    'bg-yellow-900 text-yellow-300',
    'bg-purple-900 text-purple-300',
    'bg-green-900 text-green-300',
  ][stage] ?? 'bg-gray-700 text-gray-400';
}

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
    <div className="bg-gray-800 rounded-lg p-3 text-center min-w-0">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-gray-400 text-xs mt-0.5">{label}</div>
    </div>
  );
}

function formatSourceLabel(sourceFile: string) {
  return sourceFile.replace('_updated.csv', '').replace(/[_-]/g, ' ');
}

function ProductRow({ p, hasVarScored }: { p: TechProduct; hasVarScored: boolean }) {
  const stageText = stageLabel(p.pipeline_stage, hasVarScored);
  const stageColor = stageBadgeColor(p.pipeline_stage, hasVarScored);
  const iaVal      = p.initial_assessment || '—';
  const taVal      = p.technical_assessment === 'Yes' ? 'Yes' : (p.technical_assessment || '—');

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
      <td className="py-2 px-3 text-sm text-gray-200 max-w-xs">
        <div className="truncate" title={p.product_name}>{p.product_name}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">{formatSourceLabel(p.source_file)} · {p.assessment_date}</div>
      </td>
      <td className="py-2 px-3 text-sm text-gray-400">
        {p.pre_assessment_score !== null ? p.pre_assessment_score.toFixed(1) : '—'}
      </td>
      <td className="py-2 px-3">
        <div className="flex flex-col items-start gap-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageColor}`}>
            {stageText}
          </span>
          {p.has_var && !hasVarScored && (
            <span className="text-[10px] text-amber-300">VAR linked · score extraction pending</span>
          )}
        </div>
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
      <div className="text-gray-500 text-sm py-8 text-center border border-dashed border-gray-700 rounded-xl bg-gray-900/40">
        <p className="text-gray-300 font-medium mb-1">No pipeline activity has been imported yet</p>
        <p className="text-xs text-gray-500">Load monthly highlight data for this company to show pre-assessment, technical review, and VAR progression here.</p>
      </div>
    );
  }

  const { summary, products } = data;
  const maxStage = summary.max_pipeline_stage;
  const highestStageLabel = stageLabel(maxStage, data.has_var_scored);
  const highestStageColor = stageBadgeColor(maxStage, data.has_var_scored);
  const finalStageLabel = data.has_var_scored ? 'VAR Complete' : data.has_var ? 'VAR Linked' : 'VAR';

  return (
    <div className="space-y-5">
      {/* ─ Pipeline Banner ─ */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
              Assessment Pipeline
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              Tracking {summary.total_products} grouped {summary.total_products === 1 ? 'product' : 'products'} across pre-assessment, technical review, VAR linking, and score extraction.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${highestStageColor}`}>
              Highest Stage: {highestStageLabel}
            </span>
            {data.has_var && data.has_var_scored && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-green-900/40 text-green-300 border border-green-800/60">
                VAR scored
              </span>
            )}
            {data.has_var && !data.has_var_scored && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-amber-900/30 text-amber-300 border border-amber-800/70">
                VAR linked · score extraction pending
              </span>
            )}
          </div>
        </div>
        {/* Full-width stepper */}
        <div className="flex items-center gap-0">
          {['Pre-Assessment', 'Initial', 'Technical', finalStageLabel].map((label, i) => {
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
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
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
              <th className="py-2 px-3">Pre Score</th>
              <th className="py-2 px-3">Stage</th>
              <th className="py-2 px-3">Pipeline</th>
              <th className="py-2 px-3">Initial Assess.</th>
              <th className="py-2 px-3">Tech Assess.</th>
              <th className="py-2 px-3">Maturity</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <ProductRow key={p.product_name} p={p} hasVarScored={data.has_var_scored} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
