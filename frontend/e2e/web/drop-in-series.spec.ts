import { expect, test } from '../fixtures/test';
import { answerPhotos } from '../fixtures/directory';
import { answerSeriesDetail, PARK_BOOTCAMP_DETAIL, type SeriesDetail } from '../fixtures/series';
import { WebEventSeriesPage } from '../page-objects/web/event-series.page';

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
