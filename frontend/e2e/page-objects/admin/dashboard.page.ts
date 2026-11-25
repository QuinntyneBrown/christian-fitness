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
  readonly attention: Locator;
  readonly attentionHeading: Locator;
  readonly attentionItems: Locator;
  readonly attentionLoading: Locator;
  readonly attentionEmpty: Locator;
  readonly attentionError: Locator;
  readonly attentionTryAgain: Locator;
  readonly seeAllLinks: Locator;
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
    this.attention = this.main.locator('section[aria-labelledby="attention-title"]');
    this.attentionHeading = this.attention.locator('#attention-title');
    this.attentionItems = this.attention.locator('li:has(.attention__row)');
    this.attentionLoading = this.attention.locator('.skeleton-region[aria-busy="true"]');
    this.attentionEmpty = this.attention.locator('.empty-state');
    this.attentionError = this.attention.locator('.error-state');
    this.attentionTryAgain = this.attentionError.getByRole('button', { name: 'Try again' });
    this.seeAllLinks = this.attention.locator('.attention__all a');
    const activity = this.main.locator('section[aria-labelledby="activity-title"]');
    this.table = activity.locator('.table-wrap .table');
    this.columnHeaders = this.table.locator('thead th');
    this.rows = this.table.locator('tbody tr');
    this.loading = activity.locator('.skeleton-region[aria-busy="true"]');
    this.empty = activity.locator('.empty-state');
    this.emptyTitle = this.empty.locator('.empty-state__title');
    this.emptyText = this.empty.locator('.empty-state__text');
    this.error = activity.locator('.error-state');
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

  /** Each waiting item as its text (title, then the line under it) and where its Review goes. */
  async attentionTexts(): Promise<{ title: string; meta: string; href: string | null }[]> {
    return this.attentionItems.evaluateAll((items) =>
      items.map((item) => ({
        title: item.querySelector('.attention__title')?.textContent?.trim() ?? '',
        meta: item.querySelector('.attention__meta')?.textContent?.trim() ?? '',
        href: item.querySelector('a')?.getAttribute('href') ?? null,
      })),
    );
  }

  /** Each waiting item's action as read aloud: its word, then the row it acts on. */
  async attentionActions(): Promise<string[]> {
    return this.attentionItems.evaluateAll((items) =>
      items.map((item) => (item.querySelector('a')?.textContent ?? '').replace(/\s+/g, ' ').trim()),
    );
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
