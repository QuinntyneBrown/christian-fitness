import {
  BOOTCAMP_SERIES,
  COUCH_TO_5K,
  HOOPS_SERIES,
  rowOf,
  SERIES_ROWS,
  seriesList,
  STRETCH_NO_DATES,
  type AdminSeriesFixture,
} from '../fixtures/admin-series';
import { expect, MODERATOR_SIGNED_IN, test, type ApiHandlers } from '../fixtures/test';
import { AdminSeriesPage } from '../page-objects/admin/series.page';

/** Answers the list and each series by its id, and records each series asked for. */
function answerSeries(
  api: ApiHandlers,
  series: AdminSeriesFixture[] = [COUCH_TO_5K, BOOTCAMP_SERIES],
  rows = SERIES_ROWS,
): string[] {
  const asked: string[] = [];
  api.on('GET', '/api/admin/series', () => seriesList(rows));
  for (const one of series) {
    api.on('GET', `/api/admin/series/${one.id}`, () => {
      asked.push(one.id);
      return { json: one };
    });
  }
  return asked;
}

/** Sunday Stretch & Prayer just created: no dates yet (mock `admin-series/series-created`). */
// L2-071 AC1 to AC3 (ADR 0080, ADR 0091): Event series lists every series with its cadence, time
// and joined of capacity, chooses the first, and shows it with its summary and sessions.
test.describe('Admin app, the Event series page', () => {
  test(
    'lists the series and shows the first, as the default mock draws it',
    { tag: '@critical' },
    async ({ page, api }) => {
      const asked = answerSeries(api);
      const series = new AdminSeriesPage(page);

      await series.open();

      await expect(series.heading).toHaveText('Event series');
      await expect.poll(() => series.title()).toBe('Event series · Christian Fitness Admin');
      await expect(series.subtitle).toHaveText(
        'Recurring programs. Members join the whole series or drop in to one date.',
      );
      await expect(series.cards).toHaveCount(3);
      expect(await series.cardTexts()).toEqual([
        ['Couch to 5K Run Club', 'Every Tuesday · 6:30 PM', '31 / 40 joined'],
        ['Saturday Park Bootcamp', 'Every Saturday · 8:00 AM', '38 / 50 joined'],
        ['Women’s Hoops & Devotion', '6 dates · 7:00 PM', '24 / 30 joined'],
      ]);
      await expect(series.currentCard).toHaveCount(1);
      await expect(series.currentCard.locator('.pick-card__title')).toHaveText(
        'Couch to 5K Run Club',
      );
      await expect(series.card('Saturday Park Bootcamp')).toHaveAttribute(
        'href',
        `/series?id=${BOOTCAMP_SERIES.id}`,
      );

      await expect(series.summaryTitle).toHaveText('Couch to 5K Run Club');
      await expect(series.main.getByRole('region', { name: 'Couch to 5K Run Club' })).toBeVisible();
      await expect(series.summaryImage).toHaveAttribute('src', '/images/events/run.jpg');
      await expect(series.summaryImage).toHaveAttribute('alt', '');
      await expect(series.summaryHost).toHaveText('Hosted by Lakeshore Runners Fellowship');
      await expect(series.summaryFacts).toHaveText([
        'Every Tuesday, 6:30 PM · Apr 7 – May 26',
        'Humber Bay Park East',
      ]);
      expect(await series.statTexts()).toEqual([
        ['Joined', '31 of 40', '78% full'],
        ['Price', 'Free', 'Drop-in Free'],
        ['Sessions left', '5 of 7'],
      ]);
      await expect(series.meter).toHaveAttribute('max', '40');
      await expect(series.meter).toHaveAttribute('value', '31');

      await expect(series.sessionsHeading).toBeVisible();
      expect(await series.sessionTexts()).toEqual([
        ['1', 'Tue Apr 07', 'Walk, run 60 seconds, repeat. Meet your pace group', 'Done'],
        ['2', 'Tue Apr 14', 'Run 90 seconds, walk 2 minutes', 'Done'],
        ['3', 'Tue Apr 21', 'Same intervals, six times through', 'Live'],
        ['4', 'Tue Apr 28', 'First 5-minute run', ''],
        ['5', 'Tue May 05', 'Two 8-minute runs', ''],
        ['6', 'Tue May 12', 'No class: Victoria Day week', 'Cancelled'],
        ['7', 'Tue May 19', 'Twenty minutes without stopping', ''],
        ['8', 'Tue May 26', 'Graduation 5K and potluck', ''],
      ]);
      expect(await series.sessionClasses()).toEqual([
        'admin-session admin-session--past',
        'admin-session admin-session--past',
        'admin-session',
        'admin-session',
        'admin-session',
        'admin-session admin-session--cancelled',
        'admin-session',
        'admin-session',
      ]);
      // The session list is ordered and its numbers are read in its order, not twice.
      await expect(series.main.locator('ol.admin-sessions')).toHaveCount(1);
      await expect(series.sessions.first().locator('.admin-session__n')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(asked).toEqual([COUCH_TO_5K.id]);
    },
  );

  test('choosing another series marks it current and shows it, without reloading', async ({
    page,
    api,
  }) => {
    const asked = answerSeries(api);
    const series = new AdminSeriesPage(page);
    await series.open();
    await expect(series.summaryTitle).toHaveText('Couch to 5K Run Club');
    await page.evaluate(() => ((window as unknown as { cfMark?: boolean }).cfMark = true));

    await series.card('Saturday Park Bootcamp').click();

    await expect(series.summaryTitle).toHaveText('Saturday Park Bootcamp');
    await expect(series.currentCard.locator('.pick-card__title')).toHaveText(
      'Saturday Park Bootcamp',
    );
    expect(series.pathAndQuery()).toBe(`/series?id=${BOOTCAMP_SERIES.id}`);
    await expect(series.summaryHost).toHaveText('Hosted by Danielle Okafor');
    await expect(series.summaryImage).toHaveAttribute('src', '/images/events/bootcamp.jpg');
    await expect(series.summaryFacts).toHaveText([
      'Every Saturday, 8:00 AM · Apr 4 – May 23',
      'Trillium Park, Ontario Place',
    ]);
    expect(await series.statTexts()).toEqual([
      ['Joined', '38 of 50', '76% full'],
      ['Price', '$64 for all 8', 'Drop-in $10'],
      ['Sessions left', '5 of 8'],
    ]);
    expect((await series.sessionTexts()).map((row) => row.slice(1))).toEqual([
      ['Sat Apr 04', 'Baseline: push-ups, squats, 1K walk-run', 'Done'],
      ['Sat Apr 11', 'Lower body and core', 'Done'],
      ['Sat Apr 18', 'Upper body and carries', 'Done'],
      ['Sat Apr 25', 'Partner circuits', 'Live'],
      ['Sat May 02', 'Hills and sprints', ''],
      ['Sat May 09', 'Mother’s Day mobility', ''],
      ['Sat May 16', 'Full-body ladder', ''],
      ['Sat May 23', '', ''],
    ]);
    expect(await page.evaluate(() => (window as unknown as { cfMark?: boolean }).cfMark)).toBe(
      true,
    );
    expect(asked).toEqual([COUCH_TO_5K.id, BOOTCAMP_SERIES.id]);
  });

  test('a link to one series opens with that series chosen', async ({ page, api }) => {
    const asked = answerSeries(api);
    const series = new AdminSeriesPage(page);

    await series.open(BOOTCAMP_SERIES.id);

    await expect(series.summaryTitle).toHaveText('Saturday Park Bootcamp');
    await expect(series.currentCard.locator('.pick-card__title')).toHaveText(
      'Saturday Park Bootcamp',
    );
    expect(asked).toEqual([BOOTCAMP_SERIES.id]);
  });

  // Mock admin-series/series-created: a series with no dates says so.
  test('a series with no dates says "No dates yet" and has no cadence', async ({ page, api }) => {
    answerSeries(api, [STRETCH_NO_DATES], [rowOf(STRETCH_NO_DATES), HOOPS_SERIES]);
    const series = new AdminSeriesPage(page);

    await series.open();

    await expect(series.summaryTitle).toHaveText('Sunday Stretch & Prayer');
    expect((await series.cardTexts())[0]).toEqual([
      'Sunday Stretch & Prayer',
      'No dates yet',
      '0 / 25 joined',
    ]);
    await expect(series.summaryFacts).toHaveText(['St. Lawrence Community Rec Centre']);
    expect(await series.statTexts()).toEqual([
      ['Joined', '0 of 25', '0% full'],
      ['Price', 'Free', 'Drop-in Free'],
      ['Sessions left', '0 of 0'],
    ]);
    await expect(series.sessions).toHaveCount(0);
    await expect(series.noDates.locator('.empty-state__title')).toHaveText('No dates yet');
    await expect(series.noDates.locator('.empty-state__text')).toHaveText(
      'Members can join once the series has dates. Add the first one.',
    );
  });

  test('titles, hosts and topics are rendered as text, never as HTML', async ({ page, api }) => {
    const odd: AdminSeriesFixture = {
      ...COUCH_TO_5K,
      title: '<b>Bold</b> Run Club',
      host: { ...COUCH_TO_5K.host, name: '<i>Lakeshore</i>' },
      sessions: [{ ...COUCH_TO_5K.sessions[0], topic: '<img src=x onerror=alert(1)>' }],
    };
    answerSeries(api, [odd], [rowOf(odd)]);
    const series = new AdminSeriesPage(page);

    await series.open();

    await expect(series.cardTitles).toHaveText(['<b>Bold</b> Run Club']);
    await expect(series.summaryTitle).toHaveText('<b>Bold</b> Run Club');
    await expect(series.summaryHost).toHaveText('Hosted by <i>Lakeshore</i>');
    expect((await series.sessionTexts())[0][2]).toBe('<img src=x onerror=alert(1)>');
    await expect(series.main.locator('b, i, img:not(.series-summary-card__image)')).toHaveCount(0);
  });

  // Mock admin-series/loading: a gate holds the answer, so no clock is needed.
  test('while the series load, skeletons are busy', async ({ page, api }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    answerSeries(api);
    api.on('GET', '/api/admin/series', async () => {
      await gate;
      return seriesList();
    });
    const series = new AdminSeriesPage(page);

    await series.open();

    await expect(series.loading).toBeVisible();
    await expect(series.loadingLabel).toHaveText('Loading series');
    await expect(series.skeletons).not.toHaveCount(0);
    await expect(series.cards).toHaveCount(0);
    release();
    await expect(series.cards).toHaveCount(3);
    await expect(series.summaryTitle).toHaveText('Couch to 5K Run Club');
    await expect(series.loading).toHaveCount(0);
  });

  // Mock admin-series/empty.
  test('with no series, the empty state says what a series is', async ({ page, api }) => {
    answerSeries(api, [], []);
    const series = new AdminSeriesPage(page);

    await series.open();

    await expect(series.emptyTitle).toHaveText('No series yet');
    await expect(series.emptyText).toHaveText(
      'A series is a run of dated sessions members join once, such as eight Tuesdays of Couch to 5K.',
    );
    await expect(series.picker).toHaveCount(0);
    await expect(series.summary).toHaveCount(0);
  });

  // L2-071 AC8 (ADR 0064): a Moderator uses Event series as an Admin does.
  test('a Moderator sees the same series', async ({ page, api }) => {
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    answerSeries(api);
    const series = new AdminSeriesPage(page);

    await series.open();

    await expect(series.cards).toHaveCount(3);
    await expect(series.summaryTitle).toHaveText('Couch to 5K Run Club');
  });
});

// L2-071 AC8: series that cannot be loaded show the error state; Try again asks again.
test.describe('Admin app, the Event series page when the series do not load', () => {
  test('no list shows "Series didn\'t load", and Try again loads them', async ({ page, api }) => {
    let fail = true;
    answerSeries(api);
    api.on('GET', '/api/admin/series', () => (fail ? { abort: true } : seriesList()));
    const series = new AdminSeriesPage(page);

    await series.open();

    await expect(series.error).toHaveAttribute('role', 'alert');
    await expect(series.errorTitle).toHaveText("Series didn't load");
    await expect(series.errorText).toHaveText(
      "We couldn't reach Christian Fitness. Check your connection and try again.",
    );
    await expect(series.picker).toHaveCount(0);
    fail = false;

    await series.tryAgainButton.click();

    await expect(series.cards).toHaveCount(3);
    await expect(series.summaryTitle).toHaveText('Couch to 5K Run Club');
    await expect(series.error).toHaveCount(0);
  });

  test('a chosen series that does not load shows the error, and Try again loads it', async ({
    page,
    api,
  }) => {
    let fail = true;
    answerSeries(api);
    api.on('GET', `/api/admin/series/${COUCH_TO_5K.id}`, () =>
      fail ? { abort: true } : { json: COUCH_TO_5K },
    );
    const series = new AdminSeriesPage(page);

    await series.open();

    await expect(series.errorTitle).toHaveText("Series didn't load");
    fail = false;

    await series.tryAgainButton.click();

    await expect(series.summaryTitle).toHaveText('Couch to 5K Run Club');
    await expect(series.error).toHaveCount(0);
  });
});
