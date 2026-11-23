import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's "Staff only" screen (mock `docs/mocks/pages/admin-forbidden/`): the `staff`
 * card with its heading, lead, Sign out button and note, shown in place of a screen whose read
 * the API refused with 403. Owns the selectors of that screen.
 */
export class AdminForbiddenPage {
  readonly main: Locator;
  readonly card: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  readonly signOutButton: Locator;
  readonly note: Locator;
  /** Every button in the card. */
  readonly buttons: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.card = this.main.locator('.staff__card');
    this.heading = this.card.getByRole('heading', { level: 1 });
    this.lead = this.card.locator('.staff__lead');
    this.signOutButton = this.card.locator('.auth__submit .btn');
    this.note = this.card.locator('.staff__note');
    this.buttons = this.card.getByRole('button');
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The path and query the address bar shows. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }

  async signOut(): Promise<void> {
    await this.signOutButton.click();
  }

  /** Signs out with the keyboard alone: Tab from the focused heading to the button, then Enter. */
  async signOutByKeyboard(): Promise<void> {
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Enter');
  }

  /** The Sign out button's box, in CSS pixels. */
  async signOutBox(): Promise<{ width: number; height: number }> {
    const box = await this.signOutButton.boundingBox();
    if (box === null) throw new Error('The Sign out button is not rendered.');
    return { width: box.width, height: box.height };
  }
}
