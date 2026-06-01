/**
 * Playwright E2E configuration for SENTRY Framework Manager.
 *
 * Uses the locally installed Chrome (C:\Program Files (x86)\Google\Chrome\)
 * to avoid needing to download browser binaries through the corporate proxy.
 *
 * Frontend: http://localhost:3000  (Vite dev server)
 * Backend API: http://localhost:8082  (FastAPI)
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },

  /* Run tests in parallel per-file, sequentially within a file */
  fullyParallel: false,
  workers: 1,

  /* Re-run on failure once (useful for flaky network-dependent tests) */
  retries: 1,

  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/reports' }]],

  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },

  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
    /* Use locally installed Chrome — avoids corporate-proxy download issues */
    channel: 'chrome',
  },

  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        /* Use channel detection instead of a hard-coded Windows path. */
      },
    },
  ],
});