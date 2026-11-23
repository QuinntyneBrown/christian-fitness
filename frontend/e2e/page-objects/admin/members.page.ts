import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's Members page (mock `docs/mocks/pages/admin-members/`): the page head with the
 * member count and the search, the All / Active / Flagged / Suspended tabs, the members table with
 * its pages, and its loading, no-results, tab-empty, empty and error states. Owns the selectors of
 * that screen.
 */
export class AdminMembersPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly search: Locator;
  readonly tabs: Locator;
  readonly tabLinks: Locator;
  /** The tab marked `aria-current="page"`. */
  readonly currentTab: Locator;
  /** The scrolling region around the table, named "Members". */
  readonly tableRegion: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly loading: Locator;
  readonly skeletons: Locator;
  readonly empty: Locator;
  readonly emptyTitle: Locator;
  readonly emptyText: Locator;
  readonly clearSearchButton: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly errorText: Locator;
  readonly tryAgainButton: Locator;
  readonly pagination: Locator;
  readonly paginationSummary: Locator;
  /** The page marked `aria-current="page"`. */
  readonly currentPage: Locator;
  readonly previousPage: Locator;
  readonly nextPage: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.page-head .subtitle');
    this.search = this.main.getByRole('searchbox', { name: 'Search members' });
    this.tabs = this.main.getByRole('navigation', { name: 'Filter members' });
    this.tabLinks = this.tabs.locator('.tabs__tab');
    this.currentTab = this.tabs.locator('.tabs__tab[aria-current="page"]');
    this.tableRegion = this.main.getByRole('region', { name: 'Members' });
    this.table = this.main.locator('.table-wrap .table');
    this.rows = this.table.locator('tbody tr');
    this.loading = this.main.locator('.skeleton-region[aria-busy="true"]');
    this.skeletons = this.loading.locator('.skeleton');
    this.empty = this.main.locator('.empty-state');
    this.emptyTitle = this.empty.locator('.empty-state__title');
    this.emptyText = this.empty.locator('.empty-state__text');
    this.clearSearchButton = this.empty.getByRole('button', { name: 'Clear search' });
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.locator('.empty-state__title');
    this.errorText = this.error.locator('.empty-state__text');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
    this.pagination = this.main.getByRole('navigation', { name: 'Pagination' });
    this.paginationSummary = this.pagination.locator('.pagination__summary');
    this.currentPage = this.pagination.locator('.pagination__link[aria-current="page"]');
    // An unavailable end has no address, so it is not a link to assistive technology.
    this.previousPage = this.pagination.locator('[aria-label="Previous page"]');
    this.nextPage = this.pagination.locator('[aria-label="Next page"]');
  }

  /** Opens the Members page with `query`, such as `?status=flagged&q=grace` (none by default). */
  async open(query = ''): Promise<void> {
    await this.page.goto(`/members${query}`);
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The path and query the address bar shows. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }

  tab(name: 'All' | 'Active' | 'Flagged' | 'Suspended'): Locator {
    return this.tabs.getByRole('link', { name, exact: true });
  }

  pageLink(page: number): Locator {
    return this.pagination.getByRole('link', { name: `Page ${page}`, exact: true });
  }

  /**
   * Each row as its cells' text: name, email, church, joined, events and status. A cell with no
   * home church reads as assistive technology reads it ("Not given"), not as its dash.
   */
  async rowTexts(): Promise<string[][]> {
    return this.rows.evaluateAll((rows) =>
      rows.map((row) => {
        const read = (cell: Element): string => {
          const copy = cell.cloneNode(true) as Element;
          copy.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => hidden.remove());
          return copy.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        };
        const [person, ...rest] = [...row.querySelectorAll('td')];
        const name = person?.querySelector('.table__strong')?.textContent?.trim() ?? '';
        const email = person?.querySelector('.table__sub')?.textContent?.trim() ?? '';
        return [name, email, ...rest.map(read)];
      }),
    );
  }

  /** The names in the table, in order. */
  async names(): Promise<string[]> {
    return (await this.rowTexts()).map((row) => row[0] ?? '');
  }

  /** The initials each row's avatar shows, which assistive technology skips. */
  avatars(): Locator {
    return this.rows.locator('.table__person .avatar[aria-hidden="true"]');
  }

  /** The status badges in the table. */
  statuses(): Locator {
    return this.rows.locator('.status');
  }

  /** The `<b>` elements inside the main area: none when names and terms are rendered as text. */
  bold(): Locator {
    return this.main.locator('b');
  }

  /** Types `text` into the search a key at a time, as a person does. */
  async type(text: string): Promise<void> {
    await this.search.pressSequentially(text, { delay: 20 });
  }

  /** Marks the document; the mark survives only while the page is not reloaded. */
  async mark(): Promise<void> {
    await this.page.evaluate(() => ((window as unknown as { cfMark?: boolean }).cfMark = true));
  }

  marked(): Promise<boolean> {
    return this.page.evaluate(() => (window as unknown as { cfMark?: boolean }).cfMark === true);
  }

  /** Moves focus to `locator` and presses Enter, as a keyboard user does. */
  async focusAndPressEnter(locator: Locator): Promise<void> {
    await locator.focus();
    await this.page.keyboard.press('Enter');
  }

  /** Whether `locator` has focus. */
  isFocused(locator: Locator): Promise<boolean> {
    return locator.evaluate((element) => element === document.activeElement);
  }
}
