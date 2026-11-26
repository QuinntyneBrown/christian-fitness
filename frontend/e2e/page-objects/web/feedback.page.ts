import type { Locator, Page, Request } from '@playwright/test';

/** One "You said, we did" entry, as the member reads it. */
export interface SaidView {
  quote: string;
  did: string;
  when: string;
}

/**
 * The member app's Send feedback screen at `/feedback` (mock `docs/mocks/pages/feedback/`): the
 * form with "What's it about?", the "About this page" chip, the note, the screenshot for
 * Something's off, the email choice and Send feedback; "You said, we did" beside it; the alert
 * above the form and the `done` section that replaces it once sent. Owns the selectors of that
 * screen.
 */
export class WebFeedbackPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  readonly form: Locator;
  readonly kinds: Locator;
  readonly chip: Locator;
  readonly chipLabel: Locator;
  readonly chipValue: Locator;
  readonly removePage: Locator;
  readonly note: Locator;
  readonly noteLabel: Locator;
  readonly noteHint: Locator;
  readonly noteError: Locator;
  readonly screenshotGroup: Locator;
  readonly addScreenshot: Locator;
  readonly screenshotInput: Locator;
  readonly screenshotName: Locator;
  readonly screenshotHint: Locator;
  readonly screenshotError: Locator;
  readonly removeScreenshot: Locator;
  readonly mayEmail: Locator;
  readonly sendButton: Locator;
  readonly aside: Locator;
  readonly said: Locator;
  readonly saidLead: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly done: Locator;
  readonly doneTitle: Locator;
  readonly doneText: Locator;
  readonly backHome: Locator;
  readonly sendMore: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.lead = this.main.locator('.form-page__lead');
    this.form = this.main.locator('form');
    this.kinds = this.form.getByRole('group', { name: 'What’s it about?' });
    this.chip = this.form.locator('.context-chip');
    this.chipLabel = this.chip.locator('.context-chip__label');
    this.chipValue = this.chip.locator('.context-chip__value');
    this.removePage = this.chip.getByRole('button', { name: 'Remove page' });
    this.note = this.form.locator('#f-text');
    this.noteLabel = this.form.locator('label[for="f-text"]');
    this.noteHint = this.form.locator('#f-text-hint');
    this.noteError = this.form.locator('#f-text-error');
    this.screenshotGroup = this.form.locator('.file-field');
    this.addScreenshot = this.form.locator('#f-screenshot');
    this.screenshotInput = this.screenshotGroup.locator('input[type=file]');
    this.screenshotName = this.screenshotGroup.locator('.file-field__name');
    this.screenshotHint = this.form.locator('#f-screenshot-hint');
    this.screenshotError = this.form.locator('#f-screenshot-error');
    this.removeScreenshot = this.screenshotGroup.getByRole('button', {
      name: 'Remove screenshot',
    });
    this.mayEmail = this.form.getByRole('checkbox');
    this.sendButton = this.form.locator('.form-page__foot button');
    this.aside = this.main.getByRole('complementary', { name: 'You said, we did' });
    this.said = this.aside.locator('.said > li');
    this.saidLead = this.aside.locator('.said__lead');
    this.alert = this.main.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.done = this.main.locator('section.done');
    this.doneTitle = this.done.locator('.done__title');
    this.doneText = this.done.locator('.done__text');
    this.backHome = this.done.getByRole('link', { name: 'Back to Home' });
    this.sendMore = this.done.getByRole('button', { name: 'Send more' });
  }

  async open(query = ''): Promise<void> {
    await this.page.goto(`/feedback${query}`);
  }

  kind(label: string): Locator {
    return this.kinds.getByRole('radio', { name: label, exact: true });
  }

  /** Chooses a kind as a member does: by its card. */
  async chooseKind(label: string): Promise<void> {
    await this.kinds.locator('label.choice-card', { hasText: label }).click();
  }

  /** The labels of the kinds, in order, and the one chosen. */
  async kindChoices(): Promise<{ labels: string[]; chosen: string }> {
    return this.kinds.evaluate((fieldset) => {
      const radios = Array.from(fieldset.querySelectorAll<HTMLInputElement>('input[type=radio]'));
      const labelOf = (radio: HTMLInputElement): string =>
        (radio.closest('label')?.querySelector('.choice__label')?.textContent ?? '').trim();
      return {
        labels: radios.map(labelOf),
        chosen: radios.filter((radio) => radio.checked).map(labelOf)[0] ?? '',
      };
    });
  }

  /** Each kind's value, in order. */
  kindValues(): Promise<string[]> {
    return this.kinds
      .locator('input[type=radio]')
      .evaluateAll((radios) => radios.map((radio) => (radio as HTMLInputElement).value));
  }

  /** The email choice's words, as one line. */
  async mayEmailText(): Promise<string> {
    const text = await this.form.locator('label:has(input[type=checkbox])').textContent();
    return (text ?? '').replace(/\s+/g, ' ').trim();
  }

  /** The "You said, we did" entries, in order. */
  async saidViews(): Promise<SaidView[]> {
    return this.said.evaluateAll((items) =>
      items.map((item) => ({
        quote: (item.querySelector('.said__quote')?.textContent ?? '').trim(),
        did: (item.querySelector('.said__did')?.textContent ?? '').trim(),
        when: (item.querySelector('.said__when')?.textContent ?? '').trim(),
      })),
    );
  }

  /** Chooses a screenshot file as a member does, through the picker the button opens. */
  async chooseScreenshot(name: string, mimeType: string, size: number): Promise<void> {
    const chooser = this.page.waitForEvent('filechooser');
    await this.addScreenshot.click();
    await (await chooser).setFiles({ name, mimeType, buffer: Buffer.alloc(size, 1) });
  }

  /** Presses Send feedback and returns the request it sent. */
  async sendAndAwaitRequest(): Promise<Request> {
    const sent = this.page.waitForRequest(
      (request) =>
        request.method() === 'POST' && new URL(request.url()).pathname === '/api/feedback',
    );
    await this.sendButton.click();
    return sent;
  }
}
