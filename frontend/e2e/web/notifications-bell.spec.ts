import { answerHome } from '../fixtures/events';
import {
  FakeNotifications,
  MOCK_NOTIFICATIONS,
  NOTIFICATIONS_NOW,
  unreadNotifications,
} from '../fixtures/notifications';
import { expect, test } from '../fixtures/test';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebMemberShell } from '../page-objects/web/member-shell.page';

// ADR 0068 and ADR 0083: the member top bar's bell shows no badge with nothing unread, the count to
// nine and 9+ above, says the number in its accessible name, keeps the pill out of it, and is a
// 44 × 44 px target.
test.describe('Member app, notifications bell', () => {
  test.beforeEach(async ({ page, api }) => {
    await page.clock.setFixedTime(NOTIFICATIONS_NOW);
    answerHome(api, { nextEvent: null, suggested: [] });
  });

  test('With nothing unread the bell has no badge and is named Notifications', async ({ page }) => {
    const shell = new WebMemberShell(page);

    await new WebHomePage(page).open();

    await expect(shell.bell).toHaveAccessibleName('Notifications');
    await expect(shell.bellCount).toHaveCount(0);
    await expect(shell.bell).toHaveAttribute('href', '/notifications');
    expect(await shell.bellBox()).toEqual({ width: 44, height: 44 });
  });

  test('With two unread the bell shows 2 and says so', async ({ page, api }) => {
    FakeNotifications.install(api, MOCK_NOTIFICATIONS);
    const shell = new WebMemberShell(page);

    await new WebHomePage(page).open();

    await expect(shell.bell).toHaveAccessibleName('Notifications, 2 unread');
    await expect(shell.bellCount).toHaveText('2');
    await expect(shell.bellCount).toHaveAttribute('aria-hidden', 'true');
  });

  test('With twelve unread the bell shows 9+ and its name still says 12', async ({ page, api }) => {
    FakeNotifications.install(api, unreadNotifications(12));
    const shell = new WebMemberShell(page);

    await new WebHomePage(page).open();

    await expect(shell.bell).toHaveAccessibleName('Notifications, 12 unread');
    await expect(shell.bellCount).toHaveText('9+');
  });
});
