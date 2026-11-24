import type { Locator, Page } from '@playwright/test';

/**
 * The member app's Services at `/services` (mock `docs/mocks/pages/services/`), so far its heading,
 * subtitle and the "Apply to be listed" button that opens the application dialog (slice 22.1; the
 * listing joins in slice 16.1). Owns the selectors of that screen.
 */
export class WebServicesPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly applyButton: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.applyButton = this.main.getByRole('button', { name: 'Apply to be listed' });
  }

  async open(): Promise<void> {
    await this.page.goto('/services');
  }
}
