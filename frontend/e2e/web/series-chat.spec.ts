import { FakeChatHub } from '../fixtures/chat';
import { SIGNED_IN } from '../fixtures/api-handlers';
import { answerConversations, MESSAGES_NOW } from '../fixtures/conversations';
import { answerEvent } from '../fixtures/events';
import { answerSeriesDetail, COUCH_SESSION_3, COUCH_TO_5K_DETAIL } from '../fixtures/series';
import { expect, test } from '../fixtures/test';
import { WebEventChatPage } from '../page-objects/web/event-chat.page';
import { WebEventDetailPage } from '../page-objects/web/event-detail.page';
import { WebEventSeriesPage } from '../page-objects/web/event-series.page';
import { WebMessagesPage } from '../page-objects/web/messages.page';

// L2-052 AC2 (ADR 0080, ADR 0101): a series has one group chat, opened by the series' id at
// /events/series/<id>/chat and reached from Messages and from a session's event page.
test.describe('Member app, a series group chat', () => {
  test('The series chat joins by the series id, reads "Series group" and leads back to the series', async ({
    page,
    api,
  }) => {
    const hub = await FakeChatHub.install(page, api, {
      code: null,
      title: COUCH_TO_5K_DETAIL.title,
      memberId: SIGNED_IN.memberId,
    });
    answerSeriesDetail(api, [COUCH_TO_5K_DETAIL]);
    const chat = new WebEventChatPage(page);
    const series = new WebEventSeriesPage(page);

    await chat.openSeries(COUCH_TO_5K_DETAIL.id);

    await expect(chat.chatTitle).toHaveText('Couch to 5K Run Club');
    await expect(chat.subtitle).toHaveText('Series group');
    expect(hub.joined).toEqual([COUCH_TO_5K_DETAIL.id]);
    expect(await page.title()).toBe('Group chat · Christian Fitness');
    await expect(chat.seriesBackLink).toHaveAttribute(
      'href',
      `/events/series/${COUCH_TO_5K_DETAIL.id}`,
    );
    await chat.seriesBackLink.click();
    await expect(series.seriesTitle).toHaveText('Couch to 5K Run Club');
  });

  test('A series row on Messages leads to the series chat', async ({ page, api }) => {
    await page.clock.setFixedTime(MESSAGES_NOW);
    answerConversations(api, [
      {
        kind: 'series',
        id: COUCH_TO_5K_DETAIL.id,
        name: 'Couch to 5K Run Club',
        memberCount: 33,
        lastMessage: null,
        unreadCount: 0,
        activityAt: '2026-04-17T16:00:00Z',
      },
    ]);
    const messages = new WebMessagesPage(page);

    await messages.open();

    await expect(messages.row(0).name).toHaveText('Couch to 5K Run Club');
    await expect(messages.row(0).meta).toContainText('33 members');
    await expect(messages.rows.nth(0)).toHaveAttribute(
      'href',
      `/events/series/${COUCH_TO_5K_DETAIL.id}/chat`,
    );
  });

  test("A session's event page leads its Group chat to the series chat", async ({ page, api }) => {
    answerEvent(api, [{ ...COUCH_SESSION_3, registration: 'confirmed', going: 32 }]);
    const detail = new WebEventDetailPage(page);

    await detail.open(COUCH_SESSION_3.id);

    await expect(detail.groupChatLink).toHaveAttribute(
      'href',
      `/events/series/${COUCH_TO_5K_DETAIL.id}/chat`,
    );
  });
});
