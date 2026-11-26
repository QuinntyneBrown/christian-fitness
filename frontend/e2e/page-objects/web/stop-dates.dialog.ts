import type { Locator, Page } from '@playwright/test';

/**
 * The member app's Stop going to dates dialog (mock `docs/mocks/dialogs/stop-dates/`; ADR 0102),
 * opened when a member saves their dates with held ones unticked: the `dialog` block with its
 * title, the series and the dates, the text, the failure alert, "Keep my dates" and "Stop going"
 * ("Stopping…" while it is on its way). Owns the selectors of that dialog.
 */
export class WebStopDatesDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly text: Locator;
  readonly closeButton: Locator;
  readonly keepButton: Locator;
  /** The primary button: "Stop going", or "Stopping…" while it is on its way. */
  readonly stopButton: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.locator('.dialog');
    this.title = this.dialog.locator('.dialog__title');
    this.subtitle = this.dialog.locator('.dialog__sub');
    this.text = this.dialog.locator('.stop-dates__text');
    this.closeButton = this.dialog.locator('.dialog__close');
    this.keepButton = this.dialog.getByRole('button', { name: 'Keep my dates' });
    this.stopButton = this.dialog.locator('.dialog__foot .btn--primary');
    this.alert = this.dialog.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
  }

  /** The dialog by its role and accessible name, as assistive technology finds it. */
  byRole(name: string): Locator {
    return this.page.getByRole('dialog', { name });
  }

  /** Presses Escape once the dialog is open: a key pressed before it opens closes nothing. */
  async pressEscape(): Promise<void> {
    await this.dialog.waitFor();
    await this.page.keyboard.press('Escape');
  }
}
