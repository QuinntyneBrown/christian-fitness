import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's "Staff only" screen (mock `docs/mocks/pages/admin-forbidden/`): the `staff`
 * card with its heading, lead, Sign out button and note, shown in place of a screen whose read
 * the API refused with 403; and its "Admins only" state for a Moderator (mock state `role`), whose
 * action is the "Go to dashboard" link. Owns the selectors of that screen.
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
  /** The "Admins only" state's link back to the Dashboard. */
  readonly dashboardLink: Locator;
  /** Every link in the card. */
  readonly links: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.card = this.main.locator('.staff__card');
    this.heading = this.card.getByRole('heading', { level: 1 });
    this.lead = this.card.locator('.staff__lead');
    this.signOutButton = this.card.locator('.auth__submit .btn');
    this.note = this.card.locator('.staff__note');
    this.buttons = this.card.getByRole('button');
    this.dashboardLink = this.card.locator('.auth__submit a.btn');
    this.links = this.card.getByRole('link');
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

  /** Follows the "Go to dashboard" link with the keyboard alone: Tab from the focused heading, then Enter. */
  async goToDashboardByKeyboard(): Promise<void> {
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Enter');
  }

  /** The "Go to dashboard" link's box, in CSS pixels. */
  async dashboardLinkBox(): Promise<{ width: number; height: number }> {
    const box = await this.dashboardLink.boundingBox();
    if (box === null) throw new Error('The Go to dashboard link is not rendered.');
    return { width: box.width, height: box.height };
  }

  /** The Sign out button's box, in CSS pixels. */
  async signOutBox(): Promise<{ width: number; height: number }> {
    const box = await this.signOutButton.boundingBox();
    if (box === null) throw new Error('The Sign out button is not rendered.');
    return { width: box.width, height: box.height };
  }
}
