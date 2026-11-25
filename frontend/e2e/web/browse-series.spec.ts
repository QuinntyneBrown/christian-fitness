import { expect, test } from '../fixtures/test';
import { answerEvents, generatedEvent, SUNRISE_5K } from '../fixtures/events';
import {
  answerSeries,
  answerSeriesCount,
  COUCH_TO_5K,
  HOOPS_DEVOTION,
  PARK_BOOTCAMP,
} from '../fixtures/series';
import { WebEventsPage } from '../page-objects/web/events.page';

const SUBTITLE = 'From the churches, clubs and coaches in our directory. Free unless marked.';

// L2-009 AC11 and L2-050 AC6, AC7 (ADR 0093): Events offers "By date" and "Series (<count>)".
test.describe('Member app, browse event series: the view switch', () => {
  test('Events shows By date current, Series with its count and the new subtitle; choosing Series puts it in the address', async ({
    page,
    api,
  }) => {
    answerEvents(api, [SUNRISE_5K]);
    const counted = answerSeriesCount(api, 3);
    const events = new WebEventsPage(page);
    await events.open();

    await expect(events.subtitle).toHaveText(SUBTITLE);
    await expect(events.viewOption('By date')).toHaveAttribute('href', '/events');
    await expect(events.viewOption('Series (3)')).toHaveAttribute('href', '/events?view=series');
    await expect(events.currentView).toHaveText('By date');
    await expect(events.cards).toHaveCount(1);

    await events.viewOption('Series (3)').click();

    await expect(page).toHaveURL(/\/events\?view=series$/);
    await expect(events.currentView).toHaveText('Series (3)');
    await expect(events.cards).toHaveCount(0);
    // The count is asked once on arrival, not again on each change of view.
    expect(counted.asked).toBe(1);

    await page.goBack();
    await expect(page).toHaveURL(/\/events$/);
    await expect(events.currentView).toHaveText('By date');
    await expect(events.cards).toHaveCount(1);
  });

  test('An address with view=series opens the Series view; any other view opens By date', async ({
    page,
    api,
  }) => {
    answerEvents(api, [SUNRISE_5K]);
    answerSeriesCount(api, 2);
    const events = new WebEventsPage(page);

    await events.openWith('?view=series');
    await expect(events.currentView).toHaveText('Series (2)');

    await events.openWith('?view=calendar');
    await expect(events.currentView).toHaveText('By date');
    await expect(events.cards).toHaveCount(1);
  });

  test('Until the count answers, and when it fails, the option reads Series', async ({
    page,
    api,
  }) => {
    answerEvents(api, [SUNRISE_5K]);
    answerSeriesCount(api, 0, { status: 400 });
    const events = new WebEventsPage(page);
    await events.open();

    await expect(events.cards).toHaveCount(1);
    await expect(events.viewOption('Series')).toBeVisible();
  });
});

// L2-050 AC1, AC4, AC5 (ADR 0093): the Series view lists series by next session as rows.
test.describe('Member app, browse event series: the list', () => {
  test(
    'The Series view lists each series as the mock draws it, in the order the API gives, each leading to its series',
    { tag: '@critical' },
    async ({ page, api }) => {
      answerSeriesCount(api, 3);
      const asked = answerSeries(api, [COUCH_TO_5K, PARK_BOOTCAMP, HOOPS_DEVOTION]);
      const events = new WebEventsPage(page);
      await events.openWith('?view=series');

      await expect(events.seriesRows).toHaveCount(3);
      expect(await events.readSeriesRows()).toEqual([
        {
          href: `/events/series/${COUCH_TO_5K.id}`,
          meta: 'Every Tuesday · 6:30 PM',
          title: 'Couch to 5K Run Club',
          sub: 'Lakeshore Runners Fellowship · Etobicoke · Apr 7 – May 26',
          bars: ['done', 'done', 'next', '', '', 'cancelled', '', ''],
          done: '2 of 7 sessions done',
          end: 'Joined',
          next: 'Next Apr 21',
        },
        {
          href: `/events/series/${PARK_BOOTCAMP.id}`,
          meta: 'Every Saturday · 8:00 AM',
          title: 'Saturday Park Bootcamp',
          sub: 'Danielle Okafor · Waterfront · Apr 4 – May 23',
          bars: ['done', 'done', 'done', 'next', '', '', '', ''],
          done: '3 of 8 sessions done',
          end: '$64 for all 8',
          next: 'Next Apr 25',
        },
        {
          href: `/events/series/${HOOPS_DEVOTION.id}`,
          meta: '6 dates · 7:00 PM',
          title: 'Women’s Hoops & Devotion',
          sub: 'Faith & Footwork · Downtown · Jan – Jun',
          bars: ['done', 'done', 'done', 'next', '', ''],
          done: '3 of 6 sessions done',
          end: 'Free',
          next: 'Next Apr 30',
        },
      ]);
      // Asked with no filter; the date list was never asked for.
      expect(asked.requests).toEqual([{ category: null, q: null, joined: null }]);
      await expect(events.cards).toHaveCount(0);
    },
  );

  test('While the list loads, skeleton rows show; then the rows replace them', async ({
    page,
    api,
  }) => {
    answerSeriesCount(api, 1);
    let release: () => void = () => undefined;
    const held = new Promise<null>((resolve) => (release = () => resolve(null)));
    answerSeries(api, [COUCH_TO_5K], () => held);
    const events = new WebEventsPage(page);
    await events.openWith('?view=series');

    await expect(events.seriesLoading).toBeAttached();
    await expect(events.loading).toBeAttached();
    await expect(events.currentView).toHaveText('Series (1)');

    release();
    await expect(events.seriesRows).toHaveCount(1);
    await expect(events.loading).toHaveCount(0);
  });

  test('When the list cannot be loaded, Try again asks again while the switch stays', async ({
    page,
    api,
  }) => {
    answerSeriesCount(api, 1);
    const asked = answerSeries(api, [COUCH_TO_5K], (n) =>
      n === 0 ? { status: 400, json: { code: 'error' } } : null,
    );
    const events = new WebEventsPage(page);
    await events.openWith('?view=series');

    await expect(events.seriesError).toBeVisible();
    await expect(events.currentView).toHaveText('Series (1)');

    await events.retryButton.click();
    await expect(events.seriesRows).toHaveCount(1);
    expect(asked.requests).toHaveLength(2);
  });

  test('With no series listed, the view says so', async ({ page, api }) => {
    answerSeriesCount(api, 0);
    answerSeries(api, []);
    const events = new WebEventsPage(page);
    await events.openWith('?view=series');

    await expect(events.seriesEmpty).toBeVisible();
    await expect(events.seriesEmptyText).toBeVisible();
    await expect(events.showAllSeries).toHaveCount(0);
  });
});

// L2-050 AC2, AC3, AC7 and L2-075 (ADR 0081, ADR 0093): category, "Only series I've joined" and
// the search narrow the Series view and live in the address.
test.describe('Member app, browse event series: filters', () => {
  const ALL = [COUCH_TO_5K, PARK_BOOTCAMP, HOOPS_DEVOTION];

  test('A category narrows the list, marks its chip and joins the address; the tick narrows to joined series', async ({
    page,
    api,
  }) => {
    answerSeriesCount(api, 3);
    const asked = answerSeries(api, ALL);
    const events = new WebEventsPage(page);
    await events.openWith('?view=series');
    await expect(events.seriesRows).toHaveCount(3);

    await events.seriesFilter('Workout').click();
    await expect(page).toHaveURL(/\/events\?view=series&category=workout$/);
    await expect(events.seriesFilter('Workout')).toHaveAttribute('aria-current', 'page');
    await expect(events.seriesRows).toHaveCount(1);
    expect((await events.readSeriesRows()).map((row) => row.title)).toEqual([
      'Saturday Park Bootcamp',
    ]);

    await events.seriesFilter('All').click();
    await events.joinedFilter.check();
    await expect(page).toHaveURL(/\/events\?view=series&joined=true$/);
    await expect(events.seriesRows).toHaveCount(1);
    expect((await events.readSeriesRows()).map((row) => row.title)).toEqual([
      'Couch to 5K Run Club',
    ]);
    expect(asked.requests).toEqual([
      { category: null, q: null, joined: null },
      { category: 'workout', q: null, joined: null },
      { category: null, q: null, joined: null },
      { category: null, q: null, joined: 'true' },
    ]);

    // Back returns to the unticked list; the count stays the unfiltered one.
    await page.goBack();
    await expect(page).toHaveURL(/\/events\?view=series$/);
    await expect(events.joinedFilter).not.toBeChecked();
    await expect(events.seriesRows).toHaveCount(3);
    await expect(events.currentView).toHaveText('Series (3)');
  });

  test('Typing a search narrows the series once typing pauses, keeping the view and the filters', async ({
    page,
    api,
  }) => {
    answerSeriesCount(api, 3);
    const asked = answerSeries(api, ALL);
    const events = new WebEventsPage(page);
    await events.openWith('?view=series&category=basketball');
    await expect(events.seriesRows).toHaveCount(1);

    await events.search.focus();
    await events.typeSearch('  HOOPS ');
    await expect(page).toHaveURL(/\/events\?view=series&category=basketball&q=HOOPS$/);
    await expect(events.seriesRows).toHaveCount(1);
    // One question for the whole word, not one a letter; the field keeps what was typed.
    expect(asked.requests).toEqual([
      { category: 'basketball', q: null, joined: null },
      { category: 'basketball', q: 'HOOPS', joined: null },
    ]);
    await expect(events.search).toHaveValue('  HOOPS ');
    await expect(events.currentView).toHaveText('Series (3)');
  });

  test('With no match, "No series here yet" offers Show all series, which clears the search, category and tick', async ({
    page,
    api,
  }) => {
    answerSeriesCount(api, 3);
    const asked = answerSeries(api, ALL);
    const events = new WebEventsPage(page);
    await events.openWith('?view=series&category=run&q=yoga&joined=true');

    await expect(events.seriesEmpty).toBeVisible();
    await expect(events.seriesEmptyText).toBeVisible();
    await expect(events.search).toHaveValue('yoga');
    await expect(events.seriesFilter('Run')).toHaveAttribute('aria-current', 'page');
    await expect(events.joinedFilter).toBeChecked();

    await events.showAllSeries.click();

    await expect(page).toHaveURL(/\/events\?view=series$/);
    await expect(events.seriesRows).toHaveCount(3);
    await expect(events.search).toHaveValue('');
    await expect(events.search).toBeFocused();
    await expect(events.joinedFilter).not.toBeChecked();
    await expect(events.seriesFilter('All')).toHaveAttribute('aria-current', 'page');
    expect(asked.requests.at(-1)).toEqual({ category: null, q: null, joined: null });
  });

  test('By date shows a series’ session with its series line, and a standalone event without one', async ({
    page,
    api,
  }) => {
    answerSeriesCount(api, 3);
    answerEvents(api, [
      SUNRISE_5K,
      {
        ...generatedEvent(1),
        title: 'Couch to 5K Run Club',
        series: {
          id: COUCH_TO_5K.id,
          title: 'Couch to 5K Run Club',
          number: 3,
          total: 8,
          cadence: { weekday: 2, dates: 7 },
        },
      },
    ]);
    const events = new WebEventsPage(page);
    await events.open();

    await expect(events.cards).toHaveCount(2);
    expect(await events.seriesLines()).toEqual([
      null,
      'Part of Couch to 5K Run Club · Session 3 of 8 · Every Tuesday',
    ]);
  });

  test('Switching views clears the other view’s filters', async ({ page, api }) => {
    answerSeriesCount(api, 3);
    answerSeries(api, ALL);
    answerEvents(api, [SUNRISE_5K]);
    const events = new WebEventsPage(page);
    await events.openWith('?view=series&category=run&q=couch');
    await expect(events.seriesRows).toHaveCount(1);

    await events.viewOption('By date').click();

    await expect(page).toHaveURL(/\/events$/);
    await expect(events.search).toHaveValue('');
    await expect(events.cards).toHaveCount(1);
    await expect(events.seriesRows).toHaveCount(0);
  });
});
