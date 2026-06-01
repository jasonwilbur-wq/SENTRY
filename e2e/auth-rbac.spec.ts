import { expect, type Page, test } from '@playwright/test';
import { gotoApp } from './helpers/pageObjects';

type MockUser = {
  id: string;
  role: 'admin' | 'user';
  is_admin: boolean;
};

const emptyStats = {
  total_vendors: 0,
  total_vars: 0,
  vendors_with_var: 0,
  var_coverage_pct: 0,
  avg_rating: 0,
  recently_assessed: 0,
  risk_distribution: {},
  top_categories: [],
  decision_bands: {},
};

async function mockApi(page: Page, options: { authEnabled?: boolean; user?: MockUser; rejectAuth?: boolean } = {}) {
  await page.addInitScript(() => {
    // Keep tests independent from the developer's .env.development identity.
    (window as typeof window & { __SENTRY_E2E_DISABLE_ENV_USER__?: boolean }).__SENTRY_E2E_DISABLE_ENV_USER__ = true;
    // Keep analytics fire-and-forget behavior from leaking to a real backend in mocked UI tests.
    Object.defineProperty(window.navigator, 'sendBeacon', { value: () => true, configurable: true });
  });
  const authEnabled = options.authEnabled ?? true;
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/health') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          version: '2.1.0',
          auth_mode: authEnabled ? 'header' : 'off',
          auth_enabled: authEnabled,
          auth_warning: authEnabled ? null : 'Authentication is DISABLED for local development.',
        }),
      });
    }

    if (url.pathname === '/api/auth/me') {
      if (options.rejectAuth) {
        return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ detail: 'not authorized' }) });
      }
      const user = options.user ?? { id: 'viewer_bob', role: 'user', is_admin: false };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }

    if (url.pathname === '/api/vendors/categories') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ categories: [] }) });
    }

    if (url.pathname === '/api/vendors') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ total: 0, page: 1, page_size: 20, total_pages: 1, vendors: [] }),
      });
    }

    if (url.pathname === '/api/stats') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyStats) });
    }

    if (url.pathname === '/api/analytics/events' || url.pathname === '/api/analytics/events/batch') {
      return route.fulfill({ status: 204 });
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
}

async function enterWorkspaceAt(page: Page, view = 'ARCHITECTURE') {
  await page.addInitScript(([storedView]) => {
    window.sessionStorage.setItem('sentry.platform.entered', 'true');
    window.sessionStorage.setItem('sentry.platform.view', storedView as string);
  }, [view]);
}

test.describe('Auth and RBAC shell behavior', () => {
  test('secure mode prompts for identity when no user is configured', async ({ page }) => {
    await mockApi(page, { authEnabled: true });
    await enterWorkspaceAt(page);

    await gotoApp(page);

    await expect(page.getByRole('heading', { name: /SENTRY access required/i })).toBeVisible();
    await expect(page.getByLabel(/SENTRY user ID/i)).toBeVisible();
  });

  test('non-admin users can enter workspace but cannot see admin navigation', async ({ page }) => {
    await mockApi(page, { authEnabled: true, user: { id: 'viewer_bob', role: 'user', is_admin: false } });
    await enterWorkspaceAt(page);
    await page.addInitScript(() => window.sessionStorage.setItem('sentry.auth.user', 'viewer_bob'));

    await gotoApp(page);

    await expect(page.getByRole('navigation', { name: /site sections/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'VAR Admin' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Request Queue' })).toHaveCount(0);
  });

  test('admin users can see admin navigation entries', async ({ page }) => {
    await mockApi(page, { authEnabled: true, user: { id: 'admin_alice', role: 'admin', is_admin: true } });
    await enterWorkspaceAt(page);
    await page.addInitScript(() => window.sessionStorage.setItem('sentry.auth.user', 'admin_alice'));

    await gotoApp(page);

    await expect(page.getByRole('button', { name: 'VAR Admin' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request Queue' })).toBeVisible();
  });

  test('rejected identities offer a reset path', async ({ page }) => {
    await mockApi(page, { authEnabled: true, rejectAuth: true });
    await enterWorkspaceAt(page);
    await page.addInitScript(() => window.sessionStorage.setItem('sentry.auth.user', 'hacker_eve'));

    await gotoApp(page);

    await expect(page.getByText(/not authorized to access SENTRY/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Use a different user ID/i })).toBeVisible();
  });
});
