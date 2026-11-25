import { CAST_EVENTS, eventList, problem } from '../fixtures/admin-events';
import {
  COUCH_TO_5K,
  rowOf,
  seriesList,
  STRETCH_NO_DATES,
  type AdminSeriesFixture,
} from '../fixtures/admin-series';
import { XSRF_TOKEN } from '../fixtures/api-handlers';
import { expect, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { AddSessionDialog } from '../page-objects/admin/add-session.dialog';
import { AdminEventsPage } from '../page-objects/admin/events.page';
import { AdminSeriesPage } from '../page-objects/admin/series.page';

/** The mocks' today: Wednesday April 15, 2026, 8:45 AM in Toronto. */
const MOCKS_NOW = new Date('2026-04-15T12:45:00Z');

/** Couch to 5K with June 2 added as session 9 (mock `admin-series/date-added`). */
const COUCH_WITH_JUNE_2: AdminSeriesFixture = {
  ...COUCH_TO_5K,
  cadence: { weekday: 2, dates: 8 },
  lastStartsAt: '2026-06-02T22:30:00+00:00',
  sessionsLeft: 6,
  sessionsHeld: 8,
  sessions: [
    ...COUCH_TO_5K.sessions,
    {
      id: '0190c0de-0000-7000-8000-0000000c5009',
      number: 9,
      startsAt: '2026-06-02T22:30:00+00:00',
      endsAt: '2026-06-02T23:30:00+00:00',
      topic: 'Make-up run for Victoria Day week',
      state: 'upcoming',
    },
  ],
};

/** Answers the list and `series`, and Add a date on it with `reply` (the series with June 2 unless given). */
function answerAdd(
  api: ApiHandlers,
  series: AdminSeriesFixture = COUCH_TO_5K,
  reply: () => ApiReply | Promise<ApiReply> = () => ({ status: 201, json: COUCH_WITH_JUNE_2 }),
): { body: unknown; token: string | null }[] {
  const sent: { body: unknown; token: string | null }[] = [];
  api.on('GET', '/api/admin/series', () => seriesList([rowOf(series)]));
  api.on('GET', `/api/admin/series/${series.id}`, () => ({ json: series }));
  api.on('POST', `/api/admin/series/${series.id}/sessions`, (request) => {
    sent.push({ body: request.postDataJSON(), token: request.headers()['x-xsrf-token'] ?? null });
    return reply();
  });
  return sent;
}

// L2-071 AC14 (ADR 0091): Add a date opens a dialog with the next week's date at the series'
// time; an added date sits among the sessions in date order and a toast says so. A start not after
// now and an end not after the start are named before anything is sent.
test.describe('Admin app, Add a date to a series', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(MOCKS_NOW);
  });

  test('opens the dialog the default mock draws: the week after the last date, at its time', async ({
    page,
    api,
  }) => {
    answerAdd(api);
    const series = new AdminSeriesPage(page);
    const dialog = new AddSessionDialog(page);
    await series.open();
    await expect(series.summaryTitle).toHaveText('Couch to 5K Run Club');

    await series.addDateButton.click();

    await expect(dialog.dialog).toBeVisible();
    await expect(dialog.subtitle).toHaveText('Couch to 5K Run Club · becomes session 9');
    await expect.poll(() => dialog.isFocused(dialog.date)).toBe(true);
    await expect(dialog.date).toHaveValue('2026-06-02');
    await expect(dialog.start).toHaveValue('18:30');
    await expect(dialog.end).toHaveValue('19:30');
    await expect(dialog.topic).toHaveValue('');
    await expect(dialog.topicHint).toHaveText('What this session covers');
    await expect(dialog.addButton).toHaveText('Add date');
  });

  test('Add date sends the date, closes, says it was added and lists it in date order', async ({
    page,
    api,
  }) => {
    const sent = answerAdd(api);
    const series = new AdminSeriesPage(page);
    const dialog = new AddSessionDialog(page);
    await series.open();
    await series.addDateButton.click();
    await dialog.topic.fill('Make-up run for Victoria Day week');

    await dialog.add();

    await expect(dialog.dialog).toHaveCount(0);
    expect(sent).toEqual([
      {
        body: {
          date: '2026-06-02',
          startTime: '18:30',
          endTime: '19:30',
          topic: 'Make-up run for Victoria Day week',
        },
        token: XSRF_TOKEN,
      },
    ]);
    await expect(series.toastTitle).toHaveText('Tue Jun 2 added');
    await expect(series.toastText).toHaveText('It is now listed under Events.');
    await expect(series.sessions).toHaveCount(9);
    expect((await series.sessionTexts())[8]?.slice(0, 3)).toEqual([
      '9',
      'Tue Jun 02',
      'Make-up run for Victoria Day week',
    ]);
    expect(await series.statTexts()).toContainEqual(['Sessions left', '6 of 8']);
  });

  // Mock add-session/invalid.
  test('a start before now and an end before the start are named before anything is sent', async ({
    page,
    api,
  }) => {
    const sent = answerAdd(api);
    const series = new AdminSeriesPage(page);
    const dialog = new AddSessionDialog(page);
    await series.open();
    await series.addDateButton.click();
    await dialog.fill('2026-04-10', '18:30', '18:00', 'Make-up run for Victoria Day week');

    await dialog.add();

    await expect(dialog.alertTitle).toHaveText('2 things to fix before adding');
    await expect(dialog.alertLinks).toHaveText([
      'Pick a date and start time after now',
      'End the session after it starts, at 6:30 PM',
    ]);
    expect(
      await dialog.alertLinks.evaluateAll((links) => links.map((l) => l.getAttribute('href'))),
    ).toEqual(['#f-date', '#f-end']);
    await expect(dialog.date).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.end).toHaveAttribute('aria-invalid', 'true');
    await expect.poll(() => dialog.isFocused(dialog.alert)).toBe(true);
    expect(sent).toEqual([]);
  });

  test('a date the server refuses as past is named on Date', async ({ page, api }) => {
    answerAdd(api, COUCH_TO_5K, () =>
      problem(400, 'validation_failed', { fieldCodes: { date: 'start_in_past' } }),
    );
    const series = new AdminSeriesPage(page);
    const dialog = new AddSessionDialog(page);
    await series.open();
    await series.addDateButton.click();

    await dialog.add();

    await expect(dialog.alertLinks).toHaveText(['Pick a date and start time after now']);
    await expect(dialog.date).toHaveValue('2026-06-02');
  });

  // Mock add-session/busy: a gate holds the answer.
  test('while adding, the button reads "Adding…", Cancel is disabled and the fields are read-only', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    answerAdd(api, COUCH_TO_5K, async () => {
      await gate;
      return { status: 201, json: COUCH_WITH_JUNE_2 };
    });
    const series = new AdminSeriesPage(page);
    const dialog = new AddSessionDialog(page);
    await series.open();
    await series.addDateButton.click();

    await dialog.add();

    await expect(dialog.addButton).toHaveText('Adding…');
    await expect(dialog.addButton).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.cancelButton).toBeDisabled();
    for (const input of await dialog.inputs.all()) {
      await expect(input).toHaveAttribute('readonly', '');
    }
    release();
    await expect(dialog.dialog).toHaveCount(0);
  });

  // Mock add-session/failed.
  test('an add the server failed says so and keeps what was typed', async ({ page, api }) => {
    answerAdd(api, COUCH_TO_5K, () => ({ status: 500, json: { code: 'internal_error' } }));
    const series = new AdminSeriesPage(page);
    const dialog = new AddSessionDialog(page);
    await series.open();
    await series.addDateButton.click();
    await dialog.topic.fill('Make-up run');

    await dialog.add();

    await expect(dialog.alertTitle).toHaveText("We couldn't add this date");
    await expect(dialog.alert).toContainText(
      'Nothing was changed and nobody was told. Try again in a moment.',
    );
    await expect(dialog.topic).toHaveValue('Make-up run');
    await expect(dialog.addButton).toHaveText('Add date');
  });

  test('Cancel and Escape close the dialog without adding', async ({ page, api }) => {
    const sent = answerAdd(api);
    const series = new AdminSeriesPage(page);
    const dialog = new AddSessionDialog(page);
    await series.open();

    await series.addDateButton.click();
    await dialog.cancelButton.click();
    await expect(dialog.dialog).toHaveCount(0);
    await series.addDateButton.click();
    await dialog.pressEscape();

    await expect(dialog.dialog).toHaveCount(0);
    expect(sent).toEqual([]);
  });

  // Mock admin-series/series-created: the tight empty state offers the first date.
  test('a series with no dates offers Add a date in its empty state, as session 1 with no date', async ({
    page,
    api,
  }) => {
    answerAdd(api, STRETCH_NO_DATES);
    const series = new AdminSeriesPage(page);
    const dialog = new AddSessionDialog(page);
    await series.open();

    await series.noDatesAddButton.click();

    await expect(dialog.subtitle).toHaveText('Sunday Stretch & Prayer · becomes session 1');
    await expect(dialog.date).toHaveValue('');
    await expect(dialog.start).toHaveValue('');
    await expect(dialog.end).toHaveValue('');
  });
});

// L2-071 AC6 (ADR 0091; mock admin-events/default): a session is tagged with its series in Events.
test.describe('Admin app, a series session in Events', () => {
  test('reads "Part of" its series before its place', async ({ page, api }) => {
    const tagged = CAST_EVENTS.map((event) =>
      event.title === 'Saturday Park Bootcamp'
        ? { ...event, series: { id: 'b1', title: 'Saturday Park Bootcamp' } }
        : { ...event, series: null },
    );
    api.on('GET', '/api/admin/events', () => eventList(tagged));
    const events = new AdminEventsPage(page);

    await events.open();

    await expect(events.rows).toHaveCount(tagged.length);
    const rows = await events.rowTexts();
    expect(rows.find((row) => row[0] === 'Saturday Park Bootcamp')?.[1]).toBe(
      'Part of Saturday Park Bootcamp · Trillium Park, Ontario Place',
    );
    expect(rows.find((row) => row[0] === 'Easter Sunrise 5K')?.[1]).toBe(
      'Martin Goodman Trail, Marilyn Bell Park',
    );
  });
});
