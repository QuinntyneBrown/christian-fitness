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
  readonly full: Locator;
  readonly registerNote: Locator;
  readonly registerError: Locator;
  readonly groupChatLink: Locator;
  readonly cantMakeItButton: Locator;
  readonly cancelDialog: Locator;
  readonly cancelConfirmButton: Locator;
  readonly keepPlaceButton: Locator;
  readonly cancelError: Locator;
  readonly loading: Locator;
  readonly errorHeading: Locator;
  readonly retryButton: Locator;
  /** The "Hosted by" card under the registration card, one link to the host's profile (ADR 0089). */
  readonly hostCard: Locator;
  readonly hostLabel: Locator;
  readonly hostName: Locator;
  readonly hostMark: Locator;
  readonly hostVerified: Locator;
  /** The aside that holds the registration card and the host card. */
  readonly aside: Locator;
  /** A session's series card (ADR 0096): meta, title, the next dates and one link to the series. */
  readonly seriesCard: Locator;
  readonly seriesMeta: Locator;
  readonly seriesTitle: Locator;
  readonly seriesDates: Locator;
  readonly seriesLink: Locator;

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
    this.full = page.locator('.event-detail__full');
    this.registerNote = page.locator('.event-detail__note');
    this.registerError = page.getByRole('alert');
    this.groupChatLink = page.getByRole('link', { name: 'Group chat' });
    this.cantMakeItButton = page.getByRole('button', { name: "Can't make it" });
    this.cancelDialog = page.getByRole('dialog', { name: 'Cancel your registration?' });
    this.cancelConfirmButton = this.cancelDialog.getByRole('button', {
      name: 'Cancel registration',
    });
    this.keepPlaceButton = this.cancelDialog.getByRole('button', { name: 'Keep my place' });
    this.cancelError = this.cancelDialog.getByRole('alert');
    this.loading = page.locator('[aria-busy="true"]');
    this.errorHeading = page.getByRole('heading', { name: "This event didn't load" });
    this.retryButton = page.getByRole('button', { name: 'Try again' });
    this.aside = page.getByRole('complementary', { name: 'Registration' });
    this.hostCard = this.aside.locator('a.host-card');
    this.hostLabel = this.hostCard.locator('.host-card__label');
    this.hostName = this.hostCard.locator('.host-card__name');
    this.hostMark = this.hostCard.locator('.listing-mark');
    this.hostVerified = this.hostCard.getByRole('img', { name: 'Verified' });
    this.seriesCard = page.locator('section.series-card');
    this.seriesMeta = this.seriesCard.locator('.series-card__meta');
    this.seriesTitle = this.seriesCard.getByRole('heading', { level: 2 });
    this.seriesDates = this.seriesCard.locator('.series-card__date');
    this.seriesLink = this.seriesCard.getByRole('link');
  }

  async open(id: string): Promise<void> {
    await this.page.goto(`/events/${id}`);
  }
}
