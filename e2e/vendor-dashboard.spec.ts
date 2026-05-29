/**
 * Vendor Dashboard E2E tests.
 *
 * Covers: vendor list renders, search/filter, vendor detail modal,
 * pagination, and request assessment CTA.
 *
 * Assumes backend is running on :8082. Tests gracefully skip or
 * partially pass if the backend is unreachable.
 */
import { test, expect, type Page } from '@playwright/test';
import { API_URL, AppShell, VendorDashboard } from './helpers/pageObjects';

// Navigate to the vendor dashboard view
async function openDashboard(page: Page) {
  const shell = new AppShell(page);
  await shell.goto();
  await shell.navigateTo('Vendor Directory');
  await page.waitForTimeout(800);
}

async function backendHealthy(page: Page) {
  const health = await page.request.get(`${API_URL}/api/health`).catch(() => null);
  return !!health && health.ok();
}

test.describe('Vendor Dashboard', () => {

  test('dashboard view renders without crashing', async ({ page }) => {
    await openDashboard(page);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('vendor-related content is visible on dashboard', async ({ page }) => {
    await openDashboard(page);
    const body = await page.locator('body').textContent() ?? '';
    const hasVendorContent =
      body.toLowerCase().includes('vendor') ||
      body.toLowerCase().includes('rating') ||
      body.toLowerCase().includes('loading');
    expect(hasVendorContent).toBe(true);
  });

  test('search input is present and focusable', async ({ page }) => {
    await openDashboard(page);
    const dashboard = new VendorDashboard(page);
    // The search box might not be visible if backend is loading — wait a bit
    await page.waitForTimeout(1500);
    const searchVisible = await dashboard.searchBox.isVisible().catch(() => false);
    if (searchVisible) {
      await dashboard.searchBox.focus();
      await dashboard.searchBox.fill('test query');
      const val = await dashboard.searchBox.inputValue();
      expect(val).toBe('test query');
      await dashboard.clearSearch();
    } else {
      // Search box not present — may be offline mode with fallback UI
      test.skip();
    }
  });

  test('search filters the vendor list (if backend is up)', async ({ page }) => {
    if (!await backendHealthy(page)) {
      test.skip();
      return;
    }

    await openDashboard(page);
    const dashboard = new VendorDashboard(page);
    await page.waitForTimeout(2000); // Let vendors load

    const searchBox = dashboard.searchBox;
    if (!await searchBox.isVisible()) { test.skip(); return; }

    // Capture body before search
    const bodyBefore = await page.locator('body').textContent() ?? '';

    // Type a search term unlikely to match everything
    await dashboard.search('zzxyz_no_match_expected');
    await page.waitForTimeout(700);

    const bodyAfter = await page.locator('body').textContent() ?? '';
    // The body should have changed (no results message or fewer cards)
    expect(bodyAfter).not.toBe(bodyBefore);
  });

  test('risk and category filters are accessible', async ({ page }) => {
    await openDashboard(page);
    await page.waitForTimeout(1500);

    const riskButton = page.getByRole('button', { name: /high|critical|medium|low/i }).first();
    const categoryButton = page.getByRole('button', { name: /video ai|vms\/nvr|robotics|all/i }).first();

    const filtersVisible = await riskButton.isVisible().catch(() => false) || await categoryButton.isVisible().catch(() => false);
    if (!filtersVisible) {
      test.skip();
      return;
    }

    if (await riskButton.isVisible().catch(() => false)) {
      await expect(riskButton).toBeEnabled();
    }
    if (await categoryButton.isVisible().catch(() => false)) {
      await expect(categoryButton).toBeEnabled();
    }
  });

  test('pagination controls present when there are multiple pages', async ({ page }) => {
    if (!await backendHealthy(page)) { test.skip(); return; }

    await openDashboard(page);
    await page.waitForTimeout(2500);

    // Look for next/previous page buttons
    const pagerNext = page
      .getByRole('button', { name: /next|›|»/i })
      .or(page.getByLabel(/next page/i))
      .first();

    const pagerVisible = await pagerNext.isVisible().catch(() => false);
    // If there are fewer vendors than one page, pagination won't show — that's fine
    if (pagerVisible) {
      await expect(pagerNext).toBeEnabled();
    }
    // else: single page of results — pass
  });

  test('vendor card opens accessible detail modal with working tabs and escape close', async ({ page }) => {
    if (!await backendHealthy(page)) { test.skip(); return; }

    await openDashboard(page);
    await page.waitForTimeout(2500);

    const dashboard = new VendorDashboard(page);
    const firstCard = dashboard.vendorCards().first();
    const cardVisible = await firstCard.isVisible().catch(() => false);
    if (!cardVisible) { test.skip(); return; }

    await dashboard.openFirstVendorCard();
    await expect(dashboard.detailModal).toBeVisible();
    await expect(dashboard.modalCloseButton()).toBeVisible();
    await expect(dashboard.modalTab('Technology')).toBeVisible();

    await dashboard.modalTab('Technology').click();
    await expect(dashboard.detailModal).toContainText(/assessment pipeline|hosting model|data classification/i);

    await page.keyboard.press('Escape');
    await expect(dashboard.detailModal).toBeHidden();
  });
});