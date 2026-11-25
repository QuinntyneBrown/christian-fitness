import type { Locator, Page } from '@playwright/test';

/**
 * Add a date (mock `docs/mocks/dialogs/add-session/`): a CDK Dialog over Event series with Date,
 * Start time, End time and an optional Topic, its error summary or failure alert, and Cancel and
 * Add date. Owns the selectors of that dialog.
 */
export class AddSessionDialog {
  readonly dialog: Locator;
  readonly subtitle: Locator;
  readonly date: Locator;
  readonly start: Locator;
  readonly end: Locator;
  readonly topic: Locator;
  readonly topicHint: Locator;
  readonly inputs: Locator;
  readonly cancelButton: Locator;
  /** The foot's add button, whichever it reads: Add date or Adding…. */
  readonly addButton: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertLinks: Locator;
  readonly fieldErrors: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'Add a date' });
    this.subtitle = this.dialog.locator('.dialog__sub');
    this.date = this.dialog.getByLabel('Date');
    this.start = this.dialog.getByLabel('Start time');
    this.end = this.dialog.getByLabel('End time');
    this.topic = this.dialog.getByLabel('Topic');
    this.topicHint = this.dialog.locator('#f-topic-hint');
    this.inputs = this.dialog.locator('.input');
    this.cancelButton = this.dialog.locator('.dialog__foot .btn', { hasText: 'Cancel' });
    this.addButton = this.dialog.locator('.dialog__foot .btn', { hasText: /Add date|Adding/ });
    this.alert = this.dialog.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertLinks = this.alert.getByRole('link');
    this.fieldErrors = this.dialog.locator('.field__error');
  }

  async fill(date: string, start: string, end: string, topic = ''): Promise<void> {
    await this.date.fill(date);
    await this.start.fill(start);
    await this.end.fill(end);
    await this.topic.fill(topic);
  }

  async add(): Promise<void> {
    await this.addButton.click();
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  /** Whether `locator` has focus. */
  async isFocused(locator: Locator): Promise<boolean> {
    return locator.evaluate((element) => element === document.activeElement);
  }
}
