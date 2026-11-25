import type { Locator, Page } from '@playwright/test';

/** What a person types into the series editor (mock `docs/mocks/dialogs/series-editor/`). */
export interface SeriesEditorValues {
  title: string;
  category: string;
  description: string;
  seriesPrice: string;
  dropInPrice: string;
  capacity: string;
  location: string;
  area: string;
}

/**
 * The series editor, "New series" (mock `docs/mocks/dialogs/series-editor/`): a CDK Dialog over
 * Event series with Title, Category, Host (a search over Listed directory listings), Description,
 * Image, Series price, Drop-in price, Capacity, Location and Suggestion area, its error summary or
 * failure alert, and Cancel and Create series. Owns the selectors of that dialog.
 */
export class SeriesEditorDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly closeButton: Locator;
  readonly labels: Locator;
  readonly titleField: Locator;
  readonly category: Locator;
  readonly host: Locator;
  /** The matching hosts under the Host field, each a button that chooses it. */
  readonly hostChoices: Locator;
  /** The line under the Host field saying a search found nothing or failed. */
  readonly hostStatus: Locator;
  readonly description: Locator;
  readonly imageInput: Locator;
  readonly imageName: Locator;
  readonly seriesPrice: Locator;
  readonly dropInPrice: Locator;
  readonly capacity: Locator;
  readonly location: Locator;
  readonly area: Locator;
  /** The text inputs and the text area, which turn read-only while creating. */
  readonly textInputs: Locator;
  readonly cancelButton: Locator;
  /** The foot's create button, whichever it reads: Create series or Creating…. */
  readonly createButton: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly alertLinks: Locator;
  readonly fieldErrors: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'New series' });
    this.title = this.dialog.locator('.dialog__title');
    this.subtitle = this.dialog.locator('.dialog__sub');
    this.closeButton = this.dialog.getByRole('button', { name: 'Close' });
    this.labels = this.dialog.locator('.field__label');
    this.titleField = this.dialog.getByLabel('Title');
    this.category = this.dialog.getByLabel('Category');
    this.host = this.dialog.getByLabel('Host');
    this.hostChoices = this.dialog
      .getByRole('list', { name: 'Matching hosts' })
      .locator('.pick-card');
    this.hostStatus = this.dialog.locator('#f-host-status');
    this.description = this.dialog.getByLabel('Description');
    this.imageInput = this.dialog.locator('input[type="file"]');
    this.imageName = this.dialog.locator('.file-field__name');
    this.seriesPrice = this.dialog.getByLabel('Series price');
    this.dropInPrice = this.dialog.getByLabel('Drop-in price');
    this.capacity = this.dialog.getByLabel('Capacity');
    this.location = this.dialog.getByLabel('Location');
    this.area = this.dialog.getByLabel('Suggestion area');
    this.textInputs = this.dialog.locator('.input, .textarea');
    this.cancelButton = this.dialog.locator('.dialog__foot .btn', { hasText: 'Cancel' });
    this.createButton = this.dialog.locator('.dialog__foot .btn', {
      hasText: /Create series|Creating/,
    });
    this.alert = this.dialog.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.alertLinks = this.alert.getByRole('link');
    this.fieldErrors = this.dialog.locator('.field__error');
  }

  /** Types every field but the host and the image. */
  async fill(values: SeriesEditorValues): Promise<void> {
    await this.titleField.fill(values.title);
    await this.category.selectOption(values.category);
    await this.description.fill(values.description);
    await this.seriesPrice.fill(values.seriesPrice);
    await this.dropInPrice.fill(values.dropInPrice);
    await this.capacity.fill(values.capacity);
    await this.location.fill(values.location);
    await this.area.fill(values.area);
  }

  /** Types `text` into the Host field, as a person searching for a host does. */
  async searchHost(text: string): Promise<void> {
    await this.host.fill(text);
  }

  /** Chooses the matching host named `name`. */
  async chooseHost(name: string): Promise<void> {
    await this.hostChoices.filter({ hasText: name }).click();
  }

  /** Chooses an image file with `bytes` named `name`. */
  async chooseImage(name: string, bytes: Buffer): Promise<void> {
    await this.imageInput.setInputFiles({ name, mimeType: 'image/png', buffer: bytes });
  }

  async create(): Promise<void> {
    await this.createButton.click();
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  /** Whether `locator` has focus. */
  async isFocused(locator: Locator): Promise<boolean> {
    return locator.evaluate((element) => element === document.activeElement);
  }

  /** The id of the element with focus. */
  focusedId(): Promise<string> {
    return this.page.evaluate(() => document.activeElement?.id ?? '');
  }
}
