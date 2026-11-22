import type { Locator, Page } from '@playwright/test';

/**
 * The member app's first route: the shell and an empty `main` landmark until the landing page
 * arrives (slice 8.1). Owns the selectors of that screen.
 */
export class WebStartPage {
  readonly main: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
  }

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  title(): Promise<string> {
    return this.page.title();
  }
}
