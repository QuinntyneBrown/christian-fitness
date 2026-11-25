import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's Listings page (mock `docs/mocks/pages/admin-listings/`): the page head, the
 * Suggestions and Listed tabs, the suggestion pick cards and the chosen suggestion's panel with its
 * four checks and decision, the Listed table, and the loading, empty and error states. Owns the
 * selectors of that screen.
 */
export class ManageListingsPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly tabs: Locator;
  readonly tabLinks: Locator;
  readonly currentTab: Locator;
  readonly picker: Locator;
  readonly cards: Locator;
  readonly currentCard: Locator;
  readonly panel: Locator;
  readonly kind: Locator;
  readonly name: Locator;
  readonly where: Locator;
  readonly website: Locator;
  readonly note: Locator;
  readonly by: Locator;
  readonly checksLegend: Locator;
  readonly checksPassed: Locator;
  readonly checkRows: Locator;
  readonly approveButton: Locator;
  readonly declineButton: Locator;
  readonly hint: Locator;
  readonly result: Locator;
  readonly resendButton: Locator;
  readonly loading: Locator;
  readonly skeletons: Locator;
  readonly empty: Locator;
  readonly emptyTitle: Locator;
  readonly emptyText: Locator;
  readonly seeListed: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly tryAgainButton: Locator;
  readonly loadMoreButton: Locator;
  readonly listedTable: Locator;
  readonly listedRows: Locator;
  readonly toast: Locator;
  /** A toast announced at once, as a failure is. */
  readonly alertToast: Locator;
  readonly toastTitle: Locator;
  readonly toastText: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.page-head .subtitle');
    this.tabs = this.main.getByRole('navigation', { name: 'Listings' });
    this.tabLinks = this.tabs.locator('.tabs__tab');
    this.currentTab = this.tabs.locator('.tabs__tab[aria-current="page"]');
    this.picker = this.main.getByRole('navigation', { name: 'Suggestions' });
    this.cards = this.picker.locator('.pick-card');
    this.currentCard = this.picker.locator('.pick-card[aria-current="page"]');
    this.panel = this.main.locator('.suggestion');
    this.kind = this.panel.locator('.eyebrow');
    this.name = this.panel.locator('.suggestion__name');
    this.where = this.panel.locator('.suggestion__where');
    this.website = this.where.getByRole('link');
    this.note = this.panel.locator('.suggestion__note');
    this.by = this.panel.locator('.suggestion__by');
    this.checksLegend = this.panel.locator('.suggestion__checks legend');
    this.checksPassed = this.panel.locator('.suggestion__checks .section-head__note');
    this.checkRows = this.panel.locator('.check-row');
    this.approveButton = this.panel.getByRole('button', { name: /^Approv/ });
    this.declineButton = this.panel.getByRole('button', { name: 'Decline' });
    this.hint = this.panel.locator('.suggestion__hint');
    this.result = this.panel.locator('.suggestion__result');
    this.resendButton = this.panel.getByRole('button', { name: /^(Send a new link|Sending…)$/ });
    this.loading = this.main.locator('.skeleton-region[aria-busy="true"]');
    this.skeletons = this.loading.locator('.skeleton');
    this.empty = this.main.locator('.empty-state');
    this.emptyTitle = this.empty.locator('.empty-state__title');
    this.emptyText = this.empty.locator('.empty-state__text');
    this.seeListed = this.empty.getByRole('link', { name: 'See what is listed' });
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.locator('.empty-state__title');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
    this.loadMoreButton = this.main.getByRole('button', { name: 'Load more' });
    this.listedTable = this.main.getByRole('table', { name: 'Listed' });
    this.listedRows = this.listedTable.locator('tbody tr');
    this.toast = page.getByRole('region', { name: 'Notifications' }).locator('.toast');
    this.alertToast = page
      .getByRole('region', { name: 'Notifications' })
      .getByRole('alert')
      .locator('.toast');
    this.toastTitle = this.toast.locator('.toast__title');
    this.toastText = this.toast.locator('.toast__text');
  }

  /** Opens Listings, at `query` such as `?tab=listed` or `?selected={id}`. */
  async open(query = ''): Promise<void> {
    await this.page.goto(`/listings${query}`);
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The path and query the address bar shows. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }

  tab(name: string): Locator {
    return this.tabs.getByRole('link', { name });
  }

  card(name: string): Locator {
    return this.cards.filter({ has: this.page.locator('.pick-card__title', { hasText: name }) });
  }

  /** Each card's title, kind and area, and who and when, as shown. */
  cardTexts(): Promise<string[][]> {
    return this.cards.evaluateAll((cards) =>
      cards.map((card) =>
        [
          card.querySelector('.pick-card__title'),
          ...Array.from(card.querySelectorAll('.pick-card__meta')),
        ].map((part) => part?.textContent?.trim() ?? ''),
      ),
    );
  }

  /** The tag on a card, such as "Approved". */
  cardTag(name: string): Locator {
    return this.card(name).locator('.pick-card__tag');
  }

  check(label: string): Locator {
    return this.panel.getByRole('checkbox', { name: new RegExp(`^${label}`) });
  }

  /** Each check row's label and what passing means. */
  checkTexts(): Promise<string[][]> {
    return this.checkRows.evaluateAll((rows) =>
      rows.map((row) =>
        ['.check-row__label', '.check-row__desc'].map(
          (part) => row.querySelector(part)?.textContent?.trim() ?? '',
        ),
      ),
    );
  }

  listedRow(name: string): Locator {
    return this.listedRows.filter({ hasText: name });
  }

  /** Each listed row's cells as shown: name, kind, area and followers. */
  listedTexts(): Promise<string[][]> {
    return this.listedRows.evaluateAll((rows) =>
      rows.map((row) =>
        Array.from(row.querySelectorAll('td'))
          .slice(0, 4)
          .map(
            (cell) =>
              cell.querySelector('.listed-cell__name, .table__strong')?.textContent?.trim() ??
              cell.textContent?.trim() ??
              '',
          ),
      ),
    );
  }

  /** A listed row's mark: its initials. */
  listedMark(name: string): Locator {
    return this.listedRow(name).locator('.listing-mark');
  }

  /** A listed row's photo. */
  listedPhoto(name: string): Locator {
    return this.listedRow(name).locator('img.listing-mark');
  }

  /** A listed row's Verified mark. */
  listedVerified(name: string): Locator {
    return this.listedRow(name).locator('.verified-mark');
  }

  editButton(name: string): Locator {
    return this.listedRow(name).getByRole('button', { name: `Edit ${name}` });
  }
}
