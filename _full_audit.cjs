/**
 * SENTRY Full Audit — screenshots + console errors for every view.
 */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  const warns = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 300)));
  p.on('console', msg => {
    if (msg.type() === 'error') warns.push(msg.text().slice(0, 200));
  });

  // Landing page
  await p.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 20000 });
  await p.screenshot({ path: '_audit/01_landing.png' });

  // Click enter
  const enterBtn = await p.$('button');
  if (enterBtn) await enterBtn.click();
  await p.waitForTimeout(2000);
  await p.screenshot({ path: '_audit/02_home.png' });

  // Navigate to each view via sidebar buttons
  const views = [
    { name: 'Competitor Intel', file: '03_competitor_intel' },
    { name: 'CSO Intelligence', file: '04_cso_intel' },
    { name: 'Regulatory Intel', file: '05_regulatory_intel' },
    { name: 'Incident Intel', file: '06_incident_intel' },
    { name: 'Market Analysis', file: '07_market_analysis' },
    { name: 'Vendor Directory', file: '08_vendor_directory' },
    { name: 'Project Portfolio', file: '09_project_portfolio' },
    { name: 'Command Center', file: '10_command_center' },
  ];

  for (const view of views) {
    // Find sidebar button
    const buttons = await p.$$('button');
    let found = false;
    for (const btn of buttons) {
      const text = await btn.innerText().catch(() => '');
      if (text.trim() === view.name) {
        await btn.click();
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(`⚠️  Could not find sidebar button: "${view.name}"`);
      continue;
    }
    await p.waitForTimeout(3000);
    await p.screenshot({ path: `_audit/${view.file}.png`, fullPage: false });
    console.log(`📸 ${view.name}`);
  }

  // Check API health
  const apis = [
    '/api/stats',
    '/api/morning-brief',
    '/api/competitors/stats',
    '/api/incidents/stats',
    '/api/regulatory/summary',
    '/api/projects',
    '/api/vendors?page=1&page_size=5',
  ];

  console.log('\n=== API Health Check ===');
  for (const api of apis) {
    try {
      const res = await p.evaluate(async (url) => {
        const r = await fetch(url);
        const data = await r.json();
        return { status: r.status, keys: Object.keys(data).join(', '), size: JSON.stringify(data).length };
      }, api);
      console.log(`✅ ${api} → ${res.status} (${res.size} bytes) keys: [${res.keys}]`);
    } catch (e) {
      console.log(`❌ ${api} → FAILED: ${e.message.slice(0, 100)}`);
    }
  }

  console.log('\n=== Console Errors ===');
  console.log(errs.length ? errs.join('\n') : 'NONE');
  console.log('\n=== Console Warnings ===');
  console.log(warns.length ? warns.join('\n') : 'NONE');

  await b.close();
})().catch(e => console.error('FATAL:', e.message));
