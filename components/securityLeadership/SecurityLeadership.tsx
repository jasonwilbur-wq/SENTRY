import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CSO_PROFILES, type ExecutiveProfile } from '../../data/csoProfiles';
import { fetchExecProfiles } from '../../services/api';
import { Badge, Card } from '../executiveIntel/ui';
import { SecuritySidebar } from './SecuritySidebar';
import { SecurityProfileDetail } from './SecurityProfileDetail';
import { WalmartPositionPanel } from './WalmartPositionPanel';
import { byThreatThenName, deriveCounts } from './securityLogic';
import { summarizeVerification } from './verificationLogic';
import { recentSignals, latestSignalDate } from './executiveSignals';
import { SecurityBriefingRoom } from './SecurityBriefingRoom';

// ---------------------------------------------------------------------------
// Security Leadership (Chief Security Officer) competitive intelligence.
// Master-detail layout: watchlist sidebar + rich profile detail, an overview
// deck up top, and Walmart self-positioning + recommended actions below.
// Merges the legacy CSO Intelligence content onto the Executive Intel UI kit.
// ---------------------------------------------------------------------------

export function SecurityLeadership({ embedded = false }: { embedded?: boolean } = {}) {
  // Source of truth is the SQLite-backed API (governed scout feed). Fall back
  // to the bundled static snapshot if the backend is unavailable so the page
  // always renders.
  const [liveProfiles, setLiveProfiles] = useState<ExecutiveProfile[] | null>(null);
  const [source, setSource] = useState<'live' | 'static'>('static');

  useEffect(() => {
    let cancelled = false;
    fetchExecProfiles<ExecutiveProfile>()
      .then(res => {
        if (cancelled) return;
        if (res.profiles?.length) {
          setLiveProfiles(res.profiles);
          setSource('live');
        }
      })
      .catch(() => { /* keep static fallback */ });
    return () => { cancelled = true; };
  }, []);

  const base = liveProfiles ?? CSO_PROFILES;
  const profiles = useMemo(() => [...base].sort(byThreatThenName), [base]);
  const [selectedId, setSelectedId] = useState<string>(profiles[0]?.id ?? '');
  const detailRef = useRef<HTMLDivElement | null>(null);

  const counts = useMemo(() => deriveCounts(profiles), [profiles]);
  const verification = useMemo(() => summarizeVerification(profiles), [profiles]);
  const whatsNew = useMemo(() => recentSignals(profiles, 5), [profiles]);
  const freshest = useMemo(() => latestSignalDate(profiles), [profiles]);
  const selected = useMemo(
    () => profiles.find(p => p.id === selectedId),
    [profiles, selectedId],
  );

  // Keep a valid selection once live data arrives (or if the list changes).
  useEffect(() => {
    if (profiles.length && !profiles.some(p => p.id === selectedId)) {
      setSelectedId(profiles[0].id);
    }
  }, [profiles, selectedId]);

  const selectAndScroll = (id: string) => {
    setSelectedId(id);
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <Card>
          <Badge tone="blue">Competitive intelligence</Badge>
          <h2 className="mt-3 text-2xl font-black" style={{ color: 'var(--s-text)' }}>Security Leadership</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--s-text-dim)' }}>
            Competitor Chief Security Officer and CISO benchmarking from OSINT collection. Tracks
            public posture, initiatives, and leadership transitions relevant to Walmart Global Security.
          </p>
        </Card>
      )}

      <div className="flex items-center justify-end -mb-2">
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
          style={source === 'live'
            ? { background: 'rgba(42,135,3,0.12)', color: '#4ade80', border: '1px solid rgba(42,135,3,0.3)' }
            : { background: 'var(--s-hover-over)', color: 'var(--s-text-dim)', border: '1px solid var(--s-border)' }}
          title={source === 'live'
            ? 'Served live from the SQLite-backed governed scout feed'
            : 'Backend unavailable — showing the bundled static snapshot'}
        >
          {source === 'live' ? '● Live feed' : '○ Snapshot'}
        </span>
      </div>

      <SecurityBriefingRoom
        profiles={profiles}
        counts={counts}
        verification={verification}
        whatsNew={whatsNew}
        freshest={freshest}
        onSelectProfile={selectAndScroll}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6 items-start">
        <SecuritySidebar profiles={profiles} selectedId={selectedId} onSelect={selectAndScroll} />

        <div ref={detailRef} className="space-y-6 min-w-0">
          {selected
            ? <SecurityProfileDetail profile={selected} />
            : <Card><p className="text-sm" style={{ color: 'var(--s-text-dim)' }}>Select a security leader to view their profile.</p></Card>}
        </div>
      </div>

      {/* Walmart positioning + recommended actions */}
      <WalmartPositionPanel />
    </div>
  );
}

export default SecurityLeadership;
