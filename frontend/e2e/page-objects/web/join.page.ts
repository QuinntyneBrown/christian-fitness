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
  readonly interests: Locator;
  readonly submitButton: Locator;
  readonly signInLink: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.form = this.main.locator('.auth__form');
    this.heading = this.form.getByRole('heading', { level: 1 });
    this.fullName = this.form.getByLabel('Full name');
    this.email = this.form.getByLabel('Email');
    this.password = this.form.getByLabel('Password');
    this.homeChurch = this.form.getByLabel('Home church');
    this.inputs = this.form.locator('.field .input');
    this.interestLegend = this.form.locator('.field__legend');
    this.interests = this.form.locator('.interest-list .interest');
    this.submitButton = this.form.locator('.auth__submit .btn');
    this.signInLink = this.form.locator('.auth__alt').getByRole('link', { name: 'Sign in' });
  }

  async open(): Promise<void> {
    await this.page.goto('/join');
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The interest toggle with this label. */
  interest(label: string): Locator {
    return this.interests.filter({ hasText: label });
  }

  /** Types the details into the form; a missing home church is left blank. */
  async fill(details: JoinDetails): Promise<void> {
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
    await this.page.keyboard.press('Enter');
  }
}
