import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's Events page (mock `docs/mocks/pages/admin-events/`): the page head with New
 * event, the All / Published / Draft tabs, the events table, and its loading, empty, tab-empty and
 * error states, with the Draft saved toast (`admin-toast/draft-saved`). Owns the selectors of that
 * screen.
 */
export class AdminEventsPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly newEventButton: Locator;
  readonly tabs: Locator;
  readonly tabLinks: Locator;
  /** The tab marked `aria-current="page"`. */
  readonly currentTab: Locator;
  readonly tabCounts: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  /** Every row's "Make it a pick" link, in order (L2-072 AC1). */
  readonly pickLinks: Locator;
  readonly loading: Locator;
  readonly skeletons: Locator;
  readonly empty: Locator;
  readonly emptyTitle: Locator;
  readonly emptyText: Locator;
  readonly emptyNewEventButton: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly errorText: Locator;
  readonly tryAgainButton: Locator;
  readonly toastRegion: Locator;
  readonly toast: Locator;
  readonly toastTitle: Locator;
  readonly toastText: Locator;
  readonly toastDismiss: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.page-head .subtitle');
    this.newEventButton = this.main
      .locator('.page-head')
      .getByRole('button', { name: 'New event' });
    this.tabs = this.main.getByRole('navigation', { name: 'Filter events' });
    this.tabLinks = this.tabs.locator('.tabs__tab');
    this.currentTab = this.tabs.locator('.tabs__tab[aria-current="page"]');
    this.tabCounts = this.tabs.locator('.tabs__count');
    this.table = this.main.locator('.table-wrap .table');
    this.rows = this.table.locator('tbody tr');
    this.pickLinks = this.table.locator('a.row-link--quiet');
    this.loading = this.main.locator('.skeleton-region[aria-busy="true"]');
    this.skeletons = this.loading.locator('.skeleton');
    this.empty = this.main.locator('.empty-state');
    this.emptyTitle = this.empty.locator('.empty-state__title');
    this.emptyText = this.empty.locator('.empty-state__text');
    this.emptyNewEventButton = this.empty.getByRole('button', { name: 'New event' });
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.locator('.empty-state__title');
    this.errorText = this.error.locator('.empty-state__text');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
    this.toastRegion = page.getByRole('region', { name: 'Notifications' });
    this.toast = this.toastRegion.locator('.toast');
    this.toastTitle = this.toast.locator('.toast__title');
    this.toastText = this.toast.locator('.toast__text');
    this.toastDismiss = this.toast.getByRole('button', { name: 'Dismiss' });
  }

  /** Opens the Events page, on the tab `status` names (All by default). */
  async open(status?: 'published' | 'draft'): Promise<void> {
    await this.page.goto(status ? `/events?status=${status}` : '/events');
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The path and query the address bar shows. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }

  tab(name: 'All' | 'Published' | 'Draft'): Locator {
    return this.tabs.getByRole('link', { name: new RegExp(`^${name}\\b`) });
  }

  /** Each row as its cells' text: event title, place, date, registered and status. */
  async rowTexts(): Promise<string[][]> {
    return this.rows.evaluateAll((rows) =>
      rows.map((row) => {
        const cells = [...row.querySelectorAll('td')];
        const [event, ...more] = cells;
        const rest = more.filter((cell) => !cell.classList.contains('table__end'));
        const title = event?.querySelector('.table__strong')?.textContent?.trim() ?? '';
        const place = event?.querySelector('.table__sub')?.textContent?.trim() ?? '';
        return [
          title,
          place,
          ...rest.map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
        ];
      }),
    );
  }

  /** The `<b>` elements inside the table: none when names are rendered as text. */
  boldInTable(): Locator {
    return this.table.locator('b');
  }

  /** Rests the pointer on the page head, away from the toasts. */
  async movePointerAway(): Promise<void> {
    await this.page.mouse.move(5, 5);
  }

  /** The "Make it a pick" link of the row for the event named `title` (L2-072 AC1). */
  pickLink(title: string): Locator {
    const name = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // The hidden title is positioned out of flow, so Chromium joins it with a space.
    return this.table.getByRole('link', { name: new RegExp(`^Make it a pick ?: ${name}$`) });
  }

  /** The Edit action of the row for the event named `title`. */
  editButton(title: string): Locator {
    return this.table.getByRole('button', { name: `Edit ${title}` });
  }

  async editEvent(title: string): Promise<void> {
    await this.editButton(title).click();
  }

  async openNewEvent(): Promise<void> {
    await this.newEventButton.click();
  }

  /** Whether `locator` has focus. */
  async isFocused(locator: Locator): Promise<boolean> {
    return locator.evaluate((element) => element === document.activeElement);
  }
}
