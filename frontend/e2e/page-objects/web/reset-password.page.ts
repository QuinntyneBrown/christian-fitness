import type { Locator, Page } from '@playwright/test';

/**
 * The member app's Reset password screen (mock `docs/mocks/pages/reset-password/`): the `auth`
 * block with the new password form and, around it, the notices that replace it (checking, saved,
 * expired, unchecked). Owns the selectors of that screen.
 */
export class WebResetPasswordPage {
  readonly main: Locator;
  /** The form, or the notice that replaces it (`.auth__form` either way). */
  readonly form: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  readonly password: Locator;
  readonly confirm: Locator;
  readonly inputs: Locator;
  readonly passwordHint: Locator;
  readonly passwordError: Locator;
  readonly confirmError: Locator;
  /** The form's submit button, or a notice's button ("Try again"). */
  readonly submitButton: Locator;
  /** A notice's link button: "Sign in" or "Send a new link". */
  readonly actionLink: Locator;
  /** The line under a notice. */
  readonly alt: Locator;
  readonly backLink: Locator;
  /** The `form-alert` above the fields: the summary or a failure. */
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly alertLinks: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.form = this.main.locator('.auth__form');
    this.heading = this.form.getByRole('heading', { level: 1 });
    this.lead = this.form.locator('.auth__lead');
    this.password = this.form.getByLabel('New password', { exact: true });
    this.confirm = this.form.getByLabel('Confirm new password');
    this.inputs = this.form.locator('.field .input');
    this.passwordHint = this.form.locator('#f-password-hint');
    this.passwordError = this.form.locator('#f-password-error');
    this.confirmError = this.form.locator('#f-confirm-error');
    this.submitButton = this.form.locator('.auth__submit button.btn');
    this.actionLink = this.form.locator('.auth__submit a.btn');
    this.alt = this.form.locator('.auth__alt');
    this.backLink = this.alt.getByRole('link', { name: 'Back to sign in' });
    this.alert = this.form.locator('.auth__alert .form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.alertLinks = this.alert.getByRole('link');
  }

  /** Opens the emailed link: `/reset-password#token=…`, or `/reset-password` with no token. */
  async open(token?: string): Promise<void> {
    await this.page.goto(
      token === undefined ? '/reset-password' : `/reset-password#token=${token}`,
    );
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The whole address after the origin: path, query and fragment. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search + url.hash;
  }

  async fill(password: string, confirm: string): Promise<void> {
    await this.password.fill(password);
    await this.confirm.fill(confirm);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Waits until the API has answered the next save, after `act` sends it. */
  async awaitSave(act: () => Promise<void>): Promise<void> {
    const answered = this.page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/account/password-reset/complete' &&
        response.request().method() === 'POST',
    );
    await act();
    await answered;
  }

  /** Types both passwords with the keyboard alone and saves with Enter. */
  async saveByKeyboard(password: string): Promise<void> {
    await this.password.focus();
    await this.page.keyboard.type(password);
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.type(password);
    await this.page.keyboard.press('Enter');
  }
}
