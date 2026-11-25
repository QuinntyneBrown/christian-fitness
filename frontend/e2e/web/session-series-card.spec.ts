import { expect, test } from '../fixtures/test';
import { answerEvent, BOOTCAMP_DETAIL } from '../fixtures/events';
import { answerSeriesDetail, COUCH_SESSION_3, COUCH_TO_5K_DETAIL } from '../fixtures/series';
import { WebEventDetailPage } from '../page-objects/web/event-detail.page';
import { WebEventSeriesPage } from '../page-objects/web/event-series.page';

// L2-010 AC5, AC6 (ADR 0080, ADR 0096): a session's event page shows its series card.
test.describe('Member app, a session event page: the series card', () => {
  test('A session of a series not joined shows its number, the next three dates and Join the series', async ({
    page,
    api,
  }) => {
    answerEvent(api, [COUCH_SESSION_3]);
    const detail = new WebEventDetailPage(page);

    await detail.open(COUCH_SESSION_3.id);

    await expect(detail.seriesMeta).toHaveText('Session 3 of 8 · Every Tuesday');
    await expect(detail.seriesTitle).toHaveText('Couch to 5K Run Club');
    await expect(detail.seriesDates).toHaveText([
      'Tue Apr 28First 5-minute run',
      'Tue May 05Two 8-minute runs',
      'Tue May 12 · CancelledNo class: Victoria Day week',
    ]);
    await expect(detail.seriesDates.nth(2)).toHaveAttribute(
      'class',
      'series-card__date series-card__date--cancelled',
    );
    await expect(detail.seriesDates.nth(0)).toHaveAttribute('class', 'series-card__date');
    await expect(detail.seriesLink).toHaveCount(1);
    await expect(detail.seriesLink).toHaveText('Join the series');
    await expect(detail.seriesLink).toHaveAttribute(
      'href',
      `/events/series/${COUCH_TO_5K_DETAIL.id}`,
    );
  });

  test('A member who joined reads View series, and it opens the series page in the app', async ({
    page,
    api,
  }) => {
    answerEvent(api, [
      { ...COUCH_SESSION_3, series: { ...COUCH_SESSION_3.series!, joined: true } },
    ]);
    answerSeriesDetail(api, [COUCH_TO_5K_DETAIL]);
    const detail = new WebEventDetailPage(page);
    const series = new WebEventSeriesPage(page);
    await detail.open(COUCH_SESSION_3.id);
    await expect(detail.seriesLink).toHaveText('View series');
    await page.evaluate(() => ((window as { stayed?: boolean }).stayed = true));

    await detail.seriesLink.click();

    await expect(page).toHaveURL(`/events/series/${COUCH_TO_5K_DETAIL.id}`);
    await expect(series.seriesTitle).toHaveText('Couch to 5K Run Club');
    // A plain click routes in the app: the page was not reloaded.
    expect(await page.evaluate(() => (window as { stayed?: boolean }).stayed)).toBe(true);
  });

  test('An event outside a series shows no series card', async ({ page, api }) => {
    answerEvent(api, [BOOTCAMP_DETAIL]);
    const detail = new WebEventDetailPage(page);

    await detail.open(BOOTCAMP_DETAIL.id);

    await expect(detail.eventTitle).toHaveText(BOOTCAMP_DETAIL.title);
    await expect(detail.seriesCard).toHaveCount(0);
  });
});
