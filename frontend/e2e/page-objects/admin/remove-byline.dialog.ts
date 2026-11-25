import type { Locator, Page } from '@playwright/test';

/**
 * The Remove byline dialog (mock `docs/mocks/dialogs/remove-byline/`): for a byline no story uses,
 * "Remove <name>?" with Keep it and Remove byline; for one stories use, "Can't remove <name>" with
 * an info alert and only Close. Owns the selectors of that dialog.
 */
export class RemoveBylineDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly text: Locator;
  readonly keepButton: Locator;
  /** The confirming button, which reads "Removing…" while the removal is on its way. */
  readonly removeButton: Locator;
  /** The foot's buttons, whatever they read. */
  readonly footButtons: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog', { name: /^(Remove .+\?|Can't remove .+)$/ });
    this.title = this.dialog.locator('.dialog__title');
    this.subtitle = this.dialog.locator('.dialog__sub');
    this.text = this.dialog.locator('.remove-byline__text');
    this.keepButton = this.dialog.locator('.dialog__foot .btn', { hasText: 'Keep it' });
    this.removeButton = this.dialog.locator('.dialog__foot .btn--primary');
    this.footButtons = this.dialog.locator('.dialog__foot .btn');
    this.alert = this.dialog.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
  }

  async pressEscape(): Promise<void> {
    await this.dialog.waitFor();
    await this.page.keyboard.press('Escape');
  }
}
