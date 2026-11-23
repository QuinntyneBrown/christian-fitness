import { type ChatMessage, FakeChatHub } from '../fixtures/chat';
import { SIGNED_IN } from '../fixtures/api-handlers';
import { expect, test } from '../fixtures/test';
import { answerEvent, answerRegistration, SUNRISE_DETAIL } from '../fixtures/events';
import { WebEventChatPage } from '../page-objects/web/event-chat.page';
import { WebEventDetailPage } from '../page-objects/web/event-detail.page';

const DANIELLE = '0190c0de-0000-7000-8000-000000000009';

// L2-016 (slice 12.1; ADR 0039): registered members send and receive an event's group messages live.
test.describe('Member app, event group chat', () => {
  test('a registered member opens the chat from the event, then receives and sends messages live', async ({
    page,
    api,
  }) => {
    answerEvent(api, [SUNRISE_DETAIL]);
    answerRegistration(api, SUNRISE_DETAIL);
    const hub = await FakeChatHub.install(page, api, {
      code: null,
      title: SUNRISE_DETAIL.title,
      memberId: SIGNED_IN.memberId,
    });
    const detail = new WebEventDetailPage(page);
    const chat = new WebEventChatPage(page);

    await detail.open(SUNRISE_DETAIL.id);
    await expect(detail.groupChatLink).toHaveCount(0);
    await detail.registerButton.click();
    await detail.groupChatLink.click();

    await expect(chat.chatTitle).toHaveText('Easter Sunrise 5K');
    await expect(chat.backLink).toHaveAttribute('href', `/events/${SUNRISE_DETAIL.id}`);
    await expect(chat.messages).toHaveCount(0);
    expect(hub.joined).toEqual([SUNRISE_DETAIL.id]);

    // Another member's message arrives without a reload, with the author and the time in Toronto.
    hub.push({
      eventId: SUNRISE_DETAIL.id,
      authorId: DANIELLE,
      author: 'Danielle Okafor',
      text: 'Bring a <b>layer</b> you can tie around your waist.',
      sentAt: '2026-04-18T11:58:00Z',
    });
    await expect(chat.messages).toHaveCount(1);
    await expect(chat.message(0).author).toHaveText('Danielle Okafor');
    await expect(chat.message(0).bubble).toHaveText(
      'Bring a <b>layer</b> you can tie around your waist.',
    );
    await expect(chat.message(0).time).toHaveText('7:58 AM');

    // Sending shows my message on the right, with no author, and empties the composer.
    await chat.composerInput.fill('I can drive from Scarborough.');
    await chat.sendButton.click();
    await expect(chat.messages).toHaveCount(2);
    await expect(chat.message(1).bubble).toHaveText('I can drive from Scarborough.');
    await expect(chat.message(1).author).toHaveCount(0);
    await expect(chat.messages.nth(1)).toHaveClass(/message--mine/);
    await expect(chat.composerInput).toHaveValue('');
    expect(hub.sent).toEqual(['I can drive from Scarborough.']);
  });

  test('a member who is not registered is told so and sees no messages', async ({ page, api }) => {
    const hub = await FakeChatHub.install(page, api, {
      code: 'not_a_participant',
      title: null,
      memberId: null,
    });
    const chat = new WebEventChatPage(page);

    await chat.open(SUNRISE_DETAIL.id);

    await expect(chat.refused).toBeVisible();
    await expect(chat.composerInput).toHaveCount(0);
    expect(hub.sent).toEqual([]);
  });
});

// L2-023 AC2 (slice 12.3; ADR 0041): a cancelled event's chat shows a notice and takes no more messages.
test.describe('Member app, cancelled event group chat', () => {
  test('a chat opened after the event was cancelled shows the notice and no composer', async ({
    page,
    api,
  }) => {
    await FakeChatHub.install(page, api, JOINED_CHAT, stored(2), true);
    const chat = new WebEventChatPage(page);

    await chat.open(SUNRISE_DETAIL.id);

    await expect(chat.messages).toHaveCount(2);
    await expect(chat.cancelledNotice).toBeVisible();
    await expect(chat.composerInput).toHaveCount(0);
  });

  test('a chat that is open when staff cancel the event shows the notice at once', async ({
    page,
    api,
  }) => {
    const hub = await FakeChatHub.install(page, api, JOINED_CHAT);
    const chat = new WebEventChatPage(page);
    await chat.open(SUNRISE_DETAIL.id);
    await expect(chat.composerInput).toBeVisible();
    await expect(chat.cancelledNotice).toHaveCount(0);

    hub.cancelEvent(SUNRISE_DETAIL.id);

    await expect(chat.cancelledNotice).toBeVisible();
    await expect(chat.composerInput).toHaveCount(0);
  });
});

/** The first `count` stored messages of the chat, oldest first: "Message 1" and on, a minute apart. */
function stored(count: number): ChatMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `stored-${String(index + 1).padStart(3, '0')}`,
    eventId: SUNRISE_DETAIL.id,
    authorId: DANIELLE,
    author: 'Danielle Okafor',
    text: `Message ${index + 1}`,
    sentAt: new Date(Date.UTC(2026, 3, 18, 10, index)).toISOString(),
  }));
}

const JOINED_CHAT = { code: null, title: SUNRISE_DETAIL.title, memberId: SIGNED_IN.memberId };

// L2-016 AC6 (slice 12.2; ADR 0040): the latest 50 load, earlier ones a page at a time, at most 200 held.
test.describe('Member app, event group chat history', () => {
  test('the latest 50 load; earlier messages load above them without moving the reader', async ({
    page,
    api,
  }) => {
    const hub = await FakeChatHub.install(page, api, JOINED_CHAT, stored(60));
    const chat = new WebEventChatPage(page);

    await chat.open(SUNRISE_DETAIL.id);

    await expect(chat.messages).toHaveCount(50);
    await expect(chat.text(0)).toHaveText('Message 11');
    await expect(chat.text(49)).toHaveText('Message 60');
    await expect(chat.earlierButton).toBeVisible();
    expect(hub.pagesAsked).toEqual([null]);

    // Earlier messages join above the first one, which stays where the member was reading it.
    await chat.scrollToTop();
    await expect(chat.text(0)).toHaveText('Message 1');
    await expect(chat.messages).toHaveCount(60);
    await expect(chat.earlierButton).toHaveCount(0);
    expect(hub.pagesAsked).toEqual([null, 'stored-011']);
  });

  test('the Earlier messages button loads the page before, by keyboard or touch', async ({
    page,
    api,
  }) => {
    await FakeChatHub.install(page, api, JOINED_CHAT, stored(120));
    const chat = new WebEventChatPage(page);
    await chat.open(SUNRISE_DETAIL.id);
    await expect(chat.messages).toHaveCount(50);

    await chat.earlierButton.focus();
    await page.keyboard.press('Enter');

    await expect(chat.messages).toHaveCount(100);
    await expect(chat.text(0)).toHaveText('Message 21');
    await expect(chat.earlierButton).toBeVisible();
  });

  test('the reader keeps their place when earlier messages are added', async ({ page, api }) => {
    await FakeChatHub.install(page, api, JOINED_CHAT, stored(120));
    const chat = new WebEventChatPage(page);
    await chat.open(SUNRISE_DETAIL.id);
    await expect(chat.messages).toHaveCount(50);

    // Reaching the top loads the page before, and the message that was first stays in view.
    await chat.scrollToTop();
    await expect(chat.messages).toHaveCount(100);

    await expect(chat.bubble('Message 71')).toBeInViewport();
    await expect(chat.bubble('Message 20')).not.toBeInViewport();
  });

  test('the chat holds at most 200 messages and offers the latest when older ones push them out', async ({
    page,
    api,
  }) => {
    const hub = await FakeChatHub.install(page, api, JOINED_CHAT, stored(260));
    const chat = new WebEventChatPage(page);
    await chat.open(SUNRISE_DETAIL.id);
    await expect(chat.messages).toHaveCount(50);

    for (const held of [100, 150, 200]) {
      await chat.scrollToTop();
      await expect(chat.messages).toHaveCount(held);
    }
    await expect(chat.latestButton).toHaveCount(0);
    await chat.scrollToTop();

    // 50 more would make 250: the newest 50 fall off the end and the way back appears.
    await expect(chat.latestButton).toBeVisible();
    await expect(chat.messages).toHaveCount(200);
    await expect(chat.text(0)).toHaveText('Message 11');
    await expect(chat.text(199)).toHaveText('Message 210');
    await expect(chat.earlierButton).toBeVisible();

    // A message that arrives meanwhile is not shown out of place; the way back loads the latest.
    hub.push({
      eventId: SUNRISE_DETAIL.id,
      authorId: DANIELLE,
      author: 'Danielle Okafor',
      text: 'Just now',
      sentAt: '2026-04-18T14:00:00Z',
    });
    await expect(chat.messages).toHaveCount(200);
    await chat.latestButton.click();
    await expect(chat.text(49)).toHaveText('Message 260');
    await expect(chat.latestButton).toHaveCount(0);
    expect(hub.pagesAsked.at(-1)).toBeNull();
  });
});

// L2-016 (slice 12.2): a message that cannot be sent stays in the thread, marked, and can be sent again.
test.describe('Member app, event group chat failed sends', () => {
  test('a failed send stays in the thread marked Not sent, and Try again sends it once', async ({
    page,
    api,
  }) => {
    const hub = await FakeChatHub.install(page, api, JOINED_CHAT);
    const chat = new WebEventChatPage(page);
    await chat.open(SUNRISE_DETAIL.id);
    await expect(chat.chatTitle).toBeVisible();
    hub.failNextSends(1);

    await chat.composerInput.fill('I will bring my speaker.');
    await chat.sendButton.click();

    await expect(chat.messages).toHaveCount(1);
    await expect(chat.text(0)).toHaveText('I will bring my speaker.');
    await expect(chat.messages.first()).toHaveClass(/message--failed/);
    await expect(chat.notSent).toContainText('Not sent.');
    await expect(chat.composerInput).toHaveValue('');
    expect(hub.sent).toEqual([]);

    await chat.retrySendButton.click();

    await expect(chat.notSent).toHaveCount(0);
    await expect(chat.messages).toHaveCount(1);
    await expect(chat.messages.first()).not.toHaveClass(/message--failed/);
    await expect(chat.message(0).time).toHaveText('8:45 AM');
    expect(hub.sent).toEqual(['I will bring my speaker.']);
  });

  test('a retry that fails again leaves the message marked, and a later one still works', async ({
    page,
    api,
  }) => {
    const hub = await FakeChatHub.install(page, api, JOINED_CHAT);
    const chat = new WebEventChatPage(page);
    await chat.open(SUNRISE_DETAIL.id);
    await expect(chat.chatTitle).toBeVisible();
    hub.failNextSends(2);
    await chat.composerInput.fill('Still there?');
    await chat.sendButton.click();
    await expect(chat.notSent).toHaveCount(1);

    await chat.retrySendButton.click();
    await expect(chat.notSent).toHaveCount(1);
    await expect(chat.messages).toHaveCount(1);
    expect(hub.sent).toEqual([]);

    await chat.retrySendButton.click();
    await expect(chat.notSent).toHaveCount(0);
    expect(hub.sent).toEqual(['Still there?']);
  });
});
