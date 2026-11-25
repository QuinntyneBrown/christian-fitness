import { expect, test } from '../fixtures/test';
import { answerEvents, SUNRISE_5K } from '../fixtures/events';
import { answerSeriesCount } from '../fixtures/series';
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
