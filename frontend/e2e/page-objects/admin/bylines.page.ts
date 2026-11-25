import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's Bylines page (mock `docs/mocks/pages/admin-bylines/`): the page head with Add
 * byline, the table of bylines with Edit and Remove on each row, the loading, empty and error
 * states, and the admin toast region. Owns the selectors of that screen.
 */
export class AdminBylinesPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly addButton: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly avatars: Locator;
  readonly loading: Locator;
  readonly skeletons: Locator;
  readonly empty: Locator;
  readonly emptyTitle: Locator;
  readonly emptyText: Locator;
  readonly emptyAddButton: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly errorText: Locator;
  readonly tryAgainButton: Locator;
  readonly toastRegion: Locator;
  readonly toast: Locator;
  readonly toastTitle: Locator;
  readonly toastText: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.page-head .subtitle');
    this.addButton = this.main.locator('.page-head').getByRole('button', { name: 'Add byline' });
    this.table = this.main.getByRole('table', { name: 'Bylines' });
    this.rows = this.table.locator('tbody tr');
    this.avatars = this.rows.locator('.avatar');
    this.loading = this.main.locator('table[aria-busy="true"]');
    this.skeletons = this.loading.locator('.skeleton');
    this.empty = this.main.locator('.empty-state:not(.error-state)');
    this.emptyTitle = this.empty.locator('.empty-state__title');
    this.emptyText = this.empty.locator('.empty-state__text');
    this.emptyAddButton = this.empty.getByRole('button', { name: 'Add byline' });
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.locator('.empty-state__title');
    this.errorText = this.error.locator('.empty-state__text');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
    this.toastRegion = page.getByRole('region', { name: 'Notifications' });
    this.toast = this.toastRegion.locator('.toast');
    this.toastTitle = this.toast.locator('.toast__title');
    this.toastText = this.toast.locator('.toast__text');
  }

  /** Opens Bylines, or `path` when given (such as `/stories`). */
  async open(path = '/stories/bylines'): Promise<void> {
    await this.page.goto(path);
  }

  location(): string {
    return new URL(this.page.url()).pathname;
  }

  /** Each row's name, short bio and "Used by", as read. */
  async rowTexts(): Promise<string[][]> {
    return this.rows.evaluateAll((rows) =>
      rows.map((row) =>
        [...row.querySelectorAll('td:not(.table__end)')].map(
          (cell) => (cell.querySelector('.table__strong') ?? cell).textContent?.trim() ?? '',
        ),
      ),
    );
  }

  /** The column headings, as read. */
  async headings(): Promise<string[]> {
    return this.table
      .locator('thead th')
      .evaluateAll((cells) => cells.map((cell) => cell.textContent?.trim() ?? ''));
  }

  /** The Edit button of the byline named `name`. */
  editButton(name: string): Locator {
    return this.table.getByRole('button', { name: `Edit ${name}`, exact: true });
  }

  /** The Remove button of the byline named `name`. */
  removeButton(name: string): Locator {
    return this.table.getByRole('button', { name: `Remove ${name}`, exact: true });
  }
}
