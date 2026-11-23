import type { Locator, Page } from '@playwright/test';

/**
 * The member app's shell around every member route (mock `app-header` in `docs/mocks/pages/home/`):
 * the header with the lockup, the profile avatar and the Sign out button. Owns the selectors of that
 * shell.
 */
export class WebMemberShell {
  readonly header: Locator;
  readonly lockup: Locator;
  /** The `profile-button`: the member's initials, a link to Profile. */
  readonly profileButton: Locator;
  readonly signOutButton: Locator;

  constructor(private readonly page: Page) {
    this.header = page.locator('.app-header');
    this.lockup = this.header.locator('.lockup');
    this.profileButton = this.header.getByRole('link', { name: 'Your profile' });
    this.signOutButton = this.header.getByRole('button', { name: 'Sign out' });
  }

  async openProfile(): Promise<void> {
    await this.profileButton.click();
  }

  /** Moves focus to the profile avatar and presses Enter, as a keyboard user would. */
  async openProfileByKeyboard(): Promise<void> {
    await this.profileButton.focus();
    await this.page.keyboard.press('Enter');
  }

  /** Marks the document, so a later check can tell whether a click reloaded it. */
  async markDocument(): Promise<void> {
    await this.page.evaluate(() => document.documentElement.setAttribute('data-e2e-mark', '1'));
  }

  /** Whether the document marked by `markDocument` is still the one showing (no reload). */
  isSameDocument(): Promise<boolean> {
    return this.page.evaluate(() => document.documentElement.getAttribute('data-e2e-mark') === '1');
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
