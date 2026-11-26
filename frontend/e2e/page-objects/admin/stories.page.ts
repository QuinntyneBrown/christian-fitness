import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's Stories page (mock `docs/mocks/pages/admin-stories/`): the page head with
 * Bylines and New story, the review call-outs, the status tabs with their counts, the table of
 * stories, the pages, and the loading, empty and error states. Owns the selectors of that screen.
 */
export class AdminStoriesPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly bylinesLink: Locator;
  readonly newStoryLink: Locator;
  readonly reviewCards: Locator;
  readonly allInReviewLink: Locator;
  readonly tabs: Locator;
  readonly tabLinks: Locator;
  readonly currentTab: Locator;
  readonly table: Locator;
  readonly rows: Locator;
  readonly loading: Locator;
  readonly empty: Locator;
  readonly emptyTitle: Locator;
  readonly emptyNewStory: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly tryAgainButton: Locator;
  readonly pagination: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.page-head .subtitle');
    this.bylinesLink = this.main.locator('.page-head').getByRole('link', { name: 'Bylines' });
    this.newStoryLink = this.main.locator('.page-head').getByRole('link', { name: 'New story' });
    this.reviewCards = this.main.locator('.review-card');
    this.allInReviewLink = this.main.getByRole('link', { name: /^All \d+ in review$/ });
    this.tabs = this.main.getByRole('navigation', { name: 'Filter stories' });
    this.tabLinks = this.tabs.getByRole('link');
    this.currentTab = this.tabs.locator('[aria-current="page"]');
    this.table = this.main.getByRole('table', { name: 'Stories' });
    this.rows = this.table.locator('tbody tr');
    this.loading = this.main.locator('table[aria-busy="true"]');
    this.empty = this.main.locator('.empty-state:not(.error-state)');
    this.emptyTitle = this.empty.locator('.empty-state__title');
    this.emptyNewStory = this.empty.getByRole('link', { name: 'New story' });
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.locator('.empty-state__title');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
    this.pagination = this.main.getByRole('navigation', { name: 'Pagination' });
  }

  async open(path = '/stories'): Promise<void> {
    await this.page.goto(path);
  }

  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }

  /** The tab named `label`, its count included in its name. */
  tab(label: string): Locator {
    return this.tabLinks.filter({ hasText: new RegExp(`^${label} \\d*$`) });
  }

  /** Each tab's label and count as read, such as "In review 1". */
  async tabTexts(): Promise<string[]> {
    return this.tabLinks.evaluateAll((links) =>
      links.map((link) => link.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
    );
  }

  /** Each call-out's label, title and meta. */
  async reviewCardTexts(): Promise<string[][]> {
    return this.reviewCards.evaluateAll((cards) =>
      cards.map((card) =>
        ['.review-card__label', '.review-card__title', '.review-card__meta'].map(
          (part) => card.querySelector(part)?.textContent?.trim() ?? '',
        ),
      ),
    );
  }

  /** Each row: the title, byline, section, status, when and reads as read (reads "—" when not published). */
  async rowTexts(): Promise<string[][]> {
    return this.rows.evaluateAll((rows) =>
      rows.map((row) => {
        const cells = [...row.querySelectorAll('td')];
        const text = (node: Element | null | undefined): string =>
          node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        return [
          text(cells[0]?.querySelector('.row-title')),
          text(cells[0]?.querySelector('.table__sub')),
          text(cells[1]),
          text(cells[2]),
          text(cells[3]),
          text(cells[4]?.querySelector('[aria-hidden="true"]') ?? cells[4]),
        ];
      }),
    );
  }

  /** The column headings, as read. */
  async headings(): Promise<string[]> {
    return this.table
      .locator('thead th')
      .evaluateAll((cells) => cells.map((cell) => cell.textContent?.trim() ?? ''));
  }

  /** The title link of the story headed `headline`. */
  rowLink(headline: string): Locator {
    return this.table.getByRole('link', { name: headline, exact: true });
  }

  /** What assistive technology reads in the Reads cell of row `n` (0-based). */
  readsCell(n: number): Locator {
    return this.rows.nth(n).locator('td').nth(4);
  }

  pageLink(n: number): Locator {
    return this.pagination.getByRole('link', { name: `Page ${n}`, exact: true });
  }
}
