import { answerEvents, answerHome } from '../fixtures/events';
import {
  FakeNotifications,
  MOCK_NOTIFICATIONS,
  NOTIFICATIONS_NOW,
  unreadNotifications,
} from '../fixtures/notifications';
import { expect, test } from '../fixtures/test';
import { WebMemberShell } from '../page-objects/web/member-shell.page';
import { WebNotificationsPage } from '../page-objects/web/notifications.page';

// ADR 0068 and ADR 0083 (mocks `pages/notifications/*`): the Notifications screen lists the
// member's notifications newest first, unread ones with a dot, a bold title and "Unread" for
// assistive technology; Mark all as read empties the bell; it loads, is empty or fails as drawn.
test.describe('Member app, Notifications screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOTIFICATIONS_NOW);
  });

  test('lists the notifications newest first, unread ones marked, with the settings link', async ({
    page,
    api,
  }) => {
    FakeNotifications.install(api, MOCK_NOTIFICATIONS);
    const notes = new WebNotificationsPage(page);
    const shell = new WebMemberShell(page);

    await notes.open();

    await expect(notes.heading).toBeVisible();
    await expect(notes.rows).toHaveCount(5);
    await expect(notes.row(0).title).toHaveText('Tomorrow: Saturday Park Bootcamp');
    await expect(notes.row(0).text).toHaveText(
      'Sat, Apr 25 at 6:30 AM · Centennial Park, Etobicoke',
    );
    await expect(notes.row(0).time).toHaveText('2 hours ago');
    await expect(notes.row(0).link).toHaveAttribute(
      'href',
      '/events/0196a0de-0000-7000-8000-0000000000e1',
    );
    await expect(notes.row(0).unread).toBeVisible();
    await expect(notes.row(1).title).toHaveText('Cancelled: Stretch & Pray: Mobility Morning');
    await expect(notes.row(1).time).toHaveText('Yesterday');
    await expect(notes.row(1).unread).toBeVisible();
    await expect(notes.row(2).unread).toHaveCount(0);
    await expect(notes.row(3).time).toHaveText('Apr 12');
    await expect(notes.row(4).time).toHaveText('Apr 17');
    await expect(notes.unreadRows).toHaveCount(2);
    await expect(notes.row(0).title).toHaveCSS('font-weight', '700');
    await expect(notes.row(2).title).not.toHaveCSS('font-weight', '700');
    await expect(notes.markAllButton).toBeVisible();
    await expect(notes.settingsLink).toHaveAttribute('href', '/preferences#notifications');
    await expect(notes.foot).toHaveText('That’s everything from the last 30 days.');
    await expect(shell.bell).toHaveAttribute('aria-current', 'page');
    await expect(page).toHaveTitle('Notifications · Christian Fitness');
  });

  test('Mark all as read marks every row read and empties the bell', async ({ page, api }) => {
    const fake = FakeNotifications.install(api, unreadNotifications(12));
    const notes = new WebNotificationsPage(page);
    const shell = new WebMemberShell(page);
    await notes.open();
    await expect(shell.bellCount).toHaveText('9+');

    await notes.markAllRead();

    await expect(notes.unreadRows).toHaveCount(0);
    await expect(shell.bellCount).toHaveCount(0);
    await expect(shell.bell).toHaveAccessibleName('Notifications');
    expect(fake.markedRead).toBe(1);
  });

  test('a failed Mark all as read says so and leaves every row as it was', async ({
    page,
    api,
  }) => {
    FakeNotifications.install(api, MOCK_NOTIFICATIONS, { markStatus: 500 });
    const notes = new WebNotificationsPage(page);
    const shell = new WebMemberShell(page);
    await notes.open();
    await expect(notes.rows).toHaveCount(5);

    await notes.markAllRead();

    await expect(notes.failureToast).toBeVisible();
    await expect(notes.unreadRows).toHaveCount(2);
    await expect(shell.bellCount).toHaveText('2');
    await expect(notes.markAllButton).toBeEnabled();
  });

  test('a row opens what it is about inside the app', async ({ page, api }) => {
    FakeNotifications.install(api, MOCK_NOTIFICATIONS);
    answerEvents(api, []);
    const notes = new WebNotificationsPage(page);
    const shell = new WebMemberShell(page);
    await notes.open();
    await shell.markDocument();

    await notes.row(1).link.click();

    await expect.poll(() => notes.path()).toBe('/events');
    expect(await shell.isSameDocument()).toBe(true);
  });

  test('the bell opens the screen', async ({ page, api }) => {
    FakeNotifications.install(api, MOCK_NOTIFICATIONS);
    answerHome(api, { nextEvent: null, suggested: [] });
    const notes = new WebNotificationsPage(page);
    const shell = new WebMemberShell(page);
    await page.goto('/home');

    await shell.openNotifications();

    await expect(notes.heading).toBeVisible();
    expect(notes.path()).toBe('/notifications');
  });

  test('while loading it shows skeleton rows and no Mark all as read', async ({ page, api }) => {
    let release: () => void = () => undefined;
    const answered = new Promise<void>((resolve) => (release = resolve));
    let asked = 0;
    api.on('GET', '/api/notifications', async () => {
      asked += 1;
      // The shell's first load answers at once; the screen's own load waits.
      if (asked > 1) await answered;
      return { json: { notifications: MOCK_NOTIFICATIONS, unread: 2 } };
    });
    const notes = new WebNotificationsPage(page);

    await notes.open();

    await expect(notes.loading).toBeVisible();
    await expect(notes.markAllButton).toHaveCount(0);
    await expect(notes.settingsLink).toBeVisible();
    release();
    await expect(notes.rows).toHaveCount(5);
    await expect(notes.loading).toHaveCount(0);
  });

  test('with nothing yet it says what will appear and links to events', async ({ page }) => {
    const notes = new WebNotificationsPage(page);

    await notes.open();

    await expect(notes.emptyHeading).toBeVisible();
    await expect(notes.browseEventsLink).toHaveAttribute('href', '/events');
    await expect(notes.markAllButton).toHaveCount(0);
    await expect(notes.rows).toHaveCount(0);
  });

  test('a failed load says so, the bell has no badge, and Try again loads it', async ({
    page,
    api,
  }) => {
    let fail = true;
    api.on('GET', '/api/notifications', () =>
      fail ? { abort: true } : { json: { notifications: MOCK_NOTIFICATIONS, unread: 2 } },
    );
    const notes = new WebNotificationsPage(page);
    const shell = new WebMemberShell(page);
    await notes.open();
    await expect(notes.failedHeading).toBeVisible();
    await expect(shell.bellCount).toHaveCount(0);
    await expect(notes.markAllButton).toHaveCount(0);

    fail = false;
    await notes.tryAgainButton.click();

    await expect(notes.rows).toHaveCount(5);
    await expect(shell.bellCount).toHaveText('2');
  });
});
