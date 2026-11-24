import type { Locator, Page } from '@playwright/test';
import { ErrorScreen } from '../shared/error-screen';

/** The listing's card as the member reads it. */
export interface ListingView {
  name: string;
  role: string;
  where: string;
  about: string;
  facts: Record<string, string>;
  verified: string;
}

/**
 * The member app's listing screen at `/services/:id` (L2-013 AC4; ADR 0051): the back action to
 * Services and one professional's card. Owns the selectors of that screen. An unknown listing shows
 * the not-found screen, read through {@link ErrorScreen}.
 */
export class WebServiceDetailPage extends ErrorScreen {
  readonly backLink: Locator;
  readonly card: Locator;
  readonly loading: Locator;
  readonly errorHeading: Locator;
  readonly retryButton: Locator;
  /** The card's contact actions (L2-014): Message, or Contact for a listing with a contact link, and a failure's alert. */
  readonly messageButton: Locator;
  readonly contactButton: Locator;
  readonly problem: Locator;

  constructor(page: Page) {
    super(page);
    this.backLink = page.getByRole('link', { name: 'All services' });
    this.card = this.main.locator('.service-detail__name').locator('xpath=ancestor::article');
    this.loading = this.main.locator('[aria-busy="true"]');
    this.errorHeading = page.getByRole('heading', { name: "This professional didn't load" });
    this.retryButton = page.getByRole('button', { name: 'Try again' });
    this.messageButton = this.main.getByRole('button', { name: 'Message' });
    this.contactButton = this.main.getByRole('button', { name: 'Contact' });
    this.problem = this.main.getByRole('alert');
  }

  async open(id: string, query = ''): Promise<void> {
    await this.page.goto(`/services/${id}${query}`);
  }

  async view(): Promise<ListingView> {
    return this.card.evaluate((card) => {
      const text = (selector: string): string =>
        (card.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
      const facts: Record<string, string> = {};
      for (const pair of Array.from(card.querySelectorAll('dl > div'))) {
        facts[(pair.querySelector('dt')?.textContent ?? '').trim()] = (
          pair.querySelector('dd')?.textContent ?? ''
        ).trim();
      }
      return {
        name: text('.service-detail__name'),
        role: text('.service-detail__role'),
        where: text('.service-detail__where'),
        about: text('.service-detail__about'),
        facts,
        verified: text('.service-detail__verified'),
      };
    });
  }
}
