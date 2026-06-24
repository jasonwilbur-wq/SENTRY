import React from 'react';
import { VendorOverviewTabProps } from './types';

export function VendorOverviewTab({
  modalBaseId,
  vendor,
  assessmentEvidence,
  isLoadingEvidence,
  semanticTags,
  stakeholderTags,
  secondaryDomains,
  reportCount,
  companyUrl,
  lastReviewedLabel,
  formatSignalLabel,
}: VendorOverviewTabProps) {
  return (
    <div id={`${modalBaseId}-panel-overview`} role="tabpanel" aria-labelledby={`${modalBaseId}-tab-overview`} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">About</h3>
          <p className="text-slate-300 leading-relaxed">
            {vendor.description || 'No working description is attached yet. Add one from the latest RFI, briefing, or analyst notes so this record is usable without opening source documents.'}
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Dominant Domain</p>
            <p className="mt-1 text-sm font-bold text-white">
              {formatSignalLabel(assessmentEvidence?.profile.dominant_domain || vendor.dominant_domain || vendor.category)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Evidence Files</p>
            <p className="mt-1 text-sm font-bold text-wmt-yellow">{isLoadingEvidence ? 'Loading…' : `${assessmentEvidence?.summary.artifact_count ?? 0} artifacts`}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Latest Source Change</p>
            <p className="mt-1 text-sm font-bold text-white">{assessmentEvidence?.profile.latest_modified_utc || vendor.last_assessed || 'Unknown'}</p>
          </div>
        </section>

        {(semanticTags.length > 0 || stakeholderTags.length > 0 || secondaryDomains.length > 0) && (
          <section className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Assessment Signal Map</h3>
            {semanticTags.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Semantic Tags</p>
                <div className="flex flex-wrap gap-2">
                  {semanticTags.map((tag) => (
                    <span key={tag} className="px-2 py-1 rounded-full text-xs border border-blue-900/50 bg-blue-900/20 text-blue-200">
                      {formatSignalLabel(tag)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {stakeholderTags.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Stakeholder Signals</p>
                <div className="flex flex-wrap gap-2">
                  {stakeholderTags.map((tag) => (
                    <span key={tag} className="px-2 py-1 rounded-full text-xs border border-yellow-900/40 bg-yellow-900/10 text-yellow-200">
                      {formatSignalLabel(tag)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {secondaryDomains.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Secondary Domains</p>
                <div className="flex flex-wrap gap-2">
                  {secondaryDomains.map((domain) => (
                    <span key={domain} className="px-2 py-1 rounded-full text-xs border border-slate-700 bg-slate-800/80 text-slate-300">
                      {formatSignalLabel(domain)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Products Assessed</h3>
          <div className="space-y-3">
            {(vendor.all_products || []).map((product, index) => (
              <div key={index} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center gap-4">
                <div>
                  <p className="font-semibold text-white">{product.technology_product || 'Unknown Product'}</p>
                  <p className="text-xs text-slate-500">Last assessed: {product.last_assessed || 'Pending'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${product.overall_rating >= 4 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {product.overall_rating.toFixed(1)} / 5.0
                  </p>
                  <p className="text-[11px] text-slate-500">Overall rating</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <p className="text-xs text-slate-500 uppercase">Headquarters</p>
            <p className="text-white font-medium">{vendor.hq_location || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Founded</p>
            <p className="text-white font-medium">{vendor.founded_year || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Company URL</p>
            {companyUrl ? (
              <a href={companyUrl} target="_blank" rel="noreferrer" className="text-wmt-blue hover:underline text-sm truncate block">
                {companyUrl}
              </a>
            ) : (
              <p className="text-slate-500 text-sm">Not linked</p>
            )}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h4 className="text-sm font-bold text-white mb-2">Walmart Stakeholders</h4>
          <div>
            <p className="text-xs text-slate-500 uppercase">Business Owner</p>
            <p className="text-white font-medium">{vendor.business_owner || 'TBD'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Sourcing Manager</p>
            <p className="text-white font-medium">{vendor.sourcing_manager || 'TBD'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Status</p>
            <span className="inline-block mt-1 px-2 py-1 rounded bg-blue-900/30 text-blue-300 text-xs font-bold border border-blue-800">
              {vendor.deployment_status}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Last Reviewed</p>
            <p className="text-white font-medium">{lastReviewedLabel}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Source Reports</p>
            <p className="text-white font-medium">{reportCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
