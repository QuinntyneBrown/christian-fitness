import type { Locator, Page, Request } from '@playwright/test';

/** What the dialog's fields hold, as the member reads them. */
export interface EditProfileValues {
  name: string;
  homeChurch: string;
  city: string;
  bio: string;
  goals: string;
  /** The labels of the pressed interests, in the order shown. */
  interests: string[];
}

/**
 * The member app's Edit profile dialog (mock `docs/mocks/dialogs/edit-profile/`), opened from
 * Profile: the `dialog` block over its `scrim`, with the fields, the error summary or message, and
 * Cancel and Save changes. Owns the selectors of that dialog.
 */
export class WebEditProfileDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly scrim: Locator;
  readonly closeButton: Locator;
  readonly name: Locator;
  readonly homeChurch: Locator;
  readonly city: Locator;
  /** Any "Show my home church" control: there is none, as Preferences has it (L2-006 AC4). */
  readonly showHomeChurch: Locator;
  /** Home church and City, side by side from SM up. */
  readonly churchFields: Locator;
  readonly bio: Locator;
  readonly goals: Locator;
  readonly interestLegend: Locator;
  readonly interests: Locator;
  readonly cancelButton: Locator;
  /** The primary button: "Save changes", or "Saving…" while the save is on its way. */
  readonly saveButton: Locator;
  /** The `form-alert` above the fields: the error summary, the refusal or the failure. */
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  /** The error summary's links, one per field to fix. */
  readonly alertLinks: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.locator('.dialog');
    this.title = this.dialog.locator('.dialog__title');
    this.scrim = page.locator('.scrim');
    this.closeButton = this.dialog.locator('.dialog__close');
    this.name = this.dialog.getByLabel('Full name');
    this.homeChurch = this.dialog.getByRole('textbox', { name: 'Home church (optional)' });
    this.city = this.dialog.getByRole('textbox', { name: 'City (optional)' });
    this.showHomeChurch = this.dialog.getByLabel(/show my home church/i);
    this.churchFields = this.dialog.locator('.field-grid');
    this.bio = this.dialog.getByLabel('About');
    this.goals = this.dialog.getByLabel('Goals this year');
    this.interestLegend = this.dialog.locator('.field__legend');
    this.interests = this.dialog.locator('.interest-list .interest');
    this.cancelButton = this.dialog.locator('.dialog__foot .btn--secondary');
    this.saveButton = this.dialog.locator('.dialog__foot .btn--primary');
    this.alert = this.dialog.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.alertLinks = this.alert.locator('.form-alert__list a');
  }

  /** The dialog by its role and accessible name, as assistive technology finds it. */
  byRole(): Locator {
    return this.page.getByRole('dialog', { name: 'Edit profile' });
  }

  /**
   * Whether the dialog is modal: its container says `aria-modal="true"` and the rest of the page
   * is hidden from assistive technology.
   */
  async isModal(): Promise<boolean> {
    return this.page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      const app = document.querySelector('cf-root');
      return dialog !== null && app?.closest('[aria-hidden="true"]') !== null;
    });
  }

  /** The interest toggle labelled `label`. */
  interest(label: string): Locator {
    return this.interests.filter({ hasText: label });
  }

  /** The `field` block labelled `label`: the label, its control and its hint or error. */
  field(label: string): Locator {
    return this.dialog.locator('.field').filter({ has: this.page.getByLabel(label) });
  }

  fieldHint(label: string): Locator {
    return this.field(label).locator('.field__hint');
  }

  fieldError(label: string): Locator {
    return this.field(label).locator('.field__error');
  }

  /** What every field holds now. */
  async values(): Promise<EditProfileValues> {
    return {
      name: await this.name.inputValue(),
      homeChurch: await this.homeChurch.inputValue(),
      city: await this.city.inputValue(),
      bio: await this.bio.inputValue(),
      goals: await this.goals.inputValue(),
      interests: (
        await this.dialog.locator('.interest-list .interest[aria-pressed="true"]').allTextContents()
      ).map((label) => label.trim()),
    };
  }

  /** Chooses Save changes and waits for the save request; answers it as the app sent it. */
  async saveAndAwaitRequest(): Promise<Request> {
    const sent = this.page.waitForRequest(
      (request) =>
        request.method() === 'PUT' && /\/api\/members\/[^/]+\/profile$/.test(request.url()),
    );
    await this.saveButton.click();
    return sent;
  }

  /** Chooses Save changes and waits until the API has answered. */
  async saveAndAwaitAnswer(): Promise<void> {
    const answered = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        /\/api\/members\/[^/]+\/profile$/.test(response.url()),
    );
    await this.saveButton.click();
    await answered;
  }

  async pressEscape(): Promise<void> {
    await this.dialog.waitFor();
    await this.page.keyboard.press('Escape');
  }

  /** Clicks the scrim beside the dialog, where nothing else is. */
  async clickScrim(): Promise<void> {
    await this.scrim.click({ position: { x: 8, y: 8 } });
  }
}
