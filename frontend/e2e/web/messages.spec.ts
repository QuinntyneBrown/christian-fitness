import { SIGNED_IN } from '../fixtures/api-handlers';
import { FakeChatHub } from '../fixtures/chat';
import {
  answerConversations,
  MESSAGES_NOW,
  SUNRISE_ID,
  THREE_CONVERSATIONS,
} from '../fixtures/conversations';
import { expect, test } from '../fixtures/test';
import { WebEventChatPage } from '../page-objects/web/event-chat.page';
import { WebMessagesPage } from '../page-objects/web/messages.page';

// L2-015 (slice 15.1; ADR 0042): members see their conversations, newest first, with unread counts.
test.describe('Member app, Messages list', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(MESSAGES_NOW);
  });

  test('lists the conversations as given, with name, member count, last message, time and unread count', async ({
    page,
    api,
  }) => {
    answerConversations(api, THREE_CONVERSATIONS);
    const messages = new WebMessagesPage(page);

    await messages.open();

    await expect(messages.heading).toBeVisible();
    await expect(messages.rows).toHaveCount(3);
    await expect(messages.row(0).name).toHaveText('Easter Sunrise 5K');
    await expect(messages.row(0).meta).toHaveText('18 members');
    await expect(messages.row(0).text).toHaveText(
      'Michael Chen: Parking at <b>Marilyn Bell</b> fills up by 6:30',
    );
    await expect(messages.row(0).time).toHaveText('8:42 AM');
    await expect(messages.row(0).unread).toHaveAccessibleName('3 unread');
    await expect(messages.row(1).name).toHaveText("Women's Hoops");
    await expect(messages.row(1).time).toHaveText('Mon');
    await expect(messages.row(1).unread).toHaveCount(0);
    // A chat nobody has spoken in is listed, with no last line, and says one member as "1 member".
    await expect(messages.row(2).name).toHaveText('Mobility Monday');
    await expect(messages.row(2).meta).toHaveText('1 member');
    await expect(messages.row(2).text).toHaveCount(0);
    await expect(messages.row(2).time).toHaveText('Apr 9');
  });

  test("a row opens that event's chat, which tells the server it was read", async ({
    page,
    api,
  }) => {
    answerConversations(api, THREE_CONVERSATIONS);
    const hub = await FakeChatHub.install(page, api, {
      code: null,
      title: 'Easter Sunrise 5K',
      memberId: SIGNED_IN.memberId,
    });
    const messages = new WebMessagesPage(page);
    const chat = new WebEventChatPage(page);

    await messages.open();
    await expect(messages.row(0).link).toHaveAttribute('href', `/events/${SUNRISE_ID}/chat`);
    await messages.row(0).link.click();

    await expect(chat.chatTitle).toHaveText('Easter Sunrise 5K');
    await expect.poll(() => hub.read).toEqual([SUNRISE_ID]);
  });

  test('a message that arrives while the chat is open is marked read as it arrives', async ({
    page,
    api,
  }) => {
    answerConversations(api, THREE_CONVERSATIONS);
    const hub = await FakeChatHub.install(page, api, {
      code: null,
      title: 'Easter Sunrise 5K',
      memberId: SIGNED_IN.memberId,
    });
    const messages = new WebMessagesPage(page);
    const chat = new WebEventChatPage(page);

    await messages.open();
    await messages.row(0).link.click();
    await expect(chat.chatTitle).toHaveText('Easter Sunrise 5K');
    await expect.poll(() => hub.read).toEqual([SUNRISE_ID]);
    hub.push({
      eventId: SUNRISE_ID,
      authorId: '0190c0de-0000-7000-8000-000000000009',
      author: 'Danielle Okafor',
      text: 'Bring a layer.',
      sentAt: '2026-04-18T12:50:00Z',
    });
    await expect(chat.messages).toHaveCount(1);
    await expect.poll(() => hub.read).toEqual([SUNRISE_ID, SUNRISE_ID]);
  });

  test('a member in no chat sees an empty state that links to Events', async ({ page, api }) => {
    answerConversations(api, []);
    const messages = new WebMessagesPage(page);

    await messages.open();

    await expect(messages.emptyHeading).toBeVisible();
    await expect(messages.rows).toHaveCount(0);
    await expect(messages.browseEventsLink).toHaveAttribute('href', '/events');
  });

  test('says "Messages didn\'t load" when the list fails, and Try again loads it', async ({
    page,
    api,
  }) => {
    answerConversations(api, THREE_CONVERSATIONS, (number) =>
      number === 0 ? { abort: true } : null,
    );
    const messages = new WebMessagesPage(page);

    await messages.open();
    await expect(messages.failedHeading).toBeVisible();
    await messages.tryAgainButton.click();

    await expect(messages.rows).toHaveCount(3);
    await expect(messages.failedHeading).toHaveCount(0);
  });

  test('the header lists Messages and marks it current while it shows', async ({ page, api }) => {
    answerConversations(api, THREE_CONVERSATIONS);
    const messages = new WebMessagesPage(page);

    await messages.open();

    await expect(messages.navLink).toHaveAttribute('aria-current', 'page');
    await expect(messages.navLink).toHaveAttribute('href', '/messages');
  });
});
