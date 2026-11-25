import type { Locator, Page } from '@playwright/test';

/** One event card as the member reads it. */
export interface EventCardRow {
  href: string | null;
  month: string;
  day: string;
  meta: string;
  title: string;
  place: string;
  going: string;
  end: string;
}

/** One series row as the member reads it (mock `events/series`). */
export interface SeriesRowRead {
  href: string | null;
  meta: string;
  title: string;
  sub: string;
  /** Each bar's modifier: `done`, `next`, `cancelled`, or `` for one still to come. */
  bars: string[];
  /** The meter's text for assistive technology. */
  done: string;
  /** "Joined" or the price. */
  end: string;
  next: string;
}

/**
 * The member app's Events at `/events` (mock `docs/mocks/pages/events/`): the page head, the grid of
 * event cards, and the loading, empty, error and paging states. Owns the selectors of that screen.
 */
export class WebEventsPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly cards: Locator;
  /** The skeleton cards while the first page loads. */
  readonly loading: Locator;
  readonly loadingHeading: Locator;
  readonly skeletons: Locator;
  /** The empty state's heading and its link home. */
  readonly emptyHeading: Locator;
  readonly backHomeLink: Locator;
  /** The error state's heading and its Try again. */
  readonly errorHeading: Locator;
  readonly retryButton: Locator;
  /** The foot of the list while the next page loads. */
  readonly loadingMore: Locator;
  /** "More events didn't load" and its Try again. */
  readonly moreErrorHeading: Locator;
  readonly moreRetryButton: Locator;
  /** The note the list ends with at 200 events. */
  readonly cappedNote: Locator;
  /** The header's navigation: its links and the one that is current. */
  readonly navLinks: Locator;
  readonly currentNavLink: Locator;

  constructor(private readonly page: Page) {
    this.main = page.locator('main');
    this.heading = page.getByRole('heading', { level: 1 });
    this.cards = page.locator('.event-card');
    this.loading = page.locator('[aria-busy="true"]');
    this.loadingHeading = page.getByText('Loading events', { exact: true });
    this.skeletons = page.locator('.skeleton');
    this.emptyHeading = page.getByRole('heading', { name: 'No events yet' });
    this.backHomeLink = page.getByRole('link', { name: 'Back to home' });
    this.errorHeading = page.getByRole('heading', { name: "Events didn't load" });
    this.retryButton = page.getByRole('button', { name: 'Try again' });
    this.loadingMore = page.getByText('Loading more events…');
    this.moreErrorHeading = page.getByText("More events didn't load");
    this.moreRetryButton = page.getByRole('button', { name: 'Try again' });
    this.cappedNote = page.getByText(
      'Showing the next 200 events. Choose a category to see others.',
    );
    const nav = page.getByRole('navigation', { name: 'Primary' });
    this.navLinks = nav.getByRole('link');
    this.currentNavLink = nav.locator('[aria-current="page"]');
  }

  filter(name: string): Locator {
    return this.page
      .getByRole('group', { name: 'Filter events' })
      .getByRole('link', { name, exact: true });
  }

  get noResults(): Locator {
    return this.page.getByRole('heading', { name: 'Nothing here yet' });
  }

  get noResultsText(): Locator {
    return this.page.locator('.empty-state__text');
  }

  get clearFilter(): Locator {
    return this.page.getByRole('button', { name: 'Clear filter' });
  }

  /** The no-results state of a search or of "Only events I'm going to", by its heading (ADR 0081). */
  noResultsHeading(name: string): Locator {
    return this.page.getByRole('heading', { name, exact: true });
  }

  /** The no-results action that clears the search and filters (L2-075 AC3, L2-076 AC2). */
  get clearSearchAndFilters(): Locator {
    return this.page.getByRole('button', { name: 'Clear search and filters' });
  }

  async open(category?: string): Promise<void> {
    await this.page.goto(category ? `/events?category=${encodeURIComponent(category)}` : '/events');
  }

  /** Opens Events at an address with its query, such as `?q=hoops&going=true`. */
  async openWith(query: string): Promise<void> {
    await this.page.goto(`/events${query}`);
  }

  /** The "Search events" field (L2-075; ADR 0081). */
  get search(): Locator {
    return this.page.getByRole('searchbox', { name: 'Search events' });
  }

  /** The "Only events I'm going to" checkbox (L2-076; ADR 0081). */
  get goingFilter(): Locator {
    return this.page.getByRole('checkbox', { name: "Only events I'm going to" });
  }

  /** Types `text` into the search a key at a time, as a member does. */
  async typeSearch(text: string): Promise<void> {
    await this.search.pressSequentially(text);
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** Scrolls to the end of the page, where the next page is asked for. */
  async scrollToEnd(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  /** Reads every card on the page, in order. */
  async rows(): Promise<EventCardRow[]> {
    return this.cards.evaluateAll((cards) =>
      cards.map((card) => {
        const text = (selector: string): string =>
          (card.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
        return {
          href: card.getAttribute('href'),
          month: text('.date-badge__month'),
          day: text('.date-badge__day'),
          meta: text('.event-card__meta'),
          title: text('.event-card__title'),
          place: text('.event-card__place'),
          going: text('.event-card__going'),
          end: text('.event-card__price, .event-card__left'),
        };
      }),
    );
  }

  /** The image of each card: where it loads from. */
  images(): Promise<(string | null)[]> {
    return this.cards.evaluateAll((cards) =>
      cards.map((card) => card.querySelector('img')?.getAttribute('src') ?? null),
    );
  }

  /** Each card's series line, or null for a standalone event (L2-009 AC1). */
  seriesLines(): Promise<(string | null)[]> {
    return this.cards.evaluateAll((cards) =>
      cards.map(
        (card) =>
          card.querySelector('.event-card__series')?.textContent?.replace(/\s+/g, ' ').trim() ??
          null,
      ),
    );
  }

  /** The page head's subtitle. */
  get subtitle(): Locator {
    return this.page.locator('.page-head .subtitle');
  }

  /** The view switch, "By date" and "Series (<count>)" (L2-009 AC11; ADR 0093). */
  get viewSwitch(): Locator {
    return this.page.getByRole('navigation', { name: 'View' });
  }

  /** One option of the view switch, by its whole name. */
  viewOption(name: string): Locator {
    return this.viewSwitch.getByRole('link', { name, exact: true });
  }

  /** The Series view's rows (L2-050 AC1). */
  get seriesRows(): Locator {
    return this.page.locator('a.series-row');
  }

  /** The Series view's skeleton rows while it loads (L2-050 AC4). */
  get seriesLoading(): Locator {
    return this.page.getByText('Loading series', { exact: true });
  }

  get seriesError(): Locator {
    return this.page.getByRole('heading', { name: "Series didn't load" });
  }

  /** "No series here yet" (L2-050 AC3). */
  get seriesEmpty(): Locator {
    return this.page.getByRole('heading', { name: 'No series here yet' });
  }

  get seriesEmptyText(): Locator {
    return this.page.getByText(
      'Series are weekly or monthly programs you can join once and come to every time.',
    );
  }

  get showAllSeries(): Locator {
    return this.page.getByRole('button', { name: 'Show all series' });
  }

  /** A category chip of the Series view. */
  seriesFilter(name: string): Locator {
    return this.page
      .getByRole('group', { name: 'Filter series' })
      .getByRole('link', { name, exact: true });
  }

  /** The "Only series I've joined" checkbox (L2-050 AC2). */
  get joinedFilter(): Locator {
    return this.page.getByRole('checkbox', { name: "Only series I've joined" });
  }

  /** Reads every series row, in order. */
  async readSeriesRows(): Promise<SeriesRowRead[]> {
    return this.seriesRows.evaluateAll((rows) =>
      rows.map((row) => {
        const text = (selector: string): string =>
          (row.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
        return {
          href: row.getAttribute('href'),
          meta: text('.series-row__meta'),
          title: text('.series-row__title'),
          sub: text('.series-row__sub'),
          bars: [...row.querySelectorAll('.session-meter__bar')].map((bar) =>
            (bar.getAttribute('class') ?? '').replace(
              /^session-meter__bar ?(session-meter__bar--)?/,
              '',
            ),
          ),
          done: text('.session-meter + .visually-hidden'),
          end: text('.series-row__price, .tag'),
          next: text('.series-row__next'),
        };
      }),
    );
  }

  /** The option of the view switch marked current. */
  get currentView(): Locator {
    return this.viewSwitch.locator('[aria-current="page"]');
  }
}
