import React, { useState } from 'react';

export const RequestAssessment: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // Logic to submit data would go here
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <div className="bg-sentry-card p-8 rounded-lg border border-sentry-success/50 shadow-[0_0_50px_rgba(74,222,128,0.1)] text-center max-w-lg">
          <div className="w-16 h-16 bg-sentry-success/20 text-sentry-success rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Request Submitted</h2>
          <p className="text-slate-400 mb-6">Your security assessment request has been queued. The GRC team will review the details and assign an analyst within 24 hours.</p>
          <button onClick={() => setSubmitted(false)} className="text-sentry-accent hover:underline">Submit another request</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-sentry-card border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-fadeIn">
      <div className="bg-slate-800/80 p-6 border-b border-slate-700">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </span>
            Request Security Assessment
        </h2>
        <p className="text-slate-400 mt-1 ml-14">Initiate a formal security review for a new or existing technology vendor.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        
        {/* Section 1 */}
        <div className="space-y-4">
            <h3 className="text-sentry-accent font-bold uppercase text-xs tracking-wider border-b border-slate-700 pb-2">Project Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Project Name</label>
                    <input required type="text" className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:border-sentry-accent focus:outline-none" placeholder="e.g. Project Orion" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Cost Center</label>
                    <input required type="text" className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:border-sentry-accent focus:outline-none" placeholder="e.g. 102938" />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Business Justification</label>
                <textarea required rows={3} className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:border-sentry-accent focus:outline-none" placeholder="Describe the business need and expected outcome..." />
            </div>
        </div>

        {/* Section 2 */}
        <div className="space-y-4">
            <h3 className="text-sentry-accent font-bold uppercase text-xs tracking-wider border-b border-slate-700 pb-2">Vendor Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Vendor Name</label>
                    <input required type="text" className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:border-sentry-accent focus:outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Vendor Website</label>
                    <input type="url" className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:border-sentry-accent focus:outline-none" placeholder="https://" />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Primary Contact (Email)</label>
                <input required type="email" className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:border-sentry-accent focus:outline-none" />
            </div>
        </div>

        {/* Section 3 */}
        <div className="space-y-4">
            <h3 className="text-sentry-accent font-bold uppercase text-xs tracking-wider border-b border-slate-700 pb-2">Data & Risk</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Data Classification</label>
                    <select className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:border-sentry-accent focus:outline-none">
                        <option>Public</option>
                        <option>Internal</option>
                        <option>Confidential</option>
                        <option>Highly Confidential</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Target Go-Live</label>
                    <input type="date" className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:border-sentry-accent focus:outline-none" />
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Est. Users</label>
                    <input type="number" className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:border-sentry-accent focus:outline-none" />
                </div>
            </div>
        </div>

        <div className="pt-4 flex justify-end gap-4">
            <button type="button" className="px-6 py-2 rounded text-slate-400 hover:text-white font-medium transition-colors">Cancel</button>
            <button type="submit" className="px-8 py-3 bg-sentry-accent hover:bg-sky-400 text-sentry-dark font-bold rounded shadow-lg shadow-sky-500/20 transition-all transform hover:-translate-y-0.5">
                Submit Request
            </button>
        </div>

      </form>
    </div>
  );
};