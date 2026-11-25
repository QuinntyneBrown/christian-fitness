import type { Locator, Page } from '@playwright/test';

/**
 * The member app's Notifications screen at `/notifications` (mocks `docs/mocks/pages/notifications/`:
 * `default`, `many`, `mark-failed`, `loading`, `empty` and `error`; ADR 0068, ADR 0083): the rows,
 * newest first, Mark all as read, the link to the notification settings, the empty and error states
 * and the toast when marking fails. Owns the selectors of that screen.
 */
export class WebNotificationsPage {
  readonly heading: Locator;
  readonly rows: Locator;
  readonly unreadRows: Locator;
  readonly loading: Locator;
  readonly markAllButton: Locator;
  readonly settingsLink: Locator;
  readonly foot: Locator;
  readonly emptyHeading: Locator;
  readonly browseEventsLink: Locator;
  readonly failedHeading: Locator;
  readonly tryAgainButton: Locator;
  readonly failureToast: Locator;

  constructor(private readonly page: Page) {
    const main = page.locator('main');
    this.heading = page.getByRole('heading', { level: 1, name: 'Notifications', exact: true });
    this.rows = main.locator('.note');
    this.unreadRows = main.locator('.note--unread');
    this.loading = main.locator('[aria-busy="true"]');
    this.markAllButton = main.getByRole('button', { name: 'Mark all as read' });
    this.settingsLink = main.getByRole('link', { name: 'Notification settings' });
    this.foot = main.locator('.notes-foot');
    this.emptyHeading = main.getByRole('heading', { name: 'No notifications yet' });
    this.browseEventsLink = main.getByRole('link', { name: 'Browse events' });
    this.failedHeading = main.getByRole('heading', { name: "Notifications didn't load" });
    this.tryAgainButton = main.getByRole('button', { name: 'Try again' });
    this.failureToast = page
      .getByRole('alert')
      .filter({ hasText: "We couldn't mark them as read" });
  }

  async open(): Promise<void> {
    await this.page.goto('/notifications');
  }

  /** One row's parts. */
  row(index: number): {
    link: Locator;
    title: Locator;
    text: Locator;
    time: Locator;
    unread: Locator;
  } {
    const row = this.rows.nth(index);
    return {
      link: row.locator('.note__link'),
      title: row.locator('.note__title'),
      text: row.locator('.note__text'),
      time: row.locator('.note__time'),
      unread: row.getByRole('img', { name: 'Unread' }),
    };
  }

  async markAllRead(): Promise<void> {
    await this.markAllButton.click();
  }

  /** The path the address bar shows. */
  path(): string {
    return new URL(this.page.url()).pathname;
  }
}
