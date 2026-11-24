import type { Locator, Page } from '@playwright/test';

/**
 * The member app's Report a message dialog (mock `docs/mocks/dialogs/report-message/`), opened from
 * a received message in a chat: the `dialog` block over its `scrim`, with an optional Reason, the
 * error message, Cancel and Report message, and the "Message reported" success with Done. Owns the
 * selectors of that dialog.
 */
export class WebReportMessageDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly closeButton: Locator;
  readonly reason: Locator;
  readonly cancelButton: Locator;
  /** The primary button: "Report message", or "Reporting…" while it is on its way. */
  readonly reportButton: Locator;
  readonly doneButton: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly success: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.locator('.dialog');
    this.title = this.dialog.locator('.dialog__title');
    this.subtitle = this.dialog.locator('.dialog__sub');
    this.closeButton = this.dialog.locator('.dialog__close');
    this.reason = this.dialog.getByLabel('Reason');
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
    this.reportButton = this.dialog.getByRole('button', { name: /^Report(ing)?/ });
    this.doneButton = this.dialog.getByRole('button', { name: 'Done' });
    this.alert = this.dialog.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.success = this.dialog.locator('.dialog__success');
  }

  /** The dialog by its role and accessible name, as assistive technology finds it. */
  byRole(name = 'Report this message?'): Locator {
    return this.page.getByRole('dialog', { name });
  }

  /** Presses Escape once the dialog is open: a key pressed before it opens closes nothing. */
  async pressEscape(): Promise<void> {
    await this.dialog.waitFor();
    await this.page.keyboard.press('Escape');
  }
}
