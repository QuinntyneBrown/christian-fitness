import type { Locator, Page } from '@playwright/test';

/**
 * The member app's shell around every member route (mock `app-header` in `docs/mocks/pages/home/`):
 * the header with the lockup and the Sign out button. Owns the selectors of that shell.
 */
export class WebMemberShell {
  readonly header: Locator;
  readonly lockup: Locator;
  readonly signOutButton: Locator;

  constructor(private readonly page: Page) {
    this.header = page.locator('.app-header');
    this.lockup = this.header.locator('.lockup');
    this.signOutButton = this.header.getByRole('button', { name: 'Sign out' });
  }

  async signOut(): Promise<void> {
    await this.signOutButton.click();
  }

  /** Signs out and waits until the API has answered. */
  async signOutAndAwaitAnswer(): Promise<void> {
    const answered = this.page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/session' &&
        response.request().method() === 'DELETE',
    );
    await this.signOut();
    await answered;
  }

  /** Moves focus to Sign out with Tab alone, from the top of the page, and presses Enter. */
  async signOutByKeyboard(): Promise<void> {
    for (let presses = 0; presses < 10; presses++) {
      await this.page.keyboard.press('Tab');
      if (await this.signOutButton.evaluate((button) => button === document.activeElement)) break;
    }
    await this.page.keyboard.press('Enter');
  }

  /** The Sign out button's box, in CSS pixels. */
  async signOutBox(): Promise<{ width: number; height: number }> {
    const box = await this.signOutButton.boundingBox();
    if (box === null) throw new Error('The Sign out button is not rendered.');
    return { width: box.width, height: box.height };
  }

  /** The path and query the address bar shows. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }
}
