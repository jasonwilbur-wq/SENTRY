import React, { useEffect, useState } from 'react';

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-sentry-dark flex flex-col items-center justify-center relative overflow-hidden text-white font-sans selection:bg-sentry-accent selection:text-sentry-dark">
      
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] animate-pulse delay-1000"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.9)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>
      </div>

      <div className={`z-10 max-w-6xl mx-auto px-6 text-center transition-all duration-1000 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        
        {/* Internal Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 backdrop-blur-sm mb-8 hover:border-sentry-accent/50 transition-colors cursor-default">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sentry-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sentry-success"></span>
          </span>
          <span className="text-xs font-mono font-medium tracking-widest text-slate-400 uppercase">Walmart Internal // Restricted Access</span>
        </div>

        {/* Main Title */}
        <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-white mb-8 relative drop-shadow-2xl">
          SENTRY
          <div className="absolute -inset-1 text-sentry-accent blur-3xl opacity-20 pointer-events-none"></div>
        </h1>

        {/* Acronym Breakdown */}
        <div className="flex flex-col md:flex-row flex-wrap justify-center items-center gap-2 md:gap-4 text-2xl md:text-4xl font-light text-slate-300 mb-12 max-w-5xl mx-auto leading-tight">
          <span className="inline-block whitespace-nowrap"><span className="text-sentry-accent font-bold">S</span>ecurity,</span>
          <span className="inline-block whitespace-nowrap"><span className="text-sentry-accent font-bold">E</span>valuation, &</span>
          <span className="inline-block whitespace-nowrap"><span className="text-sentry-accent font-bold">R</span>isk</span>
          <span className="inline-block whitespace-nowrap"><span className="text-sentry-accent font-bold">T</span>ransparency for</span>
          <span className="inline-block whitespace-nowrap"><span className="text-sentry-accent font-bold">Y</span>ou</span>
        </div>

        {/* Description/Context */}
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-16 leading-relaxed border-t border-slate-800 pt-8">
          The definitive System of Record for Emerging Technology vendor assessment. 
          Identify risks, visualize architecture, and govern with AI-driven insights.
        </p>

        {/* CTA Button */}
        <button 
          onClick={onEnter}
          className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 bg-sentry-accent text-sentry-dark font-bold text-lg rounded-sm overflow-hidden transition-all hover:bg-white hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_50px_rgba(56,189,248,0.6)]"
        >
          <span className="relative z-10 tracking-wider">ACCESS TERMINAL</span>
          <svg className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          {/* Button Shine Effect */}
          <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-40 group-hover:animate-shine" />
        </button>

      </div>

      {/* Footer Details */}
      <div className="absolute bottom-6 left-0 right-0 text-center px-4">
        <p className="text-[10px] md:text-xs font-mono text-slate-600 uppercase tracking-widest">
          Secure Connection :: Encrypted via Google Cloud IAP :: Zero Trust Enforced
        </p>
      </div>
    </div>
  );
};