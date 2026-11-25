import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's Event series page (mock `docs/mocks/pages/admin-series/`): the page head, the
 * series' pick cards, the chosen series' summary card and its sessions, and the loading, empty and
 * error states, with the admin toast region. Owns the selectors of that screen.
 */
export class AdminSeriesPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly newSeriesButton: Locator;
  readonly picker: Locator;
  readonly cards: Locator;
  readonly cardTitles: Locator;
  /** The card marked `aria-current="page"`. */
  readonly currentCard: Locator;
  readonly summary: Locator;
  readonly summaryImage: Locator;
  readonly summaryTitle: Locator;
  readonly summaryHost: Locator;
  readonly summaryFacts: Locator;
  readonly stats: Locator;
  readonly meter: Locator;
  readonly editDetailsButton: Locator;
  readonly sessionsHeading: Locator;
  readonly addDateButton: Locator;
  readonly sessions: Locator;
  readonly loading: Locator;
  readonly loadingLabel: Locator;
  readonly skeletons: Locator;
  readonly empty: Locator;
  readonly emptyTitle: Locator;
  readonly emptyText: Locator;
  readonly emptyNewSeriesButton: Locator;
  readonly noDates: Locator;
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
    this.newSeriesButton = this.main
      .locator('.page-head')
      .getByRole('button', { name: 'New series' });
    this.picker = this.main.getByRole('navigation', { name: 'Series' });
    this.cards = this.picker.locator('.pick-card');
    this.cardTitles = this.picker.locator('.pick-card__title');
    this.currentCard = this.picker.locator('.pick-card[aria-current="page"]');
    this.summary = this.main.locator('.series-summary-card');
    this.summaryImage = this.summary.locator('.series-summary-card__image');
    this.summaryTitle = this.summary.locator('.series-summary-card__title');
    this.summaryHost = this.summary.locator('.series-summary-card__host');
    this.summaryFacts = this.summary.locator('.series-summary-card__facts > span');
    this.stats = this.summary.locator('.series-summary-card__stats > div');
    this.meter = this.summary.locator('meter');
    this.editDetailsButton = this.summary.getByRole('button', { name: /^Edit details/ });
    this.sessionsHeading = this.main.getByRole('heading', { name: 'Sessions', level: 3 });
    this.addDateButton = this.main.getByRole('button', { name: 'Add a date' });
    this.sessions = this.main.locator('.admin-sessions .admin-session');
    this.loading = this.main.locator('.skeleton-region[aria-busy="true"]');
    this.loadingLabel = this.loading.locator('.visually-hidden');
    this.skeletons = this.loading.locator('.skeleton');
    this.empty = this.main.locator('.empty-state:not(.empty-state--tight)');
    this.emptyTitle = this.empty.locator('.empty-state__title');
    this.emptyText = this.empty.locator('.empty-state__text');
    this.emptyNewSeriesButton = this.empty.getByRole('button', { name: 'New series' });
    this.noDates = this.main.locator('.empty-state--tight');
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.locator('.empty-state__title');
    this.errorText = this.error.locator('.empty-state__text');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
    this.toastRegion = page.getByRole('region', { name: 'Notifications' });
    this.toast = this.toastRegion.locator('.toast');
    this.toastTitle = this.toast.locator('.toast__title');
    this.toastText = this.toast.locator('.toast__text');
  }

  /** Opens Event series, with the series `id` chosen when given. */
  async open(id?: string): Promise<void> {
    await this.page.goto(id ? `/series?id=${id}` : '/series');
  }

  /** The pick card titled `title`. */
  card(title: string): Locator {
    return this.cards.filter({ has: this.page.locator('.pick-card__title', { hasText: title }) });
  }

  /** Each card's title, meta and count, as read. */
  async cardTexts(): Promise<string[][]> {
    return this.cards.evaluateAll((cards) =>
      cards.map((card) =>
        ['.pick-card__title', '.pick-card__meta', '.pick-card__count'].map(
          (part) => card.querySelector(part)?.textContent?.trim() ?? '',
        ),
      ),
    );
  }

  /** Each stat's term and its values, as read: ["Joined", "31 of 40", "78% full"]. */
  async statTexts(): Promise<string[][]> {
    return this.stats.evaluateAll((groups) =>
      groups.map((group) =>
        [...group.querySelectorAll('dt, dd')]
          .map((part) => part.textContent?.trim() ?? '')
          .filter((text) => text !== ''),
      ),
    );
  }

  /** Each session row's number, date, topic and end words, as read. */
  async sessionTexts(): Promise<string[][]> {
    return this.sessions.evaluateAll((rows) =>
      rows.map((row) =>
        [
          '.admin-session__n',
          '.admin-session__date',
          '.admin-session__topic',
          '.admin-session__end',
        ].map((part) => row.querySelector(part)?.textContent?.trim() ?? ''),
      ),
    );
  }

  /** The `class` of each session row: its state modifier (`--past`, `--cancelled`). */
  async sessionClasses(): Promise<string[]> {
    return this.sessions.evaluateAll((rows) => rows.map((row) => row.className));
  }

  /** The page's path and query. */
  pathAndQuery(): string {
    const url = new URL(this.page.url());
    return `${url.pathname}${url.search}`;
  }

  /** The document title. */
  title(): Promise<string> {
    return this.page.title();
  }
}
