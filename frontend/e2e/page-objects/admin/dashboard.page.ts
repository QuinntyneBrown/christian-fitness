import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's Dashboard (mock `docs/mocks/pages/admin-dashboard/`), as far as slice 28.1
 * builds it: the page heading and the community activity of the last weeks, with its loading,
 * empty and error states. Owns the selectors of that screen.
 */
export class AdminDashboardPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly activityHeading: Locator;
  readonly table: Locator;
  readonly columnHeaders: Locator;
  readonly rows: Locator;
  readonly loading: Locator;
  readonly empty: Locator;
  readonly emptyTitle: Locator;
  readonly emptyText: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly errorText: Locator;
  readonly tryAgainButton: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.activityHeading = this.main.getByRole('heading', { level: 2, name: 'Community activity' });
    this.table = this.main.locator('.table-wrap .table');
    this.columnHeaders = this.table.locator('thead th');
    this.rows = this.table.locator('tbody tr');
    this.loading = this.main.locator('.skeleton-region[aria-busy="true"]');
    this.empty = this.main.locator('.empty-state');
    this.emptyTitle = this.empty.locator('.empty-state__title');
    this.emptyText = this.empty.locator('.empty-state__text');
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.locator('.empty-state__title');
    this.errorText = this.error.locator('.empty-state__text');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
  }

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** Each row as its cells' text: the week, then new members, registrations and messages. */
  async rowTexts(): Promise<string[][]> {
    return this.rows.evaluateAll((rows) =>
      rows.map((row) =>
        [...row.querySelectorAll('th, td')].map(
          (cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        ),
      ),
    );
  }
}
