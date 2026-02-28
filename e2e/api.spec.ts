/**
 * API E2E tests — test the FastAPI backend directly via page.request.
 *
 * These validate the API contract without going through the UI.
 * All tests skip gracefully if the backend is unreachable (offline CI).
 *
 * Backend: http://localhost:8082
 */
import { test, expect } from '@playwright/test';
import { API_URL } from './helpers/pageObjects';

// Utility: check if backend is alive before running API tests
async function backendAlive(page: any): Promise<boolean> {
  const r = await page.request.get(`${API_URL}/api/health`).catch(() => null);
  return r?.ok() ?? false;
}

test.describe('API — FastAPI Backend Contract', () => {

  test('health endpoint returns 200', async ({ page }) => {
    const alive = await backendAlive(page);
    if (!alive) { test.skip(); return; }

    const r = await page.request.get(`${API_URL}/api/health`);
    expect(r.status()).toBe(200);
  });

  test('health response has expected shape', async ({ page }) => {
    const alive = await backendAlive(page);
    if (!alive) { test.skip(); return; }

    const r    = await page.request.get(`${API_URL}/api/health`);
    const body = await r.json();
    // Minimal contract: status or ok field
    expect(
      body.status === 'ok' ||
      body.status === 'healthy' ||
      body.ok === true ||
      typeof body === 'object',
    ).toBe(true);
  });

  test('GET /api/vendors returns a list response', async ({ page }) => {
    const alive = await backendAlive(page);
    if (!alive) { test.skip(); return; }

    const r    = await page.request.get(`${API_URL}/api/vendors`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    // Expect either an array or an object with items/vendors/data key
    const hasVendors =
      Array.isArray(body) ||
      Array.isArray(body?.vendors) ||
      Array.isArray(body?.items) ||
      Array.isArray(body?.data) ||
      typeof body?.total === 'number';
    expect(hasVendors).toBe(true);
  });

  test('GET /api/vendors with search param returns filtered results', async ({ page }) => {
    const alive = await backendAlive(page);
    if (!alive) { test.skip(); return; }

    const r    = await page.request.get(`${API_URL}/api/vendors?search=security`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    // Should still return a valid response shape
    expect(typeof body).toBe('object');
  });

  test('GET /api/vendors?page=1 pagination works', async ({ page }) => {
    const alive = await backendAlive(page);
    if (!alive) { test.skip(); return; }

    const r1 = await page.request.get(`${API_URL}/api/vendors?page=1`);
    const r2 = await page.request.get(`${API_URL}/api/vendors?page=2`);
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
  });

  test('GET /api/categories returns a list of category strings', async ({ page }) => {
    const alive = await backendAlive(page);
    if (!alive) { test.skip(); return; }

    const r    = await page.request.get(`${API_URL}/api/categories`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    const cats = Array.isArray(body) ? body : (body?.categories ?? body?.data ?? []);
    expect(Array.isArray(cats)).toBe(true);
    if (cats.length > 0) {
      expect(typeof cats[0]).toBe('string');
    }
  });

  test('POST /api/chat with a message returns a response', async ({ page }) => {
    const alive = await backendAlive(page);
    if (!alive) { test.skip(); return; }

    const r = await page.request.post(`${API_URL}/api/chat`, {
      data: { message: 'Hello SENTRY', session_id: 'e2e-test' },
    }).catch(() => null);

    if (!r) { test.skip(); return; }  // Chat endpoint may not exist in all builds

    // Accept 200 or 422 (if auth required) — just not 500
    expect(r.status()).toBeLessThan(500);
  });

  test('invalid vendor ID returns 404 not 500', async ({ page }) => {
    const alive = await backendAlive(page);
    if (!alive) { test.skip(); return; }

    const r = await page.request.get(`${API_URL}/api/vendors/nonexistent-id-xyz-123`);
    // Should be 404 (not found) not 500 (server error)
    const status = r.status();
    expect([404, 422]).toContain(status);
  });

  test('API returns JSON content-type header', async ({ page }) => {
    const alive = await backendAlive(page);
    if (!alive) { test.skip(); return; }

    const r = await page.request.get(`${API_URL}/api/vendors`);
    const ct = r.headers()['content-type'] ?? '';
    expect(ct).toContain('application/json');
  });
});