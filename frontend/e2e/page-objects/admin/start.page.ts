import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's first route: the shell and an empty `main` landmark until staff sign-in
 * arrives (slice 9.1). Owns the selectors of that screen.
 */
export class AdminStartPage {
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
