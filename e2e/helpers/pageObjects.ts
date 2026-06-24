/**
 * Page Object Model helpers for SENTRY E2E tests.
 *
 * Page objects encapsulate selector logic so tests stay
 * readable when the UI changes.
 */
import { type Page, type Locator, type Response } from '@playwright/test';

export const BASE_URL = 'http://127.0.0.1:3000';
export const API_URL  = 'http://localhost:8082';

/**
 * Navigate to the Vite app with a small retry loop.
 *
 * Playwright can race the first dev-server connection on Windows and surface
 * `net::ERR_CONNECTION_RESET` even though the next request succeeds. Keep this
 * retry centralized so individual tests don't grow little flake gardens.
 */
export async function gotoApp(page: Page, url = BASE_URL): Promise<Response | null> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    } catch (error) {
      lastError = error;
      if (attempt === 3) break;
      await page.waitForTimeout(400 * attempt);
    }
  }

  throw lastError;
}

// ── Landing / Shell ────────────────────────────────────────────────────────

export class AppShell {
  readonly page: Page;
  readonly sidebar:   Locator;
  readonly mainTitle: Locator;

  constructor(page: Page) {
    this.page      = page;
    // SENTRY renders a sidebar nav — look for nav or aside role
    this.sidebar   = page.locator('nav, aside').first();
    this.mainTitle = page.locator('h1, h2').first();
  }

  async goto() {
    await gotoApp(this.page);
    await this.enterPlatformIfNeeded();
    await this.sidebar.waitFor({ state: 'visible', timeout: 10_000 });
  }

  /** Enter through the landing page when a fresh browser context starts there. */
  async enterPlatformIfNeeded() {
    const enterButton = this.page.getByRole('button', { name: /enter sentry/i });

    try {
      await enterButton.waitFor({ state: 'visible', timeout: 2_500 });
      await enterButton.click();
    } catch {
      // Already inside the app shell, or the landing CTA is not present.
    }
  }

  /** Click a sidebar/nav item by its visible text. */
  async navigateTo(label: string) {
    await this.page.getByRole('button', { name: label }).first().click();
  }

  /** Click a button by its accessible name */
  async clickButton(name: string) {
    await this.page.getByRole('button', { name }).first().click();
  }
}

// ── Vendor Dashboard ──────────────────────────────────────────────────────

export class VendorDashboard {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly detailModal: Locator;

  constructor(page: Page) {
    this.page      = page;
    this.searchBox = page.getByPlaceholder(/search/i);
    this.detailModal = page.getByTestId('vendor-detail-modal');
  }

  /** Returns all vendor card elements currently visible */
  vendorCards(): Locator {
    // Vendor cards use a consistent structure — look for article or div
    // with a company name inside. We look for data-testid if present,
    // otherwise fall back to aria-label or heading inside cards.
    return this.page.locator('[data-testid="vendor-card"], .vendor-card').or(
      this.page.locator('article, [role="listitem"]').filter({ hasText: /rating|score/i }),
    );
  }

  async search(query: string) {
    await this.searchBox.fill(query);
    // Allow debounce to settle
    await this.page.waitForTimeout(400);
  }

  async clearSearch() {
    await this.searchBox.clear();
    await this.page.waitForTimeout(400);
  }

  async openFirstVendorCard() {
    await this.vendorCards().first().click();
    await this.page.waitForTimeout(500);
  }

  modalTab(label: string): Locator {
    return this.detailModal.getByRole('tab', { name: label });
  }

  modalCloseButton(): Locator {
    return this.detailModal.getByRole('button', { name: /close/i });
  }
}

// ── Market Analysis ────────────────────────────────────────────────────────

export class MarketAnalysis {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Click a tab by its label text */
  async clickTab(label: string) {
    await this.page.getByRole('button', { name: label }).click();
    await this.page.waitForTimeout(300);
  }

  /** The canvas element rendered by Three.js (MarketGlobe) */
  globeCanvas(): Locator {
    return this.page.locator('canvas').first();
  }
}