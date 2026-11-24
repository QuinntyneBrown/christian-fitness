import type { Locator, Page } from '@playwright/test';

const FIELDS = [
  '.application__name',
  '.application__when',
  '.application__role',
  '.application__creds',
];

/**
 * The admin app's Services page (mock `docs/mocks/pages/admin-services/`): the page head and the
 * Applications section with each pending application's name, when it was sent, role and
 * credentials, and its loading, empty and error states. Owns the selectors of that screen.
 */
export class ManageServicesPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly applicationsHeading: Locator;
  readonly applicationsCount: Locator;
  readonly applications: Locator;
  readonly loading: Locator;
  readonly skeletons: Locator;
  readonly empty: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly errorText: Locator;
  readonly tryAgainButton: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.page-head .subtitle');
    this.applicationsHeading = this.main.getByRole('heading', { level: 2, name: 'Applications' });
    this.applicationsCount = this.applicationsHeading.locator('.section-title__count');
    this.applications = this.main.locator('.applications .application:not(.application--loading)');
    this.loading = this.main.locator('.skeleton-region[aria-busy="true"]');
    this.skeletons = this.loading.locator('.skeleton');
    this.empty = this.main.locator('.applications__empty');
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.locator('.empty-state__title');
    this.errorText = this.error.locator('.empty-state__text');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
  }

  /** Opens the Services page by its address. */
  async open(): Promise<void> {
    await this.page.goto('/services');
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** Each application as its name, when it was sent, role and credentials. */
  async applicationTexts(): Promise<string[][]> {
    return this.applications.evaluateAll(
      (items, fields) =>
        items.map((item) =>
          fields.map(
            (selector) =>
              item.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          ),
        ),
      FIELDS,
    );
  }
}
