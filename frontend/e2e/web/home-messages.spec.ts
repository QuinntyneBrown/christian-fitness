import {
  answerConversations,
  type ConversationRow,
  HOOPS_ID,
  MESSAGES_NOW,
  QUIET_ID,
  SUNRISE_ID,
} from '../fixtures/conversations';
import { answerHome, BOOTCAMP, SUNRISE_5K } from '../fixtures/events';
import { expect, test } from '../fixtures/test';
import { WebHomePage } from '../page-objects/web/home.page';

const DANIELLE_ID = '0190c0de-0000-7000-8000-0000000000d1';

const FOUR_CONVERSATIONS: ConversationRow[] = [
  {
    kind: 'group',
    id: SUNRISE_ID,
    name: 'Sunrise 5K Crew',
    memberCount: 18,
    lastMessage: {
      author: 'Michael',
      text: 'Parking at <b>Marilyn Bell</b> fills up by 6:30',
      sentAt: '2026-04-18T12:42:00Z',
    },
    unreadCount: 3,
    activityAt: '2026-04-18T12:42:00Z',
  },
  {
    kind: 'direct',
    id: DANIELLE_ID,
    name: 'Danielle Okafor',
    memberCount: null,
    lastMessage: {
      author: 'Danielle Okafor',
      text: 'See you Thursday at 6!',
      sentAt: '2026-04-17T16:00:00Z',
    },
    unreadCount: 0,
    activityAt: '2026-04-17T16:00:00Z',
  },
  {
    kind: 'group',
    id: HOOPS_ID,
    name: "Women's Hoops",
    memberCount: 12,
    lastMessage: {
      author: 'Priya',
      text: 'Who has the pinnies?',
      sentAt: '2026-04-13T16:00:00Z',
    },
    unreadCount: 1,
    activityAt: '2026-04-13T16:00:00Z',
  },
  {
    kind: 'group',
    id: QUIET_ID,
    name: 'Fourth Older Group',
    memberCount: 5,
    lastMessage: null,
    unreadCount: 2,
    activityAt: '2026-04-09T16:00:00Z',
  },
];

// L2-007 AC1, AC4, AC5 and L2-008 AC1–AC3 (ADR 0045): unread messages on Home and in navigation.
test.describe('Member app, unread messages on Home', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(MESSAGES_NOW);
  });

  test('Home shows the three newest conversations with unread labels and puts the total unread count in navigation', async ({
    page,
    api,
  }) => {
    answerHome(api, { nextEvent: SUNRISE_5K, suggested: [BOOTCAMP], unreadCount: 6 });
    const asked = answerConversations(api, FOUR_CONVERSATIONS);
    const home = new WebHomePage(page);

    await home.open();

    await expect(home.messagesHeading).toBeVisible();
    await expect(home.openMessagesLink).toHaveAttribute('href', '/messages');
    await expect(home.messageRows).toHaveCount(3);
    expect(await home.messageItems()).toEqual([
      {
        href: `/events/${SUNRISE_ID}/chat`,
        name: 'Sunrise 5K Crew',
        time: '8:42 AM',
        text: 'Michael: Parking at <b>Marilyn Bell</b> fills up by 6:30',
        unread: '3 unread',
      },
      {
        href: `/messages/${DANIELLE_ID}`,
        name: 'Danielle Okafor',
        time: 'Yesterday',
        text: 'Danielle Okafor: See you Thursday at 6!',
        unread: null,
      },
      {
        href: `/events/${HOOPS_ID}/chat`,
        name: "Women's Hoops",
        time: 'Mon',
        text: 'Priya: Who has the pinnies?',
        unread: '1 unread',
      },
    ]);
    await expect(home.headerUnreadBadge).toHaveText('6');
    await expect(home.headerUnreadBadge).toHaveAttribute('aria-label', '6 unread');
    expect(asked.asked).toBe(1);
  });

  test('With no conversations Home invites the member to register for an event and shows no unread badge', async ({
    page,
    api,
  }) => {
    answerHome(api, { nextEvent: null, suggested: [BOOTCAMP], unreadCount: 0 });
    answerConversations(api, []);
    const home = new WebHomePage(page);

    await home.open();

    await expect(home.messagesEmpty).toHaveText(
      "No messages yet. Register for an event and you'll join its group chat.",
    );
    await expect(home.messageRows).toHaveCount(0);
    await expect(home.headerUnreadBadge).toHaveCount(0);
  });

  test('When conversations fail while Home loaded, events stay visible and Try again reloads messages in place', async ({
    page,
    api,
  }) => {
    answerHome(api, { nextEvent: SUNRISE_5K, suggested: [BOOTCAMP], unreadCount: 0 });
    const asked = answerConversations(api, FOUR_CONVERSATIONS, (n) =>
      n === 0 ? { abort: true } : null,
    );
    const home = new WebHomePage(page);

    await home.open();

    await expect(home.nextTitle).toHaveText('Easter Sunrise 5K');
    await expect(home.messagesErrorHeading).toHaveText("Messages didn't load.");
    await expect(home.messagesErrorText).toHaveText('Your events are up to date.');
    await expect(home.messageRows).toHaveCount(0);

    await home.messagesRetryButton.click();

    await expect(home.messageRows).toHaveCount(3);
    await expect(home.messagesErrorHeading).toHaveCount(0);
    await expect(home.headerUnreadBadge).toHaveText('6');
    expect(asked.asked).toBe(2);
  });

  test('Below MD the bottom bar shows Home, Events, Messages and Profile with unread text and 44 px targets', async ({
    page,
    api,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    answerHome(api, { nextEvent: null, suggested: [], unreadCount: 4 });
    answerConversations(api, FOUR_CONVERSATIONS.slice(0, 3));
    const home = new WebHomePage(page);

    await home.open();

    await expect(home.mobileNav).toBeVisible();
    await expect(home.mobileItems).toHaveCount(4);
    await expect(home.mobileCurrentItem).toHaveText('Home');
    await expect(home.mobileMessagesLink).toHaveAccessibleName('Messages, 4 unread');
    const boxes = await home.mobileItems.evaluateAll((links) =>
      links.map((link) => {
        const rect = link.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    );
    for (const box of boxes) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});
