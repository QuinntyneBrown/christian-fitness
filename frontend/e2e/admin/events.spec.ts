import { CAST_EVENTS, eventList, problem, RETREAT_DRAFT } from '../fixtures/admin-events';
import { expect, test, type ApiHandlers } from '../fixtures/test';
import { AdminEventsPage } from '../page-objects/admin/events.page';

/** Answers every list request from `events` by its `status`, and records each tab asked for. */
function answerList(api: ApiHandlers, events = CAST_EVENTS): (string | null)[] {
  const asked: (string | null)[] = [];
  api.on('GET', '/api/admin/events', (request) => {
    const status = new URL(request.url()).searchParams.get('status');
    asked.push(status);
    const shown =
      status === 'published' || status === 'draft'
        ? events.filter((e) => e.status === status)
        : events;
    return eventList(shown, events);
  });
  return asked;
}

// L2-022 AC5 (ADR 0017): the Events page lists every event soonest first, with the date and time in
// Toronto, going / capacity and the status, under All, Published and Draft with their counts.
test.describe('Admin app, the Events page', () => {
  test('lists every event soonest first under All, as the default mock draws it', async ({
    page,
    api,
  }) => {
    const asked = answerList(api);
    const events = new AdminEventsPage(page);

    await events.open();

    await expect(events.heading).toHaveText('Events');
    await expect.poll(() => events.title()).toBe('Events · Christian Fitness Admin');
    await expect(events.subtitle).toHaveText(
      'Published events appear in the member app right away.',
    );
    await expect(events.newEventButton).toBeVisible();
    await expect(events.tabLinks).toHaveText(['All 5', 'Published 4', 'Draft 1']);
    await expect(events.currentTab).toHaveText('All 5');
    await expect(events.rows).toHaveCount(5);
    expect(await events.rowTexts()).toEqual([
      [
        'Easter Sunrise 5K',
        'Martin Goodman Trail, Marilyn Bell Park',
        'Apr 18 · 6:45 AM',
        '142 / 200',
        'Published',
      ],
      [
        'Saturday Park Bootcamp',
        'Trillium Park, Ontario Place',
        'Apr 25 · 8:00 AM',
        '38 / 50',
        'Published',
      ],
      [
        "Women's Hoops & Devotion Night",
        'St. Lawrence Community Rec Centre',
        'Apr 30 · 7:00 PM',
        '24 / 30',
        'Published',
      ],
      [
        'Stretch & Pray: Mobility Morning',
        'Grace Fellowship Hall',
        'May 06 · 9:30 AM',
        '17 / 25',
        'Published',
      ],
      ['Whole Life Retreat', 'Muskoka Woods, Rosseau', 'May 22 · 4:00 PM', '0 / 60', 'Draft'],
    ]);
    expect(asked).toEqual(['all']);
  });

  test('the Draft tab asks for drafts only and marks itself current, without reloading', async ({
    page,
    api,
  }) => {
    const asked = answerList(api);
    const events = new AdminEventsPage(page);
    await events.open();
    await expect(events.rows).toHaveCount(5);
    await page.evaluate(() => ((window as unknown as { cfMark?: boolean }).cfMark = true));

    await events.tab('Draft').click();

    await expect(events.currentTab).toHaveText('Draft 1');
    await expect(events.rows).toHaveCount(1);
    expect(await events.rowTexts()).toEqual([
      ['Whole Life Retreat', 'Muskoka Woods, Rosseau', 'May 22 · 4:00 PM', '0 / 60', 'Draft'],
    ]);
    expect(events.location()).toBe('/events?status=draft');
    expect(asked).toEqual(['all', 'draft']);
    expect(await page.evaluate(() => (window as unknown as { cfMark?: boolean }).cfMark)).toBe(
      true,
    );
    await expect(events.tab('All')).toHaveAttribute('href', '/events');
    await expect(events.tab('Published')).toHaveAttribute('href', '/events?status=published');
  });

  test('opening /events?status=draft shows the Draft tab at once', async ({ page, api }) => {
    const asked = answerList(api);
    const events = new AdminEventsPage(page);

    await events.open('draft');

    await expect(events.currentTab).toHaveText('Draft 1');
    await expect(events.rows).toHaveCount(1);
    expect(asked).toEqual(['draft']);
  });

  test('names are rendered as text, never as HTML', async ({ page, api }) => {
    answerList(api, [
      { ...RETREAT_DRAFT, title: '<b>Whole Life Retreat</b>', place: '<b>Muskoka</b>' },
    ]);
    const events = new AdminEventsPage(page);

    await events.open();

    await expect(events.rows).toHaveCount(1);
    expect((await events.rowTexts())[0]?.slice(0, 2)).toEqual([
      '<b>Whole Life Retreat</b>',
      '<b>Muskoka</b>',
    ]);
    await expect(events.boldInTable()).toHaveCount(0);
  });

  // Mock admin-events/empty.
  test('with no events at all, says so and offers New event', async ({ page }) => {
    const events = new AdminEventsPage(page);

    await events.open();

    await expect(events.emptyTitle).toHaveText('No events yet');
    await expect(events.emptyText).toHaveText(
      'Create the first one. It appears in the member app as soon as you publish it.',
    );
    await expect(events.emptyNewEventButton).toBeVisible();
    await expect(events.tabLinks).toHaveText(['All 0', 'Published 0', 'Draft 0']);
    await expect(events.table).toHaveCount(0);
  });

  // Mock admin-events/tab-empty.
  test('a tab with no events says so, with no New event of its own', async ({ page, api }) => {
    answerList(api, [RETREAT_DRAFT]);
    const events = new AdminEventsPage(page);

    await events.open('published');

    await expect(events.emptyTitle).toHaveText('Nothing published yet');
    await expect(events.emptyText).toHaveText(
      'Publish a draft and it appears here and in the member app.',
    );
    await expect(events.emptyNewEventButton).toHaveCount(0);
    await expect(events.tabLinks).toHaveText(['All 1', 'Published 0', 'Draft 1']);
    await expect(events.currentTab).toHaveText('Published 0');
  });

  // Mock admin-events/loading: a gate holds the answer, so no clock is needed.
  test('while the events load, skeleton rows are busy and the tabs show no counts', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    api.on('GET', '/api/admin/events', async () => {
      await gate;
      return eventList(CAST_EVENTS);
    });
    const events = new AdminEventsPage(page);

    await events.open();

    await expect(events.loading).toBeVisible();
    // Four columns until slice 10.2 adds Edit (ADR 0017), five rows.
    await expect(events.skeletons).toHaveCount(20);
    await expect(events.tabLinks).toHaveText(['All', 'Published', 'Draft']);
    await expect(events.tabCounts).toHaveCount(0);
    release();
    await expect(events.rows).toHaveCount(5);
    await expect(events.loading).toHaveCount(0);
  });
});

// L2-022 AC6 (ADR 0017): events that cannot be loaded show the error state; Try again asks again.
test.describe('Admin app, the Events page when the events do not load', () => {
  test('no answer shows "Events didn\'t load", and Try again loads them', async ({ page, api }) => {
    let fail = true;
    api.on('GET', '/api/admin/events', () => (fail ? { abort: true } : eventList(CAST_EVENTS)));
    const events = new AdminEventsPage(page);

    await events.open();

    await expect(events.error).toHaveAttribute('role', 'alert');
    await expect(events.errorTitle).toHaveText("Events didn't load");
    await expect(events.errorText).toHaveText(
      "We couldn't reach the server. Try again in a moment.",
    );
    await expect(events.table).toHaveCount(0);
    fail = false;
    await events.tryAgainButton.click();
    await expect(events.rows).toHaveCount(5);
    await expect(events.error).toHaveCount(0);
    await expect(events.tabLinks).toHaveText(['All 5', 'Published 4', 'Draft 1']);
  });

  test("a refusal shows the same error state, never the server's words", async ({ page, api }) => {
    api.on('GET', '/api/admin/events', () => problem(400, 'validation_failed'));
    const events = new AdminEventsPage(page);

    await events.open();

    await expect(events.errorTitle).toHaveText("Events didn't load");
    await expect(events.error).not.toContainText('A sentence from the server');
  });
});
