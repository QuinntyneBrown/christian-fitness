import type { Locator, Page, Request } from '@playwright/test';

/** What the dialog's fields hold, as the member reads them. */
export interface ApplyValues {
  role: string;
  category: string;
  credentials: string;
  where: string;
  price: string;
  about: string;
}

/**
 * The member app's Apply to be listed dialog (mock `docs/mocks/dialogs/apply-to-be-listed/`),
 * opened from Services: the `dialog` block over its `scrim`, with the six fields, the error summary
 * or message, Cancel and Send application, and the "Application sent" success. Owns the selectors
 * of that dialog.
 */
export class WebApplyToBeListedDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly scrim: Locator;
  readonly closeButton: Locator;
  readonly role: Locator;
  readonly category: Locator;
  readonly credentials: Locator;
  readonly where: Locator;
  readonly price: Locator;
  readonly about: Locator;
  readonly cancelButton: Locator;
  /** The primary button: "Send application", "Sending…" while it is on its way, "Done" once sent. */
  readonly sendButton: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly alertLinks: Locator;
  readonly success: Locator;
  readonly successTitle: Locator;
  readonly successText: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.locator('.dialog');
    this.title = this.dialog.locator('.dialog__title');
    this.scrim = page.locator('.scrim');
    this.closeButton = this.dialog.locator('.dialog__close');
    this.role = this.dialog.getByLabel('Role');
    this.category = this.dialog.getByLabel('Category');
    this.credentials = this.dialog.getByLabel('Credentials');
    this.where = this.dialog.getByLabel('Where');
    this.price = this.dialog.getByLabel('Price');
    this.about = this.dialog.getByLabel('About');
    this.cancelButton = this.dialog.locator('.dialog__foot .btn--secondary');
    this.sendButton = this.dialog.locator('.dialog__foot .btn--primary');
    this.alert = this.dialog.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.alertLinks = this.alert.locator('.form-alert__list a');
    this.success = this.dialog.locator('.dialog__success');
    this.successTitle = this.success.locator('.dialog__success-title');
    this.successText = this.success.locator('.dialog__success-text');
  }

  /** The dialog by its role and accessible name, as assistive technology finds it. */
  byRole(name = 'Apply to be listed'): Locator {
    return this.page.getByRole('dialog', { name });
  }

  /** Whether the dialog is modal and the rest of the page is hidden from assistive technology. */
  async isModal(): Promise<boolean> {
    return this.page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      const app = document.querySelector('cf-root');
      return dialog !== null && app?.closest('[aria-hidden="true"]') !== null;
    });
  }

  /** The `field` block labelled `label`: the label, its control and its hint or error. */
  field(label: string): Locator {
    return this.dialog.locator('.field').filter({ has: this.page.getByLabel(label) });
  }

  fieldHint(label: string): Locator {
    return this.field(label).locator('.field__hint');
  }

  fieldError(label: string): Locator {
    return this.field(label).locator('.field__error');
  }

  /** The labels of the category choices, in the order shown. */
  categoryOptions(): Promise<string[]> {
    return this.category
      .locator('option')
      .allTextContents()
      .then((labels) => labels.map((label) => label.trim()));
  }

  /** What every field holds now (the category as its chosen label). */
  async values(): Promise<ApplyValues> {
    return {
      role: await this.role.inputValue(),
      category: await this.category.evaluate((el) => {
        const select = el as HTMLSelectElement;
        return select.selectedOptions[0]?.textContent?.trim() ?? '';
      }),
      credentials: await this.credentials.inputValue(),
      where: await this.where.inputValue(),
      price: await this.price.inputValue(),
      about: await this.about.inputValue(),
    };
  }

  /** Fills the four text fields and the About with the mock's trainer. */
  async fillValid(): Promise<void> {
    await this.role.fill('Personal trainer');
    await this.category.selectOption({ label: 'Training' });
    await this.credentials.fill('NSCA-CPT, 8 years coaching');
    await this.where.fill('Mississauga');
    await this.price.fill('$70 / session');
    await this.about.fill('I help busy parents build strength without burning out.');
  }

  /** Chooses Send application and waits for the request; answers it as the app sent it. */
  async sendAndAwaitRequest(): Promise<Request> {
    const sent = this.page.waitForRequest(
      (request) =>
        request.method() === 'POST' &&
        new URL(request.url()).pathname === '/api/professional-applications',
    );
    await this.sendButton.click();
    return sent;
  }

  async pressEscape(): Promise<void> {
    await this.dialog.waitFor();
    await this.page.keyboard.press('Escape');
  }

  /** Clicks the scrim beside the dialog, where nothing else is. */
  async clickScrim(): Promise<void> {
    await this.scrim.click({ position: { x: 8, y: 8 } });
  }
}
