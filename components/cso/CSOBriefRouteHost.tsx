import React from 'react';
import { CSOBriefEditPage } from './CSOBriefEditPage';
import { CSOBriefViewPage } from './CSOBriefViewPage';

function parseCSOPath(pathname: string): { briefId: string; mode: 'edit' | 'view' } | null {
  const match = pathname.match(/^\/cso-briefs\/([^/]+)\/(edit|view)\/?$/);
  if (!match) return null;
  return {
    briefId: decodeURIComponent(match[1]),
    mode: match[2] as 'edit' | 'view',
  };
}

export const CSOBriefRouteHost: React.FC = () => {
  const parsed = parseCSOPath(window.location.pathname);

  if (!parsed) {
    return <div className="p-6 text-sm text-red-300">Invalid CSO brief route.</div>;
  }

  return parsed.mode === 'edit'
    ? <CSOBriefEditPage briefId={parsed.briefId} />
    : <CSOBriefViewPage briefId={parsed.briefId} />;
};

export { parseCSOPath };
