import { FakeChatHub } from '../fixtures/chat';
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
