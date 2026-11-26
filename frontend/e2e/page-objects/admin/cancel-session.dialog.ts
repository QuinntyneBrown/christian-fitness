import type { Locator, Page } from '@playwright/test';

/**
 * The Cancel a series date confirmation (mock `docs/mocks/dialogs/cancel-session/`): a dialog over
 * Event series naming the series, session and date, how many are going and who is told, with Keep
 * the date and Cancel date, and the `failed` alert. Owns the selectors of that dialog.
 */
export class CancelSessionDialog {
  readonly dialog: Locator;
  readonly subtitle: Locator;
  /** The body's sentences, in order. */
  readonly texts: Locator;
  readonly keepButton: Locator;
  /** The confirming button, which reads "Cancelling…" while the cancel is on its way. */
  readonly cancelButton: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'Cancel this date?' });
    this.subtitle = this.dialog.locator('.dialog__sub');
    this.texts = this.dialog.locator('.cancel-session__text');
    this.keepButton = this.dialog.getByRole('button', { name: 'Keep the date' });
    this.cancelButton = this.dialog.locator('.dialog__foot .btn--primary');
    this.alert = this.dialog.getByRole('alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
  }

  /** Whether `locator` has the page's focus. */
  isFocused(locator: Locator): Promise<boolean> {
    return locator.evaluate((element) => element === document.activeElement);
  }

  async pressEscape(): Promise<void> {
    await this.dialog.waitFor();
    await this.page.keyboard.press('Escape');
  }
}
