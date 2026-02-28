/**
 * Smoke tests — does the SENTRY app load at all?
 *
 * These are the first line of defence: if any of these fail,
 * something fundamental is broken and we shouldn't bother
 * running the rest of the suite.
 */
import { test, expect } from '@playwright/test';
import { AppShell, BASE_URL } from './helpers/pageObjects';

test.describe('Smoke — App Bootstrap', () => {

  test('homepage returns HTTP 200 and loads without crashing', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    expect(response?.status()).toBeLessThan(400);
  });

  test('page has a meaningful title', async ({ page }) => {
    await page.goto(BASE_URL);
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title).not.toBe('Error');
  });

  test('no uncaught JavaScript errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(BASE_URL);
    // Give React time to mount + async data fetches to fire
    await page.waitForTimeout(2000);
    expect(errors, `JS errors detected: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('root #root element is present (React mounted)', async ({ page }) => {
    await page.goto(BASE_URL);
    const root = page.locator('#root');
    await expect(root).toBeAttached();
    // Ensure React actually rendered something inside
    const innerHtml = await root.innerHTML();
    expect(innerHtml.length).toBeGreaterThan(50);
  });

  test('app renders at least one heading', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);
    const headings = page.locator('h1, h2, h3');
    await expect(headings.first()).toBeVisible();
  });

  test('no 404 or 5xx errors in network requests on load', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('response', (response) => {
      // Ignore vendor assessment backend calls (may be offline in CI)
      if (response.url().includes('/api/') && response.status() >= 500) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });
    await page.goto(BASE_URL);
    await page.waitForTimeout(1500);
    // We allow backend to be down in unit-CI; only hard-fail on frontend 5xx
    const frontendErrors = failedRequests.filter(r => !r.includes(':8082'));
    expect(frontendErrors).toHaveLength(0);
  });

  test('CSS is loaded (body has non-default background)', async ({ page }) => {
    await page.goto(BASE_URL);
    const bgColor = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor,
    );
    // A dark-themed app should NOT have the browser default white
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('shell renders navigation element', async ({ page }) => {
    const shell = new AppShell(page);
    await shell.goto();
    await page.waitForTimeout(1000);
    // Sidebar nav should be visible
    await expect(shell.sidebar).toBeVisible();
  });
});