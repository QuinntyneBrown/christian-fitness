import type { Locator, Page } from '@playwright/test';

/**
 * The member app's Home at `/home`: a stand-in until slice 13.1 (ADR 0007), the mock's greeting
 * heading in one `main` landmark. Owns the selectors of that screen.
 */
export class WebHomePage {
  readonly main: Locator;
  readonly greeting: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.greeting = this.main.locator('.page-title--greeting');
  }

  async open(): Promise<void> {
    await this.page.goto('/home');
  }

  /** Waits until the API has answered the session the greeting is read from. */
  async sessionAnswered(): Promise<void> {
    await this.page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/session',
    );
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The path and query the address bar shows. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }
}
