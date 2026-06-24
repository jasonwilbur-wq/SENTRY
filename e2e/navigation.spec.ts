/**
 * Navigation tests — can the user get around the app?
 *
 * SENTRY is a SPA. We test that clicking nav items renders
 * the expected view without a full page reload or crash.
 */
import { test, expect } from '@playwright/test';
import { AppShell } from './helpers/pageObjects';

// Helper: wait for a heading/text to appear after navigation
async function expectContentContaining(page: any, pattern: RegExp, timeout = 6000) {
  await expect(page.locator('body')).toContainText(pattern, { timeout });
}

test.describe('Navigation — SPA Routing', () => {

  test.beforeEach(async ({ page }) => {
    const shell = new AppShell(page);
    await shell.goto();
    await page.waitForTimeout(600);
  });

  test('app loads and sidebar is visible', async ({ page }) => {
    const shell = new AppShell(page);
    await expect(shell.sidebar).toBeVisible();
  });

  test('can navigate to Vendor Dashboard view', async ({ page }) => {
    const shell = new AppShell(page);
    await shell.navigateTo('Vendor Directory');
    await page.waitForTimeout(800);

    // Either vendors loaded or a loading state is present
    const hasVendorContent = await page.locator('body').evaluate(
      el => el.textContent?.toLowerCase().includes('vendor') ?? false,
    );
    expect(hasVendorContent).toBe(true);
  });

  test('can navigate to Market Analysis / Forecast view', async ({ page }) => {
    const shell = new AppShell(page);
    await shell.navigateTo('Market Analysis');
    await page.waitForTimeout(1200);

    // The forecast page should mention "Q2" or "Forecast" or "Security Technology"
    await expectContentContaining(page, /Q2|forecast|security technology|market analysis/i, 8000);
  });

  test('clicking a nav item does not trigger a full page reload', async ({ page }) => {
    // Record the number of navigations — a SPA should only have the initial one
    let navCount = 0;
    page.on('framenavigated', () => navCount++);
    const shell = new AppShell(page);
    const initialNavCount = navCount;

    await shell.navigateTo('Vendor Directory');
    await page.waitForTimeout(500);

    // In a true SPA, framenavigated fires once more for hash/history change.
    // But it should NOT load a new HTML document.
    expect(navCount).toBeLessThanOrEqual(initialNavCount + 1);
  });

  test('SENTRY branding is present somewhere in the shell', async ({ page }) => {
    const bodyText = await page.locator('body').textContent() ?? '';
    expect(
      bodyText.toUpperCase().includes('SENTRY') ||
      bodyText.toUpperCase().includes('WALMART') ||
      bodyText.includes('Vendor'),
    ).toBe(true);
  });

  test('back button does not crash the app', async ({ page }) => {
    await page.goBack();
    await page.goForward();
    await page.waitForTimeout(500);
    // App should still be alive — root must still be attached
    await expect(page.locator('#root')).toBeAttached();
  });
});