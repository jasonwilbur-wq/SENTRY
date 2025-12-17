import React, { useState } from 'react';
import { PROCESSED_VENDORS } from '../utils/dataProcessor';
import { RiskLevel } from '../types';

export const VendorDashboard: React.FC = () => {
  const [filter, setFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredVendors = PROCESSED_VENDORS.filter(v => {
    const matchesCategory = filter === 'All' || v.category === filter;
    const matchesSearch = v.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          v.technologyProduct.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['All', ...Array.from(new Set(PROCESSED_VENDORS.map(v => v.category))).sort()];

  // Helper for Rating Stars
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        stars.push(<span key={i} className="text-yellow-400">★</span>);
      } else if (rating >= i - 0.5) {
        stars.push(<span key={i} className="text-yellow-400 opacity-75">☆</span>); // Simple approximation for half
      } else {
        stars.push(<span key={i} className="text-slate-600">★</span>);
      }
    }
    return stars;
  };

  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case RiskLevel.LOW: return 'bg-green-500';
      case RiskLevel.MEDIUM: return 'bg-yellow-500';
      case RiskLevel.HIGH: return 'bg-orange-500';
      case RiskLevel.CRITICAL: return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header / Search */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-sentry-card p-6 rounded-lg border border-slate-700 shadow-lg sticky top-0 z-20 backdrop-blur-md bg-opacity-90">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Vendor Directory</h2>
          <p className="text-slate-400 text-sm">Browse cards for {PROCESSED_VENDORS.length} emerging technology vendors.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
             <input 
                type="text" 
                placeholder="Search vendors or products..." 
                className="w-full md:w-72 bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:border-sentry-accent focus:outline-none placeholder-slate-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
             <svg className="w-4 h-4 text-slate-500 absolute right-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <select 
            className="bg-slate-900 text-white border border-slate-600 rounded px-4 py-2 focus:outline-none focus:border-sentry-accent"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map((vendor) => (
          <div key={vendor.id} className="bg-sentry-card rounded-lg border border-slate-700 shadow-lg hover:shadow-2xl hover:border-slate-500 transition-all duration-300 flex flex-col overflow-hidden group">
            
            {/* Card Header with Risk Indicator */}
            <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-start relative">
              <div className={`absolute top-0 left-0 w-1 h-full ${getRiskColor(vendor.riskLevel)}`}></div>
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-sentry-accent transition-colors line-clamp-1" title={vendor.companyName}>
                  {vendor.companyName}
                </h3>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 border border-slate-600">
                  {vendor.category}
                </span>
              </div>
              <div className="text-right">
                 <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                    vendor.riskLevel === RiskLevel.LOW ? 'bg-green-900/20 text-green-400 border border-green-800' :
                    vendor.riskLevel === RiskLevel.MEDIUM ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-800' :
                    'bg-red-900/20 text-red-400 border border-red-800'
                 }`}>
                   {vendor.riskLevel} Risk
                 </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-5 flex-grow space-y-4">
              
              {/* Product */}
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Technology Product</p>
                <p className="text-sm text-slate-200 line-clamp-2 min-h-[2.5em]">
                  {vendor.technologyProduct}
                </p>
              </div>

              {/* Rating & Status Row */}
              <div className="flex justify-between items-end">
                <div>
                   <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Security Rating</p>
                   <div className="flex items-center gap-2">
                     <span className="text-2xl font-bold text-white">{vendor.overallRating}</span>
                     <span className="text-xs text-slate-500 mb-1">/ 5.0</span>
                   </div>
                   <div className="flex text-sm">{renderStars(vendor.overallRating)}</div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Status</p>
                   <span className={`text-sm font-medium ${vendor.vendorStatus ? 'text-white' : 'text-slate-500 italic'}`}>
                     {vendor.vendorStatus || 'Active'}
                   </span>
                </div>
              </div>

              {/* Last Assessed */}
              <div className="pt-3 border-t border-slate-700/50 flex justify-between items-center">
                 <span className="text-xs text-slate-500">Last Assessed:</span>
                 <span className="text-xs font-mono text-sentry-accent">{vendor.lastAudited}</span>
              </div>

            </div>

            {/* Card Footer / Action */}
            <div className="p-4 bg-slate-900/50 border-t border-slate-700">
              <a 
                href={vendor.reportUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-semibold text-sm transition-all ${
                  vendor.reportUrl && vendor.reportUrl !== '#' 
                    ? 'bg-sentry-accent text-sentry-dark hover:bg-white hover:shadow-[0_0_15px_rgba(56,189,248,0.4)]' 
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
                onClick={(e) => { if(!vendor.reportUrl || vendor.reportUrl === '#') e.preventDefault() }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Vendor Report
              </a>
            </div>

          </div>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <div className="p-12 text-center bg-sentry-card rounded-lg border border-slate-700">
            <div className="text-slate-500 mb-2">No vendors found matching your criteria.</div>
            <button onClick={() => {setFilter('All'); setSearchTerm('');}} className="text-sentry-accent hover:underline text-sm">Clear Filters</button>
        </div>
      )}
    </div>
  );
};