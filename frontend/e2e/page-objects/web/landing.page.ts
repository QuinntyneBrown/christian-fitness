import type { Locator, Page } from '@playwright/test';

/** One event row of the landing page's "Coming up" list. */
export interface LandingRow {
  href: string | null;
  month: string;
  day: string;
  title: string;
  meta: string;
}

/** The member app's public landing page at `/`. Owns the selectors of that screen. */
export class WebLandingPage {
  readonly heading: Locator;
  readonly joinFree: Locator;
  readonly signIn: Locator;
  readonly rows: Locator;
  readonly list: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;
  readonly verse: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 });
    this.joinFree = page.locator('.site-header').getByRole('link', { name: 'Join free' });
    this.signIn = page.locator('.site-header').getByRole('link', { name: 'Sign in' });
    this.rows = page.locator('.landing-list .event-row');
    this.list = page.locator('.landing-list');
    this.error = page.locator('.landing-list .inline-error');
    this.tryAgain = this.error.getByRole('button', { name: 'Try again' });
    this.verse = page.locator('.verse__quote');
  }

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** Each row's date, title, meta and where it leads. */
  async events(): Promise<LandingRow[]> {
    return this.rows.evaluateAll((rows) =>
      rows.map((row) => ({
        href: row.getAttribute('href'),
        month: row.querySelector('.event-row__month')?.textContent?.trim() ?? '',
        day: row.querySelector('.event-row__day')?.textContent?.trim() ?? '',
        title: row.querySelector('.event-row__title')?.textContent?.trim() ?? '',
        meta: row.querySelector('.event-row__meta')?.textContent?.trim() ?? '',
      })),
    );
  }

  /** Whether the page is wider than the viewport. */
  overflowsHorizontally(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }
}
