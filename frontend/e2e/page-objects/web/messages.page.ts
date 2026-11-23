import type { Locator, Page } from '@playwright/test';

/**
 * The member app's Messages list at `/messages` (mocks `docs/mocks/pages/messages/list`, `empty`,
 * `loading` and `error`; ADR 0042): one row per conversation, the empty state and the load error.
 * Owns the selectors of that screen.
 */
export class WebMessagesPage {
  readonly heading: Locator;
  readonly rows: Locator;
  readonly loading: Locator;
  readonly emptyHeading: Locator;
  readonly browseEventsLink: Locator;
  readonly failedHeading: Locator;
  readonly tryAgainButton: Locator;
  /** The header's Messages destination. */
  readonly navLink: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Messages', exact: true });
    this.rows = page.locator('.conversation');
    this.loading = page.locator('[aria-busy="true"]');
    this.emptyHeading = page.getByRole('heading', { name: 'No messages yet' });
    this.browseEventsLink = page.getByRole('link', { name: 'Browse events' });
    this.failedHeading = page.getByRole('heading', { name: "Messages didn't load" });
    this.tryAgainButton = page.getByRole('button', { name: 'Try again' });
    this.navLink = page.locator('.app-header').getByRole('link', { name: 'Messages' });
  }

  async open(): Promise<void> {
    await this.page.goto('/messages');
  }

  /** One row's parts. */
  row(index: number): {
    link: Locator;
    name: Locator;
    meta: Locator;
    text: Locator;
    time: Locator;
    unread: Locator;
  } {
    const link = this.rows.nth(index);
    return {
      link,
      name: link.locator('.mini-row__name'),
      meta: link.locator('.mini-row__meta'),
      text: link.locator('.mini-row__text'),
      time: link.locator('.mini-row__time'),
      unread: link.locator('.count-pill'),
    };
  }

  /** The path and query the address bar shows. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }
}
