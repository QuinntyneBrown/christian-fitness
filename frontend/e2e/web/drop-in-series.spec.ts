import { expect, test } from '../fixtures/test';
import { answerPhotos } from '../fixtures/directory';
import {
  answerDropIns,
  answerSeriesDetail,
  COUCH_TO_5K_DETAIL,
  joinedOf,
  PARK_BOOTCAMP_DETAIL,
  type SeriesDetail,
} from '../fixtures/series';
import { WebEventSeriesPage } from '../page-objects/web/event-series.page';
import { WebStopDatesDialog } from '../page-objects/web/stop-dates.dialog';

/**
 * Saturday Park Bootcamp with every place at session 6 (Sat May 9) taken, as the mock
 * `event-series/full` draws that date: three done, sessions 4, 5, 7 and 8 open (ADR 0102).
 */
const BOOTCAMP_MAY_9_FULL: SeriesDetail = {
  ...PARK_BOOTCAMP_DETAIL,
  sessions: PARK_BOOTCAMP_DETAIL.sessions.map((session) => ({
    ...session,
    full: session.number === 6,
  })),
};

/** The id of Saturday Park Bootcamp's session `n`. */
const bootcamp = (n: number): string => PARK_BOOTCAMP_DETAIL.sessions[n - 1]!.id;

/** Saturday Park Bootcamp with the member holding sessions 4 (Sat Apr 25) and 6 (Sat May 9), as the mock booked draws it. */
const BOOTCAMP_HOLDING_4_6: SeriesDetail = {
  ...PARK_BOOTCAMP_DETAIL,
  sessions: PARK_BOOTCAMP_DETAIL.sessions.map((session) => ({
    ...session,
    held: session.number === 4 || session.number === 6,
  })),
};

/** Couch to 5K, free with a free drop-in, before the member joined or held any date. */
const COUCH_NOT_JOINED: SeriesDetail = {
  ...COUCH_TO_5K_DETAIL,
  joined: false,
  sessions: COUCH_TO_5K_DETAIL.sessions.map((session) => ({ ...session, held: false })),
};

// L2-053 AC1 and AC7 (ADR 0102): with "Pick dates to drop in" chosen, every open date gets a
// "Drop in" tick box named with its date, a full one reads "Full", and the button counts the dates.
test.describe('Member app, drop in on series dates: picking dates', () => {
  test('Each open date gets a Drop in tick box named with its date, and a full one reads Full with none', async ({
    page,
    api,
  }) => {
    answerPhotos(api);
    answerSeriesDetail(api, [BOOTCAMP_MAY_9_FULL]);
    const series = new WebEventSeriesPage(page);
    await series.open(BOOTCAMP_MAY_9_FULL.id);
    await expect(series.dropInBoxes).toHaveCount(0);

    await series.dropIn.check();

    await expect(series.dropInBoxes).toHaveCount(4);
    for (const [n, name] of [
      [4, 'Drop in on Sat, Apr 25'],
      [5, 'Drop in on Sat, May 02'],
      [7, 'Drop in on Sat, May 16'],
      [8, 'Drop in on Sat, May 23'],
    ] as const) {
      await expect(series.dropInBox(n)).toHaveAccessibleName(name);
      await expect(series.dropInBox(n)).not.toBeChecked();
    }
    await expect(series.sessionEnd(6)).toHaveText('Full');
    for (const n of [1, 2, 3]) await expect(series.sessionEnd(n)).toHaveText('Done');
    await expect(series.planNote(1)).toHaveText('Tick dates in the list');
    await expect(series.panelButton).toHaveText('Pick a date first');
    await expect(series.panelButton).toBeDisabled();
  });

  test('Ticking dates counts them on the option and the button, by pointer and by keyboard', async ({
    page,
    api,
  }) => {
    answerPhotos(api);
    answerSeriesDetail(api, [BOOTCAMP_MAY_9_FULL]);
    const series = new WebEventSeriesPage(page);
    await series.open(BOOTCAMP_MAY_9_FULL.id);
    await series.dropIn.check();

    await series.dropInBox(4).click();

    await expect(series.planNote(1)).toHaveText('1 picked below');
    await expect(series.panelButton).toHaveText('Register for 1 date');
    await expect(series.panelButton).toBeEnabled();
    await series.dropInBox(7).focus();
    await page.keyboard.press('Space');
    await expect(series.dropInBox(7)).toBeChecked();
    await expect(series.planNote(1)).toHaveText('2 picked below');
    await expect(series.panelButton).toHaveText('Register for 2 dates');
    await series.dropInBox(4).click();
    await series.dropInBox(7).click();
    await expect(series.planNote(1)).toHaveText('Tick dates in the list');
    await expect(series.panelButton).toHaveText('Pick a date first');
    await expect(series.panelButton).toBeDisabled();
  });

  test('Choosing Every session again hides the tick boxes and brings back Details', async ({
    page,
    api,
  }) => {
    answerPhotos(api);
    answerSeriesDetail(api, [BOOTCAMP_MAY_9_FULL]);
    const series = new WebEventSeriesPage(page);
    await series.open(BOOTCAMP_MAY_9_FULL.id);
    await series.dropIn.check();
    await series.dropInBox(4).click();

    await series.everySession.check();

    await expect(series.dropInBoxes).toHaveCount(0);
    await expect(series.details(4)).toBeVisible();
    await expect(series.details(6)).toBeVisible();
    await expect(series.panelButton).toHaveText('Join the series');
  });
});

// L2-053 AC2 and AC3 (ADR 0102): registering for the ticked dates, all of them or none.
test.describe('Member app, drop in on series dates: registering', () => {
  test(
    'Registering for two ticked dates of a paid drop-in says which sessions, how to pay, and offers Change dates',
    { tag: '@critical' },
    async ({ page, api }) => {
      answerPhotos(api);
      answerSeriesDetail(api, [PARK_BOOTCAMP_DETAIL]);
      const sent = answerDropIns(api, [PARK_BOOTCAMP_DETAIL]);
      const series = new WebEventSeriesPage(page);
      await series.open(PARK_BOOTCAMP_DETAIL.id);
      await series.dropIn.check();
      await series.dropInBox(4).click();
      await series.dropInBox(7).click();

      await series.panelButton.click();

      await expect(series.confirmed).toHaveText('Registered for 2 dates');
      expect(sent).toEqual([[bootcamp(4), bootcamp(7)]]);
      await expect(series.payNotes).toHaveText([
        'Sessions 4, 7. You can add more dates any time. Pay $10 to the host at each session; online payment is not available yet.',
      ]);
      await expect(series.changeDatesButton).toBeVisible();
      await expect(series.planGroup).toHaveCount(0);
      await expect(series.dropInBoxes).toHaveCount(0);
      await expect(series.details(7)).toBeVisible();
    },
  );

  test('A free drop-in says which session and nothing about paying', async ({ page, api }) => {
    answerSeriesDetail(api, [COUCH_NOT_JOINED]);
    answerDropIns(api, [COUCH_NOT_JOINED]);
    const series = new WebEventSeriesPage(page);
    await series.open(COUCH_NOT_JOINED.id);
    await series.dropIn.check();
    await series.dropInBox(5).click();

    await series.panelButton.click();

    await expect(series.confirmed).toHaveText('Registered for 1 date');
    await expect(series.payNotes).toHaveText(['Session 5. You can add more dates any time.']);
  });

  test('While the registration waits, the button reads "Registering…" and nothing can be pressed or chosen', async ({
    page,
    api,
  }) => {
    answerPhotos(api);
    answerSeriesDetail(api, [PARK_BOOTCAMP_DETAIL]);
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    const sent = answerDropIns(api, [PARK_BOOTCAMP_DETAIL], async () => {
      await held;
      return null;
    });
    const series = new WebEventSeriesPage(page);
    await series.open(PARK_BOOTCAMP_DETAIL.id);
    await series.dropIn.check();
    await series.dropInBox(4).click();

    await series.panelButton.click();

    await expect(series.panelButton).toHaveText('Registering…');
    await expect(series.panelButton).toBeDisabled();
    await expect(series.panelButton).toHaveAttribute('aria-busy', 'true');
    await expect(series.everySession).toBeDisabled();
    await expect(series.dropIn).toBeDisabled();
    release();
    await expect(series.confirmed).toHaveText('Registered for 1 date');
    expect(sent).toHaveLength(1);
  });

  for (const [why, sessions, words] of [
    ['one date that filled', [7], 'Sat May 16 is full. Untick it and try again.'],
    [
      'two dates that filled',
      [5, 7],
      'Sat May 2 and Sat May 16 are full. Untick them and try again.',
    ],
  ] as const) {
    test(`A registration refused for ${why} names them above the button and keeps the ticks`, async ({
      page,
      api,
    }) => {
      answerPhotos(api);
      answerSeriesDetail(api, [PARK_BOOTCAMP_DETAIL]);
      const sent = answerDropIns(api, [PARK_BOOTCAMP_DETAIL], (n) =>
        n === 0 ? { status: 409, json: { code: 'event_full', sessions } } : null,
      );
      const series = new WebEventSeriesPage(page);
      await series.open(PARK_BOOTCAMP_DETAIL.id);
      await series.dropIn.check();
      for (const n of [4, 5, 7]) await series.dropInBox(n).click();

      await series.panelButton.click();

      await expect(series.failure).toHaveText(words);
      for (const n of [4, 5, 7]) await expect(series.dropInBox(n)).toBeChecked();
      await expect(series.panelButton).toHaveText('Register for 3 dates');
      await expect(series.panelButton).toBeEnabled();
      await expect(series.confirmed).toHaveCount(0);
      for (const n of sessions) await series.dropInBox(n).click();
      await series.panelButton.click();
      await expect(series.confirmed).toHaveText(
        `Registered for ${3 - sessions.length} date${sessions.length === 1 ? 's' : ''}`,
      );
      expect(sent).toHaveLength(2);
    });
  }

  for (const [why, reply] of [
    ['refused account_suspended', { status: 403, json: { code: 'account_suspended' } }],
    ['not answered', { abort: true }],
  ] as const) {
    test(`A registration ${why} shows a generic message above the button, which stays usable`, async ({
      page,
      api,
    }) => {
      answerPhotos(api);
      answerSeriesDetail(api, [PARK_BOOTCAMP_DETAIL]);
      answerDropIns(api, [PARK_BOOTCAMP_DETAIL], (n) => (n === 0 ? reply : null));
      const series = new WebEventSeriesPage(page);
      await series.open(PARK_BOOTCAMP_DETAIL.id);
      await series.dropIn.check();
      await series.dropInBox(4).click();

      await series.panelButton.click();

      await expect(series.failure).toHaveText("We couldn't sign you up. Try again in a moment.");
      await expect(series.panelButton).toHaveText('Register for 1 date');
      await expect(series.panelButton).toBeEnabled();
      await expect(series.dropInBox(4)).toBeChecked();
    });
  }
});

// L2-053 AC4 (ADR 0102): changing the dates held; unticking one asks first.
test.describe('Member app, drop in on series dates: changing dates', () => {
  /** Opens Saturday Park Bootcamp holding sessions 4 and 6 and presses Change dates. */
  async function changing(
    page: import('@playwright/test').Page,
    api: import('../fixtures/api-handlers').ApiHandlers,
    reply?: Parameters<typeof answerDropIns>[2],
  ): Promise<{ series: WebEventSeriesPage; sent: string[][] }> {
    answerPhotos(api);
    answerSeriesDetail(api, [BOOTCAMP_HOLDING_4_6]);
    const sent = answerDropIns(api, [BOOTCAMP_HOLDING_4_6], reply);
    const series = new WebEventSeriesPage(page);
    await series.open(BOOTCAMP_HOLDING_4_6.id);
    await series.changeDatesButton.click();
    return { series, sent };
  }

  test('Change dates ticks the dates held, keeps Save dates disabled until the ticks differ, and Cancel goes back', async ({
    page,
    api,
  }) => {
    const { series, sent } = await changing(page, api);

    await expect(series.dropIn).toBeChecked();
    await expect(series.dropInBox(4)).toBeChecked();
    await expect(series.dropInBox(6)).toBeChecked();
    await expect(series.dropInBox(5)).not.toBeChecked();
    await expect(series.planNote(1)).toHaveText('2 picked below');
    await expect(series.panelButton).toHaveText('Save dates');
    await expect(series.panelButton).toBeDisabled();
    await series.dropInBox(5).click();
    await expect(series.panelButton).toBeEnabled();
    await series.dropInBox(5).click();
    await expect(series.panelButton).toBeDisabled();
    await series.dropInBox(6).click();
    await series.cancelButton.click();
    await expect(series.confirmed).toHaveText('Registered for 2 dates');
    await expect(series.dropInBoxes).toHaveCount(0);
    await series.changeDatesButton.click();
    await expect(series.dropInBox(6)).toBeChecked();
    expect(sent).toEqual([]);
  });

  test('Adding a date saves without asking', async ({ page, api }) => {
    const { series, sent } = await changing(page, api);
    await series.dropInBox(5).click();

    await series.panelButton.click();

    await expect(series.confirmed).toHaveText('Registered for 3 dates');
    expect(sent.map((ids) => [...ids].sort())).toEqual([
      [bootcamp(4), bootcamp(5), bootcamp(6)].sort(),
    ]);
    await expect(new WebStopDatesDialog(page).dialog).toHaveCount(0);
  });

  test('Unticking a held date asks first, with focus on Keep my dates, which keeps the ticks', async ({
    page,
    api,
  }) => {
    const { series, sent } = await changing(page, api);
    const stop = new WebStopDatesDialog(page);
    await series.dropInBox(6).click();

    await series.panelButton.click();

    await expect(stop.byRole('Stop going to 1 date?')).toBeVisible();
    await expect(stop.subtitle).toHaveText('Saturday Park Bootcamp · Sat May 9');
    await expect(stop.text).toHaveText(
      'Your place goes to someone else. You can register for these dates again while places are left.',
    );
    await expect(stop.keepButton).toBeFocused();
    await stop.keepButton.click();
    await expect(stop.dialog).toHaveCount(0);
    await expect(series.dropInBox(6)).not.toBeChecked();
    await expect(series.panelButton).toHaveText('Save dates');
    await series.panelButton.click();
    await stop.pressEscape();
    await expect(stop.dialog).toHaveCount(0);
    expect(sent).toEqual([]);
  });

  test('Stop going takes the member off every unticked date and the panel offers the series again', async ({
    page,
    api,
  }) => {
    const { series, sent } = await changing(page, api);
    const stop = new WebStopDatesDialog(page);
    await series.dropInBox(4).click();
    await series.dropInBox(6).click();
    await series.panelButton.click();
    await expect(stop.title).toHaveText('Stop going to 2 dates?');
    await expect(stop.subtitle).toHaveText('Saturday Park Bootcamp · Sat Apr 25 and Sat May 9');

    await stop.stopButton.click();

    await expect(stop.dialog).toHaveCount(0);
    expect(sent).toEqual([[]]);
    await expect(series.confirmed).toHaveCount(0);
    await expect(series.panelButton).toHaveText('Join the series');
  });

  test('While stopping waits both buttons are disabled and it reads "Stopping…"; with no answer the dialog stays with its alert', async ({
    page,
    api,
  }) => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    const { series } = await changing(page, api, async (n) => {
      if (n > 0) return null;
      await held;
      return { abort: true };
    });
    const stop = new WebStopDatesDialog(page);
    await series.dropInBox(6).click();
    await series.panelButton.click();

    await stop.stopButton.click();

    await expect(stop.stopButton).toHaveText('Stopping…');
    await expect(stop.stopButton).toBeDisabled();
    await expect(stop.keepButton).toBeDisabled();
    release();
    await expect(stop.alertTitle).toHaveText("We couldn't take you off those dates");
    await expect(stop.alert).toContainText('You still have your places. Try again in a moment.');
    await expect(stop.stopButton).toHaveText('Stop going');
    await stop.stopButton.click();
    await expect(stop.dialog).toHaveCount(0);
    await expect(series.confirmed).toHaveText('Registered for 1 date');
  });

  test('A date that filled meanwhile closes the dialog and the page names it, keeping the ticks', async ({
    page,
    api,
  }) => {
    const { series } = await changing(page, api, (n) =>
      n === 0 ? { status: 409, json: { code: 'event_full', sessions: [5] } } : null,
    );
    const stop = new WebStopDatesDialog(page);
    await series.dropInBox(6).click();
    await series.dropInBox(5).click();
    await series.panelButton.click();

    await stop.stopButton.click();

    await expect(stop.dialog).toHaveCount(0);
    await expect(series.failure).toHaveText('Sat May 2 is full. Untick it and try again.');
    await expect(series.dropInBox(5)).toBeChecked();
    await expect(series.dropInBox(6)).not.toBeChecked();
    await expect(series.panelButton).toHaveText('Save dates');
  });
});

// L2-053 AC4 (ADR 0102): a joined member changes their dates; the confirmation then counts the
// dates to come they hold, and each date to come reads Registered or Not going.
test.describe('Member app, drop in on series dates: a joined member changing dates', () => {
  /** Saturday Park Bootcamp joined: a place at sessions 4 to 8. */
  const JOINED = joinedOf(PARK_BOOTCAMP_DETAIL);

  test('The joined panel offers Change dates between its actions and Leave the series', async ({
    page,
    api,
  }) => {
    answerPhotos(api);
    answerSeriesDetail(api, [JOINED]);
    const series = new WebEventSeriesPage(page);

    await series.open(JOINED.id);

    await expect(series.confirmed).toHaveText("You're in for every session");
    await expect(series.panelButtons).toHaveText(['All dates', 'Change dates', 'Leave the series']);
    await expect(series.groupChatLink).toBeVisible();
  });

  test('Change dates ticks every date held, keeps the confirmation, and Cancel goes back', async ({
    page,
    api,
  }) => {
    answerPhotos(api);
    answerSeriesDetail(api, [JOINED]);
    const series = new WebEventSeriesPage(page);
    await series.open(JOINED.id);

    await series.changeDatesButton.click();

    await expect(series.confirmed).toHaveText("You're in for every session");
    await expect(series.planGroup).toHaveCount(0);
    await expect(series.dropInBoxes).toHaveCount(5);
    for (const n of [4, 5, 6, 7, 8]) await expect(series.dropInBox(n)).toBeChecked();
    await expect(series.panelButton).toHaveText('Save dates');
    await expect(series.panelButton).toBeDisabled();
    await expect(series.leaveButton).toHaveCount(0);
    await series.cancelButton.click();
    await expect(series.dropInBoxes).toHaveCount(0);
    await expect(series.leaveButton).toBeVisible();
  });

  test('Giving a date up asks first, then the panel counts the dates held and each date to come says Registered or Not going', async ({
    page,
    api,
  }) => {
    answerPhotos(api);
    answerSeriesDetail(api, [JOINED]);
    const sent = answerDropIns(api, [JOINED]);
    const series = new WebEventSeriesPage(page);
    const stop = new WebStopDatesDialog(page);
    await series.open(JOINED.id);
    await series.changeDatesButton.click();
    await series.dropInBox(5).click();

    await series.panelButton.click();
    await expect(stop.title).toHaveText('Stop going to 1 date?');
    await expect(stop.subtitle).toHaveText('Saturday Park Bootcamp · Sat May 2');
    await stop.stopButton.click();

    await expect(series.confirmed).toHaveText("You're in for 4 of 5 sessions to come");
    expect(sent.map((ids) => [...ids].sort())).toEqual([
      [bootcamp(4), bootcamp(6), bootcamp(7), bootcamp(8)].sort(),
    ]);
    await expect(series.sessionMeta(4)).toHaveText(
      'Session 4 · Sat, Apr 25 · Next up · Registered',
    );
    await expect(series.sessionMeta(5)).toHaveText('Session 5 · Sat, May 02 · Not going');
    await expect(series.details(5)).toHaveCount(0);
    await expect(series.details(6)).toBeVisible();
    await expect(series.sessionMeta(3)).toHaveText('Session 3 · Sat, Apr 18');
    await expect(series.leaveButton).toBeVisible();
  });

  test('Ticking a date given up again saves without asking and the member is in for every session', async ({
    page,
    api,
  }) => {
    const gaveUp5: SeriesDetail = {
      ...JOINED,
      sessions: JOINED.sessions.map((session) => ({
        ...session,
        held: session.held && session.number !== 5,
      })),
    };
    answerPhotos(api);
    answerSeriesDetail(api, [gaveUp5]);
    const sent = answerDropIns(api, [gaveUp5]);
    const series = new WebEventSeriesPage(page);
    await series.open(gaveUp5.id);
    await expect(series.confirmed).toHaveText("You're in for 4 of 5 sessions to come");
    await series.changeDatesButton.click();
    await series.dropInBox(5).click();

    await series.panelButton.click();

    await expect(series.confirmed).toHaveText("You're in for every session");
    expect(sent).toHaveLength(1);
    await expect(new WebStopDatesDialog(page).dialog).toHaveCount(0);
    await expect(series.sessionMeta(5)).toHaveText('Session 5 · Sat, May 02');
  });
});
