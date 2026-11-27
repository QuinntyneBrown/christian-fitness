import type { Locator, Page } from '@playwright/test';

/**
 * The member app's Download your data screen at `/preferences/download/{id}` (mock
 * `docs/mocks/pages/download/`): the way back to Preferences, skeletons while the link is checked,
 * the `done` block once the download starts (with Download again) or once the link has expired,
 * and the error state when the check got no answer. Owns the selectors of that screen.
 */
export class DownloadPage {
  readonly main: Locator;
  readonly backLink: Locator;
  readonly heading: Locator;
  readonly loading: Locator;
  readonly done: Locator;
  readonly doneText: Locator;
  readonly downloadAgain: Locator;
  readonly backToPreferences: Locator;
  readonly requestNew: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.backLink = this.main.getByRole('link', { name: 'Preferences', exact: true });
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.loading = this.main.locator('[aria-busy="true"]');
    this.done = this.main.locator('.done');
    this.doneText = this.done.locator('.done__text');
    this.downloadAgain = this.done.getByRole('button', { name: 'Download again' });
    this.backToPreferences = this.main.getByRole('link', { name: 'Back to preferences' });
    this.requestNew = this.done.getByRole('link', { name: 'Request a new download' });
    this.error = this.main.locator('.error-state');
    this.tryAgain = this.error.getByRole('button', { name: 'Try again' });
  }

  async open(id: string): Promise<void> {
    await this.page.goto(`/preferences/download/${id}`);
  }
}
