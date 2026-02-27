/**
 * Page Object Model helpers for SENTRY E2E tests.
 *
 * Page objects encapsulate selector logic so tests stay
 * readable when the UI changes.
 */
import { type Page, type Locator } from '@playwright/test';

export const BASE_URL = 'http://localhost:3000';
export const API_URL  = 'http://localhost:8082';

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
    await this.page.goto(BASE_URL);
  }

  /** Click a sidebar/nav link by its visible text */
  async navigateTo(label: string) {
    await this.page.getByRole('link', { name: label }).first().click();
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

  constructor(page: Page) {
    this.page      = page;
    this.searchBox = page.getByPlaceholder(/search/i);
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