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
  readonly professionalsHeading: Locator;
  readonly professionals: Locator;
  readonly professionalsSection: Locator;
  readonly professionalsError: Locator;
  readonly professionalsTryAgain: Locator;

  footerLink(name: string) {
    return this.page.getByRole('contentinfo').getByRole('link', { name, exact: true });
  }

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 });
    this.joinFree = page.locator('.site-header').getByRole('link', { name: 'Join free' });
    this.signIn = page.locator('.site-header').getByRole('link', { name: 'Sign in' });
    this.rows = page.locator('.landing-list .event-row');
    this.list = page.locator('.landing-list');
    this.error = page.locator('.landing-list .inline-error');
    this.tryAgain = this.error.getByRole('button', { name: 'Try again' });
    this.verse = page.locator('.verse__quote');
    this.professionalsHeading = page.getByRole('heading', { name: 'Meet our professionals' });
    this.professionalsSection = page.locator('.landing-pros');
    this.professionals = page.locator('.landing-pros .service-row');
    this.professionalsError = page.locator('.landing-pros .inline-error');
    this.professionalsTryAgain = this.professionalsError.getByRole('button', { name: 'Try again' });
  }

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  /** Scrolls the professionals section into view, which starts its deferred load. */
  async scrollToProfessionals(): Promise<void> {
    await this.professionalsHeading.scrollIntoViewIfNeeded();
  }

  /** The feeds the document head names: each `<link rel="alternate">` of type RSS, in order. */
  feeds(): Promise<{ title: string | null; href: string | null }[]> {
    return this.page
      .locator('head link[rel="alternate"][type="application/rss+xml"]')
      .evaluateAll((links) =>
        links.map((link) => ({
          title: link.getAttribute('title'),
          href: link.getAttribute('href'),
        })),
      );
  }

  /** The footer's links' words, in order. */
  async footerLinks(): Promise<string[]> {
    const words = await this.page.getByRole('contentinfo').getByRole('link').allTextContents();
    return words.map((w) => w.trim());
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

  /** Each professional's name, role and where, price and where it leads. */
  async professionalRows(): Promise<
    { href: string | null; name: string; text: string; price: string; initials: string }[]
  > {
    return this.professionals.evaluateAll((rows) =>
      rows.map((row) => ({
        href: row.getAttribute('href'),
        name: row.querySelector('.mini-row__name, .service-row__name')?.textContent?.trim() ?? '',
        text: row.querySelector('.mini-row__text, .service-row__text')?.textContent?.trim() ?? '',
        price: row.querySelector('.service-row__price')?.textContent?.trim() ?? '',
        initials: row.querySelector('.avatar')?.textContent?.trim() ?? '',
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
