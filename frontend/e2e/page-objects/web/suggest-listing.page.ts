import type { Locator, Page, Request } from '@playwright/test';

/** One step of "What happens next", as the member reads it. */
export interface StepView {
  n: string;
  title: string;
  text: string;
}

/** One field of the form as the member reads it: its label, value, hint, error and state. */
export interface SuggestFieldView {
  label: string;
  value: string;
  hint: string | null;
  error: string | null;
  invalid: boolean;
}

/**
 * The member app's Suggest a listing screen at `/directory/suggest` (mock
 * `docs/mocks/pages/suggest-listing/`): the back link, the form with its two choice groups, the
 * fields and the foot, "What happens next" beside it, the alert above the form and the `done`
 * section that replaces the form once sent. Owns the selectors of that screen.
 */
export class WebSuggestListingPage {
  readonly main: Locator;
  readonly backLink: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  readonly form: Locator;
  readonly relationLegend: Locator;
  readonly relations: Locator;
  readonly kindLegend: Locator;
  readonly kinds: Locator;
  readonly name: Locator;
  readonly where: Locator;
  readonly website: Locator;
  readonly church: Locator;
  readonly reason: Locator;
  readonly email: Locator;
  readonly tell: Locator;
  readonly sendButton: Locator;
  readonly sentAs: Locator;
  readonly aside: Locator;
  readonly asideHeading: Locator;
  readonly steps: Locator;
  readonly vettingLink: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly done: Locator;
  readonly doneTitle: Locator;
  readonly doneText: Locator;
  readonly doneName: Locator;
  readonly backToDirectory: Locator;
  readonly suggestAnother: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.backLink = this.main.locator('a.back-link');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.lead = this.main.locator('.form-page__lead');
    this.form = this.main.locator('form');
    this.relationLegend = this.form.locator('legend').nth(0);
    this.relations = this.form.getByRole('group', { name: 'Who are you suggesting?' });
    this.kindLegend = this.form.locator('legend').nth(1);
    this.kinds = this.form.getByRole('group', { name: 'What kind of listing?' });
    this.name = this.form.locator('#f-name');
    this.where = this.form.getByLabel('Where they meet or work');
    this.website = this.form.getByLabel('Website or social');
    this.church = this.form.getByLabel('Church connection');
    this.reason = this.form.locator('#f-why');
    this.email = this.form.getByLabel('Their email');
    this.tell = this.form.getByRole('checkbox', {
      name: 'It’s fine to tell them you suggested them',
    });
    this.sendButton = this.form.locator('.form-page__foot button');
    this.sentAs = this.main.locator('.form-page__as');
    this.aside = this.main.getByRole('complementary', { name: 'What happens next' });
    this.asideHeading = this.aside.getByRole('heading', { level: 2 });
    this.steps = this.aside.locator('.steps__item');
    this.vettingLink = this.main.getByRole('link', { name: 'How we vet every listing' });
    this.alert = this.main.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.done = this.main.locator('section.done');
    this.doneTitle = this.done.locator('.done__title');
    this.doneText = this.done.locator('.done__text');
    this.doneName = this.doneText.locator('strong');
    this.backToDirectory = this.done.getByRole('link', { name: 'Back to the directory' });
    this.suggestAnother = this.done.getByRole('button', { name: 'Suggest another' });
  }

  async open(): Promise<void> {
    await this.page.goto('/directory/suggest');
  }

  relation(label: string): Locator {
    return this.relations.getByRole('radio', { name: label });
  }

  kind(label: string): Locator {
    return this.kinds.getByRole('radio', { name: label, exact: true });
  }

  /** Chooses a kind as a member does: by its chip, whose radio is visually hidden. */
  async chooseKind(label: string): Promise<void> {
    await this.kinds.locator('label.chip', { hasText: new RegExp(`^${label}$`) }).click();
  }

  /** The labels of a radio group's choices, in order, and the one chosen. */
  async choices(group: 'relations' | 'kinds'): Promise<{ labels: string[]; chosen: string }> {
    return this[group].evaluate((fieldset) => {
      const radios = Array.from(fieldset.querySelectorAll<HTMLInputElement>('input[type=radio]'));
      const labelOf = (radio: HTMLInputElement): string =>
        (
          radio.closest('label')?.querySelector('.choice__label')?.textContent ??
          radio.closest('label')?.textContent ??
          ''
        ).trim();
      return {
        labels: radios.map(labelOf),
        chosen: radios.filter((radio) => radio.checked).map(labelOf)[0] ?? '',
      };
    });
  }

  /** Each card's description, in order. */
  relationDescriptions(): Promise<string[]> {
    return this.relations
      .locator('.choice__desc')
      .allTextContents()
      .then((texts) => texts.map((text) => text.trim()));
  }

  /** Reads every text field and the textarea, in the order shown. */
  async fieldViews(): Promise<SuggestFieldView[]> {
    return this.form.locator('.field').evaluateAll((fields) =>
      fields.map((field) => {
        const control = field.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          'input, textarea',
        );
        return {
          label: (field.querySelector('.field__label')?.textContent ?? '')
            .replace(/\s+/g, ' ')
            .trim(),
          value: control?.value ?? '',
          hint: field.querySelector('.field__hint')?.textContent?.trim() ?? null,
          error: field.querySelector('.field__error')?.textContent?.trim() ?? null,
          invalid: control?.getAttribute('aria-invalid') === 'true',
        };
      }),
    );
  }

  /** The steps of "What happens next", in order. */
  async stepViews(): Promise<StepView[]> {
    return this.steps.evaluateAll((items) =>
      items.map((item) => ({
        n: (item.querySelector('.steps__n')?.textContent ?? '').trim(),
        title: (item.querySelector('.steps__title')?.textContent ?? '').trim(),
        text: (item.querySelector('.steps__text')?.textContent ?? '').trim(),
      })),
    );
  }

  /** Fills the mock's suggestion: Eastside Ladies Who Lift. */
  async fillMockSuggestion(): Promise<void> {
    await this.name.fill('Eastside Ladies Who Lift');
    await this.where.fill('Danforth & Pape, Toronto');
    await this.website.fill('instagram.com/eastsideladieslift');
    await this.reason.fill(
      'Saturday morning strength group out of Danforth Baptist. About 25 women, coached by a CSEP trainer.',
    );
  }

  /** Presses Send suggestion and answers the request it sent. */
  async sendAndAwaitRequest(): Promise<Request> {
    const sent = this.page.waitForRequest(
      (request) =>
        request.method() === 'POST' &&
        new URL(request.url()).pathname === '/api/directory/suggestions',
    );
    await this.sendButton.click();
    return sent;
  }

  /** Whether the page scrolls sideways; the header fits a small phone (ADR 0084), so all of it. */
  async sidewaysScroll(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }
}
