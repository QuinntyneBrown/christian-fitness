import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's event attendance page (mock `docs/mocks/pages/admin-event-attendance/`; ADR
 * 0106): the event's tabs, the polite status line, the table of names with a Came box each, the
 * failed-save toast, and the not-started, empty, loading and error states. Owns the selectors of
 * that screen.
 */
export class EventAttendancePage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly tabs: Locator;
  readonly currentTab: Locator;
  readonly registrationsTab: Locator;
  readonly attendanceTab: Locator;
  readonly status: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly boxes: Locator;
  readonly loading: Locator;
  readonly loadingLabel: Locator;
  readonly empty: Locator;
  readonly emptyTitle: Locator;
  readonly emptyText: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly tryAgainButton: Locator;
  readonly toast: Locator;
  readonly toastTitle: Locator;
  readonly toastText: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.page-head .subtitle');
    this.tabs = this.main.getByRole('navigation', { name: 'Event' });
    this.currentTab = this.tabs.locator('[aria-current="page"]');
    this.registrationsTab = this.tabs.getByRole('link', { name: 'Registrations' });
    this.attendanceTab = this.tabs.getByRole('link', { name: 'Attendance' });
    this.status = this.main.locator('p.subtitle[role="status"]');
    this.table = this.main.locator('.table-wrap .table');
    this.rows = this.table.locator('tbody tr');
    this.boxes = this.table.getByRole('checkbox');
    this.loading = this.main.locator('.skeleton-region[aria-busy="true"]');
    this.loadingLabel = this.loading.locator(':scope > .visually-hidden');
    this.empty = this.main.locator('.empty-state');
    this.emptyTitle = this.empty.locator('.empty-state__title');
    this.emptyText = this.empty.locator('.empty-state__text');
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.locator('.empty-state__title');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
    this.toast = page.locator('.toast');
    this.toastTitle = this.toast.locator('.toast__title');
    this.toastText = this.toast.locator('.toast__text');
  }

  /** Opens the attendance of the event `id` by its address. */
  async open(id: string): Promise<void> {
    await this.page.goto(`/events/${id}/attendance`);
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The path the address bar shows. */
  location(): string {
    return new URL(this.page.url()).pathname;
  }

  /** The Came box of the member named `name` ("Came: <name>"). */
  box(name: string): Locator {
    return this.table.getByRole('checkbox', { name: `Came: ${name}`, exact: true });
  }

  /** The words beside the Came box of `name`: "Came", or "Saving…" while it saves. */
  boxLabel(name: string): Locator {
    return this.rows
      .filter({ has: this.page.getByRole('checkbox', { name: `Came: ${name}`, exact: true }) })
      .locator('.check > span');
  }

  /** The height of each row, its name and Came box, in CSS pixels. */
  async rowHeights(): Promise<number[]> {
    return this.rows.evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height));
  }

  /** Whether the page itself scrolls sideways. */
  scrollsSideways(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }

  /** Each row as its name and whether its box is ticked. */
  async rowStates(): Promise<[string, boolean][]> {
    return this.rows.evaluateAll((rows) =>
      rows.map((row): [string, boolean] => [
        row.querySelector('td')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        (row.querySelector('input[type="checkbox"]') as HTMLInputElement | null)?.checked ?? false,
      ]),
    );
  }
}
