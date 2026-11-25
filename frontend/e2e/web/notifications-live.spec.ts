import { SIGNED_IN } from '../fixtures/api-handlers';
import { FakeChatHub } from '../fixtures/chat';
import { SUNRISE_ID } from '../fixtures/conversations';
import {
  FakeNotifications,
  MOCK_NOTIFICATIONS,
  type Notification,
  unreadNotifications,
} from '../fixtures/notifications';
import { type ApiReply, expect, test } from '../fixtures/test';
import { WebMemberShell } from '../page-objects/web/member-shell.page';
import { WebNotificationsPage } from '../page-objects/web/notifications.page';

const JOINED = { code: null, title: 'Easter Sunrise 5K', memberId: SIGNED_IN.memberId };

const SIGNED_OUT: ApiReply = {
  status: 401,
  headers: { 'content-type': 'application/problem+json' },
  json: { status: 401, code: 'unauthenticated' },
};

/** A reminder the hub pushes while the member is in the app. */
function pushed(n: number): Notification {
  return {
    id: `0196a0de-0000-7000-8000-${String(900 + n).padStart(12, '0')}`,
    kind: 'event-reminder',
    title: `Starting soon: Easter Sunrise 5K (${n})`,
    text: 'Sun, Apr 20 at 6:00 AM · Marilyn Bell Park',
    href: `/events/${SUNRISE_ID}`,
    createdAt: '2026-04-24T12:44:00Z',
    read: false,
  };
}

// ADR 0083: notifications arrive over the member's one real-time connection, opened by the shell
// and shared with chat; the client keeps the latest 50, and the connection ends with the session.
test.describe('Member app, notifications in real time', () => {
  test(
    'a notification pushed on Home raises the bell at once, and one on the screen goes first',
    { tag: '@critical' },
    async ({ page, api }) => {
      const hub = await FakeChatHub.install(page, api, JOINED);
      FakeNotifications.install(api, MOCK_NOTIFICATIONS);
      const shell = new WebMemberShell(page);
      const notes = new WebNotificationsPage(page);
      await page.goto('/home');
      await expect(shell.bellCount).toHaveText('2');
      await expect.poll(() => hub.opened).toBe(1);

      hub.notify(pushed(1));

      await expect(shell.bellCount).toHaveText('3');
      await shell.openNotifications();
      await expect(notes.rows).toHaveCount(5);
      hub.notify(pushed(2));
      await expect(notes.rows).toHaveCount(6);
      await expect(notes.row(0).title).toHaveText('Starting soon: Easter Sunrise 5K (2)');
      await expect(notes.row(0).unread).toBeVisible();
      await expect(shell.bellCount).toHaveText('3');
    },
  );

  test('the chat and the bell share one connection, which stays open when the chat closes', async ({
    page,
    api,
  }) => {
    const hub = await FakeChatHub.install(page, api, JOINED);
    const shell = new WebMemberShell(page);
    const notes = new WebNotificationsPage(page);
    await page.goto(`/events/${SUNRISE_ID}/chat`);
    await expect.poll(() => hub.joined).toEqual([SUNRISE_ID]);

    await shell.openNotifications();
    // The screen's own load has answered, so it cannot replace what arrives next.
    await expect(notes.emptyHeading).toBeVisible();
    hub.notify(pushed(1));

    await expect(shell.bellCount).toHaveText('1');
    expect(hub.connections).toBe(1);
    expect(hub.closed).toBe(0);
  });

  test('the list keeps the latest 50: a pushed one goes first and the oldest leaves', async ({
    page,
    api,
  }) => {
    const hub = await FakeChatHub.install(page, api, JOINED);
    const fifty = unreadNotifications(50);
    FakeNotifications.install(api, fifty);
    const notes = new WebNotificationsPage(page);
    await notes.open();
    await expect(notes.rows).toHaveCount(50);
    await expect.poll(() => hub.opened).toBe(1);

    hub.notify(pushed(1));

    await expect(notes.row(0).title).toHaveText('Starting soon: Easter Sunrise 5K (1)');
    await expect(notes.rows).toHaveCount(50);
    await expect(notes.row(49).title).toHaveText('Reminder 49');
  });

  test('signing out closes the connection', async ({ page, api }) => {
    const hub = await FakeChatHub.install(page, api, JOINED);
    api.on('DELETE', '/api/session', () => {
      api.on('GET', '/api/session', () => SIGNED_OUT);
      return { status: 204 };
    });
    const shell = new WebMemberShell(page);
    await page.goto('/home');
    await expect.poll(() => hub.opened).toBe(1);

    await shell.signOut();

    await expect(shell.header).toHaveCount(0);
    await expect.poll(() => hub.closed).toBe(1);
  });
});
