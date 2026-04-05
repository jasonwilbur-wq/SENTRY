/**
 * LandingPage — cinematic entry screen for SENTRY.
 *
 * Forces dark mode while visible (space aesthetic).
 * All stats are live — fetched from backend APIs on mount.
 */
import React, { useEffect, useState } from 'react';
import { LandingBackground3D } from './LandingBackground3D';
import { useTheme } from '../context/ThemeContext';
import {
  fetchStats, fetchCompetitorStats, fetchRegulatorySummary,
} from '../services/api';

interface LandingPageProps {
  onEnter: () => void;
}

// Each letter of SENTRY gets its own reveal with a staggered delay
const SENTRY_LETTERS = ['S', 'E', 'N', 'T', 'R', 'Y'];

// Acronym words revealed one by one after title appears
const ACRONYM = [
  { letter: 'S', rest: 'ecurity,' },
  { letter: 'E', rest: 'merging-Tech' },
  { letter: 'N', rest: 'ode' },
  { letter: 'T', rest: 'racking &' },
  { letter: 'R', rest: 'isk' },
  { letter: 'Y', rest: 'ielding Intelligence' },
];

// ── Live stat strip item ─────────────────────────────────────────────────────
interface StatItem { value: string; label: string }

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [mounted, setMounted]           = useState(false);
  const [acronymIndex, setAcronymIndex] = useState(-1);
  const [liveStats, setLiveStats]       = useState<StatItem[]>([]);
  const { theme }                       = useTheme();

  // ── Force dark mode while landing page is visible ──────────────────────
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');
    return () => {
      root.setAttribute('data-theme', theme);
      if (theme === 'dark') root.classList.add('dark');
      else                  root.classList.remove('dark');
    };
  }, [theme]);

  // ── Fetch live stats in parallel ───────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [stats, compStats, regStats] = await Promise.allSettled([
          fetchStats(),
          fetchCompetitorStats(),
          fetchRegulatorySummary(),
        ]);

        const items: StatItem[] = [];

        if (stats.status === 'fulfilled') {
          const s = stats.value;
          items.push({ value: s.total_vendors.toLocaleString(), label: 'Vendors Tracked' });
          items.push({ value: s.total_vars.toLocaleString(), label: 'VAR Reports' });
          items.push({ value: `${s.var_coverage_pct.toFixed(1)}%`, label: 'Assessment Coverage' });
        }

        if (compStats.status === 'fulfilled') {
          items.push({ value: compStats.value.total.toLocaleString(), label: 'Competitor Events' });
        }

        if (regStats.status === 'fulfilled') {
          const r = regStats.value.stats;
          items.push({ value: r.total_obligations.toLocaleString(), label: 'Regulatory Obligations' });
        }

        setLiveStats(items);
      } catch {
        // Graceful degradation — stats strip just won't render
      }
    };
    load();
  }, []);

  // ── Mount + acronym cascade ────────────────────────────────────────────
  useEffect(() => {
    const t1 = setTimeout(() => setMounted(true), 60);
    const timers: ReturnType<typeof setTimeout>[] = [];
    ACRONYM.forEach((_, i) => {
      timers.push(setTimeout(() => setAcronymIndex(i), 900 + i * 160));
    });
    return () => {
      clearTimeout(t1);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden text-white"
         style={{ background: '#000B28' }}>

      {/* Three.js starfield */}
      <LandingBackground3D />

      {/* Ambient glow orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] animate-pulse"
          style={{ background: 'rgba(0,83,226,0.18)' }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[140px]"
          style={{ background: 'rgba(255,194,32,0.08)', animationDelay: '1s', animation: 'pulse-slow 4s ease-in-out infinite' }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,83,226,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(0,83,226,0.6) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 40%, transparent 100%)',
          }}
        />
      </div>

      {/* Main content */}
      <div
        className="relative z-10 max-w-5xl mx-auto px-6 text-center"
        style={{
          transition: 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity:   mounted ? 1 : 0,
          transform: mounted ? 'none' : 'translateY(24px)',
        }}
      >
        {/* Status badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-10 border-glow-blue"
          style={{
            background: 'rgba(0,83,226,0.08)',
            border: '1px solid rgba(0,83,226,0.3)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inset-0 rounded-full bg-green-400 opacity-60" />
            <span className="relative rounded-full h-2 w-2 bg-green-400" />
          </span>
          <span className="text-[10px] font-mono font-semibold tracking-[0.2em] text-slate-400 uppercase">
            Walmart ET Security · Internal Platform · Eagle &amp; VPN Only
          </span>
        </div>

        {/* SENTRY title — letter-by-letter reveal */}
        <h1 className="relative mb-8 leading-none select-none" style={{ perspective: '600px' }}>
          <div className="flex items-center justify-center gap-1 md:gap-2">
            {SENTRY_LETTERS.map((letter, i) => (
              <span
                key={letter + i}
                className="text-8xl md:text-[9rem] font-black"
                style={{
                  display: 'inline-block',
                  color: '#ffffff',
                  textShadow: '0 0 40px rgba(0,83,226,0.5), 0 0 80px rgba(0,83,226,0.2)',
                  transition: 'opacity 0.4s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                  transitionDelay: `${i * 0.07 + 0.1}s`,
                  opacity:   mounted ? 1 : 0,
                  transform: mounted ? 'none' : 'translateY(40px) rotateX(40deg)',
                }}
              >
                {letter}
              </span>
            ))}
          </div>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,83,226,0.15) 0%, transparent 70%)',
              zIndex: -1,
            }}
            aria-hidden="true"
          />
        </h1>

        {/* Acronym breakdown — cascading word reveal */}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-12 min-h-[2.5rem]">
          {ACRONYM.map((item, i) => (
            <span
              key={i}
              className="text-xl md:text-3xl font-light"
              style={{
                transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                opacity:   acronymIndex >= i ? 1 : 0,
                transform: acronymIndex >= i ? 'none' : 'translateY(10px)',
                color: '#94a3b8',
              }}
            >
              <span style={{ color: '#FFC220', fontWeight: 800 }}>{item.letter}</span>
              {item.rest}
            </span>
          ))}
        </div>

        {/* Description + live stats strip */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '2rem',
            transition: 'opacity 0.6s ease 1.2s',
            opacity: mounted ? 1 : 0,
          }}
          className="mb-10"
        >
          <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Walmart Enterprise Security's single source of truth for emerging-tech vendor risk.
            Every VAR, every score, every competitor move — one platform, zero spreadsheets.
          </p>

          {/* Live stats strip */}
          {liveStats.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 md:gap-5">
              {liveStats.map(({ value, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center px-4 py-2 rounded-xl"
                  style={{
                    background: 'rgba(0,83,226,0.07)',
                    border: '1px solid rgba(0,83,226,0.2)',
                  }}
                >
                  <span className="text-xl md:text-2xl font-black" style={{ color: '#FFC220' }}>{value}</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mt-0.5">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA button */}
        <button
          onClick={onEnter}
          className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 font-black text-lg rounded-sm overflow-hidden always-white"
          style={{
            background: '#FFC220',
            color: '#000B28',
            boxShadow: '0 0 28px rgba(255,194,32,0.4)',
            transition: 'background 0.2s, box-shadow 0.2s, transform 0.1s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 56px rgba(255,194,32,0.65)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#FFC220';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 28px rgba(255,194,32,0.4)';
          }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
        >
          {/* Shine effect */}
          <div
            className="absolute top-0 h-full w-1/3 -skew-x-12 bg-white/30 opacity-0 group-hover:opacity-100 pointer-events-none"
            style={{ left: '-40%', transition: 'left 0.4s ease, opacity 0.2s' }}
            onTransitionEnd={e => {
              const el = e.currentTarget as HTMLDivElement;
              if (el.style.left === '140%') el.style.left = '-40%';
            }}
            ref={el => {
              if (!el) return;
              const parent = el.parentElement;
              if (!parent) return;
              const enter = () => { el.style.left = '140%'; };
              const leave = () => { setTimeout(() => { el.style.left = '-40%'; }, 400); };
              parent.addEventListener('mouseenter', enter);
              parent.addEventListener('mouseleave', leave);
            }}
            aria-hidden="true"
          />
          <span className="relative z-10 tracking-[0.12em]" style={{ color: '#000B28' }}>ACCESS TERMINAL</span>
          <svg
            className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-1"
            style={{ color: '#000B28' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 inset-x-0 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: '#1e293b' }}>
          Walmart Internal Only ∷ Requires Eagle WiFi or VPN ∷ ET Security — Emerging Technology
        </p>
      </div>
    </div>
  );
};
