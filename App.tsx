import React, { useState } from 'react';
import { ViewState } from './types';
import { VendorDashboard } from './components/VendorDashboard';
import { LandingPage } from './components/LandingPage';
import { RequestAssessment } from './components/RequestAssessment';
import { RequestLabVisit } from './components/RequestLabVisit';
import { CompetitorAnalysis } from './components/CompetitorAnalysis';

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DIRECTORY);

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  const NavButton = ({ view, label, icon }: { view: ViewState, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg transition-all duration-200 ${
        currentView === view
          ? 'bg-sentry-accent/10 text-sentry-accent border-r-2 border-sentry-accent'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans bg-sentry-dark text-slate-200">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col sticky top-0 md:h-screen z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-sentry-accent to-blue-600 flex items-center justify-center text-slate-900 font-bold">S</div>
            SENTRY
          </h1>
          <p className="text-[10px] text-slate-500 mt-1 font-mono tracking-widest uppercase">Internal v2.0</p>
        </div>

        <nav className="flex-grow p-4 space-y-2">
          <NavButton 
            view={ViewState.DIRECTORY} 
            label="Directory" 
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            } 
          />
          <NavButton 
            view={ViewState.REQUEST_ASSESSMENT} 
            label="Request Assessment" 
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            } 
          />
          <NavButton 
            view={ViewState.COMPETITOR_ANALYSIS} 
            label="Competitor Analysis" 
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            } 
          />
          <NavButton 
            view={ViewState.REQUEST_LAB_VISIT} 
            label="Request Lab Visit" 
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            } 
          />
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className="bg-slate-800/50 rounded p-3 text-[10px] text-slate-500 font-mono">
             <div className="flex justify-between items-center mb-1">
               <span>SYS.STATUS</span>
               <span className="text-green-500">ONLINE</span>
             </div>
             <div>UPTIME: 99.99%</div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <header className="mb-6 pb-6 border-b border-slate-800">
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
            {currentView === ViewState.DIRECTORY && "Vendor Directory"}
            {currentView === ViewState.REQUEST_ASSESSMENT && "Security Assessment"}
            {currentView === ViewState.COMPETITOR_ANALYSIS && "Competitor & Market Analysis"}
            {currentView === ViewState.REQUEST_LAB_VISIT && "Emerging Tech Lab"}
          </h2>
          <p className="text-slate-400 max-w-3xl">
            {currentView === ViewState.DIRECTORY && "Search and filter the centralized record of Emerging Technology vendors."}
            {currentView === ViewState.REQUEST_ASSESSMENT && "Initiate GRC workflows for new technology reviews."}
            {currentView === ViewState.COMPETITOR_ANALYSIS && "Visualize risk metrics and compare vendor performance against market standards."}
            {currentView === ViewState.REQUEST_LAB_VISIT && "Schedule hands-on evaluation time with specific hardware in the secure lab."}
          </p>
        </header>

        {currentView === ViewState.DIRECTORY && <VendorDashboard />}
        {currentView === ViewState.REQUEST_ASSESSMENT && <RequestAssessment />}
        {currentView === ViewState.COMPETITOR_ANALYSIS && <CompetitorAnalysis />}
        {currentView === ViewState.REQUEST_LAB_VISIT && <RequestLabVisit />}

      </main>
    </div>
  );
};

export default App;