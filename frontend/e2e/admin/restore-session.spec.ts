import { COUCH_TO_5K, rowOf, seriesList, type AdminSeriesFixture } from '../fixtures/admin-series';
import { XSRF_TOKEN } from '../fixtures/api-handlers';
import { expect, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { AdminSeriesPage } from '../page-objects/admin/series.page';

/** Couch to 5K with May 12 restored (mock `admin-series/date-restored`). */
const COUCH_MAY_12_RESTORED: AdminSeriesFixture = {
  ...COUCH_TO_5K,
  cadence: { weekday: 2, dates: 8 },
  sessionsLeft: 6,
  sessionsHeld: 8,
  sessions: COUCH_TO_5K.sessions.map((session) =>
    session.number === 6 ? { ...session, state: 'upcoming' } : session,
  ),
};

/** Answers the list and Couch to 5K, and Restore on May 12 with `reply` (31 told unless given). */
function answerRestore(
  api: ApiHandlers,
  reply: () => ApiReply | Promise<ApiReply> = () => ({
    json: { series: COUCH_MAY_12_RESTORED, told: 31 },
  }),
): { url: string; token: string | null }[] {
  const sent: { url: string; token: string | null }[] = [];
  const may12 = COUCH_TO_5K.sessions[5];
  api.on('GET', '/api/admin/series', () => seriesList([rowOf(COUCH_TO_5K)]));
  api.on('GET', `/api/admin/series/${COUCH_TO_5K.id}`, () => ({ json: COUCH_TO_5K }));
  api.on('POST', `/api/admin/series/${COUCH_TO_5K.id}/sessions/${may12.id}/restore`, (request) => {
    sent.push({
      url: new URL(request.url()).pathname,
      token: request.headers()['x-xsrf-token'] ?? null,
    });
    return reply();
  });
  return sent;
}

// L2-071 AC5 (ADR 0103; mocks admin-series/date-restored, restoring and restore-failed): Restore
// on a cancelled date to come makes it upcoming again and says how many were told; while it waits
// the button reads "Restoring…"; a failure says so in a toast and changes nothing.
test.describe('Admin app, restore a series date', () => {
  test('Restore makes May 12 upcoming again, says 31 were told and keeps focus on its row', async ({
    page,
    api,
  }) => {
    const sent = answerRestore(api);
    const series = new AdminSeriesPage(page);
    await series.open();
    await series.sessionAction(6).focus();

    await page.keyboard.press('Enter');

    await expect(series.toastTitle).toHaveText('Tue May 12 restored');
    await expect(series.toastText).toHaveText('31 members were told.');
    expect(sent).toEqual([
      {
        url: `/api/admin/series/${COUCH_TO_5K.id}/sessions/${COUCH_TO_5K.sessions[5].id}/restore`,
        token: XSRF_TOKEN,
      },
    ]);
    expect((await series.sessionTexts())[5]).toEqual([
      '6',
      'Tue May 12',
      'No class: Victoria Day week',
      '',
    ]);
    expect((await series.sessionActions())[5]).toBe('Cancel date: session 6, Tue May 12');
    expect(await series.statTexts()).toContainEqual(['Sessions left', '6 of 8']);
    await expect(series.sessionAction(6)).toBeFocused();
  });

  // Mock admin-series/restoring: a gate holds the answer.
  test('while restoring, its button reads "Restoring…" and is busy', async ({ page, api }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const sent = answerRestore(api, async () => {
      await gate;
      return { json: { series: COUCH_MAY_12_RESTORED, told: 31 } };
    });
    const series = new AdminSeriesPage(page);
    await series.open();

    await series.sessionAction(6).click();

    await expect(series.sessionAction(6)).toHaveText('Restoring… session 6, Tue May 12');
    await expect(series.sessionAction(6)).toHaveAttribute('aria-busy', 'true');
    await series.sessionAction(6).focus();
    await page.keyboard.press('Enter');
    expect(sent).toHaveLength(1);
    release();
    await expect(series.toastTitle).toHaveText('Tue May 12 restored');
  });

  // Mock admin-series/restore-failed.
  test('a restore the server failed says so in a toast and changes nothing', async ({
    page,
    api,
  }) => {
    answerRestore(api, () => ({ status: 409, json: { code: 'session_started' } }));
    const series = new AdminSeriesPage(page);
    await series.open();

    await series.sessionAction(6).click();

    const alert = series.toastRegion.getByRole('alert');
    await expect(alert.locator('.toast__title')).toHaveText("We couldn't restore Tue May 12");
    await expect(alert.locator('.toast__text')).toHaveText(
      'Nothing was changed. Try again in a moment.',
    );
    expect((await series.sessionTexts())[5][3]).toBe('Cancelled');
    expect((await series.sessionActions())[5]).toBe('Restore session 6, Tue May 12');
  });
});
