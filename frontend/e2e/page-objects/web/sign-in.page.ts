import type { Locator, Page } from '@playwright/test';

/**
 * The member app's Sign in screen (mock `docs/mocks/pages/sign-in/`): the `auth` block with its
 * form. Owns the selectors of that screen.
 */
export class WebSignInPage {
  readonly main: Locator;
  readonly form: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  readonly email: Locator;
  readonly password: Locator;
  /** The text inputs, in the order the form shows them. */
  readonly inputs: Locator;
  readonly submitButton: Locator;
  /** The line that offers the other way in: "New here? Create a profile". */
  readonly alt: Locator;
  readonly joinLink: Locator;
  /** The `form-alert` above the fields: wrong credentials or a failure. */
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  /** Every link in the form, in order. */
  readonly links: Locator;
  /** "Forgot your password?" under the password field. */
  readonly forgotLink: Locator;
  /** "Reset your password" in the alert that says sign-in is paused. */
  readonly resetLink: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.form = this.main.locator('.auth__form');
    this.heading = this.form.getByRole('heading', { level: 1 });
    this.lead = this.form.locator('.auth__lead');
    this.email = this.form.getByLabel('Email', { exact: true });
    this.password = this.form.getByLabel('Password');
    this.inputs = this.form.locator('.field .input');
    this.submitButton = this.form.locator('.auth__submit .btn');
    this.alt = this.form.locator('.auth__alt');
    this.joinLink = this.alt.getByRole('link', { name: 'Create a profile' });
    this.alert = this.form.locator('.auth__alert .form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.links = this.form.getByRole('link');
    this.forgotLink = this.form.getByRole('link', { name: 'Forgot your password?' });
    this.resetLink = this.alert.getByRole('link', { name: 'Reset your password' });
  }

  /** Opens the screen; with `returnUrl`, as a link that asks to return there after signing in. */
  async open(returnUrl?: string): Promise<void> {
    await this.page.goto(
      returnUrl === undefined ? '/sign-in' : `/sign-in?returnUrl=${encodeURIComponent(returnUrl)}`,
    );
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
        new URL(response.url()).pathname === '/api/session' &&
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
