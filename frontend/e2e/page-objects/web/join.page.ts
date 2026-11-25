import type { Locator, Page } from '@playwright/test';

/** What a visitor types into the Join form. */
export interface JoinDetails {
  fullName: string;
  email: string;
  password: string;
  homeChurch?: string;
}

/**
 * The member app's Join screen (mock `docs/mocks/pages/join/`): the `auth` block with its form.
 * Owns the selectors of that screen.
 */
export class WebJoinPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly form: Locator;
  readonly fullName: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly homeChurch: Locator;
  /** The text inputs, in the order the form shows them. */
  readonly inputs: Locator;
  readonly interestLegend: Locator;
  /** The interests' fieldset: the legend and every toggle. */
  readonly interestPicker: Locator;
  readonly interests: Locator;
  readonly submitButton: Locator;
  readonly signInLink: Locator;
  /** The `form-alert` above the fields: the error summary, the refusal or the failure. */
  readonly alert: Locator;
  readonly alertTitle: Locator;
  /** The error summary's links, one per invalid field. */
  readonly alertLinks: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.form = this.main.locator('.auth__form');
    this.heading = this.form.getByRole('heading', { level: 1 });
    this.fullName = this.form.getByLabel('Full name');
    this.email = this.form.getByLabel('Email', { exact: true });
    this.password = this.form.getByLabel('Password');
    this.homeChurch = this.form.getByLabel('Home church');
    this.inputs = this.form.locator('.field .input');
    this.interestLegend = this.form.locator('.field__legend');
    this.interests = this.form.locator('.interest-list .interest');
    this.interestPicker = this.form
      .locator('fieldset')
      .filter({ has: page.locator('.field__legend') });
    this.submitButton = this.form.locator('.auth__submit .btn');
    this.signInLink = this.form.locator('.auth__alt').getByRole('link', { name: 'Sign in' });
    this.alert = this.form.locator('.auth__alert .form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertLinks = this.alert.locator('.form-alert__list a');
  }

  async open(): Promise<void> {
    await this.page.goto('/join');
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The `field` block labelled `label`: the label, its input and its hint. */
  field(label: string): Locator {
    return this.form
      .locator('.field')
      .filter({ has: this.page.getByLabel(label, { exact: true }) });
  }

  /** The `field__error` of the field labelled `label`. */
  fieldError(label: string): Locator {
    return this.field(label).locator('.field__error');
  }

  /** The link inside a field's error, such as "Sign in instead?". */
  fieldErrorLink(label: string): Locator {
    return this.fieldError(label).locator('.inline-link');
  }

  /** The error summary's link that names this message. */
  alertLink(message: string): Locator {
    return this.alertLinks.filter({ hasText: message });
  }

  /** The interest toggle with this label. */
  interest(label: string): Locator {
    return this.interests.filter({ hasText: label });
  }

  /** Types the details into the form; a missing home church is left blank. */
  get age() {
    return this.form.getByRole('checkbox', { name: "I'm 16 or older" });
  }
  agreementLink(name: string) {
    return this.termsSentence.getByRole('link', { name });
  }
  get termsSentence() {
    return this.form.locator('.auth__terms');
  }

  async fill(details: JoinDetails): Promise<void> {
    await this.age.check();
    await this.fullName.fill(details.fullName);
    await this.email.fill(details.email);
    await this.password.fill(details.password);
    if (details.homeChurch !== undefined) await this.homeChurch.fill(details.homeChurch);
  }

  /** Presses each interest toggle once. */
  async choose(...labels: string[]): Promise<void> {
    for (const label of labels) await this.interest(label).click();
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Submits and waits until the API has answered the join request. */
  async submitAndAwaitAnswer(): Promise<void> {
    const answered = this.page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/account/join',
    );
    await this.submit();
    await answered;
  }

  /** Fills the form and chooses interests with the keyboard alone, then submits with Enter. */
  async joinByKeyboard(details: JoinDetails, interests: string[]): Promise<void> {
    await this.fullName.focus();
    await this.page.keyboard.type(details.fullName);
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.type(details.email);
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.type(details.password);
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.type(details.homeChurch ?? '');
    const labels = await this.interests.allTextContents();
    for (const label of labels) {
      await this.page.keyboard.press('Tab');
      if (interests.includes(label.trim())) await this.page.keyboard.press('Space');
    }
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Space');
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Enter');
  }
}
