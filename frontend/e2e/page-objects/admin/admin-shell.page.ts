import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's layout around every staff route (mock `admin` block in
 * `docs/mocks/pages/admin-dashboard/default.html`): the sidebar with the brand, the `admin-nav`
 * links and the signed-in staff member with Sign out, and the routed area in `admin__main`, which
 * until each area's slice shows only its heading. Owns the selectors of that layout.
 */
export class AdminShell {
  /** The design system's skip link, the page's first stop. */
  readonly skipLink: Locator;
  readonly main: Locator;
  readonly sidebar: Locator;
  readonly brandName: Locator;
  readonly nav: Locator;
  readonly navItems: Locator;
  /** The group headings (Publish, Gather, Community), an Admin's only (ADR 0079). */
  readonly navGroups: Locator;
  /** The link marked `aria-current="page"`. */
  readonly currentItem: Locator;
  readonly userInitials: Locator;
  readonly userName: Locator;
  readonly userRole: Locator;
  readonly signOutButton: Locator;
  /** The routed area's heading, such as "Dashboard". */
  readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.skipLink = page.getByRole('link', { name: 'Skip to content' });
    this.main = page.getByRole('main');
    this.sidebar = page.locator('.admin__sidebar');
    this.brandName = this.sidebar.locator('.admin__brand-name');
    this.nav = page.getByRole('navigation', { name: 'Admin' });
    this.navItems = this.nav.locator('.admin-nav__item');
    this.navGroups = this.nav.locator('.admin-nav__group');
    this.currentItem = this.nav.locator('.admin-nav__item[aria-current="page"]');
    this.userInitials = this.sidebar.locator('.admin__user-avatar');
    this.userName = this.sidebar.locator('.admin__user-name');
    this.userRole = this.sidebar.locator('.admin__user-role');
    this.signOutButton = this.sidebar.getByRole('button', { name: 'Sign out' });
    this.heading = this.main.getByRole('heading', { level: 1 });
  }

  /** Opens `path` of the admin app (the Dashboard by default). */
  async open(path = '/'): Promise<void> {
    await this.page.goto(path);
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The path and query the address bar shows. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }

  navItem(name: string): Locator {
    return this.nav.getByRole('link', { name });
  }

  /** The count of work waiting beside the area named `label`, absent when nothing waits. */
  navCount(label: string): Locator {
    return this.navItems.filter({ hasText: label }).locator('.admin-nav__count');
  }

  /** The links of the list a group heading names, such as "Gather". */
  navGroupLinks(group: string): Locator {
    return this.nav.getByRole('list', { name: group }).locator('.admin-nav__item');
  }

  /** Each link list's name, in order: the group heading that labels it, or null when none does. */
  async navListNames(): Promise<(string | null)[]> {
    return this.nav.locator('.admin-nav__list').evaluateAll((lists) =>
      lists.map((list) => {
        const by = list.getAttribute('aria-labelledby');
        return by === null ? null : (document.getElementById(by)?.textContent?.trim() ?? '');
      }),
    );
  }

  /** Whether the navigation's links scroll inside it: taller than its box, and scrollable. */
  async navScrollsWithin(): Promise<boolean> {
    return this.nav.evaluate((nav) => {
      const overflow = getComputedStyle(nav).overflowY;
      return nav.scrollHeight > nav.clientHeight && (overflow === 'auto' || overflow === 'scroll');
    });
  }

  /** How far the page itself has scrolled down, in CSS pixels. */
  async pageScrollY(): Promise<number> {
    return this.page.evaluate(() => window.scrollY);
  }

  /**
   * Marks the loaded document, so a spec can tell an in-app navigation (the mark stays) from a
   * whole-page load (it goes).
   */
  async markDocument(): Promise<void> {
    await this.page.evaluate(() => {
      (window as unknown as { cfMark?: boolean }).cfMark = true;
    });
  }

  async documentIsMarked(): Promise<boolean> {
    return this.page.evaluate(() => (window as unknown as { cfMark?: boolean }).cfMark === true);
  }

  async signOut(): Promise<void> {
    await this.signOutButton.click();
  }

  /** The Sign out button's box, in CSS pixels. */
  async signOutBox(): Promise<{ width: number; height: number }> {
    const box = await this.signOutButton.boundingBox();
    if (box === null) throw new Error('The Sign out button is not rendered.');
    return { width: box.width, height: box.height };
  }

  /** How far the page itself scrolls sideways, in CSS pixels: 0 when nothing overflows it. */
  async pageOverflowX(): Promise<number> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
  }

  /** Whether the navigation's links sit in one row (the band below LG) or one column. */
  async navIsOneRow(): Promise<boolean> {
    const tops = await this.navItems.evaluateAll((items) =>
      items.map((item) => Math.round(item.getBoundingClientRect().top)),
    );
    return new Set(tops).size === 1;
  }

  /** Presses one key, such as Tab or Enter, wherever focus is. */
  async press(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /** Moves focus with Tab alone, from the top of the page, to `target`, and presses Enter. */
  async tabToAndPress(target: Locator): Promise<void> {
    for (let presses = 0; presses < 12; presses++) {
      await this.page.keyboard.press('Tab');
      if (await target.evaluate((element) => element === document.activeElement)) break;
    }
    await this.page.keyboard.press('Enter');
  }
}
