import type { Locator, Page } from '@playwright/test';
import { ErrorScreen } from '../shared/error-screen';

/**
 * The member app's Event series at `/events/series/:id` (mock `docs/mocks/pages/event-series/`):
 * the back link, the wide banner, the eyebrow, title, facts and summary, and the aside with the
 * sign-up panel and the "Hosted by" card. Owns the selectors of that screen. An unknown series
 * shows the not-found screen, read through {@link ErrorScreen}.
 */
export class WebEventSeriesPage extends ErrorScreen {
  readonly backLink: Locator;
  readonly banner: Locator;
  readonly eyebrow: Locator;
  readonly seriesTitle: Locator;
  /** Each fact: its term (`dt`) and detail (`dd`). */
  readonly facts: Locator;
  readonly summary: Locator;
  /** The column that holds the head and the sessions. */
  readonly content: Locator;
  /** The aside that holds the sign-up panel and the host card. */
  readonly aside: Locator;
  readonly hostCard: Locator;
  readonly hostLabel: Locator;
  readonly hostName: Locator;
  readonly hostVerified: Locator;
  readonly loading: Locator;
  readonly errorHeading: Locator;
  readonly retryButton: Locator;
  readonly allEventsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.backLink = page.locator('.back-link');
    this.banner = page.locator('.banner-image');
    this.eyebrow = page.locator('.eyebrow');
    this.seriesTitle = page.getByRole('heading', { level: 1 });
    this.facts = page.locator('.facts__item');
    this.summary = page.locator('.series-summary');
    this.content = page.locator('.event-series__content');
    this.aside = page.getByRole('complementary', { name: 'Sign up' });
    this.hostCard = this.aside.locator('a.host-card');
    this.hostLabel = this.hostCard.locator('.host-card__label');
    this.hostName = this.hostCard.locator('.host-card__name');
    this.hostVerified = this.hostCard.getByRole('img', { name: 'Verified' });
    this.loading = page.locator('[aria-busy="true"]');
    this.errorHeading = page.getByRole('heading', { name: "This series didn't load" });
    this.retryButton = page.getByRole('button', { name: 'Try again' });
    this.allEventsButton = page.locator('.empty-state__actions').getByRole('link', {
      name: 'All events',
    });
  }

  async open(id: string): Promise<void> {
    await this.page.goto(`/events/series/${id}`);
  }
}
