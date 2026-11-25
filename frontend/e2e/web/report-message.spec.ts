import { SIGNED_IN } from '../fixtures/api-handlers';
import { type ChatMessage, FakeChatHub } from '../fixtures/chat';
import { MESSAGES_NOW } from '../fixtures/conversations';
import { answerReports } from '../fixtures/reports';
import { expect, test } from '../fixtures/test';
import { WebEventChatPage } from '../page-objects/web/event-chat.page';
import { WebReportMessageDialog } from '../page-objects/web/report-message.dialog';

const EVENT = '0190c0de-0000-7000-8000-0000000000e1';
const MICHAEL = '0190c0de-0000-7000-8000-0000000000b1';
const THEIRS = '0190c0de-0000-7000-8000-0000000000a1';
const MINE = '0190c0de-0000-7000-8000-0000000000a2';

const HISTORY: ChatMessage[] = [
  {
    id: THEIRS,
    eventId: EVENT,
    authorId: MICHAEL,
    author: 'Michael Chen',
    text: 'Parking at Marilyn Bell fills up by 6:30.',
    sentAt: '2026-04-18T12:00:00Z',
  },
  {
    id: MINE,
    eventId: EVENT,
    authorId: SIGNED_IN.memberId,
    author: SIGNED_IN.name,
    text: "I'll drive from Scarborough.",
    sentAt: '2026-04-18T12:05:00Z',
  },
];

// L2-017 (slice 25.1; ADR 0000): Report on a received message opens a dialog with an optional reason;
// once recorded it says "Message reported" (mock `default`, `busy`, `failed`, `refused`, `success`).
test.describe('Member app, report a message', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(MESSAGES_NOW);
  });

  test(
    'a group message from another member is reported with a reason and confirmed; mine has no Report',
    { tag: '@critical' },
    async ({ page, api }) => {
      await FakeChatHub.install(
        page,
        api,
        { code: null, title: 'Sunrise 5K Crew', memberId: SIGNED_IN.memberId },
        HISTORY,
      );
      const sent = answerReports(api);
      const chat = new WebEventChatPage(page);
      const dialog = new WebReportMessageDialog(page);
      await chat.open(EVENT);
      await expect(chat.messages).toHaveCount(2);
      await expect(chat.reportButtons).toHaveCount(1);
      await expect(chat.reportButton(1)).toHaveCount(0);

      await chat.reportButton(0).click();

      await expect(dialog.byRole()).toBeVisible();
      await expect(dialog.title).toHaveText('Report this message?');
      await expect(dialog.subtitle).toContainText('Michael Chen');
      await expect(dialog.reason).toBeFocused();
      await dialog.reason.fill('  Pressuring newcomers for money  ');
      await dialog.reportButton.click();

      await expect(dialog.title).toHaveText('Message reported');
      await expect(dialog.success).toBeVisible();
      expect(sent).toEqual([
        { messageId: THEIRS, body: { reason: 'Pressuring newcomers for money' } },
      ]);
      await dialog.doneButton.click();
      await expect(dialog.dialog).toHaveCount(0);
      await expect(chat.reportButton(0)).toBeFocused();
    },
  );

  test('a direct message is reported without a reason', async ({ page, api }) => {
    await FakeChatHub.install(
      page,
      api,
      { code: null, title: 'Michael Chen', memberId: SIGNED_IN.memberId },
      [{ ...HISTORY[0], eventId: MICHAEL }],
    );
    const sent = answerReports(api);
    const chat = new WebEventChatPage(page);
    const dialog = new WebReportMessageDialog(page);
    await chat.openDirect(MICHAEL);

    await chat.reportButton(0).click();
    await dialog.reportButton.click();

    await expect(dialog.title).toHaveText('Message reported');
    expect(sent).toEqual([{ messageId: THEIRS, body: { reason: null } }]);
  });

  test('while reporting, the reason holds still and nothing closes the dialog', async ({
    page,
    api,
  }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await FakeChatHub.install(
      page,
      api,
      { code: null, title: 'Sunrise 5K Crew', memberId: SIGNED_IN.memberId },
      HISTORY,
    );
    answerReports(api, [], held);
    const chat = new WebEventChatPage(page);
    const dialog = new WebReportMessageDialog(page);
    await chat.open(EVENT);
    await chat.reportButton(0).click();
    await dialog.reason.fill('Rude');

    await dialog.reportButton.click();

    await expect(dialog.reportButton).toHaveText('Reporting…');
    await expect(dialog.reportButton).toBeDisabled();
    await expect(dialog.reportButton).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.cancelButton).toBeDisabled();
    await expect(dialog.reason).toHaveAttribute('readonly', '');
    await dialog.closeButton.click();
    await dialog.pressEscape();
    await expect(dialog.byRole()).toBeVisible();

    release();

    await expect(dialog.title).toHaveText('Message reported');
  });

  test("a report that doesn't send keeps the reason and can be sent again", async ({
    page,
    api,
  }) => {
    await FakeChatHub.install(
      page,
      api,
      { code: null, title: 'Sunrise 5K Crew', memberId: SIGNED_IN.memberId },
      HISTORY,
    );
    const sent = answerReports(api, [{ status: 404, code: 'message_not_found' }]);
    const chat = new WebEventChatPage(page);
    const dialog = new WebReportMessageDialog(page);
    await chat.open(EVENT);
    await chat.reportButton(0).click();
    await dialog.reason.fill('Rude');

    await dialog.reportButton.click();

    await expect(dialog.alertTitle).toHaveText("Your report didn't send");
    await expect(dialog.reason).toHaveValue('Rude');
    await expect(dialog.reportButton).toBeEnabled();

    await dialog.reportButton.click();

    await expect(dialog.title).toHaveText('Message reported');
    expect(sent).toHaveLength(2);
  });

  test('a message the member already reported says so and sends nothing more', async ({
    page,
    api,
  }) => {
    await FakeChatHub.install(
      page,
      api,
      { code: null, title: 'Sunrise 5K Crew', memberId: SIGNED_IN.memberId },
      HISTORY,
    );
    const sent = answerReports(api, [{ status: 409, code: 'already_reported' }]);
    const chat = new WebEventChatPage(page);
    const dialog = new WebReportMessageDialog(page);
    await chat.open(EVENT);
    await chat.reportButton(0).click();

    await dialog.reportButton.click();

    await expect(dialog.alertTitle).toHaveText("You've already reported this message");
    await expect(dialog.reportButton).toHaveCount(0);
    await dialog.doneButton.click();
    await expect(dialog.dialog).toHaveCount(0);
    expect(sent).toHaveLength(1);
  });

  test('Cancel and Escape leave without reporting', async ({ page, api }) => {
    await FakeChatHub.install(
      page,
      api,
      { code: null, title: 'Sunrise 5K Crew', memberId: SIGNED_IN.memberId },
      HISTORY,
    );
    const sent = answerReports(api);
    const chat = new WebEventChatPage(page);
    const dialog = new WebReportMessageDialog(page);
    await chat.open(EVENT);

    await chat.reportButton(0).click();
    await dialog.cancelButton.click();
    await expect(dialog.dialog).toHaveCount(0);
    await chat.reportButton(0).click();
    await dialog.pressEscape();

    await expect(dialog.dialog).toHaveCount(0);
    expect(sent).toEqual([]);
  });
});
