import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's Staff sign in screen (mock `docs/mocks/pages/admin-sign-in/`): the `staff` card
 * with its form. Owns the selectors of that screen.
 */
export class AdminStaffSignInPage {
  readonly main: Locator;
  readonly card: Locator;
  readonly brandName: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  readonly email: Locator;
  readonly password: Locator;
  /** The text inputs, in the order the form shows them. */
  readonly inputs: Locator;
  readonly submitButton: Locator;
  /** The `form-alert` above the fields: wrong credentials, not staff or a failure. */
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  /** The note under the button, such as the mock's "Two-step verification required". */
  readonly note: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.card = this.main.locator('.staff__card');
    this.brandName = this.card.locator('.staff__name');
    this.heading = this.card.getByRole('heading', { level: 1 });
    this.lead = this.card.locator('.staff__lead');
    this.email = this.card.getByLabel('Work email');
    this.password = this.card.getByLabel('Password');
    this.inputs = this.card.locator('.field .input');
    this.submitButton = this.card.locator('.auth__submit .btn');
    this.alert = this.card.locator('.auth__alert .form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__title + p');
    this.note = this.card.locator('.staff__note');
  }

  async open(): Promise<void> {
    await this.page.goto('/sign-in');
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The path and query the address bar shows. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }

  async fill(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Submits and waits until the API has answered the sign-in. */
  async submitAndAwaitAnswer(): Promise<void> {
    const answered = this.page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/admin/session' &&
        response.request().method() === 'POST',
    );
    await this.submit();
    await answered;
  }

  /** Types the email and password with the keyboard alone and submits with Enter. */
  async signInByKeyboard(email: string, password: string): Promise<void> {
    await this.email.focus();
    await this.page.keyboard.type(email);
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.type(password);
    await this.page.keyboard.press('Enter');
  }
}
