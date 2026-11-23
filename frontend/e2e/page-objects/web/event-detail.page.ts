import type { Locator, Page } from '@playwright/test';
import { ErrorScreen } from '../shared/error-screen';

/**
 * The member app's Event detail at `/events/:id` (mock `docs/mocks/pages/event-detail/`): the back
 * link, the picture, the title and facts, the about text and the aside with the price and spots.
 * Owns the selectors of that screen. An unknown event shows the not-found screen, read through
 * {@link ErrorScreen}.
 */
export class WebEventDetailPage extends ErrorScreen {
  readonly backLink: Locator;
  readonly image: Locator;
  readonly eyebrow: Locator;
  readonly eventTitle: Locator;
  readonly facts: Locator;
  readonly about: Locator;
  readonly price: Locator;
  readonly spots: Locator;
  readonly going: Locator;
  readonly registerButton: Locator;
  readonly confirmed: Locator;
  readonly registerNote: Locator;
  readonly registerError: Locator;
  readonly loading: Locator;
  readonly errorHeading: Locator;
  readonly retryButton: Locator;

  constructor(page: Page) {
    super(page);
    this.backLink = page.getByRole('link', { name: 'All events' });
    this.image = page.locator('.event-detail__image');
    this.eyebrow = page.locator('.event-detail__eyebrow');
    this.eventTitle = page.getByRole('heading', { level: 1 });
    this.facts = page.locator('.facts__item');
    this.about = page.locator('.event-detail__about');
    this.price = page.locator('.event-detail__price');
    this.spots = page.locator('.event-detail__spots');
    this.going = page.locator('.event-detail__going');
    this.registerButton = page.getByRole('button', { name: /^Register/ });
    this.confirmed = page.locator('.event-detail__confirmed');
    this.registerNote = page.locator('.event-detail__note');
    this.registerError = page.getByRole('alert');
    this.loading = page.locator('[aria-busy="true"]');
    this.errorHeading = page.getByRole('heading', { name: "This event didn't load" });
    this.retryButton = page.getByRole('button', { name: 'Try again' });
  }

  async open(id: string): Promise<void> {
    await this.page.goto(`/events/${id}`);
  }
}
