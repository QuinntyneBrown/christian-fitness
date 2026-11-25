import { expect, test } from '../fixtures/test';
import { answerListingProfile, LAKESHORE, PROFILES } from '../fixtures/listing-profile';
import { answerSeriesDetail, COUCH_TO_5K_DETAIL } from '../fixtures/series';
import { WebEventSeriesPage } from '../page-objects/web/event-series.page';
import { WebListingProfilePage } from '../page-objects/web/listing-profile.page';

// L2-051 AC1, AC6 to AC8 (ADR 0094): a member opens a series at /events/series/<id>.
test.describe('Member app, view an event series: the page', () => {
  test('A series shows its banner, kind, title, cadence and time, dates, place and summary, and who hosts it', async ({
    page,
    api,
  }) => {
    const asked = answerSeriesDetail(api, [COUCH_TO_5K_DETAIL]);
    const series = new WebEventSeriesPage(page);

    await series.open(COUCH_TO_5K_DETAIL.id);

    await expect(series.seriesTitle).toHaveText('Couch to 5K Run Club');
    expect(asked).toEqual([COUCH_TO_5K_DETAIL.id]);
    expect(await series.title()).toBe('Event series · Christian Fitness');
    await expect(series.backLink).toHaveAttribute('href', '/events?view=series');
    await expect(series.banner).toHaveAttribute('alt', '');
    await expect(series.eyebrow).toContainText('Run series');
    await expect(series.facts).toHaveText([
      'Every Tuesday, 6:30 PMApr 7 – May 26',
      'Humber Bay Park EastEtobicoke, Toronto',
    ]);
    await expect(series.summary).toHaveText(COUCH_TO_5K_DETAIL.summary);
    await expect(series.hostCard).toHaveAttribute('href', `/directory/${LAKESHORE.id}`);
    await expect(series.hostLabel).toHaveText('Hosted by');
    await expect(series.hostName).toContainText('Lakeshore Runners Fellowship');
    await expect(series.hostVerified).toHaveCount(1);
  });

  test('The host card leads to the host profile in the app', async ({ page, api }) => {
    answerSeriesDetail(api, [COUCH_TO_5K_DETAIL]);
    answerListingProfile(api, PROFILES);
    const series = new WebEventSeriesPage(page);
    const profile = new WebListingProfilePage(page);
    await series.open(COUCH_TO_5K_DETAIL.id);

    await series.hostCard.click();

    await expect(page).toHaveURL(`/directory/${LAKESHORE.id}`);
    await expect(profile.name).toHaveText('Lakeshore Runners Fellowship');
  });

  test('A series that is not there shows the not-found view', async ({ page, api }) => {
    answerSeriesDetail(api, []);
    const series = new WebEventSeriesPage(page);

    await series.open('0190c0de-0000-7000-8000-0000000005ff');

    await expect(series.heading).toHaveText('Page not found');
    await expect(series.action('Browse events')).toHaveAttribute('href', '/events');
  });

  test('While it loads, skeletons show; then the series', async ({ page, api }) => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    answerSeriesDetail(api, [COUCH_TO_5K_DETAIL], async () => {
      await held;
      return null;
    });
    const series = new WebEventSeriesPage(page);

    await series.open(COUCH_TO_5K_DETAIL.id);

    await expect(series.loading).toBeVisible();
    await expect(series.loading).toContainText('Loading series');
    await expect(series.loading.locator('.skeleton')).not.toHaveCount(0);
    release();
    await expect(series.seriesTitle).toHaveText('Couch to 5K Run Club');
    await expect(series.loading).toHaveCount(0);
  });

  test('A series that fails to load offers Try again, which asks again, and a way back to all events', async ({
    page,
    api,
  }) => {
    const asked = answerSeriesDetail(api, [COUCH_TO_5K_DETAIL], (n) =>
      n === 0 ? { status: 400, json: { code: 'error' } } : null,
    );
    const series = new WebEventSeriesPage(page);
    await series.open(COUCH_TO_5K_DETAIL.id);

    await expect(series.errorHeading).toBeVisible();
    await expect(series.allEventsButton).toHaveAttribute('href', '/events?view=series');

    await series.retryButton.click();

    await expect(series.seriesTitle).toHaveText('Couch to 5K Run Club');
    expect(asked).toEqual([COUCH_TO_5K_DETAIL.id, COUCH_TO_5K_DETAIL.id]);
  });

  test('From LG the aside sits beside the content and stays in view; below LG it follows in one column', async ({
    page,
    api,
  }) => {
    answerSeriesDetail(api, [COUCH_TO_5K_DETAIL]);
    const series = new WebEventSeriesPage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await series.open(COUCH_TO_5K_DETAIL.id);
    await expect(series.hostCard).toBeVisible();

    const wide = {
      content: await series.content.boundingBox(),
      aside: await series.aside.boundingBox(),
    };
    expect(wide.aside!.x).toBeGreaterThan(wide.content!.x + wide.content!.width - 1);
    await expect(series.aside).toHaveCSS('position', 'sticky');

    await page.setViewportSize({ width: 390, height: 800 });
    await expect(series.aside).not.toHaveCSS('position', 'sticky');
    const narrow = {
      content: await series.content.boundingBox(),
      aside: await series.aside.boundingBox(),
    };
    expect(narrow.aside!.y).toBeGreaterThanOrEqual(narrow.content!.y + narrow.content!.height);
  });
});
