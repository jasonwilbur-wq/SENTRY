import React, { useMemo, useRef, useState } from 'react';
import { CSO_PROFILES } from '../../data/csoProfiles';
import { Badge, Card, StatCard } from '../executiveIntel/ui';
import { SecuritySidebar } from './SecuritySidebar';
import { SecurityProfileDetail } from './SecurityProfileDetail';
import { WalmartPositionPanel } from './WalmartPositionPanel';
import { byThreatThenName, deriveCounts } from './securityLogic';
import { summarizeVerification } from './verificationLogic';

// ---------------------------------------------------------------------------
// Security Leadership (Chief Security Officer) competitive intelligence.
// Master-detail layout: watchlist sidebar + rich profile detail, an overview
// deck up top, and Walmart self-positioning + recommended actions below.
// Merges the legacy CSO Intelligence content onto the Executive Intel UI kit.
// ---------------------------------------------------------------------------

export function SecurityLeadership({ embedded = false }: { embedded?: boolean } = {}) {
  const profiles = useMemo(() => [...CSO_PROFILES].sort(byThreatThenName), []);
  const [selectedId, setSelectedId] = useState<string>(profiles[0]?.id ?? '');
  const detailRef = useRef<HTMLDivElement | null>(null);

  const counts = useMemo(() => deriveCounts(profiles), [profiles]);
  const verification = useMemo(() => summarizeVerification(profiles), [profiles]);
  const selected = useMemo(
    () => profiles.find(p => p.id === selectedId),
    [profiles, selectedId],
  );

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

      {/* Overview deck */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Leaders tracked" value={counts.profiles} helper="Competitor CSO / CISO profiles" />
        <StatCard label="Key findings" value={counts.findings} helper="OSINT-derived intelligence items" />
        <StatCard label="Critical / high" value={counts.critical} helper="Orange + red risk findings" tone="red" />
        <StatCard
          label="Data confidence"
          value={verification.verified + '/' + verification.total}
          helper={verification.verified === verification.total
            ? 'All profiles verified'
            : verification.provisional + ' provisional · ' + verification.review + ' need review'}
          tone={verification.verified === verification.total ? undefined : 'red'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
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
