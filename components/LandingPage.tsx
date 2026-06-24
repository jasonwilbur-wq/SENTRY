import React, { useEffect, useState } from 'react';
import { LandingBackground3D } from './LandingBackground3D';

interface LandingPageProps {
  onEnter: (initialView?: "HOME") => void;
}

// SENTRY breaks down — kept honest and short, no marketing fluff.
const ACRONYM = [
  { letter: 'S', rest: 'ecurity' },
  { letter: 'E', rest: 'valuation &' },
  { letter: 'R', rest: 'isk' },
  { letter: 'T', rest: 'ransparency for' },
  { letter: 'Y', rest: 'ou' },
];

// Numbers that the platform actually tracks — gives the landing real weight.
const PROOF_POINTS = [
  { value: '300+',  label: 'Vendors assessed' },
  { value: '1,113', label: 'Competitor signals' },
  { value: '362',   label: 'Regulations tracked' },
  { value: '14',    label: 'Active EST projects' },
];

// Animated Walmart Spark — six visible yellow sparklets around a center.
// Keep SVG rotation in attributes instead of CSS transforms so animation does
// not accidentally collapse every ray into the same position.
function AnimatedSpark({ size = 88 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="Walmart Spark"
      style={{ display: 'block', filter: 'drop-shadow(0 0 18px rgba(255,194,32,0.45))' }}
    >
      <defs>
        <radialGradient id="spark-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="#FFC220" stopOpacity="0.48" />
          <stop offset="58%" stopColor="#FFC220" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#FFC220" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#spark-glow)" />
      {[0, 60, 120, 180, 240, 300].map((rot, i) => (
        <g key={rot} transform={`rotate(${rot} 50 50)`}>
          <g
            style={{
              opacity: 0,
              animation: `spark-pop 0.58s cubic-bezier(0.16,1,0.3,1) ${0.12 + i * 0.08}s forwards`,
            }}
          >
            <rect x="44" y="6" width="12" height="31" rx="6" fill="#FFC220" />
          </g>
        </g>
      ))}
      <circle cx="50" cy="50" r="6" fill="#FFC220" opacity="0.95" />
      <style>{`
        @keyframes spark-pop {
          from { opacity: 0; transform: scale(0.72); transform-origin: 50px 50px; }
          to   { opacity: 1; transform: scale(1); transform-origin: 50px 50px; }
        }
      `}</style>
    </svg>
  );
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [mounted, setMounted]           = useState(false);
  const [acronymIndex, setAcronymIndex] = useState(-1);

  useEffect(() => {
    const t1 = window.setTimeout(() => setMounted(true), 60);
    const timers: number[] = [];
    ACRONYM.forEach((_, i) => {
      timers.push(window.setTimeout(() => setAcronymIndex(i), 800 + i * 130));
    });
    return () => {
      window.clearTimeout(t1);
      timers.forEach(window.clearTimeout);
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden text-white"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #001440 0%, #000B28 55%, #00081f 100%)' }}
    >
      {/* Three.js starfield */}
      <LandingBackground3D />

      {/* Ambient layers */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute top-[8%] left-1/4 w-[520px] h-[520px] rounded-full blur-[150px]"
          style={{ background: 'rgba(0,83,226,0.20)', animation: 'pulse-slow 6s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-[5%] right-1/4 w-[460px] h-[460px] rounded-full blur-[150px]"
          style={{ background: 'rgba(255,194,32,0.10)', animation: 'pulse-slow 8s ease-in-out infinite 1.4s' }}
        />
        {/* Vector grid floor — anchors the composition */}
        <div
          className="absolute inset-x-0 bottom-0 h-[55%] opacity-[0.10]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,83,226,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(0,83,226,0.7) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            transform: 'perspective(800px) rotateX(60deg)',
            transformOrigin: 'bottom',
            maskImage: 'linear-gradient(to top, black 0%, black 30%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, black 30%, transparent 100%)',
          }}
        />
        {/* Top vignette */}
        <div
          className="absolute inset-x-0 top-0 h-32"
          style={{ background: 'linear-gradient(to bottom, rgba(0,11,40,0.7), transparent)' }}
        />
      </div>

      {/* Top-left corner brand mark */}
      <div
        className="absolute top-6 left-8 z-20 flex items-center gap-3"
        style={{
          transition: 'opacity 0.6s ease',
          opacity: mounted ? 1 : 0,
        }}
      >
        <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true">
          <circle cx="16" cy="16" r="16" fill="#FFC220" />
          <g fill="#001E60">
            <rect x="14.5" y="2"  width="3" height="12" rx="1.5" />
            <rect x="14.5" y="18" width="3" height="12" rx="1.5" />
            <rect x="2"    y="14.5" width="12" height="3" rx="1.5" />
            <rect x="18"   y="14.5" width="12" height="3" rx="1.5" />
            <rect x="5.5"  y="5.5"  width="3" height="10" rx="1.5" transform="rotate(45 7 10.5)" />
            <rect x="18.5" y="18.5" width="3" height="10" rx="1.5" transform="rotate(45 20 23.5)" />
          </g>
        </svg>
        <div className="leading-tight">
          <p className="text-[10px] font-bold uppercase tracking-[0.32em]" style={{ color: '#FFC220' }}>Walmart</p>
          <p className="text-xs font-medium uppercase tracking-[0.22em]" style={{ color: '#9fb2d1' }}>
            Global Security, Strategy &amp; Innovation
          </p>
        </div>
      </div>

      {/* Top-right pill */}
      <div
        className="absolute top-6 right-8 z-20 inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(0,83,226,0.10)',
          border: '1px solid rgba(0,83,226,0.30)',
          backdropFilter: 'blur(8px)',
          transition: 'opacity 0.6s ease 0.2s',
          opacity: mounted ? 1 : 0,
        }}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inset-0 rounded-full bg-green-400 opacity-60" />
          <span className="relative rounded-full h-2 w-2 bg-green-400" />
        </span>
        <span className="text-xs font-mono font-semibold tracking-[0.14em] uppercase" style={{ color: '#a9c1e6' }}>
          Internal workspace · verify auth status inside
        </span>
      </div>

      {/* Main composition */}
      <div
        className="relative z-10 max-w-5xl mx-auto px-6 text-center"
        style={{
          transition: 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity:   mounted ? 1 : 0,
          transform: mounted ? 'none' : 'translateY(24px)',
        }}
      >
        {/* Spark — gives the page a real Walmart heartbeat instead of generic AI glow */}
        <div className="flex flex-col items-center justify-center mb-6" style={{ animation: 'float 6s ease-in-out infinite' }}>
          <AnimatedSpark size={96} />
        </div>

        {/* Wordmark — single weight, monospace tracking, no per-letter dance */}
        <h1
          className="text-7xl md:text-[8rem] font-black leading-none mb-6 select-none"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #cfe2ff 60%, #6ea7ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.04em',
            textShadow: '0 0 80px rgba(0,83,226,0.35)',
          }}
        >
          SENTRY
        </h1>

        {/* Acronym strip — cascading reveal */}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-10 min-h-[2.5rem]">
          {ACRONYM.map((item, i) => (
            <span
              key={i}
              className="text-lg md:text-2xl font-light"
              style={{
                transition: 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
                opacity:   acronymIndex >= i ? 1 : 0,
                transform: acronymIndex >= i ? 'none' : 'translateY(8px)',
                color: '#9aa9c1',
              }}
            >
              <span style={{ color: '#FFC220', fontWeight: 800 }}>{item.letter}</span>
              <span className="ml-0.5">{item.rest}</span>
            </span>
          ))}
        </div>

        {/* Plain-English purpose, not an AI-style buzzword cloud */}
        <p
          className="text-base md:text-lg max-w-2xl mx-auto mb-12 leading-relaxed"
          style={{
            color: '#a9b8d1',
            transition: 'opacity 0.6s ease 0.9s',
            opacity: mounted ? 1 : 0,
          }}
        >
          The system of record for emerging security technology at Walmart.
          Assess vendors, track competitor moves, monitor regulations, and run
          every project from one workspace.
        </p>

        {/* Action row — primary + secondary */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
          style={{
            transition: 'opacity 0.6s ease 1.05s, transform 0.6s ease 1.05s',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'none' : 'translateY(8px)',
          }}
        >
          <button
            onClick={() => onEnter('HOME')}
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 font-bold text-base rounded-full overflow-hidden"
            style={{
              background: '#FFC220',
              color: '#001E60',
              boxShadow: '0 10px 32px rgba(255,194,32,0.30), 0 0 0 1px rgba(255,194,32,0.6) inset',
              transition: 'transform 0.15s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 14px 44px rgba(255,194,32,0.55), 0 0 0 1px rgba(255,255,255,0.6) inset'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 32px rgba(255,194,32,0.30), 0 0 0 1px rgba(255,194,32,0.6) inset'; }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
            onMouseUp={e   => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
          >
            {/* Shine sweep */}
            <span
              aria-hidden
              className="absolute top-0 -left-1/3 h-full w-1/3 -skew-x-12 pointer-events-none opacity-0 group-hover:opacity-100"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                animation: 'shine 0.9s ease-in-out',
              }}
            />
            <span className="relative tracking-wide">Enter SENTRY</span>
            <svg className="w-4 h-4 relative transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>

          <a
            href="#proof"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('proof');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="group inline-flex items-center justify-center gap-2 px-6 py-4 font-semibold text-sm rounded-full"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: '#cdd9ec',
              border: '1px solid rgba(255,255,255,0.10)',
              backdropFilter: 'blur(8px)',
            }}
          >
            What is SENTRY?
            <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>

        </div>
      </div>

      {/* Proof strip — gives the user numbers, not slogans */}
      <div
        id="proof"
        className="relative z-10 mt-16 w-full max-w-4xl mx-auto px-6"
        style={{
          transition: 'opacity 0.6s ease 1.3s, transform 0.6s ease 1.3s',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'none' : 'translateY(12px)',
        }}
      >
        <div
          className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(8,14,30,0.72)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(14px) saturate(140%)',
          }}
        >
          {PROOF_POINTS.map((p, i) => (
            <div
              key={p.label}
              className="px-5 py-4 text-center"
              style={{
                borderRight: i < PROOF_POINTS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              }}
            >
              <p
                className="text-2xl md:text-3xl font-black leading-none"
                style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #FFC220 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {p.value}
              </p>
              <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#9fb2d1' }}>
                {p.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-5 inset-x-0 text-center z-10">
        <p className="text-xs font-mono uppercase tracking-[0.18em]" style={{ color: '#6f819f' }}>
          Internal use only · runtime security posture appears after access check · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};
