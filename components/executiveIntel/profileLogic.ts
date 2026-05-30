import { ExecutivePortfolioSummary } from '../../services/executiveIntelApi';
import { Tone } from './signalLogic';

// Profile-level helpers shared by the Executive Intelligence views.

export const statusTone = (status?: string): Tone => {
  const value = (status ?? 'ACTIVE').toUpperCase();
  if (value === 'ACTIVE') return 'green';
  if (value === 'ARCHIVED') return 'red';
  if (value === 'DISCOVERY') return 'yellow';
  return 'gray';
};

export const isArchived = (status?: string) => (status ?? 'ACTIVE').toUpperCase() === 'ARCHIVED';

// title_svp_conclusion may be a plain string OR a structured object
// ({status, evidence/note, ...}). Never render the raw object — React throws.
export function svpConclusionText(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const status = typeof obj.status === 'string' ? obj.status.replace(/_/g, ' ') : '';
    const detail = typeof obj.evidence === 'string'
      ? obj.evidence
      : (typeof obj.note === 'string' ? obj.note : '');
    return [status ? 'SVP title: ' + status + '.' : '', detail].filter(Boolean).join(' ');
  }
  return '';
}

export function optionLabel(item: ExecutivePortfolioSummary): string {
  const archived = isArchived(item.status);
  const prefix = archived ? '\u26A0 ' : '';
  const suffix = archived ? ' (archived)' : '';
  return prefix + item.full_name + ' \u00b7 ' + item.organization + suffix;
}

// Group portfolios by company; companies A–Z, members active-first then A–Z.
export function groupByCompany(
  portfolios: ExecutivePortfolioSummary[],
): Array<[string, ExecutivePortfolioSummary[]]> {
  const groups = new Map<string, ExecutivePortfolioSummary[]>();
  for (const p of portfolios) {
    const org = p.organization || 'Other';
    if (!groups.has(org)) groups.set(org, []);
    groups.get(org)!.push(p);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([org, members]) => [
      org,
      members.sort((a, b) => {
        const aa = isArchived(a.status) ? 1 : 0;
        const bb = isArchived(b.status) ? 1 : 0;
        return aa - bb || a.full_name.localeCompare(b.full_name);
      }),
    ] as [string, ExecutivePortfolioSummary[]]);
}

// Curated analyst review layer: ESG key findings surfaced from collection passes.
export const KEY_FINDINGS: string[] = [
  'Ex-Walmart U.S. CEO Greg Foran is now Kroger\u2019s CEO (Feb 2026) \u2014 deepest competitive flag in this watchlist.',
  '3 of the original 9 targets had stale/incorrect data \u2014 Target\u2019s Nusz departed, Kroger\u2019s CSO is embedded in Comms (unnamed), FedEx has no CSO (CEO owns it).',
  'Regulatory center of gravity shifted: the U.S. SEC climate rule was withdrawn (Mar 2025); EU CSRD + California SB 253/261 are now the real mandatory triggers.',
  'Escalation: a possible Walmart-CFO / Microsoft-board overlap was surfaced (MSFT sig_020) \u2014 route to Legal/Compliance before downstream use.',
];
