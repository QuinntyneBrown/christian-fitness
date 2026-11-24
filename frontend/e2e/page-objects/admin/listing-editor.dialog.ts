import type { Locator, Page } from '@playwright/test';

/** What the listing editor's fields hold, by label. */
export interface ListingEditorValues {
  name: string;
  role: string;
  category: string;
  where: string;
  rate: string;
  credentials: string;
  about: string;
  contactLink: string;
}

/**
 * The listing editor drawer, "Edit listing" (mock `docs/mocks/dialogs/listing-editor/`, states
 * `edit` and `edit-invalid`): a CDK Dialog over the Services page with the listing's fields, Cancel
 * and Save changes. Owns the selectors of that dialog.
 */
export class ListingEditorDialog {
  readonly dialog: Locator;
  readonly heading: Locator;
  readonly closeButton: Locator;
  readonly name: Locator;
  readonly role: Locator;
  readonly category: Locator;
  readonly where: Locator;
  readonly rate: Locator;
  readonly credentials: Locator;
  readonly about: Locator;
  readonly contactLink: Locator;
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
    this.heading = this.dialog.locator('.drawer__title');
    this.closeButton = this.dialog.getByRole('button', { name: 'Close' });
    this.name = this.dialog.getByLabel('Name');
    this.role = this.dialog.getByLabel('Role');
    this.category = this.dialog.getByLabel('Category');
    this.where = this.dialog.getByLabel('Where');
    this.rate = this.dialog.getByLabel('Rate');
    this.credentials = this.dialog.getByLabel('Credentials');
    this.about = this.dialog.getByLabel('About');
    this.contactLink = this.dialog.getByLabel('Contact link');
    this.labels = this.dialog.locator('.field__label');
    this.textInputs = this.dialog.locator('.input, .textarea');
    this.cancelButton = this.dialog.locator('.drawer__foot .btn', { hasText: 'Cancel' });
    this.saveButton = this.dialog.locator('.drawer__foot .btn', { hasText: /Save changes|Saving/ });
    this.alert = this.dialog.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.alertLinks = this.alert.getByRole('link');
  }

  /** Replaces the fields' text; the category by its label. */
  async fill(values: Partial<ListingEditorValues>): Promise<void> {
    if (values.name !== undefined) await this.name.fill(values.name);
    if (values.role !== undefined) await this.role.fill(values.role);
    if (values.category !== undefined) await this.category.selectOption({ label: values.category });
    if (values.where !== undefined) await this.where.fill(values.where);
    if (values.rate !== undefined) await this.rate.fill(values.rate);
    if (values.credentials !== undefined) await this.credentials.fill(values.credentials);
    if (values.about !== undefined) await this.about.fill(values.about);
    if (values.contactLink !== undefined) await this.contactLink.fill(values.contactLink);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  /** The message under the field whose control has `id`, such as `f-contact`. */
  fieldError(id: string): Locator {
    return this.dialog.locator(`#${id}-error`);
  }

  async pressEscape(): Promise<void> {
    await this.dialog.waitFor();
    await this.page.keyboard.press('Escape');
  }
}
