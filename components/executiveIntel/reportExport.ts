import { ExecutivePortfolio, ExecutivePortfolioSummary } from '../../services/executiveIntelApi';
import { buildComparison } from './analytics';
import { isArchived } from './profileLogic';
import { sortByPriority, prettyLabel } from './signalLogic';

// ---------------------------------------------------------------------------
// Build a self-contained, offline flat HTML benchmark report and download it.
// No external assets, no network — Walmart-colored, print-friendly, WCAG-aware.
// ---------------------------------------------------------------------------

const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function comparisonTable(portfolios: ExecutivePortfolioSummary[]): string {
  const rows = buildComparison(portfolios, isArchived);
  const body = rows.map(r =>
    '<tr>' +
    '<td>' + esc(r.name) + (r.archived ? ' <span class="tag warn">archived</span>' : '') + '</td>' +
    '<td>' + esc(r.organization) + '</td>' +
    '<td class="num">' + r.signals + '</td>' +
    '<td class="num">' + r.csoReady + '</td>' +
    '<td class="num">' + r.verifiedPct + '%</td>' +
    '</tr>',
  ).join('');
  return '<table><thead><tr><th>Executive</th><th>Organization</th><th class="num">Signals</th>' +
    '<th class="num">CSO-ready</th><th class="num">% valid</th></tr></thead><tbody>' + body + '</tbody></table>';
}

function signalsSection(portfolio: ExecutivePortfolio): string {
  const signals = sortByPriority(portfolio.signals).slice(0, 25);
  const items = signals.map(s => {
    const cites = (s.citations || []).map(c =>
      '<li><a href="' + esc(c.url) + '">' + esc(c.source_title || c.url) + '</a> ' +
      '<span class="tag">' + esc(prettyLabel(c.source_quality)) + '</span></li>',
    ).join('');
    return '<article class="signal">' +
      '<div class="badges">' +
      '<span class="tag ' + (s.verification_status === 'VERIFIED' ? 'ok' : 'warn') + '">' + esc(s.verification_status) + '</span>' +
      '<span class="tag">' + esc(prettyLabel(s.category)) + '</span>' +
      '<span class="muted">' + esc(s.event_date || 'undated') + '</span>' +
      '</div>' +
      '<h4>' + esc(s.title) + '</h4>' +
      '<p>' + esc(s.summary) + '</p>' +
      (s.walmart_cso_relevance ? '<p class="rel"><strong>Walmart relevance:</strong> ' + esc(s.walmart_cso_relevance) + '</p>' : '') +
      (cites ? '<details><summary>' + (s.citations?.length || 0) + ' sources</summary><ul>' + cites + '</ul></details>' : '') +
      '</article>';
  }).join('');
  return '<section><h3>Top signals (priority-ranked)</h3>' + items + '</section>';
}

export function buildReportHtml(
  portfolio: ExecutivePortfolio,
  portfolios: ExecutivePortfolioSummary[],
): string {
  const p = portfolio.profile;
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const css =
    'body{font-family:system-ui,Segoe UI,Arial,sans-serif;margin:0;background:#f5f5f5;color:#1a1a1a;line-height:1.5}' +
    '.wrap{max-width:960px;margin:0 auto;padding:24px}' +
    'header{background:#0053e2;color:#fff;padding:24px;border-radius:12px}' +
    'header h1{margin:0 0 4px;font-size:24px}header .sub{opacity:.9;font-size:14px}' +
    'h2{font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:#0053e2;margin:28px 0 10px}' +
    'h3{font-size:16px;margin:20px 0 8px}h4{margin:6px 0}' +
    'section,article.signal{background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:16px;margin:10px 0}' +
    'table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden}' +
    'th,td{padding:8px 10px;border-bottom:1px solid #eee;text-align:left;font-size:14px}' +
    'th{background:#f0f4ff;color:#0053e2}.num{text-align:right}' +
    '.tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#eef;color:#0053e2;text-transform:uppercase}' +
    '.tag.ok{background:#e6f4e6;color:#2a8703}.tag.warn{background:#fdeaea;color:#ea1100}' +
    '.muted{color:#595959;font-size:12px;margin-left:auto}.badges{display:flex;gap:6px;align-items:center}' +
    '.rel{background:#f0f4ff;border-left:4px solid #0053e2;padding:8px 10px;border-radius:6px;font-size:14px}' +
    'details{margin-top:8px;font-size:13px}summary{cursor:pointer;color:#0053e2;font-weight:700}' +
    'ul{margin:6px 0;padding-left:18px}.foot{color:#595959;font-size:12px;margin-top:24px;text-align:center}' +
    '@media print{body{background:#fff}.wrap{max-width:none}}';

  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Executive Intel Benchmark — ' + esc(p.full_name) + '</title><style>' + css + '</style></head><body><div class="wrap">' +
    '<header><h1>' + esc(p.full_name) + '</h1>' +
    '<div class="sub">' + esc(p.title) + ' · ' + esc(p.organization) + ' · generated ' + esc(now) + ' UTC</div></header>' +
    '<h2>Executive summary</h2><section>' +
    '<p><strong>Status:</strong> ' + esc((p.status || 'ACTIVE').toUpperCase()) + ' · ' +
    '<strong>Signals:</strong> ' + portfolio.stats.signal_count + ' · ' +
    '<strong>CSO-ready:</strong> ' + portfolio.stats.cso_ready_signal_count + ' · ' +
    '<strong>Valid:</strong> ' + portfolio.stats.valid_signal_count + '/' + portfolio.stats.signal_count + '</p>' +
    (p.relevance_framing ? '<p>' + esc(p.relevance_framing) + '</p>' : '') +
    '</section>' +
    '<h2>Portfolio comparison</h2>' + comparisonTable(portfolios) +
    '<h2>Signals</h2>' + signalsSection(portfolio) +
    '<p class="foot">SENTRY Executive Intelligence — review-only benchmark. Not published. Verify before CSO distribution.</p>' +
    '</div></body></html>';
}

export function downloadReport(
  portfolio: ExecutivePortfolio,
  portfolios: ExecutivePortfolioSummary[],
): void {
  const html = buildReportHtml(portfolio, portfolios);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = (portfolio.profile.full_name || 'executive').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  a.href = url;
  a.download = 'exec-intel-benchmark-' + slug + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
