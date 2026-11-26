import type { Locator, Page } from '@playwright/test';

/**
 * The member app's Leave the series dialog (mock `docs/mocks/dialogs/leave-series/`), opened from a
 * joined series' sign-up panel: the `dialog` block with its title, the series and its cadence, how
 * many places go back, the failure alert, "Stay in the series" and "Leave the series"
 * ("Leaving…" while it is on its way). Owns the selectors of that dialog.
 */
export class WebLeaveSeriesDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly text: Locator;
  readonly closeButton: Locator;
  readonly stayButton: Locator;
  /** The primary button: "Leave the series", or "Leaving…" while it is on its way. */
  readonly leaveButton: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.locator('.dialog');
    this.title = this.dialog.locator('.dialog__title');
    this.subtitle = this.dialog.locator('.dialog__sub');
    this.text = this.dialog.locator('.leave-series__text');
    this.closeButton = this.dialog.locator('.dialog__close');
    this.stayButton = this.dialog.getByRole('button', { name: 'Stay in the series' });
    this.leaveButton = this.dialog.locator('.dialog__foot .btn--primary');
    this.alert = this.dialog.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
  }

  /** The dialog by its role and accessible name, as assistive technology finds it. */
  byRole(name = 'Leave the series?'): Locator {
    return this.page.getByRole('dialog', { name });
  }

  /** Presses Escape once the dialog is open: a key pressed before it opens closes nothing. */
  async pressEscape(): Promise<void> {
    await this.dialog.waitFor();
    await this.page.keyboard.press('Escape');
  }
}
