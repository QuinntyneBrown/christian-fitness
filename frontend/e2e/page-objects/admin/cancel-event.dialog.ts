import type { Locator, Page } from '@playwright/test';

/**
 * The Cancel event confirmation (mock `docs/mocks/dialogs/cancel-event/`): a dialog over the event
 * editor naming the event, with Keep event and Cancel event, and the `failed` alert. Owns the
 * selectors of that dialog.
 */
export class CancelEventDialog {
  readonly dialog: Locator;
  readonly subtitle: Locator;
  readonly text: Locator;
  readonly keepButton: Locator;
  /** The confirming button, which reads "Cancelling…" while the cancel is on its way. */
  readonly cancelButton: Locator;
  readonly closeButton: Locator;
  readonly alert: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'Cancel this event?' });
    this.subtitle = this.dialog.locator('.dialog__sub');
    this.text = this.dialog
      .locator('.dialog__body .prose, .dialog__body p:not(.form-alert__title)')
      .last();
    this.keepButton = this.dialog.getByRole('button', { name: 'Keep event' });
    this.cancelButton = this.dialog.locator('.dialog__foot .btn--primary');
    this.closeButton = this.dialog.getByRole('button', { name: 'Close' });
    this.alert = this.dialog.getByRole('alert');
  }

  async pressEscape(): Promise<void> {
    await this.dialog.waitFor();
    await this.page.keyboard.press('Escape');
  }
}
