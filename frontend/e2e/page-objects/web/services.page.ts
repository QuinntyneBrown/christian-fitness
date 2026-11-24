import type { Locator, Page } from '@playwright/test';

/** One list row as the member reads it. */
export interface ServiceRowView {
  href: string | null;
  name: string;
  text: string;
  price: string;
  current: boolean;
}

/** The selected professional's card as the member reads it. */
export interface ServiceDetailView {
  name: string;
  role: string;
  where: string;
  about: string;
  facts: Record<string, string>;
  verified: string;
}

/**
 * The member app's Services at `/services` (mock `docs/mocks/pages/services/`): its heading,
 * subtitle, the "Apply to be listed" button, the category chips, the list of professionals with the
 * selected one's card beside it, and the loading, empty and error states. Owns the selectors of
 * that screen.
 */
export class WebServicesPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly applyButton: Locator;
  readonly rows: Locator;
  readonly currentRow: Locator;
  readonly detail: Locator;
  /** The card's contact actions (L2-014) and a failure's alert. */
  readonly messageButton: Locator;
  readonly contactButton: Locator;
  readonly problem: Locator;
  /** The skeleton rows while the list loads. */
  readonly loading: Locator;
  readonly loadingLabel: Locator;
  readonly skeletonRows: Locator;
  readonly emptyHeading: Locator;
  readonly browseEventsLink: Locator;
  readonly errorHeading: Locator;
  readonly retryButton: Locator;
  readonly noResults: Locator;
  readonly noResultsText: Locator;
  readonly clearFilter: Locator;
  /** The header's navigation: its links and the one that is current. */
  readonly navLinks: Locator;
  readonly currentNavLink: Locator;
  /** The bottom bar below MD: its items and the one that is current. */
  readonly mobileItems: Locator;
  readonly mobileCurrentItem: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.applyButton = this.main.getByRole('button', { name: 'Apply to be listed' });
    this.rows = this.main.locator('a.service-row');
    this.currentRow = this.main.locator('a.service-row[aria-current="true"]');
    this.detail = this.main.locator('.service-detail__name').locator('xpath=ancestor::article');
    this.messageButton = this.detail.getByRole('button', { name: 'Message' });
    this.contactButton = this.detail.getByRole('button', { name: 'Contact' });
    this.problem = this.detail.getByRole('alert');
    this.loading = this.main.locator('[aria-busy="true"]');
    this.loadingLabel = this.main.getByText('Loading professionals', { exact: true });
    this.skeletonRows = this.main.locator('.service-row .skeleton');
    this.emptyHeading = this.main.getByRole('heading', { name: 'No professionals yet' });
    this.browseEventsLink = this.main.getByRole('link', { name: 'Browse events' });
    this.errorHeading = this.main.getByRole('heading', { name: "Professionals didn't load" });
    this.retryButton = this.main.getByRole('button', { name: 'Try again' });
    this.noResults = this.main.getByRole('heading', { name: 'Nothing here yet' });
    this.noResultsText = this.main.locator('.empty-state__text');
    this.clearFilter = this.main.getByRole('button', { name: 'Clear filter' });
    const nav = page.getByRole('navigation', { name: 'Primary', exact: true });
    this.navLinks = nav.getByRole('link');
    this.currentNavLink = nav.locator('[aria-current="page"]');
    const tabs = page.getByRole('navigation', { name: 'Primary, mobile' });
    this.mobileItems = tabs.getByRole('link');
    this.mobileCurrentItem = tabs.locator('[aria-current="page"]');
  }

  filter(name: string): Locator {
    return this.page
      .getByRole('group', { name: 'Filter professionals' })
      .getByRole('link', { name, exact: true });
  }

  async open(query = ''): Promise<void> {
    await this.page.goto(`/services${query}`);
  }

  /** Reads every row on the page, in order. */
  async rowViews(): Promise<ServiceRowView[]> {
    return this.rows.evaluateAll((rows) =>
      rows.map((row) => {
        const text = (selector: string): string =>
          (row.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
        return {
          href: row.getAttribute('href'),
          name: text('.service-row__name'),
          text: text('.service-row__text'),
          price: text('.service-row__price'),
          current: row.getAttribute('aria-current') === 'true',
        };
      }),
    );
  }

  /** Reads the card beside the list. */
  async detailView(): Promise<ServiceDetailView> {
    return this.detail.evaluate((card) => {
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
