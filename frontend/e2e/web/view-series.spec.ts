import { expect, test } from '../fixtures/test';
import { answerPhotos } from '../fixtures/directory';
import { answerEvent, BOOTCAMP_DETAIL } from '../fixtures/events';
import { answerListingProfile, LAKESHORE, PROFILES } from '../fixtures/listing-profile';
import {
  answerSeriesDetail,
  COUCH_SESSIONS,
  COUCH_TO_5K_DETAIL,
  COUCH_TO_5K_RECORDED,
  PARK_BOOTCAMP_DETAIL,
} from '../fixtures/series';
import { WebEventDetailPage } from '../page-objects/web/event-detail.page';
import { WebEventSeriesPage } from '../page-objects/web/event-series.page';
import { WebListingProfilePage } from '../page-objects/web/listing-profile.page';

// L2-051 AC1, AC6 to AC8 (ADR 0096): a member opens a series at /events/series/<id>.
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
    await expect(series.eyebrow).toHaveText('Run series · 8 sessions');
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

// L2-051 AC2, AC4, AC5 (ADR 0080, ADR 0096): the sessions are an ordered list in date order.
test.describe('Member app, view an event series: the sessions', () => {
  test(
    'The dates show in order with their number, weekday and topic, done and to go, Next up, Cancelled in words and Details',
    { tag: '@critical' },
    async ({ page, api }) => {
      answerSeriesDetail(api, [COUCH_TO_5K_DETAIL]);
      const series = new WebEventSeriesPage(page);

      await series.open(COUCH_TO_5K_DETAIL.id);

      await expect(series.sessionsHeading).toBeVisible();
      // Two done; April 21, 28, May 5, 19 and 26 to go; May 12 counts in neither.
      await expect(series.sessionsNote).toHaveText('2 done · 5 to go');
      await expect(series.sessions).toHaveCount(8);
      await expect(series.sessionMeta(1)).toHaveText('Session 1 · Tue, Apr 07');
      await expect(series.sessionMeta(3)).toHaveText('Session 3 · Tue, Apr 21 · Next up');
      await expect(series.sessionMeta(6)).toHaveText('Session 6 · Tue, May 12');
      await expect(series.sessionTopic(1)).toHaveText(
        'Walk, run 60 seconds, repeat. Meet your pace group',
      );
      await expect(series.sessionTopic(8)).toHaveText('Graduation 5K and potluck');
      // The member held a place at the first date and no attendance is recorded; not at the second.
      await expect(series.sessionEnd(1)).toHaveText('Not recorded');
      await expect(series.sessionEnd(2)).toHaveText('Done');
      await expect(series.sessionEnd(6)).toHaveText('Cancelled');
      await expect(series.session(6)).toHaveClass(/session-row--cancelled/);
      await expect(series.session(3)).toHaveClass(/session-row--next/);
      await expect(series.session(1)).toHaveClass(/session-row--past/);
      for (const n of [3, 4, 5, 7, 8]) {
        await expect(series.details(n)).toHaveAttribute(
          'href',
          `/events/${COUCH_SESSIONS[n - 1]!.id}`,
        );
      }
      await expect(series.sessionList.getByRole('link')).toHaveCount(5);
    },
  );

  // L2-051 AC3 and L2-080 AC7 (ADR 0106): what staff recorded shows on the member's past dates.
  test('A past date reads You came or Missed as staff recorded it, never by colour alone', async ({
    page,
    api,
  }) => {
    answerSeriesDetail(api, [COUCH_TO_5K_RECORDED]);
    const series = new WebEventSeriesPage(page);

    await series.open(COUCH_TO_5K_RECORDED.id);

    await expect(series.sessionEnd(1)).toHaveText('You came');
    await expect(series.came(1)).toBeVisible();
    await expect(series.sessionEnd(2)).toHaveText('Missed');
    await expect(series.came(2)).toHaveCount(0);
    await expect(series.sessionsNote).toHaveText('2 done · 5 to go');
  });

  test("Details opens that session's event page in the app", async ({ page, api }) => {
    answerSeriesDetail(api, [COUCH_TO_5K_DETAIL]);
    const third = { ...BOOTCAMP_DETAIL, id: COUCH_SESSIONS[2]!.id, title: 'Couch to 5K: Week 3' };
    answerEvent(api, [third]);
    const series = new WebEventSeriesPage(page);
    const detail = new WebEventDetailPage(page);
    await series.open(COUCH_TO_5K_DETAIL.id);

    await series.details(3).click();

    await expect(page).toHaveURL(`/events/${third.id}`);
    await expect(detail.eventTitle).toHaveText('Couch to 5K: Week 3');
  });

  test('A finished series has no Next up and nothing to go', async ({ page, api }) => {
    const finished = {
      ...COUCH_TO_5K_DETAIL,
      sessions: COUCH_SESSIONS.map((session) => ({
        ...session,
        state: session.state === 'cancelled' ? ('cancelled' as const) : ('done' as const),
      })),
    };
    answerSeriesDetail(api, [finished]);
    const series = new WebEventSeriesPage(page);

    await series.open(finished.id);

    await expect(series.sessionsNote).toHaveText('7 done · 0 to go');
    await expect(series.sessionList).not.toContainText('Next up');
    await expect(series.sessionList.getByRole('link')).toHaveCount(0);
  });
});

// L2-051 AC1 (ADR 0080, ADR 0096, ADR 0101): the sign-up panel.
test.describe('Member app, view an event series: the sign-up panel', () => {
  test('A series the member has not joined shows the spots left and both ways to come with their prices', async ({
    page,
    api,
  }) => {
    answerPhotos(api);
    answerSeriesDetail(api, [PARK_BOOTCAMP_DETAIL]);
    const series = new WebEventSeriesPage(page);

    await series.open(PARK_BOOTCAMP_DETAIL.id);

    await expect(series.panelTitle).toHaveText('Sign up');
    await expect(series.spots).toHaveText('12 of 50 spots left');
    await expect(series.plans).toHaveText([
      'Every session (5 left)Your spot is held each week$64 for all 8',
      'Pick dates to drop inCome when you can$10 each',
    ]);
    await expect(series.panelNote).toHaveText('One group chat for the whole series.');
    await expect(series.confirmed).toHaveCount(0);
    // The ways to come are one radio group and the panel has one button (journey 12, ADR 0101).
    await expect(series.planGroup.getByRole('radio')).toHaveCount(2);
    await expect(series.panelButton).toHaveText('Join the series');
  });

  test('A full series says so, and why every session cannot be had', async ({ page, api }) => {
    answerPhotos(api);
    answerSeriesDetail(api, [{ ...PARK_BOOTCAMP_DETAIL, spotsLeft: 0 }]);
    const series = new WebEventSeriesPage(page);

    await series.open(PARK_BOOTCAMP_DETAIL.id);

    await expect(series.spots).toHaveText('Series full');
    await expect(series.plans.first()).toContainText('Every place in the series is taken');
  });

  test('A member who joined is told they are in for every session', async ({ page, api }) => {
    answerSeriesDetail(api, [COUCH_TO_5K_DETAIL]);
    const series = new WebEventSeriesPage(page);

    await series.open(COUCH_TO_5K_DETAIL.id);

    await expect(series.confirmed).toHaveText("You're in for every session");
    await expect(series.plans).toHaveCount(0);
  });
});
