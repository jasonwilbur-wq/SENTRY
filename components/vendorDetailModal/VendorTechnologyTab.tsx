import React from 'react';
import { TechAssessmentTab } from '../TechAssessmentTab';
import { VendorTechnologyTabProps } from './types';

export function VendorTechnologyTab({
  modalBaseId,
  vendor,
  sourceReportCount,
  dominantDomainLabel,
  useCaseItems,
  semanticTags,
  secondaryDomains,
  formatSignalValue,
  formatSignalLabel,
}: VendorTechnologyTabProps) {
  return (
    <div id={`${modalBaseId}-panel-tech`} role="tabpanel" aria-labelledby={`${modalBaseId}-tab-tech`} className="space-y-8">
      <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Technology Context</h3>
            <p className="mt-1 text-sm text-slate-400">
              What the capability appears to do, where it fits, and what evidence is available before reviewers open source files.
            </p>
          </div>
          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-700 text-slate-300 bg-slate-800/80">
            {sourceReportCount} report{sourceReportCount === 1 ? '' : 's'} tracked
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Primary Capability</p>
            <p className="mt-2 text-sm font-semibold text-white">{vendor.technology_product || formatSignalValue(vendor.category)}</p>
            <p className="mt-2 text-[11px] text-slate-500">Domain: {formatSignalValue(dominantDomainLabel || vendor.category)}</p>
          </div>
          <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Use-Case Coverage</p>
            <p className="mt-2 text-sm font-semibold text-white">{useCaseItems.length ? `${useCaseItems.length} signal${useCaseItems.length === 1 ? '' : 's'} captured` : 'Not captured'}</p>
            <p className="mt-2 text-[11px] text-slate-500">{useCaseItems.slice(0, 2).join(' • ') || 'Add field, store, aviation, investigations, or asset-protection context.'}</p>
          </div>
          <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Architecture Readiness</p>
            <p className="mt-2 text-sm font-semibold text-white">{vendor.hosting_type || 'Hosting TBD'} · {vendor.data_classification || 'Data class TBD'}</p>
            <p className="mt-2 text-[11px] text-slate-500">Capture cloud dependency, integrations, data types, and operational owner before approval.</p>
          </div>
        </div>

        {(semanticTags.length > 0 || secondaryDomains.length > 0) && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Technology Signals</p>
            <div className="flex flex-wrap gap-2">
              {[...semanticTags, ...secondaryDomains].slice(0, 14).map((tag) => (
                <span key={tag} className="px-2 py-1 rounded-full text-xs border border-blue-900/50 bg-blue-900/20 text-blue-200">
                  {formatSignalLabel(tag)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
          <h4 className="text-slate-500 text-xs uppercase mb-1">Hosting Model</h4>
          <p className="text-xl font-semibold text-white">{vendor.hosting_type || 'Unknown'}</p>
        </div>
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
          <h4 className="text-slate-500 text-xs uppercase mb-1">Data Classification</h4>
          <p className="text-xl font-semibold text-white">{vendor.data_classification || 'Internal'}</p>
        </div>
      </div>

      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="text-slate-500 text-xs uppercase mb-1">Assessment Pipeline</h4>
            <p className="text-sm text-slate-400">Product-stage progress from imported highlights, source-backed directory rows, and linked VAR evidence.</p>
          </div>
          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-700 text-slate-300 bg-slate-800/80">
            Source: Highlights + Evidence
          </span>
        </div>
        <TechAssessmentTab vendorId={vendor.id} />
      </div>
    </div>
  );
}
