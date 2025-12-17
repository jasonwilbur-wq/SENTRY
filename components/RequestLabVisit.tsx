import React, { useState } from 'react';

export const RequestLabVisit: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <div className="bg-sentry-card p-8 rounded-lg border border-sentry-success/50 shadow-[0_0_50px_rgba(74,222,128,0.1)] text-center max-w-lg">
          <div className="w-16 h-16 bg-sentry-success/20 text-sentry-success rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Visit Scheduled</h2>
          <p className="text-slate-400 mb-6">Your Emerging Tech Lab visit request has been received. You will receive a calendar invite and access badge instructions shortly.</p>
          <button onClick={() => setSubmitted(false)} className="text-sentry-accent hover:underline">Book another visit</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-sentry-card border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-fadeIn">
      <div className="bg-slate-800/80 p-6 border-b border-slate-700">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </span>
            Request Lab Visit
        </h2>
        <p className="text-slate-400 mt-1 ml-14">Schedule time at the Emerging Technology Security Lab for hands-on evaluation.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        
        {/* Location Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <label className="cursor-pointer">
              <input type="radio" name="location" className="peer sr-only" required />
              <div className="p-4 rounded-lg border border-slate-600 bg-slate-900 hover:bg-slate-800 peer-checked:border-sentry-accent peer-checked:bg-sentry-accent/10 transition-all">
                  <div className="font-bold text-white">Bentonville Lab (HQ)</div>
                  <div className="text-sm text-slate-400">Building 4, Level 2</div>
              </div>
           </label>
           <label className="cursor-pointer">
              <input type="radio" name="location" className="peer sr-only" />
              <div className="p-4 rounded-lg border border-slate-600 bg-slate-900 hover:bg-slate-800 peer-checked:border-sentry-accent peer-checked:bg-sentry-accent/10 transition-all">
                  <div className="font-bold text-white">Sunnyvale Lab</div>
                  <div className="text-sm text-slate-400">Moffett Park, Zone B</div>
              </div>
           </label>
        </div>

        {/* Visit Details */}
        <div className="space-y-4">
            <h3 className="text-sentry-accent font-bold uppercase text-xs tracking-wider border-b border-slate-700 pb-2">Visit Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Proposed Date</label>
                    <input required type="datetime-local" className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:border-sentry-accent focus:outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Duration</label>
                    <select className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:border-sentry-accent focus:outline-none">
                        <option>1 Hour</option>
                        <option>2 Hours</option>
                        <option>Half Day (4 Hours)</option>
                        <option>Full Day</option>
                    </select>
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Number of Visitors</label>
                <input required type="number" min="1" max="10" className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:border-sentry-accent focus:outline-none" />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Purpose of Visit</label>
                <textarea required rows={3} className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white focus:border-sentry-accent focus:outline-none" placeholder="What specific hardware or software are you evaluating?" />
            </div>
        </div>

        {/* Requirements */}
        <div className="space-y-4">
            <h3 className="text-sentry-accent font-bold uppercase text-xs tracking-wider border-b border-slate-700 pb-2">Hardware Requirements</h3>
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-sentry-accent focus:ring-sentry-accent" />
                    <span className="text-slate-300">Faraday Cage Access</span>
                </div>
                <div className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-sentry-accent focus:ring-sentry-accent" />
                    <span className="text-slate-300">Network Traffic Analyzer</span>
                </div>
                <div className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-sentry-accent focus:ring-sentry-accent" />
                    <span className="text-slate-300">Drone Flight Cage</span>
                </div>
            </div>
        </div>

        <div className="pt-4 flex justify-end gap-4">
            <button type="button" className="px-6 py-2 rounded text-slate-400 hover:text-white font-medium transition-colors">Cancel</button>
            <button type="submit" className="px-8 py-3 bg-purple-500 hover:bg-purple-400 text-white font-bold rounded shadow-lg shadow-purple-500/20 transition-all transform hover:-translate-y-0.5">
                Request Access
            </button>
        </div>

      </form>
    </div>
  );
};