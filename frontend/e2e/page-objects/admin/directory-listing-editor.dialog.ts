import type { Locator, Page } from '@playwright/test';

/**
 * The staff listing editor, "Edit listing" (mock `docs/mocks/dialogs/directory-listing-editor/`):
 * a CDK Dialog over Listings with the listing's name, kind, area, tagline, about, website and
 * photo, the note that the Verified mark cannot be changed, Cancel and Save changes. Owns the
 * selectors of that dialog.
 */
export class DirectoryListingEditorDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly name: Locator;
  readonly kind: Locator;
  readonly area: Locator;
  readonly tagline: Locator;
  readonly about: Locator;
  readonly website: Locator;
  readonly focus: Locator;
  readonly contact: Locator;
  readonly photoInput: Locator;
  readonly photoName: Locator;
  readonly photoError: Locator;
  readonly verifiedNote: Locator;
  readonly labels: Locator;
  /** The text inputs and the text area, which turn read-only while saving. */
  readonly textInputs: Locator;
  readonly cancelButton: Locator;
  /** The foot's save button, whichever it reads: Save changes or Saving…. */
  readonly saveButton: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly alertLinks: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'Edit listing' });
    this.title = this.dialog.locator('.dialog__title');
    this.subtitle = this.dialog.locator('.dialog__sub');
    this.name = this.dialog.getByLabel('Name', { exact: true });
    this.kind = this.dialog.getByLabel('Kind');
    this.area = this.dialog.getByLabel('Area');
    this.tagline = this.dialog.getByLabel('Tagline');
    this.about = this.dialog.getByLabel('About');
    this.website = this.dialog.getByLabel('Website');
    this.focus = this.dialog.getByLabel('Focus');
    this.contact = this.dialog.getByLabel('Contact email');
    this.photoInput = this.dialog.locator('input[type="file"]');
    this.photoName = this.dialog.locator('.file-field__name');
    this.photoError = this.dialog.locator('#f-image-error');
    this.verifiedNote = this.dialog.locator('.directory-listing-editor__note');
    this.labels = this.dialog.locator('.field__label');
    this.textInputs = this.dialog.locator('.input, .textarea');
    this.cancelButton = this.dialog.locator('.dialog__foot .btn', { hasText: 'Cancel' });
    this.saveButton = this.dialog.locator('.dialog__foot .btn', {
      hasText: /Save changes|Saving/,
    });
    this.alert = this.dialog.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.alertLinks = this.alert.getByRole('link');
  }

  /** Chooses a photo file with `bytes` named `name`. */
  async choosePhoto(name: string, bytes: Buffer): Promise<void> {
    await this.photoInput.setInputFiles({ name, mimeType: 'image/png', buffer: bytes });
  }
}
