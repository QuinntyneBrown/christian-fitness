import { SIGNED_IN } from '../fixtures/api-handlers';
import { FakeChatHub } from '../fixtures/chat';
import { MESSAGES_NOW } from '../fixtures/conversations';
import { expect, test } from '../fixtures/test';
import { WebEventChatPage } from '../page-objects/web/event-chat.page';

/** The Christian Fitness account's fixed id (ADR 0090). */
const CHRISTIAN_FITNESS = '0193a9c0-0000-7000-8000-00000000cf00';
const NOTE = "This account doesn't read replies. To reach the team, use Send feedback.";

const OUTCOMES = [
  {
    id: 'cf1',
    eventId: CHRISTIAN_FITNESS,
    authorId: CHRISTIAN_FITNESS,
    author: 'Christian Fitness',
    text: "Thanks for suggesting Riverside Run Club. It's now in the directory.",
    sentAt: '2026-04-18T09:00:00Z',
  },
];

// L2-014 AC8 (ADR 0065, ADR 0090): the Christian Fitness account's messages can be read, never answered.
test.describe('Member app, the Christian Fitness account', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(MESSAGES_NOW);
  });

  // Mock messages/system.
  test('its conversation shows its messages and a note in place of the composer', async ({
    page,
    api,
  }) => {
    await FakeChatHub.install(
      page,
      api,
      { code: null, title: 'Christian Fitness', memberId: SIGNED_IN.memberId, system: true },
      OUTCOMES,
    );
    const chat = new WebEventChatPage(page);

    await chat.openDirect(CHRISTIAN_FITNESS);

    await expect(chat.chatTitle).toHaveText('Christian Fitness');
    await expect(chat.subtitle).toHaveText("Official account · Doesn't read replies");
    await expect(chat.text(0)).toHaveText(OUTCOMES[0].text);
    await expect(chat.composerNote).toHaveText(NOTE);
    await expect(chat.feedbackLink).toHaveAttribute('href', '/feedback');
    await expect(chat.composerInput).toHaveCount(0);
    await expect(chat.sendButton).toHaveCount(0);
  });

  // Mock messages/system-refused: a client that still showed the composer.
  test('a send it refuses says it was not sent and puts the note in place of the composer', async ({
    page,
    api,
  }) => {
    const hub = await FakeChatHub.install(
      page,
      api,
      { code: null, title: 'Christian Fitness', memberId: SIGNED_IN.memberId },
      OUTCOMES,
    );
    hub.refuseSends('system_account');
    const chat = new WebEventChatPage(page);
    await chat.openDirect(CHRISTIAN_FITNESS);

    await chat.composerInput.fill('Thank you!');
    await chat.sendButton.click();

    await expect(chat.composerRefused).toHaveText(
      "That message wasn't sent. This account doesn't take messages.",
    );
    await expect(chat.composerRefused).toHaveAttribute('role', 'alert');
    await expect(chat.composerNote).toHaveText(NOTE);
    await expect(chat.composerInput).toHaveCount(0);
    await expect(chat.notSent).toHaveCount(0);
    expect(hub.sent).toEqual(['Thank you!']);
  });
});
