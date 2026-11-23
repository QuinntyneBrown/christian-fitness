import type { Locator, Page } from '@playwright/test';

/**
 * The member app's Forgot password screen (mock `docs/mocks/pages/forgot-password/`): the `auth`
 * block with its form and, once a link is on its way, the "Check your email" notice. Owns the
 * selectors of that screen.
 */
export class WebForgotPasswordPage {
  readonly main: Locator;
  /** The form, or the notice that replaces it (`.auth__form` either way). */
  readonly form: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  /** The email the notice names, in bold. */
  readonly leadEmail: Locator;
  readonly email: Locator;
  readonly inputs: Locator;
  readonly emailError: Locator;
  readonly submitButton: Locator;
  /** "Back to sign in" as the notice's button. */
  readonly backButton: Locator;
  /** The line under the form or the notice. */
  readonly alt: Locator;
  readonly backLink: Locator;
  readonly sendAgain: Locator;
  /** The `form-alert` above the field: the summary or a failure. */
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly alertLinks: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.form = this.main.locator('.auth__form');
    this.heading = this.form.getByRole('heading', { level: 1 });
    this.lead = this.form.locator('.auth__lead');
    this.leadEmail = this.lead.locator('strong');
    this.email = this.form.getByLabel('Email', { exact: true });
    this.inputs = this.form.locator('.field .input');
    this.emailError = this.form.locator('#f-email-error');
    this.submitButton = this.form.locator('.auth__submit button.btn');
    this.backButton = this.form.locator('.auth__submit a.btn');
    this.alt = this.form.locator('.auth__alt');
    this.backLink = this.alt.getByRole('link', { name: 'Back to sign in' });
    this.sendAgain = this.alt.getByRole('button', { name: 'send it again' });
    this.alert = this.form.locator('.auth__alert .form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.alertLinks = this.alert.getByRole('link');
  }

  async open(): Promise<void> {
    await this.page.goto('/forgot-password');
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The path and query the address bar shows. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }

  async fill(email: string): Promise<void> {
    await this.email.fill(email);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Waits until the API has answered the next reset request, after `act` sends it. */
  async awaitAnswer(act: () => Promise<void>): Promise<void> {
    const answered = this.page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/account/password-reset' &&
        response.request().method() === 'POST',
    );
    await act();
    await answered;
  }

  /** Types the email with the keyboard alone and submits with Enter. */
  async requestByKeyboard(email: string): Promise<void> {
    await this.email.focus();
    await this.page.keyboard.type(email);
    await this.page.keyboard.press('Enter');
  }
}
