import { COUCH_TO_5K, rowOf, seriesList, type AdminSeriesFixture } from '../fixtures/admin-series';
import { XSRF_TOKEN } from '../fixtures/api-handlers';
import { expect, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { CancelSessionDialog } from '../page-objects/admin/cancel-session.dialog';
import { AdminSeriesPage } from '../page-objects/admin/series.page';

/** Couch to 5K with May 5 cancelled (mock `admin-series/date-cancelled`). */
const COUCH_MAY_5_CANCELLED: AdminSeriesFixture = {
  ...COUCH_TO_5K,
  cadence: { weekday: 2, dates: 6 },
  sessionsLeft: 4,
  sessionsHeld: 6,
  sessions: COUCH_TO_5K.sessions.map((session) =>
    session.number === 5 ? { ...session, state: 'cancelled' } : session,
  ),
};

/** Answers the list and Couch to 5K, and Cancel date on May 5 with `reply` (34 told unless given). */
function answerCancel(
  api: ApiHandlers,
  reply: () => ApiReply | Promise<ApiReply> = () => ({
    json: { series: COUCH_MAY_5_CANCELLED, told: 34 },
  }),
): { url: string; token: string | null }[] {
  const sent: { url: string; token: string | null }[] = [];
  const may5 = COUCH_TO_5K.sessions[4];
  api.on('GET', '/api/admin/series', () => seriesList([rowOf(COUCH_TO_5K)]));
  api.on('GET', `/api/admin/series/${COUCH_TO_5K.id}`, () => ({ json: COUCH_TO_5K }));
  api.on('POST', `/api/admin/series/${COUCH_TO_5K.id}/sessions/${may5.id}/cancel`, (request) => {
    sent.push({
      url: new URL(request.url()).pathname,
      token: request.headers()['x-xsrf-token'] ?? null,
    });
    return reply();
  });
  return sent;
}

// L2-071 AC4 (ADR 0103; mocks admin-series/default, date-cancelled and cancel-session): a date that
// has not started offers Cancel date; the dialog names the series, session and date, how many are
// going and who is told, with focus on "Keep the date"; a cancel says how many were told.
test.describe('Admin app, cancel a series date', () => {
  test('only dates that have not started and are not cancelled offer Cancel date', async ({
    page,
    api,
  }) => {
    answerCancel(api);
    const series = new AdminSeriesPage(page);

    await series.open();

    await expect(series.sessions).toHaveCount(8);
    expect(await series.sessionActions()).toEqual([
      '',
      '',
      'Cancel date: session 3, Tue Apr 21',
      'Cancel date: session 4, Tue Apr 28',
      'Cancel date: session 5, Tue May 05',
      'Restore session 6, Tue May 12',
      'Cancel date: session 7, Tue May 19',
      'Cancel date: session 8, Tue May 26',
    ]);
  });

  test(
    'Cancel date asks first, then cancels May 5, says 34 were told and shows it cancelled',
    { tag: '@critical' },
    async ({ page, api }) => {
      const sent = answerCancel(api);
      const series = new AdminSeriesPage(page);
      const dialog = new CancelSessionDialog(page);
      await series.open();

      await series.sessionAction(5).click();

      await expect(dialog.dialog).toBeVisible();
      await expect(dialog.subtitle).toHaveText(
        'Couch to 5K Run Club · Session 5 · Tue May 5, 6:30 PM',
      );
      await expect(dialog.texts).toHaveText([
        '34 people are going to this date (31 joined, 3 dropped in). Everyone going is told in the series chat and in their notifications. If anyone paid for it, the host will sort out refunds with them directly.',
        'You can restore the date until it would have started.',
      ]);
      await expect.poll(() => dialog.isFocused(dialog.keepButton)).toBe(true);
      expect(sent).toEqual([]);

      await dialog.cancelButton.click();

      await expect(dialog.dialog).toHaveCount(0);
      expect(sent).toEqual([
        {
          url: `/api/admin/series/${COUCH_TO_5K.id}/sessions/${COUCH_TO_5K.sessions[4].id}/cancel`,
          token: XSRF_TOKEN,
        },
      ]);
      await expect(series.toastTitle).toHaveText('Tue May 5 cancelled');
      await expect(series.toastText).toHaveText('34 members were told.');
      expect((await series.sessionTexts())[4]).toEqual([
        '5',
        'Tue May 05',
        'Two 8-minute runs',
        'Cancelled',
      ]);
      expect(await series.statTexts()).toContainEqual(['Sessions left', '4 of 6']);
    },
  );

  // Mock cancel-session/busy: a gate holds the answer.
  test('while cancelling, the button reads "Cancelling…" and both buttons are disabled', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    answerCancel(api, async () => {
      await gate;
      return { json: { series: COUCH_MAY_5_CANCELLED, told: 34 } };
    });
    const series = new AdminSeriesPage(page);
    const dialog = new CancelSessionDialog(page);
    await series.open();
    await series.sessionAction(5).click();

    await dialog.cancelButton.click();

    await expect(dialog.cancelButton).toHaveText('Cancelling…');
    await expect(dialog.cancelButton).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.cancelButton).toBeDisabled();
    await expect(dialog.keepButton).toBeDisabled();
    release();
    await expect(dialog.dialog).toHaveCount(0);
  });

  // Mock cancel-session/failed.
  test('a cancel the server failed says so in the dialog and changes nothing', async ({
    page,
    api,
  }) => {
    answerCancel(api, () => ({ status: 409, json: { code: 'session_started' } }));
    const series = new AdminSeriesPage(page);
    const dialog = new CancelSessionDialog(page);
    await series.open();
    await series.sessionAction(5).click();

    await dialog.cancelButton.click();

    await expect(dialog.alertTitle).toHaveText("We couldn't cancel this date");
    await expect(dialog.alert).toContainText(
      'Nothing was changed and nobody was told. Try again in a moment.',
    );
    await expect(dialog.cancelButton).toHaveText('Cancel date');
    await dialog.keepButton.click();
    await expect(dialog.dialog).toHaveCount(0);
    expect((await series.sessionTexts())[4][3]).toBe('');
    await expect(series.toast).toHaveCount(0);
  });

  test('Keep the date and Escape close the dialog without cancelling', async ({ page, api }) => {
    const sent = answerCancel(api);
    const series = new AdminSeriesPage(page);
    const dialog = new CancelSessionDialog(page);
    await series.open();

    await series.sessionAction(5).click();
    await dialog.keepButton.click();
    await expect(dialog.dialog).toHaveCount(0);
    await expect.poll(() => dialog.isFocused(series.sessionAction(5))).toBe(true);
    await series.sessionAction(5).click();
    await dialog.pressEscape();

    await expect(dialog.dialog).toHaveCount(0);
    expect(sent).toEqual([]);
  });
});
