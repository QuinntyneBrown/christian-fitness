import type { Locator, Page } from '@playwright/test';

/**
 * The member app's Request a booking dialog (mock `docs/mocks/dialogs/request-booking/`), opened from
 * a professional's card: the `dialog` block over its `scrim`, with What would you like, When works
 * for you and an optional Message, the error summary or message, Cancel and Send request, and the
 * "Request sent" success with Done and Go to messages. Owns the selectors of that dialog.
 */
export class WebRequestBookingDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly scrim: Locator;
  readonly closeButton: Locator;
  readonly kind: Locator;
  readonly when: Locator;
  readonly message: Locator;
  readonly cancelButton: Locator;
  /** The primary button: "Send request", "Sending…" while it is on its way, "Go to messages" once sent. */
  readonly sendButton: Locator;
  readonly doneButton: Locator;
  readonly goToMessagesButton: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly alertLinks: Locator;
  readonly success: Locator;
  readonly successText: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.locator('.dialog');
    this.title = this.dialog.locator('.dialog__title');
    this.subtitle = this.dialog.locator('.dialog__sub');
    this.scrim = page.locator('.scrim');
    this.closeButton = this.dialog.locator('.dialog__close');
    this.kind = this.dialog.getByLabel('What would you like?');
    this.when = this.dialog.getByLabel('When works for you?');
    this.message = this.dialog.getByLabel('Message');
    this.cancelButton = this.dialog.locator('.dialog__foot .btn--secondary');
    this.sendButton = this.dialog.locator('.dialog__foot .btn--primary');
    this.doneButton = this.dialog.getByRole('button', { name: 'Done' });
    this.goToMessagesButton = this.dialog.getByRole('button', { name: 'Go to messages' });
    this.alert = this.dialog.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.alertLinks = this.alert.locator('.form-alert__list a');
    this.success = this.dialog.locator('.dialog__success');
    this.successText = this.success.locator('.dialog__success-text');
  }

  /** The dialog by its role and accessible name, as assistive technology finds it. */
  byRole(name = 'Request a booking'): Locator {
    return this.page.getByRole('dialog', { name });
  }

  /** The `field` block labelled `label`. */
  field(label: string): Locator {
    return this.dialog.locator('.field').filter({ has: this.page.getByLabel(label) });
  }

  fieldHint(label: string): Locator {
    return this.field(label).locator('.field__hint');
  }

  fieldError(label: string): Locator {
    return this.field(label).locator('.field__error');
  }

  /** The labels of the kind choices, in the order shown. */
  kindOptions(): Promise<string[]> {
    return this.kind
      .locator('option')
      .allTextContents()
      .then((labels) => labels.map((label) => label.trim()));
  }

  /** The kind chosen now, as its label. */
  chosenKind(): Promise<string> {
    return this.kind.evaluate(
      (el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ?? '',
    );
  }

  async pressEscape(): Promise<void> {
    await this.dialog.waitFor();
    await this.page.keyboard.press('Escape');
  }
}
