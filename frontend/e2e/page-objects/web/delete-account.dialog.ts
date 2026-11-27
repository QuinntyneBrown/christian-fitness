import type { Locator, Page } from '@playwright/test';

/**
 * The member app's Delete your account dialog (mock `docs/mocks/dialogs/delete-account/`), opened
 * from Preferences' Your data: the `dialog` block with its title, the account's name and email,
 * what is removed and when, the field for the word "delete" with its error, the failure or
 * staff-account alert, "Keep my account" and "Delete my account" ("Deleting…" while it is on its
 * way). Owns the selectors of that dialog.
 */
export class WebDeleteAccountDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly text: Locator;
  readonly closeButton: Locator;
  readonly confirm: Locator;
  readonly confirmError: Locator;
  readonly keepButton: Locator;
  /** The danger button: "Delete my account", or "Deleting…" while it is on its way. */
  readonly deleteButton: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.locator('.dialog');
    this.title = this.dialog.locator('.dialog__title');
    this.subtitle = this.dialog.locator('.dialog__sub');
    this.text = this.dialog.locator('.delete-account__text');
    this.closeButton = this.dialog.locator('.dialog__close');
    this.confirm = this.dialog.getByLabel('Type "delete" to confirm');
    this.confirmError = this.dialog.locator('.field__error');
    this.keepButton = this.dialog.getByRole('button', { name: 'Keep my account' });
    this.deleteButton = this.dialog.locator('.dialog__foot .btn--danger');
    this.alert = this.dialog.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
  }

  /** The dialog by its role and accessible name, as assistive technology finds it. */
  byRole(name = 'Delete your account?'): Locator {
    return this.page.getByRole('dialog', { name });
  }

  /** Presses Escape once the dialog is open: a key pressed before it opens closes nothing. */
  async pressEscape(): Promise<void> {
    await this.dialog.waitFor();
    await this.page.keyboard.press('Escape');
  }
}
