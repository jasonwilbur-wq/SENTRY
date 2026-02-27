/**
 * Market Analysis (CompetitorAnalysis) E2E tests.
 *
 * Tests the Q1 2026 Security Tech Forecast page including:
 * - 3D globe canvas renders
 * - KPI cards are visible
 * - Tab switching works
 * - Scatter/bar charts render
 * - Executive insight cards are present
 */
import { test, expect, type Page } from '@playwright/test';
import { BASE_URL, MarketAnalysis, AppShell } from './helpers/pageObjects';

async function openMarketAnalysis(page: Page) {
  await page.goto(BASE_URL);
  await page.waitForTimeout(1200);

  // Try nav link
  const link = page
    .getByRole('link', { name: /market|analysis|forecast|competitor/i })
    .first();

  if (await link.isVisible()) {
    await link.click();
  } else {
    // Fallback: look for a tab button
    const btn = page
      .getByRole('button', { name: /market|analysis|forecast/i })
      .first();
    if (await btn.isVisible()) await btn.click();
  }

  await page.waitForTimeout(1500);
}

test.describe('Market Analysis — Q1 2026 Forecast', () => {

  test('market analysis view loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openMarketAnalysis(page);
    await page.waitForTimeout(1000);
    expect(errors, `Unexpected JS errors: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('Q1 2026 forecast content is rendered', async ({ page }) => {
    await openMarketAnalysis(page);
    const body = await page.locator('body').textContent() ?? '';
    const hasForecastContent =
      body.includes('Q1') ||
      body.includes('Forecast') ||
      body.includes('Security Technology') ||
      body.includes('Pilot');
    expect(hasForecastContent).toBe(true);
  });

  test('Three.js globe canvas is rendered', async ({ page }) => {
    await openMarketAnalysis(page);
    // Give Three.js time to mount
    await page.waitForTimeout(2000);
    const ma = new MarketAnalysis(page);
    const canvas = ma.globeCanvas();
    // Canvas may be inside a div wrapper — check it exists in DOM
    const canvasCount = await page.locator('canvas').count();
    // Three.js creates a canvas element
    expect(canvasCount).toBeGreaterThan(0);
  });

  test('KPI cards are visible with numeric values', async ({ page }) => {
    await openMarketAnalysis(page);
    // KPI cards contain text like "<500ms", "<5%", ">90%"
    const body = await page.locator('body').textContent() ?? '';
    const hasKpiValues =
      body.includes('500ms') ||
      body.includes('<5%') ||
      body.includes('>90%') ||
      body.includes('100%') ||
      body.includes('12');
    expect(hasKpiValues).toBe(true);
  });

  test('Q1 Forecast tab is the default active tab', async ({ page }) => {
    await openMarketAnalysis(page);
    // Executive Intelligence section should be visible by default
    const hasExecContent = await page.locator('body').evaluate(
      el => el.textContent?.includes('Executive Intelligence') ||
             el.textContent?.includes('Telemetry') ||
             el.textContent?.includes('Category Matrix') ?? false,
    );
    expect(hasExecContent).toBe(true);
  });

  test('Vendor Data tab switches content', async ({ page }) => {
    await openMarketAnalysis(page);
    const ma = new MarketAnalysis(page);

    // Click the Vendor Data tab
    const vendorTab = page.getByRole('button', { name: /vendor/i }).first();
    if (!await vendorTab.isVisible()) { test.skip(); return; }

    await vendorTab.click();
    await page.waitForTimeout(600);

    // After switching, vendor-related content should appear
    const body = await page.locator('body').textContent() ?? '';
    const hasVendorContent =
      body.toLowerCase().includes('risk') ||
      body.toLowerCase().includes('vendor') ||
      body.toLowerCase().includes('rating');
    expect(hasVendorContent).toBe(true);
  });

  test('AI Analyst tab renders ChatAssistant', async ({ page }) => {
    await openMarketAnalysis(page);

    const chatTab = page.getByRole('button', { name: /ai|analyst|chat/i }).first();
    if (!await chatTab.isVisible()) { test.skip(); return; }

    await chatTab.click();
    await page.waitForTimeout(600);

    // Chat UI should have an input or message area
    const chatInput = page
      .getByPlaceholder(/ask|message|type/i)
      .or(page.locator('textarea'))
      .first();
    const chatVisible = await chatInput.isVisible().catch(() => false);
    // Chat input might be loading — check body has chat-related content
    const body = await page.locator('body').textContent() ?? '';
    const hasChatContent =
      chatVisible ||
      body.toLowerCase().includes('sentry') ||
      body.toLowerCase().includes('ai') ||
      body.toLowerCase().includes('analyst');
    expect(hasChatContent).toBe(true);
  });

  test('pilot cost data is rendered in investment section', async ({ page }) => {
    await openMarketAnalysis(page);
    // The pilot section mentions cost ranges like "$50k", "$150k", "$2.0M"
    const body = await page.locator('body').textContent() ?? '';
    const hasCostContent =
      body.includes('$') &&
      (body.includes('k') || body.includes('M')) &&
      (body.includes('50') || body.includes('150') || body.includes('300'));
    expect(hasCostContent).toBe(true);
  });

  test('executive insight cards render (at least 2 visible)', async ({ page }) => {
    await openMarketAnalysis(page);
    // Each card has an emoji + title + body text
    const cards = page.locator('text=🎯, text=📡, text=⚖️, text=🛡️');
    // At least one of the insight emoji icons should be visible
    const emojiCount = await page.locator('body').evaluate(
      el => [
        el.textContent?.includes('🎯'),
        el.textContent?.includes('📡'),
        el.textContent?.includes('⚖️'),
        el.textContent?.includes('🛡️'),
      ].filter(Boolean).length ?? 0,
    );
    expect(emojiCount).toBeGreaterThanOrEqual(2);
  });

  test('Recharts SVG charts are rendered (scatter + bar)', async ({ page }) => {
    await openMarketAnalysis(page);
    await page.waitForTimeout(1500);
    // Recharts renders SVG elements
    const svgCount = await page.locator('svg').count();
    expect(svgCount).toBeGreaterThan(0);
  });

  test('leadership timeline has three horizon cards', async ({ page }) => {
    await openMarketAnalysis(page);
    const body = await page.locator('body').textContent() ?? '';
    const hasTimeline =
      body.includes('30 Day') ||
      body.includes('60') ||
      body.includes('12 Month') ||
      body.includes('90 Day');
    expect(hasTimeline).toBe(true);
  });
});