import type { Locator, Page } from '@playwright/test';

/**
 * The byline editor, "Add a byline" or "Edit byline" (mock `docs/mocks/dialogs/byline-editor/`):
 * a CDK Dialog over Bylines with the name, the short bio with its counter and an optional photo,
 * Cancel and Add byline or Save byline. Owns the selectors of that dialog.
 */
export class BylineEditorDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly name: Locator;
  readonly nameHint: Locator;
  readonly nameError: Locator;
  readonly bio: Locator;
  readonly bioHint: Locator;
  readonly bioError: Locator;
  readonly photoButton: Locator;
  readonly photoInput: Locator;
  readonly photoName: Locator;
  readonly photoHint: Locator;
  readonly photoError: Locator;
  /** The text input and the text area, which turn read-only while saving. */
  readonly textInputs: Locator;
  readonly closeButton: Locator;
  readonly cancelButton: Locator;
  /** The foot's save button, whichever it reads: Add byline, Save byline or Saving…. */
  readonly saveButton: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertLinks: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog', { name: /^(Add a byline|Edit byline)$/ });
    this.title = this.dialog.locator('.dialog__title');
    this.name = this.dialog.getByLabel('Name', { exact: true });
    this.nameHint = this.dialog.locator('#f-name-hint');
    this.nameError = this.dialog.locator('#f-name-error');
    this.bio = this.dialog.getByLabel('Short bio');
    this.bioHint = this.dialog.locator('#f-bio-hint');
    this.bioError = this.dialog.locator('#f-bio-error');
    this.photoButton = this.dialog.locator('.file-field').getByRole('button');
    this.photoInput = this.dialog.locator('input[type="file"]');
    this.photoName = this.dialog.locator('.file-field__name');
    this.photoHint = this.dialog.locator('#f-photo-hint');
    this.photoError = this.dialog.locator('#f-photo-error');
    this.textInputs = this.dialog.locator('.input, .textarea');
    this.closeButton = this.dialog.locator('.dialog__close');
    this.cancelButton = this.dialog.locator('.dialog__foot .btn', { hasText: 'Cancel' });
    this.saveButton = this.dialog.locator('.dialog__foot .btn', {
      hasText: /Add byline|Save byline|Saving/,
    });
    this.alert = this.dialog.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertLinks = this.alert.getByRole('link');
  }

  /** Chooses a photo file with `bytes` named `name`. */
  async choosePhoto(name: string, bytes: Buffer): Promise<void> {
    await this.photoInput.setInputFiles({ name, mimeType: 'image/png', buffer: bytes });
  }
}
