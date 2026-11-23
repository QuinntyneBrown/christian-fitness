import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's code screen, "Enter your code" (mock `docs/mocks/pages/admin-two-step/`): the
 * `staff` card with one Verification code field. Owns the selectors of that screen.
 */
export class AdminTwoStepPage {
  readonly main: Locator;
  readonly card: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  readonly code: Locator;
  /** The text inputs, in the order the form shows them. */
  readonly inputs: Locator;
  /** The field's error under the code: a wrong code or a failure. */
  readonly codeError: Locator;
  readonly submitButton: Locator;
  readonly note: Locator;
  readonly alert: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.card = this.main.locator('.staff__card');
    this.heading = this.card.getByRole('heading', { level: 1 });
    this.lead = this.card.locator('.staff__lead');
    this.code = this.card.getByLabel('Verification code');
    this.inputs = this.card.locator('.field .input');
    this.codeError = this.card.locator('.field__error');
    this.submitButton = this.card.locator('.auth__submit .btn');
    this.note = this.card.locator('.staff__note');
    this.alert = this.card.locator('.auth__alert .form-alert');
  }

  async open(): Promise<void> {
    await this.page.goto('/sign-in/verify');
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The path and query the address bar shows. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }

  async fill(code: string): Promise<void> {
    await this.code.fill(code);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Submits and waits until the API has answered the code. */
  async submitAndAwaitAnswer(): Promise<void> {
    const answered = this.page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/admin/session/two-step' &&
        response.request().method() === 'POST',
    );
    await this.submit();
    await answered;
  }

  /** Types the code with the keyboard alone and submits with Enter. */
  async verifyByKeyboard(code: string): Promise<void> {
    await this.code.focus();
    await this.page.keyboard.type(code);
    await this.page.keyboard.press('Enter');
  }
}
