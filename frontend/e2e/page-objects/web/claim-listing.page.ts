import type { Locator, Page } from '@playwright/test';

/** One key fact of the preview as the member reads it: its label and value. */
export interface ClaimFactView {
  label: string;
  value: string;
}

/**
 * The member app's Claim a listing screen at `/claim/{token}` (mock
 * `docs/mocks/pages/claim-listing/`), in both its routes (ADR 0092): signed out, the auth layout's
 * card that names the listing with Sign in and Join; signed in, the form page with the listing as
 * it will appear, its two answers, the alert above it, the `done` outcome that replaces it, and
 * the app's 404 for an unknown link. Owns the selectors of that screen.
 */
export class WebClaimListingPage {
  readonly main: Locator;
  /** The signed-out card (`auth__form`). */
  readonly card: Locator;
  readonly cardHeading: Locator;
  readonly cardLead: Locator;
  readonly cardNote: Locator;
  readonly signInLink: Locator;
  readonly joinLink: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  readonly skeleton: Locator;
  readonly preview: Locator;
  readonly kind: Locator;
  readonly name: Locator;
  readonly tagline: Locator;
  readonly about: Locator;
  readonly tags: Locator;
  readonly facts: Locator;
  readonly hint: Locator;
  readonly publishButton: Locator;
  readonly notMeButton: Locator;
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly done: Locator;
  readonly doneTitle: Locator;
  readonly doneText: Locator;
  readonly doneActions: Locator;
  readonly notFound: Locator;
  readonly notFoundHeading: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.card = this.main.locator('.auth__form');
    this.cardHeading = this.card.getByRole('heading', { level: 1 });
    this.cardLead = this.card.locator('.auth__lead');
    this.cardNote = this.card.locator('.auth__alt');
    this.signInLink = this.card.getByRole('link', { name: 'Sign in' });
    this.joinLink = this.card.getByRole('link', { name: 'Join Christian Fitness' });
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.lead = this.main.locator('.form-page__lead');
    this.skeleton = this.main.locator('[aria-busy="true"]');
    this.preview = this.main.getByRole('region', { name: 'Your listing as members will see it' });
    this.kind = this.preview.locator('.listing-head__kind');
    this.name = this.preview.locator('.listing-head__name');
    this.tagline = this.preview.locator('.listing-head .subtitle');
    this.about = this.preview.locator('.prose');
    this.tags = this.preview.locator('.tag');
    this.facts = this.preview.locator('.spec-list > div');
    this.hint = this.main.locator('.claim-listing-page__hint');
    this.publishButton = this.main.locator('.form-page__foot button').first();
    this.notMeButton = this.main.getByRole('button', { name: 'This isn’t me' });
    this.alert = this.main.locator('.form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.done = this.main.locator('.done');
    this.doneTitle = this.done.getByRole('heading', { level: 1 });
    this.doneText = this.done.locator('.done__text');
    this.doneActions = this.done.locator('.done__actions a');
    this.notFound = this.main.locator('.empty-state--system');
    this.notFoundHeading = this.notFound.getByRole('heading', { level: 1 });
  }

  async open(token: string): Promise<void> {
    await this.page.goto(`/claim/${token}`);
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The path and query the address bar shows. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }

  /** The preview's key facts, in order. */
  async factViews(): Promise<ClaimFactView[]> {
    const rows = await this.facts.all();
    return Promise.all(
      rows.map(async (row) => ({
        label: (await row.locator('dt').innerText()).trim(),
        value: (await row.locator('dd').innerText()).trim(),
      })),
    );
  }

  /** The outcome's ways on, as their names and addresses. */
  async doneLinks(): Promise<{ name: string; href: string | null }[]> {
    const links = await this.doneActions.all();
    return Promise.all(
      links.map(async (link) => ({
        name: (await link.innerText()).trim(),
        href: await link.getAttribute('href'),
      })),
    );
  }

  async publish(): Promise<void> {
    await this.publishButton.click();
  }

  async notMe(): Promise<void> {
    await this.notMeButton.click();
  }
}
