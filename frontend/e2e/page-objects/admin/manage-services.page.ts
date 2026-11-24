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
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly listingsHeading: Locator;
  readonly listingsCount: Locator;
  readonly listingRows: Locator;
  readonly listingsEmpty: Locator;
  readonly toast: Locator;
  readonly toastTitle: Locator;
  readonly toastText: Locator;

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
    this.alert = this.main.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.listingsHeading = this.main.getByRole('heading', { level: 2, name: /^Live listings/ });
    this.listingsCount = this.listingsHeading.locator('.section-title__count--muted');
    this.listingRows = this.main.locator('.table tbody tr');
    this.listingsEmpty = this.main.locator('.empty-state');
    const toasts = page.getByRole('region', { name: 'Notifications' });
    this.toast = toasts.locator('.toast');
    this.toastTitle = this.toast.locator('.toast__title');
    this.toastText = this.toast.locator('.toast__text');
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

  /** The application card of `name`. */
  card(name: string): Locator {
    return this.applications.filter({
      has: this.page.locator('.application__name', { hasText: name }),
    });
  }

  /** The Approve button of the card of `name`; its name says whose it is. */
  approveButton(name: string): Locator {
    return this.card(name).getByRole('button', { name: `Approve ${name}` });
  }

  /** The Decline button of the card of `name`. */
  declineButton(name: string): Locator {
    return this.card(name).getByRole('button', { name: `Decline ${name}` });
  }

  /** What the card of `name` says it was decided, once it was. */
  decision(name: string): Locator {
    return this.card(name).locator('.decision');
  }

  /** Whether `locator` has focus. */
  isFocused(locator: Locator): Promise<boolean> {
    return locator.evaluate((element) => element === document.activeElement);
  }

  /** Each live listing as its name and role (joined by a bar), category, rate and verified month. */
  async listingTexts(): Promise<string[][]> {
    return this.listingRows.evaluateAll((rows) =>
      rows.map((row) =>
        [...row.querySelectorAll('td:not(.table__end)')].map((cell) => {
          const name = cell.querySelector('.table__strong')?.textContent?.trim();
          const sub = cell.querySelector('.table__sub')?.textContent?.trim();
          return name && sub
            ? `${name} | ${sub}`
            : (cell.textContent?.replace(/\s+/g, ' ').trim() ?? '');
        }),
      ),
    );
  }

  /** The Edit button of the live listing of `name`; its name says whose it is. */
  editButton(name: string): Locator {
    return this.main.getByRole('button', { name: `Edit ${name}` });
  }
}
