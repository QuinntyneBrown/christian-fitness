import type { Locator, Page } from '@playwright/test';

/** What the owner's editor holds, field by field, as the member reads it. */
export interface OwnerListingEditorValues {
  name: string;
  about: string;
  website: string;
  photo: string;
  focus: string;
  contact: string;
}

/**
 * The owner's listing editor, "Edit your listing" (mock `docs/mocks/dialogs/owner-listing-editor/`;
 * L2-079; ADR 0093): a CDK Dialog over the listing profile with the name, about, website, photo,
 * focus and contact email, Cancel and Save changes, and an alert above the fields for a refusal, a
 * failure or a name waiting for staff. Owns the selectors of that dialog.
 */
export class OwnerListingEditorDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly name: Locator;
  readonly nameHint: Locator;
  readonly about: Locator;
  readonly website: Locator;
  readonly photoInput: Locator;
  readonly photoName: Locator;
  readonly photoError: Locator;
  readonly focus: Locator;
  readonly focusHint: Locator;
  readonly contact: Locator;
  readonly contactHint: Locator;
  readonly labels: Locator;
  /** The text inputs and the text area, which turn read-only while saving. */
  readonly textInputs: Locator;
  readonly closeButton: Locator;
  readonly cancelButton: Locator;
  /** The foot's save button, whichever it reads: Save changes or Saving…. */
  readonly saveButton: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly alertLinks: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'Edit your listing' });
    this.title = this.dialog.locator('.dialog__title');
    this.subtitle = this.dialog.locator('.dialog__sub');
    this.name = this.dialog.getByLabel('Name', { exact: true });
    this.nameHint = this.dialog.locator('#f-name-hint');
    this.about = this.dialog.getByLabel('About');
    this.website = this.dialog.getByLabel('Website');
    this.photoInput = this.dialog.locator('input[type="file"]');
    this.photoName = this.dialog.locator('.file-field__name');
    this.photoError = this.dialog.locator('#f-photo-error');
    this.focus = this.dialog.getByLabel('Focus');
    this.focusHint = this.dialog.locator('#f-focus-hint');
    this.contact = this.dialog.getByLabel('Contact email');
    this.contactHint = this.dialog.locator('#f-contact-hint');
    this.labels = this.dialog.locator('.field__label');
    this.textInputs = this.dialog.locator('.input, .textarea');
    this.closeButton = this.dialog.getByRole('button', { name: 'Close' });
    this.cancelButton = this.dialog.locator('.dialog__foot .btn', { hasText: 'Cancel' });
    this.saveButton = this.dialog.locator('.dialog__foot .btn', {
      hasText: /Save changes|Saving/,
    });
    this.alert = this.dialog.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.alertLinks = this.alert.getByRole('link');
  }

  /** Every field's value, as the member reads it; the photo is the file name the field shows. */
  async values(): Promise<OwnerListingEditorValues> {
    return {
      name: await this.name.inputValue(),
      about: await this.about.inputValue(),
      website: await this.website.inputValue(),
      photo: ((await this.photoName.textContent()) ?? '').trim(),
      focus: await this.focus.inputValue(),
      contact: await this.contact.inputValue(),
    };
  }

  /** Chooses a photo file with `bytes` named `name`. */
  async choosePhoto(name: string, bytes: Buffer): Promise<void> {
    await this.photoInput.setInputFiles({ name, mimeType: 'image/png', buffer: bytes });
  }
}
