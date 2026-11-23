import { SIGNED_IN } from '../fixtures/api-handlers';
import { FakeChatHub } from '../fixtures/chat';
import { answerConversations, MESSAGES_NOW } from '../fixtures/conversations';
import { expect, test } from '../fixtures/test';
import { WebEventChatPage } from '../page-objects/web/event-chat.page';
import { WebMemberProfilePage } from '../page-objects/web/member-profile.page';
import { WebMessagesPage } from '../page-objects/web/messages.page';

const MICHAEL = '0190c0de-0000-7000-8000-0000000000b1';

// L2-014 and L2-016 (slice 14.1; ADR 0043): members start a private conversation from a profile and chat live.
test.describe('Member app, direct messages', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(MESSAGES_NOW);
  });

  test("Message on a member's profile opens a private chat that receives and sends live and is read", async ({
    page,
    api,
  }) => {
    api.on('GET', `/api/members/${MICHAEL}/profile`, () => ({
      json: { name: 'Michael Chen', bio: null, interests: [] },
    }));
    const hub = await FakeChatHub.install(
      page,
      api,
      { code: null, title: 'Michael Chen', memberId: SIGNED_IN.memberId },
      [
        {
          id: 'h1',
          eventId: MICHAEL,
          authorId: MICHAEL,
          author: 'Michael Chen',
          text: 'See you Saturday?',
          sentAt: '2026-04-18T12:00:00Z',
        },
      ],
    );
    const profile = new WebMemberProfilePage(page);
    const chat = new WebEventChatPage(page);

    await profile.open(MICHAEL);
    await profile.messageLink.click();

    await expect(chat.chatTitle).toHaveText('Michael Chen');
    await expect(chat.subtitle).toHaveText('Direct message');
    await expect(chat.messagesLink).toHaveAttribute('href', '/messages');
    await expect(chat.messages).toHaveCount(1);
    await expect(chat.text(0)).toHaveText('See you Saturday?');
    expect(hub.joined).toEqual([MICHAEL]);
    await expect.poll(() => hub.read).toEqual([MICHAEL]);

    hub.push({
      eventId: MICHAEL,
      authorId: MICHAEL,
      author: 'Michael Chen',
      text: 'Bring <b>water</b>.',
      sentAt: '2026-04-18T12:30:00Z',
    });
    await expect(chat.messages).toHaveCount(2);
    await expect(chat.text(1)).toHaveText('Bring <b>water</b>.');

    await chat.composerInput.fill('Yes, see you there.');
    await chat.sendButton.click();
    await expect(chat.messages).toHaveCount(3);
    await expect(chat.messages.nth(2)).toHaveClass(/message--mine/);
    expect(hub.sent).toEqual(['Yes, see you there.']);
  });

  test('a member who cannot be messaged is told so and sees no composer', async ({ page, api }) => {
    const hub = await FakeChatHub.install(page, api, {
      code: 'recipient_unavailable',
      title: null,
      memberId: null,
    });
    const chat = new WebEventChatPage(page);

    await chat.openDirect(MICHAEL);

    await expect(chat.unavailable).toBeVisible();
    await expect(chat.composerInput).toHaveCount(0);
    expect(hub.sent).toEqual([]);
  });

  test('a direct conversation in the Messages list opens the private chat', async ({
    page,
    api,
  }) => {
    answerConversations(api, [
      {
        kind: 'direct',
        id: MICHAEL,
        name: 'Michael Chen',
        memberCount: null,
        lastMessage: {
          author: 'Michael Chen',
          text: 'See you Saturday?',
          sentAt: '2026-04-18T12:00:00Z',
        },
        unreadCount: 1,
        activityAt: '2026-04-18T12:00:00Z',
      },
    ]);
    await FakeChatHub.install(page, api, {
      code: null,
      title: 'Michael Chen',
      memberId: SIGNED_IN.memberId,
    });
    const messages = new WebMessagesPage(page);
    const chat = new WebEventChatPage(page);

    await messages.open();
    await expect(messages.row(0).meta).toHaveCount(0);
    await messages.row(0).link.click();

    await expect(chat.chatTitle).toHaveText('Michael Chen');
    await expect(chat.subtitle).toHaveText('Direct message');
  });
});
