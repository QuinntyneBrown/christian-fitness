import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's event registrations page (mock `docs/mocks/pages/admin-event-registrations/`): the
 * breadcrumb, the event's title, the capacity used, the table of names and registration dates, and
 * its loading, empty and error states. Owns the selectors of that screen.
 */
export class EventRegistrationsPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly breadcrumbEvents: Locator;
  readonly capacity: Locator;
  readonly capacityLabel: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly loading: Locator;
  readonly empty: Locator;
  readonly emptyTitle: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly tryAgainButton: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.page-head .subtitle');
    this.breadcrumbEvents = this.main
      .getByRole('navigation', { name: 'Breadcrumb' })
      .getByRole('link', { name: 'Events' });
    this.capacity = this.main.getByRole('progressbar');
    this.capacityLabel = this.main.locator('.progress__label');
    this.table = this.main.locator('.table-wrap .table');
    this.rows = this.table.locator('tbody tr');
    this.loading = this.main.locator('.skeleton-region[aria-busy="true"]');
    this.empty = this.main.locator('.empty-state');
    this.emptyTitle = this.empty.locator('.empty-state__title');
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.locator('.empty-state__title');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
  }

  /** Opens the registrations of the event `id` by its address. */
  async open(id: string): Promise<void> {
    await this.page.goto(`/events/${id}/registrations`);
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The path the address bar shows. */
  location(): string {
    return new URL(this.page.url()).pathname;
  }

  /** Each row as its name and registration date. */
  async rowTexts(): Promise<string[][]> {
    return this.rows.evaluateAll((rows) =>
      rows.map((row) =>
        [...row.querySelectorAll('td')].map(
          (cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        ),
      ),
    );
  }
}
