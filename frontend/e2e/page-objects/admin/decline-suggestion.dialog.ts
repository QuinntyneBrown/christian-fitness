import type { Locator, Page } from '@playwright/test';

/**
 * The decline dialog of the admin Listings screen (mock `docs/mocks/dialogs/decline-suggestion/`):
 * the optional reason, the error summary, the alert a refusal or a failure shows, Cancel and
 * Decline suggestion. Owns the selectors of that dialog.
 */
export class DeclineSuggestionDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly reason: Locator;
  readonly reasonLabel: Locator;
  readonly reasonHint: Locator;
  readonly reasonError: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly alertLinks: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog');
    this.title = this.dialog.locator('.dialog__title');
    this.subtitle = this.dialog.locator('.dialog__sub');
    this.reason = this.dialog.getByRole('textbox', { name: 'Reason' });
    this.reasonLabel = this.dialog.locator('label[for="f-reason"]');
    this.reasonHint = this.dialog.locator('#f-reason-hint');
    this.reasonError = this.dialog.locator('#f-reason-error');
    this.alert = this.dialog.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.alertLinks = this.alert.getByRole('link');
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
    this.submitButton = this.dialog.locator('.dialog__foot .btn--primary');
  }

  /** Whether `locator` has focus. */
  isFocused(locator: Locator): Promise<boolean> {
    return locator.evaluate((element) => element === document.activeElement);
  }

  async pressEscape(): Promise<void> {
    await this.dialog.waitFor();
    await this.page.keyboard.press('Escape');
  }
}
