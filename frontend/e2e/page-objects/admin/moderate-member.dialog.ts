import type { Locator, Page } from '@playwright/test';

/**
 * The moderation dialog of the admin Members page (mock `docs/mocks/dialogs/moderate-member/`):
 * Flag or Suspend for an Active member, suspension only for a Flagged one, the note, the
 * confirmation, the error summary and the alert a refusal shows. Owns the selectors of that dialog.
 */
export class ModerateMemberDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly closeButton: Locator;
  readonly scrim: Locator;
  readonly actions: Locator;
  readonly flagChoice: Locator;
  readonly suspendChoice: Locator;
  readonly note: Locator;
  readonly noteHint: Locator;
  readonly noteError: Locator;
  readonly confirmation: Locator;
  readonly confirmationError: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertLinks: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog');
    this.title = this.dialog.locator('.dialog__title');
    this.subtitle = this.dialog.locator('.dialog__sub');
    this.closeButton = this.dialog.getByRole('button', { name: 'Close' });
    this.scrim = page.locator('.scrim');
    this.actions = this.dialog.getByRole('group', { name: 'What do you want to do?' });
    this.flagChoice = this.dialog.getByRole('radio', { name: /^Flag/ });
    this.suspendChoice = this.dialog.getByRole('radio', { name: /^Suspend/ });
    this.note = this.dialog.getByRole('textbox', { name: 'Note' });
    this.noteHint = this.dialog.locator('#f-note-hint');
    this.noteError = this.dialog.locator('#f-note-error');
    this.confirmation = this.dialog.getByRole('checkbox');
    this.confirmationError = this.dialog.locator('#f-confirm-error');
    this.alert = this.dialog.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertLinks = this.alert.getByRole('link');
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
    this.submitButton = this.dialog.locator('.dialog__foot .btn--primary');
  }

  /** Whether `locator` has focus. */
  isFocused(locator: Locator): Promise<boolean> {
    return locator.evaluate((element) => element === document.activeElement);
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  /** Clicks the scrim beside the dialog, where a pointer lands when it misses the panel. */
  async clickScrim(): Promise<void> {
    await this.page.mouse.click(8, 8);
  }
}
