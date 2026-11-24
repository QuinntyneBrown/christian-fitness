import type { Locator, Page } from '@playwright/test';

/**
 * The Remove listing confirmation (mock `docs/mocks/dialogs/remove-listing/`): a dialog over Manage
 * Services naming the professional, with Keep listing and Remove listing, and the `failed` alert.
 * Owns the selectors of that dialog.
 */
export class RemoveListingDialog {
  readonly dialog: Locator;
  readonly subtitle: Locator;
  readonly text: Locator;
  readonly keepButton: Locator;
  /** The confirming button, which reads "Removing…" while the removal is on its way. */
  readonly removeButton: Locator;
  readonly closeButton: Locator;
  readonly alert: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'Remove this listing?' });
    this.subtitle = this.dialog.locator('.dialog__sub');
    this.text = this.dialog.locator('.dialog__body .remove-listing__text');
    this.keepButton = this.dialog.getByRole('button', { name: 'Keep listing' });
    this.removeButton = this.dialog.locator('.dialog__foot .btn--primary');
    this.closeButton = this.dialog.getByRole('button', { name: 'Close' });
    this.alert = this.dialog.getByRole('alert');
  }

  async pressEscape(): Promise<void> {
    await this.dialog.waitFor();
    await this.page.keyboard.press('Escape');
  }
}
