import type { Locator, Page } from '@playwright/test';

/** A file the editor's image field is given. */
export interface ImageUpload {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

/** What the event editor's fields hold, by label. */
export interface EventEditorValues {
  title: string;
  category: string;
  date: string;
  startTime: string;
  place: string;
  area: string;
  price: string;
  capacity: string;
  summary: string;
}

/**
 * The event editor drawer, "New event" or "Edit event" (mock `docs/mocks/dialogs/event-editor/`): a
 * CDK Dialog over the Events page with the event's fields and image, Save draft or Save changes,
 * and Close. Owns the selectors of that dialog.
 */
export class EventEditorDialog {
  readonly dialog: Locator;
  readonly drawer: Locator;
  readonly heading: Locator;
  readonly closeButton: Locator;
  readonly title: Locator;
  readonly category: Locator;
  readonly date: Locator;
  readonly startTime: Locator;
  readonly place: Locator;
  readonly area: Locator;
  readonly price: Locator;
  readonly priceHint: Locator;
  readonly capacity: Locator;
  readonly summary: Locator;
  readonly labels: Locator;
  /** The text inputs and the text area, which turn read-only while saving. */
  readonly textInputs: Locator;
  readonly saveDraftButton: Locator;
  /** The foot's save button, whichever the editor shows: Save draft, Save changes or Saving…. */
  readonly saveButton: Locator;
  /** The foot's Publish button, which reads "Publishing…" while it works. */
  readonly publishButton: Locator;
  /** The foot's Cancel event button, offered on a published event. */
  readonly cancelEventButton: Locator;
  readonly chooseImageButton: Locator;
  readonly removeImageButton: Locator;
  readonly imageName: Locator;
  readonly alertLinks: Locator;
  readonly footButtons: Locator;
  readonly alert: Locator;
  readonly scrim: Locator;

  constructor(
    private readonly page: Page,
    name: 'New event' | 'Edit event' = 'New event',
  ) {
    this.dialog = page.getByRole('dialog', { name });
    this.drawer = this.dialog.locator('.drawer');
    this.heading = this.dialog.locator('.drawer__title');
    this.closeButton = this.dialog.getByRole('button', { name: 'Close' });
    this.title = this.dialog.getByLabel('Title');
    this.category = this.dialog.getByLabel('Category');
    this.date = this.dialog.getByLabel('Date');
    this.startTime = this.dialog.getByLabel('Start time');
    this.place = this.dialog.getByLabel('Place');
    this.area = this.dialog.getByLabel('Area');
    this.price = this.dialog.getByLabel('Price');
    this.priceHint = this.dialog.locator('#f-price-hint');
    this.capacity = this.dialog.getByLabel('Capacity');
    this.summary = this.dialog.getByLabel('Summary');
    this.labels = this.dialog.locator('.field__label');
    this.textInputs = this.dialog.locator('.input, .textarea');
    this.saveDraftButton = this.dialog.locator('.drawer__foot .btn', {
      hasText: /Save draft|Saving/,
    });
    this.footButtons = this.dialog.locator('.drawer__foot .btn');
    this.saveButton = this.dialog.locator('.drawer__foot .btn', {
      hasText: /Save draft|Save changes|Saving/,
    });
    this.publishButton = this.dialog.locator('.drawer__foot .btn', {
      hasText: /Publish/,
    });
    this.cancelEventButton = this.dialog.locator('.drawer__foot .btn', { hasText: /Cancel event/ });
    this.chooseImageButton = this.dialog.getByRole('button', { name: /^Choose image/ });
    this.removeImageButton = this.dialog.getByRole('button', { name: 'Remove image' });
    this.imageName = this.dialog.locator('.file-field__name');
    this.alertLinks = this.dialog.locator('.form-alert__list a');
    this.alert = this.dialog.locator('.form-alert');
    this.scrim = this.dialog.locator('.scrim');
  }

  /** Fills every field; the category by its label, such as "Retreat". */
  async fill(values: EventEditorValues): Promise<void> {
    await this.title.fill(values.title);
    await this.category.selectOption({ label: values.category });
    await this.date.fill(values.date);
    await this.startTime.fill(values.startTime);
    await this.place.fill(values.place);
    await this.area.fill(values.area);
    await this.price.fill(values.price);
    await this.capacity.fill(values.capacity);
    await this.summary.fill(values.summary);
  }

  async saveDraft(): Promise<void> {
    await this.saveDraftButton.click();
  }

  async publish(): Promise<void> {
    await this.publishButton.click();
  }

  async cancelEvent(): Promise<void> {
    await this.cancelEventButton.click();
  }

  async saveChanges(): Promise<void> {
    await this.saveButton.click();
  }

  /** Chooses `file` in the image field, as a person does from the file picker. */
  async chooseImage(file: ImageUpload): Promise<void> {
    await this.dialog.locator('input[type=file]').setInputFiles(file);
  }

  /** The message under the field whose control has `id`, such as `f-title`. */
  fieldError(id: string): Locator {
    return this.dialog.locator(`#${id}-error`);
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  /** Clicks the scrim beside the drawer, at its left edge. */
  async clickScrim(): Promise<void> {
    await this.page.mouse.click(5, 300);
  }

  /** Whether the Title field has focus. */
  async titleIsFocused(): Promise<boolean> {
    return this.title.evaluate((element) => element === document.activeElement);
  }

  /** The drawer's box, in CSS pixels. */
  async drawerBox(): Promise<{ x: number; width: number; height: number }> {
    const box = await this.drawer.boundingBox();
    if (box === null) throw new Error('The drawer is not rendered.');
    return { x: box.x, width: box.width, height: box.height };
  }
}
