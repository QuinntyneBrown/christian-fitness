import { answerStoryImages } from '../fixtures/admin-stories';
import {
  answerFrontPage,
  answerMostRead,
  answerRailEvents,
  EVENTS_SECTION,
  FRONT_PAGE,
  HEADLINES,
  LATEST,
  LEAD,
  MOST_READ,
  NEXT_FOUR,
  NO_STORIES,
  riverPage,
} from '../fixtures/front-page';
import { STORY_NOW } from '../fixtures/stories';
import { expect, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebLandingPage } from '../page-objects/web/landing.page';

const SIGNED_OUT: ApiReply = {
  status: 401,
  headers: { 'content-type': 'application/problem+json' },
  json: { status: 401, code: 'unauthenticated' },
};

/** A visitor on the mocks' morning, with the default front page, events and most read. */
async function asVisitor(page: import('@playwright/test').Page, api: ApiHandlers): Promise<void> {
  await page.clock.setFixedTime(STORY_NOW);
  api.on('GET', '/api/session', () => SIGNED_OUT);
  answerStoryImages(api);
  answerFrontPage(api, FRONT_PAGE);
  answerRailEvents(api, NEXT_FOUR);
  answerMostRead(api, MOST_READ);
}

const SECTIONS = ['Latest', 'Events', 'Training', 'Nutrition', 'Faith & Body', 'Community', 'Pros'];

// L2-001 and L2-002 (journey 25; ADR 0107): the news front page.
test.describe('Member app, news front page', () => {
  test(
    'a visitor sees the masthead, the lead, four headlines, the latest and the rail',
    { tag: '@critical' },
    async ({ page, api }) => {
      await asVisitor(page, api);
      const stories = answerFrontPage(api, FRONT_PAGE);
      const events = answerRailEvents(api, NEXT_FOUR);
      const landing = new WebLandingPage(page);

      await landing.open();

      await expect(landing.signIn).toHaveAttribute('href', '/sign-in');
      await expect(landing.joinFree).toHaveAttribute('href', '/join');
      await expect(landing.sections.getByRole('link')).toHaveText(SECTIONS);
      await expect(landing.currentSection).toHaveText('Latest');
      await expect(landing.heading).toHaveText(LEAD.headline);
      expect(await landing.stories('lead')).toEqual([
        {
          href: `/stories/${LEAD.slug}`,
          section: 'Community',
          title: LEAD.headline,
          summary: LEAD.summary,
          meta: 'Naomi Clarke · 2 hours ago',
          image: true,
        },
      ]);
      expect(
        (await landing.stories('headlines')).map((s) => [s.section, s.title, s.meta, s.image]),
      ).toEqual([
        ['Events', HEADLINES[0].headline, 'CF Team · 4 hours ago', true],
        ['Pros', HEADLINES[1].headline, 'Marcus Bell · 6 hours ago', true],
        ['Nutrition', HEADLINES[2].headline, 'Priya Raman · 7 hours ago', true],
        ['Faith & Body', HEADLINES[3].headline, 'Pastor Ruth Adeyemi · 8 hours ago', true],
      ]);
      await expect(landing.riverTitle).toHaveText('The latest');
      expect(await landing.stories('river')).toEqual([
        {
          href: `/stories/${LATEST[0].slug}`,
          section: 'Events · Yesterday',
          title: LATEST[0].headline,
          summary: LATEST[0].summary,
          meta: 'Naomi Clarke',
          image: true,
        },
        {
          href: `/stories/${LATEST[1].slug}`,
          section: 'Community · Yesterday',
          title: LATEST[1].headline,
          summary: LATEST[1].summary,
          meta: 'Priya Raman',
          image: true,
        },
        {
          href: `/stories/${LATEST[2].slug}`,
          section: 'Events · Yesterday',
          title: LATEST[2].headline,
          summary: null,
          meta: 'CF Team',
          image: true,
        },
        {
          href: `/stories/${LATEST[3].slug}`,
          section: 'Training · Apr 13',
          title: LATEST[3].headline,
          summary: LATEST[3].summary,
          meta: 'Marcus Bell',
          image: true,
        },
        {
          href: `/stories/${LATEST[4].slug}`,
          section: 'Pros · Apr 12',
          title: LATEST[4].headline,
          summary: LATEST[4].summary,
          meta: 'CF Team',
          image: false,
        },
      ]);
      await expect(landing.moreStories).toHaveCount(0);
      await expect(landing.joinCard.locator('.join-card__title')).toHaveText('Life to the full.');
      await expect(landing.joinTheCommunity).toHaveAttribute('href', '/join');
      expect(await landing.eventRows()).toEqual([
        {
          href: '/join',
          month: 'Apr',
          day: '18',
          title: 'Easter Sunrise 5K',
          meta: 'Sat 6:45 AM · Waterfront',
        },
        {
          href: '/join',
          month: 'Apr',
          day: '21',
          title: 'Couch to 5K: Week 3',
          meta: 'Tue 6:30 PM · Etobicoke',
        },
        {
          href: '/join',
          month: 'Apr',
          day: '25',
          title: 'Saturday Park Bootcamp',
          meta: 'Sat 8:00 AM · Waterfront',
        },
        {
          href: '/join',
          month: 'Apr',
          day: '30',
          title: "Women's Hoops & Devotion Night",
          meta: 'Thu 7:00 PM · Downtown',
        },
      ]);
      expect(await landing.mostReadStories()).toEqual(
        MOST_READ.map((s, i) => ({
          n: String(i + 1),
          title: s.headline,
          href: `/stories/${s.slug}`,
        })),
      );
      await expect(landing.verse).toHaveText(
        '“I came that they may have life and have it abundantly.”',
      );
      expect(stories.asked).toEqual(['']);
      expect(events.asked).toEqual(['?take=4']);
      await expect.poll(() => landing.title()).toBe('Christian Fitness');
    },
  );

  test('choosing a section shows only its stories under its name, with no top stories', async ({
    page,
    api,
  }) => {
    await asVisitor(page, api);
    const stories = answerFrontPage(api, (query) =>
      query.get('section') === 'events' ? EVENTS_SECTION : FRONT_PAGE,
    );
    const landing = new WebLandingPage(page);
    await landing.open();
    await expect(landing.lead).toBeVisible();

    await landing.section('Events').click();

    await expect(page).toHaveURL(/\/\?section=events$/);
    await expect(landing.currentSection).toHaveText('Events');
    await expect(landing.heading).toHaveText('Events');
    await expect(landing.topStories).toHaveCount(0);
    expect((await landing.stories('river')).map((s) => s.title)).toEqual([
      HEADLINES[0].headline,
      LATEST[0].headline,
      LATEST[2].headline,
    ]);
    await expect(landing.rows).toHaveCount(4);
    expect(stories.asked).toEqual(['', 'section=events']);
  });

  test('Faith & Body is addressed by its feed slug, and an unknown section shows Latest', async ({
    page,
    api,
  }) => {
    await asVisitor(page, api);
    const stories = answerFrontPage(api, (query) =>
      query.get('section') ? EVENTS_SECTION : FRONT_PAGE,
    );
    const landing = new WebLandingPage(page);

    await landing.open('?section=faith-body');
    await expect(landing.currentSection).toHaveText('Faith & Body');
    await expect(landing.section('Faith & Body')).toHaveAttribute('href', '/?section=faith-body');
    await landing.open('?section=sports');

    await expect(landing.currentSection).toHaveText('Latest');
    await expect(landing.heading).toHaveText(LEAD.headline);
    expect(stories.asked).toEqual(['section=faith-and-body', '']);
  });

  test('a section with no stories says so, and so does Latest with none at all', async ({
    page,
    api,
  }) => {
    await asVisitor(page, api);
    answerFrontPage(api, NO_STORIES);
    const landing = new WebLandingPage(page);

    await landing.open('?section=training');
    await expect(landing.heading).toHaveText('Training');
    await expect(landing.riverEmpty).toHaveText('No stories in Training yet this week.');
    await landing.open();

    await expect(landing.heading).toHaveText('The latest');
    await expect(landing.riverEmpty).toHaveText('No stories yet. Check back soon.');
    await expect(landing.topStories).toHaveCount(0);
  });

  test('failed stories say so with Try again, and the rail is unaffected', async ({
    page,
    api,
  }) => {
    await asVisitor(page, api);
    answerFrontPage(api, 404);
    const landing = new WebLandingPage(page);

    await landing.open();
    await expect(landing.storiesError).toContainText("Stories didn't load.");
    await expect(landing.storiesError).toContainText('Check your connection, then try again.');
    await expect(landing.heading).toHaveText('The latest');
    await expect(landing.rows).toHaveCount(4);
    await expect(landing.mostReadRows).toHaveCount(5);
    answerFrontPage(api, FRONT_PAGE);
    await landing.storiesTryAgain.click();

    await expect(landing.heading).toHaveText(LEAD.headline);
    await expect(landing.riverRows).toHaveCount(5);
  });

  test('failed events say so in the rail with Try again, and the stories are unaffected', async ({
    page,
    api,
  }) => {
    await asVisitor(page, api);
    answerRailEvents(api, [], 404);
    const landing = new WebLandingPage(page);

    await landing.open();
    await expect(landing.eventsError).toContainText("Upcoming events didn't load.");
    await expect(landing.riverRows).toHaveCount(5);
    answerRailEvents(api, NEXT_FOUR);
    await landing.eventsTryAgain.click();

    await expect(landing.rows).toHaveCount(4);
  });

  test('fewer than four events show only those, and none say so', async ({ page, api }) => {
    await asVisitor(page, api);
    answerRailEvents(api, NEXT_FOUR.slice(0, 2));
    const landing = new WebLandingPage(page);

    await landing.open();
    await expect(landing.rows).toHaveCount(2);
    await expect(landing.events).not.toContainText('No events posted yet.');
    answerRailEvents(api, []);
    await landing.open('?section=events');

    await expect(landing.events).toContainText('No events posted yet. Check back soon.');
    await expect(landing.rows).toHaveCount(0);
  });

  test('Most read hides when nothing was read or it fails, and nothing else breaks', async ({
    page,
    api,
  }) => {
    await asVisitor(page, api);
    answerMostRead(api, []);
    const landing = new WebLandingPage(page);

    await landing.open();
    await expect(landing.rows).toHaveCount(4);
    await expect(landing.mostRead).toHaveCount(0);
    answerMostRead(api, [], 404);
    await landing.open('?section=events');

    await expect(landing.rows).toHaveCount(4);
    await expect(landing.riverRows).not.toHaveCount(0);
    await expect(landing.mostRead).toHaveCount(0);
  });

  test('More stories adds the next twelve, keeps them when a page fails, and stops at 60', async ({
    page,
    api,
  }) => {
    await asVisitor(page, api);
    let failNext = false;
    const stories = answerFrontPage(api, (query) => {
      const skip = Number(query.get('skip') ?? 0);
      if (skip === 24 && failNext) {
        failNext = false;
        return 404;
      }
      return { ...FRONT_PAGE, latest: riverPage(skip, 12), more: true };
    });
    const landing = new WebLandingPage(page);

    await landing.open();
    await expect(landing.riverRows).toHaveCount(12);
    await landing.moreStories.click();
    await expect(landing.riverRows).toHaveCount(24);
    await expect(landing.riverRows.nth(12)).toContainText('River story 13');
    failNext = true;
    await landing.moreStories.click();
    await expect(landing.moreError).toContainText("More stories didn't load.");
    await expect(landing.moreError).toContainText('The ones above are still here.');
    await expect(landing.riverRows).toHaveCount(24);
    await landing.moreTryAgain.click();
    await expect(landing.riverRows).toHaveCount(36);
    await landing.moreStories.click();
    await expect(landing.riverRows).toHaveCount(48);
    await landing.moreStories.click();

    await expect(landing.riverRows).toHaveCount(60);
    await expect(landing.moreStories).toHaveCount(0);
    await expect(landing.riverEnd).toHaveText(
      "That's the latest 60 stories. Choose a section above to see older ones.",
    );
    expect(stories.asked).toEqual(['', 'skip=12', 'skip=24', 'skip=24', 'skip=36', 'skip=48']);
  });

  test('a story title leads to its page, and titles, summaries and authors are text', async ({
    page,
    api,
  }) => {
    await asVisitor(page, api);
    const marked = { ...LEAD, headline: '<b>Bold</b> claims', author: '<i>Someone</i>' };
    answerFrontPage(api, { ...FRONT_PAGE, lead: marked });
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(landing.heading).toHaveText('<b>Bold</b> claims');
    await expect(landing.lead.locator('b, i')).toHaveCount(0);
    expect((await landing.stories('lead'))[0].meta).toBe('<i>Someone</i> · 2 hours ago');
    expect((await landing.stories('headlines'))[0].href).toBe(`/stories/${HEADLINES[0].slug}`);
  });

  test('a signed-in member is sent to Home', async ({ page }) => {
    const home = new WebHomePage(page);
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(home.greeting).toBeVisible();
    await expect(page).toHaveURL(/\/home$/);
  });
});

// L2-002 (journey 25): one column on a phone, two at LG, and the masthead always at the top.
test.describe('Member app, news front page layout', () => {
  test('on a phone everything stacks in order, the sections scroll inside the masthead and nothing overflows', async ({
    page,
    api,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await asVisitor(page, api);
    const landing = new WebLandingPage(page);

    await landing.open();
    await expect(landing.mostReadRows).toHaveCount(5);

    expect(await landing.overflowsHorizontally()).toBe(false);
    await expect(landing.joinFree).toBeVisible();
    expect(await landing.sections.evaluate((nav) => nav.scrollWidth > nav.clientWidth)).toBe(true);
    const order = [landing.lead, landing.headlines.first(), landing.river, landing.rail];
    const tops = await Promise.all(order.map(async (part) => (await part.boundingBox())!.y));
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    expect(await landing.mastheadTopAfterScrolling()).toBe(0);
  });

  test('at LG the lead sits beside the headlines and the rail beside the river, in view while it scrolls', async ({
    page,
    api,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await asVisitor(page, api);
    answerFrontPage(api, { ...FRONT_PAGE, latest: riverPage(0, 12) });
    const landing = new WebLandingPage(page);

    await landing.open();
    await expect(landing.mostReadRows).toHaveCount(5);

    const top = await landing.boxes(landing.lead, landing.headlines.first());
    expect(top.b!.x).toBeGreaterThan(top.a!.x + top.a!.width - 1);
    expect(Math.abs(top.b!.y - top.a!.y)).toBeLessThan(40);
    const news = await landing.boxes(landing.river, landing.rail);
    expect(news.b!.x).toBeGreaterThan(news.a!.x + news.a!.width - 1);
    await page.evaluate(() => window.scrollTo(0, 1500));
    const rail = await landing.rail.boundingBox();
    expect(rail!.y).toBeGreaterThanOrEqual(0);
    expect(rail!.y).toBeLessThan(200);
    expect(await landing.mastheadTopAfterScrolling()).toBe(0);
  });
});
