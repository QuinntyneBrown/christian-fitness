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
}
