import { expect, test } from '../fixtures/test';
import type { Download } from '@playwright/test';
import { answerPhotos } from '../fixtures/directory';
import {
  answerSeriesDetail,
  answerSeriesJoin,
  COUCH_TO_5K_DETAIL,
  PARK_BOOTCAMP_DETAIL,
  type SeriesDetail,
} from '../fixtures/series';
import { WebEventSeriesPage } from '../page-objects/web/event-series.page';

/** Couch to 5K, free, before the member joined: no place held, 9 of 40 spots left. */
const COUCH_NOT_JOINED: SeriesDetail = {
  ...COUCH_TO_5K_DETAIL,
  joined: false,
  sessions: COUCH_TO_5K_DETAIL.sessions.map((session) => ({ ...session, held: false })),
};

// L2-052 AC1, AC2 and AC4 (ADR 0101): "Every session" or "Pick dates to drop in" in one radio
// group, and "Join the series" holds a place at every session to come.
test.describe('Member app, join a series', () => {
  test(
    'Every session is chosen by default, and joining a paid series says the member is in and how to pay',
    { tag: '@critical' },
    async ({ page, api }) => {
      answerPhotos(api);
      answerSeriesDetail(api, [PARK_BOOTCAMP_DETAIL]);
      const joined = answerSeriesJoin(api, [PARK_BOOTCAMP_DETAIL]);
      const series = new WebEventSeriesPage(page);
      await series.open(PARK_BOOTCAMP_DETAIL.id);
      await expect(series.everySession).toBeChecked();
      await expect(series.dropIn).not.toBeChecked();

      await series.panelButton.click();

      await expect(series.confirmed).toHaveText("You're in for every session");
      expect(joined).toEqual([PARK_BOOTCAMP_DETAIL.id]);
      await expect(series.payNotes).toHaveText([
        "Pay the host at your first session, by cash or e-transfer. You won't be charged online.",
      ]);
      await expect(series.planGroup).toHaveCount(0);
      await expect(series.panel.getByRole('button', { name: 'Join the series' })).toHaveCount(0);
    },
  );

  test('A free series reads no payment note once joined', async ({ page, api }) => {
    answerSeriesDetail(api, [COUCH_NOT_JOINED]);
    answerSeriesJoin(api, [COUCH_NOT_JOINED]);
    const series = new WebEventSeriesPage(page);
    await series.open(COUCH_NOT_JOINED.id);

    await series.panelButton.click();

    await expect(series.confirmed).toHaveText("You're in for every session");
    await expect(series.payNotes).toHaveCount(0);
  });

  test('While the join waits, the button reads "Joining…" and nothing can be pressed or chosen', async ({
    page,
    api,
  }) => {
    answerPhotos(api);
    answerSeriesDetail(api, [PARK_BOOTCAMP_DETAIL]);
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    const joined = answerSeriesJoin(api, [PARK_BOOTCAMP_DETAIL], async () => {
      await held;
      return null;
    });
    const series = new WebEventSeriesPage(page);
    await series.open(PARK_BOOTCAMP_DETAIL.id);

    await series.panelButton.click();

    await expect(series.panelButton).toHaveText('Joining…');
    await expect(series.panelButton).toBeDisabled();
    await expect(series.panelButton).toHaveAttribute('aria-busy', 'true');
    await expect(series.everySession).toBeDisabled();
    await expect(series.dropIn).toBeDisabled();
    await expect(series.everySession).toBeChecked();
    release();
    await expect(series.confirmed).toHaveText("You're in for every session");
    expect(joined).toHaveLength(1);
  });

  test('Choosing "Pick dates to drop in" by keyboard asks for dates and the button waits for one', async ({
    page,
    api,
  }) => {
    answerPhotos(api);
    answerSeriesDetail(api, [PARK_BOOTCAMP_DETAIL]);
    const joined = answerSeriesJoin(api, [PARK_BOOTCAMP_DETAIL]);
    const series = new WebEventSeriesPage(page);
    await series.open(PARK_BOOTCAMP_DETAIL.id);
    await series.everySession.focus();

    await page.keyboard.press('ArrowDown');

    await expect(series.dropIn).toBeChecked();
    await expect(series.plans.nth(1)).toContainText('Tick dates in the list');
    await expect(series.panelButton).toHaveText('Pick a date first');
    await expect(series.panelButton).toBeDisabled();
    await page.keyboard.press('ArrowUp');
    await expect(series.everySession).toBeChecked();
    await expect(series.plans.nth(1)).toContainText('Come when you can');
    await expect(series.panelButton).toHaveText('Join the series');
    await expect(series.panelButton).toBeEnabled();
    expect(joined).toEqual([]);
  });
});

// L2-052 AC5, AC7 and AC8 (ADR 0101): a full series, and joins that are refused.
test.describe('Member app, join a series: full and refused', () => {
  test('A full series reads "Series full", every session cannot be chosen and says why, and drop-in is chosen', async ({
    page,
    api,
  }) => {
    answerPhotos(api);
    answerSeriesDetail(api, [{ ...PARK_BOOTCAMP_DETAIL, spotsLeft: 0 }]);
    const series = new WebEventSeriesPage(page);

    await series.open(PARK_BOOTCAMP_DETAIL.id);

    await expect(series.spots).toHaveText('Series full');
    await expect(series.everySession).toBeDisabled();
    await expect(series.plans.first()).toContainText('Every place in the series is taken');
    await expect(series.dropIn).toBeChecked();
    await expect(series.panelButton).toHaveText('Pick a date first');
    await expect(series.panelButton).toBeDisabled();
  });

  test('A join refused series_full shows the series as full without asking for it again', async ({
    page,
    api,
  }) => {
    answerPhotos(api);
    const read = answerSeriesDetail(api, [PARK_BOOTCAMP_DETAIL]);
    answerSeriesJoin(api, [PARK_BOOTCAMP_DETAIL], () => ({
      status: 409,
      json: { code: 'series_full' },
    }));
    const series = new WebEventSeriesPage(page);
    await series.open(PARK_BOOTCAMP_DETAIL.id);

    await series.panelButton.click();

    await expect(series.spots).toHaveText('Series full');
    await expect(series.everySession).toBeDisabled();
    await expect(series.dropIn).toBeChecked();
    await expect(series.panelButton).toHaveText('Pick a date first');
    await expect(series.failure).toHaveCount(0);
    expect(read).toHaveLength(1);
  });

  for (const [why, reply] of [
    ['refused account_suspended', { status: 403, json: { code: 'account_suspended' } }],
    ['not answered', { abort: true }],
  ] as const) {
    test(`A join ${why} shows a generic message above the button, which stays usable`, async ({
      page,
      api,
    }) => {
      answerPhotos(api);
      answerSeriesDetail(api, [PARK_BOOTCAMP_DETAIL]);
      const joined = answerSeriesJoin(api, [PARK_BOOTCAMP_DETAIL], (n) => (n === 0 ? reply : null));
      const series = new WebEventSeriesPage(page);
      await series.open(PARK_BOOTCAMP_DETAIL.id);

      await series.panelButton.click();

      await expect(series.failure).toHaveText("We couldn't sign you up. Try again in a moment.");
      await expect(series.panelButton).toHaveText('Join the series');
      await expect(series.panelButton).toBeEnabled();
      await expect(series.everySession).toBeChecked();
      await expect(series.everySession).toBeEnabled();
      await series.panelButton.click();
      await expect(series.confirmed).toHaveText("You're in for every session");
      expect(joined).toHaveLength(2);
    });
  }
});

/** The text of a download. */
async function textOf(download: Download): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

// L2-052 AC3 and AC4 (ADR 0101): what a member who joined sees.
test.describe('Member app, join a series: the joined panel', () => {
  test('A member who joined sees their progress, All dates, Group chat and Leave the series', async ({
    page,
    api,
  }) => {
    answerSeriesDetail(api, [COUCH_TO_5K_DETAIL]);
    const series = new WebEventSeriesPage(page);

    await series.open(COUCH_TO_5K_DETAIL.id);

    await expect(series.confirmed).toHaveText("You're in for every session");
    await expect(series.progressLabel).toHaveText('Your progress');
    await expect(series.progressCount).toHaveText('Attendance not recorded yet');
    await expect(series.allDatesButton).toBeVisible();
    await expect(series.groupChatLink).toHaveAttribute(
      'href',
      `/events/series/${COUCH_TO_5K_DETAIL.id}/chat`,
    );
    await expect(series.leaveButton).toBeVisible();
  });

  test('All dates downloads one calendar file with every session still to come', async ({
    page,
    api,
  }) => {
    answerSeriesDetail(api, [COUCH_TO_5K_DETAIL]);
    const series = new WebEventSeriesPage(page);
    await series.open(COUCH_TO_5K_DETAIL.id);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      series.allDatesButton.click(),
    ]);

    expect(download.suggestedFilename()).toBe('couch-to-5k-run-club.ics');
    const calendar = await textOf(download);
    const lines = calendar.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    // April 21, 28, May 5, 19 and 26: not the two done, nor the cancelled May 12.
    expect(lines.filter((line) => line.startsWith('DTSTART:'))).toEqual([
      'DTSTART:20260421T223000Z',
      'DTSTART:20260428T223000Z',
      'DTSTART:20260505T223000Z',
      'DTSTART:20260519T223000Z',
      'DTSTART:20260526T223000Z',
    ]);
    expect(lines).toContain('DTEND:20260421T233000Z');
    expect(lines).toContain('LOCATION:Humber Bay Park East\\, Etobicoke\\, Toronto');
    expect(lines.at(-2)).toBe('END:VCALENDAR');
  });

  test('Joining a paid series after dropping in on a date says that date keeps the drop-in price', async ({
    page,
    api,
  }) => {
    const droppedIn: SeriesDetail = {
      ...PARK_BOOTCAMP_DETAIL,
      sessions: PARK_BOOTCAMP_DETAIL.sessions.map((session) => ({
        ...session,
        held: session.number === 4,
      })),
    };
    answerPhotos(api);
    answerSeriesDetail(api, [droppedIn]);
    answerSeriesJoin(api, [droppedIn]);
    const series = new WebEventSeriesPage(page);
    await series.open(droppedIn.id);

    await series.panelButton.click();

    await expect(series.payNotes).toHaveText([
      "Pay the host at your first session, by cash or e-transfer. You won't be charged online.",
      "You'd already booked session 4, so it stays at the drop-in price ($10). Your other dates are at the series price.",
    ]);
  });
});
