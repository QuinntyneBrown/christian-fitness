import type { Locator, Page } from '@playwright/test';

/**
 * What the not-found and server-error screens of both apps share: the design system's error-page
 * block (`empty-state--system`) in the page's one `main` landmark. Each screen's page object
 * extends this and adds how it is opened.
 */
export abstract class ErrorScreen {
  readonly main: Locator;
  readonly heading: Locator;
  readonly code: Locator;
  readonly text: Locator;
  readonly actions: Locator;

  constructor(protected readonly page: Page) {
    this.main = page.getByRole('main');
    const block = this.main.locator('.empty-state--system');
    this.heading = block.getByRole('heading', { level: 1 });
    this.code = block.locator('.system__code');
    this.text = block.locator('.empty-state__text');
    this.actions = block.locator('.empty-state__actions').getByRole('link');
  }

  /** The action link with this accessible name. */
  action(name: string): Locator {
    return this.actions.filter({ hasText: name });
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The path and query the address bar shows. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }

  /** Moves keyboard focus forward once. */
  async tab(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  /** Follows the focused link with the keyboard. */
  async pressEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }
}
