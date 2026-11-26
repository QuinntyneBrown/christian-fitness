import { expect, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { answerLanding, NEXT_FOUR } from '../fixtures/public-events';
import {
  answerStories,
  BASEMENT_GYM,
  BOOTCAMP_GUIDE,
  EASTER_RECORD,
  HALF_MARATHON,
  HOOPS_LEAGUE,
  MEAL_PREP,
  OKAFOR,
  SABBATH_REST,
  VETTING,
  WALKING_SENIORS,
  EVENTS_SECTION,
  FRONT_PAGE_NOW,
  LATEST,
  NO_STORIES,
  riverStories,
  storyImage,
  type FrontPageFixture,
} from '../fixtures/public-stories';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebLandingPage } from '../page-objects/web/landing.page';

const SIGNED_OUT: ApiReply = {
  status: 401,
  headers: { 'content-type': 'application/problem+json' },
  json: { status: 401, code: 'unauthenticated' },
};

function asVisitor(api: ApiHandlers): void {
  api.on('GET', '/api/session', () => SIGNED_OUT);
}

// L2-001 and L2-002: the public landing page, a news front page.
test.describe('Member app, landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(FRONT_PAGE_NOW);
  });

  test(
    'a visitor sees the masthead with Latest current, the lead story, four headlines and the latest stories',
    { tag: '@critical' },
    async ({ page, api }) => {
      asVisitor(api);
      const seen = answerStories(api, { '': LATEST });
      answerLanding(api, NEXT_FOUR);
      const landing = new WebLandingPage(page);

      await landing.open();

      await expect(landing.joinFree).toHaveAttribute('href', '/join');
      await expect(landing.signIn).toHaveAttribute('href', '/sign-in');
      expect(await landing.sectionLinks()).toEqual([
        { name: 'Latest', href: '/' },
        { name: 'Events', href: '/?section=events' },
        { name: 'Training', href: '/?section=training' },
        { name: 'Nutrition', href: '/?section=nutrition' },
        { name: 'Faith & Body', href: '/?section=faith-body' },
        { name: 'Community', href: '/?section=community' },
        { name: 'Pros', href: '/?section=pros' },
      ]);
      await expect(landing.currentSection).toHaveText('Latest');
      await expect(landing.heading).toHaveText(
        'A West End church turned its basement into a free gym. Two hundred neighbours now train there every week',
      );
      expect(await landing.stories(landing.lead)).toEqual([
        {
          href: '/stories/basement-gym',
          section: 'Community',
          title:
            'A West End church turned its basement into a free gym. Two hundred neighbours now train there every week',
          summary:
            'Rowers, kettlebells and a Thursday prayer circle: how St. Anne’s made fitness the front door to its parish.',
          meta: 'Naomi Clarke · 2 hours ago',
          image: storyImage(BASEMENT_GYM),
        },
      ]);
      expect(await landing.stories(landing.headlines)).toEqual([
        {
          href: '/stories/easter-5k-record',
          section: 'Events',
          title: 'Easter Sunrise 5K hits a record 142 sign-ups with ten days to go',
          summary: '',
          meta: 'CF Team · 4 hours ago',
          image: storyImage(EASTER_RECORD),
        },
        {
          href: '/stories/okafor-interview',
          section: 'Pros',
          title: 'Danielle Okafor on coaching strength without the shame',
          summary: '',
          meta: 'Marcus Bell · 6 hours ago',
          image: storyImage(OKAFOR),
        },
        {
          href: '/stories/meal-prep-ministry',
          section: 'Nutrition',
          title:
            'Inside the Scarborough kitchen prepping 300 healthy meals a week for shift workers',
          summary: '',
          meta: 'Priya Raman · 7 hours ago',
          image: storyImage(MEAL_PREP),
        },
        {
          href: '/stories/sabbath-rest',
          section: 'Faith & Body',
          title: 'Why your rest day might be the most spiritual part of your training plan',
          summary: '',
          meta: 'Pastor Ruth Adeyemi · 8 hours ago',
          image: storyImage(SABBATH_REST),
        },
      ]);
      await expect(landing.riverTitle).toHaveText('The latest');
      expect(await landing.stories(landing.riverRows)).toEqual([
        {
          href: '/stories/half-marathon-churches',
          section: 'Events · Yesterday',
          title: 'Twelve GTA churches will run the Toronto Half as one team this fall',
          summary:
            'Registration for the combined team opens May 1, with free training plans for first-time runners.',
          meta: 'Naomi Clarke',
          image: storyImage(HALF_MARATHON),
        },
        {
          href: '/stories/walking-seniors',
          section: 'Community · Yesterday',
          title: 'The Tuesday walking group that got 40 seniors off the couch and into the park',
          summary:
            'It started with three women from Grace Fellowship and a pair of borrowed poles.',
          meta: 'Priya Raman',
          image: storyImage(WALKING_SENIORS),
        },
        {
          href: '/stories/hoops-league',
          section: 'Events · Yesterday',
          title: 'Women’s Hoops & Devotion Night is adding a second court after a waitlist of 60',
          summary: '',
          meta: 'CF Team',
          image: storyImage(HOOPS_LEAGUE),
        },
        {
          href: '/stories/park-bootcamp-guide',
          section: 'Training · Apr 13',
          title:
            'A beginner’s guide to your first outdoor bootcamp, from what to bring to how sore you’ll be',
          summary: 'Coach Danielle answers the eight questions she hears most at Trillium Park.',
          meta: 'Marcus Bell',
          image: storyImage(BOOTCAMP_GUIDE),
        },
        {
          href: '/stories/how-we-vet-every-listing',
          section: 'Pros · Apr 12',
          title: 'How we vet every professional in the Christian Fitness directory',
          summary:
            'Credentials, references and a conversation about faith: the four checks every listing passes.',
          meta: 'CF Team',
          image: storyImage(VETTING),
        },
      ]);
      expect(seen.asked).toEqual(['']);
      await expect.poll(() => landing.title()).toBe('Christian Fitness');
    },
  );

  test('the rail invites joining and shows the next four events, most read and the verse', async ({
    page,
    api,
  }) => {
    asVisitor(api);
    answerStories(api, { '': LATEST });
    const seen = answerLanding(api, NEXT_FOUR);
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(landing.joinCard).toContainText('Life to the full.');
    await expect(landing.joinCard).toContainText(
      'A Christian community for health in body and spirit. Find events, train with friends, and meet professionals who share your faith.',
    );
    await expect(landing.joinCommunity).toHaveAttribute('href', '/join');
    await expect(landing.rows).toHaveCount(4);
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
      {
        href: '/join',
        month: 'May',
        day: '06',
        title: 'Stretch & Pray: Mobility Morning',
        meta: 'Wed 9:30 AM · Scarborough',
      },
    ]);
    expect(seen.asked).toEqual(['?take=4']);
    await expect(landing.mostRead).toBeVisible();
    expect(await landing.ranked()).toEqual([
      {
        rank: '1',
        title: 'Why your rest day might be the most spiritual part of your training plan',
        href: '/stories/sabbath-rest',
      },
      {
        rank: '2',
        title:
          'A beginner’s guide to your first outdoor bootcamp, from what to bring to how sore you’ll be',
        href: '/stories/park-bootcamp-guide',
      },
      {
        rank: '3',
        title: 'Twelve GTA churches will run the Toronto Half as one team this fall',
        href: '/stories/half-marathon-churches',
      },
      {
        rank: '4',
        title: 'Danielle Okafor on coaching strength without the shame',
        href: '/stories/okafor-interview',
      },
      {
        rank: '5',
        title: 'The Tuesday walking group that got 40 seniors off the couch and into the park',
        href: '/stories/walking-seniors',
      },
    ]);
    await expect(landing.verse).toHaveText(
      '“I came that they may have life and have it abundantly.”',
    );
  });

  test('fewer than four events show only those, and none says so', async ({ page, api }) => {
    asVisitor(api);
    answerStories(api, { '': LATEST });
    answerLanding(api, NEXT_FOUR.slice(0, 2));
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(landing.rows).toHaveCount(2);
    await expect(landing.events).not.toContainText('No events posted yet.');
    answerLanding(api, []);
    await landing.open();

    await expect(landing.events).toContainText('No events posted yet. Check back soon.');
    await expect(landing.rows).toHaveCount(0);
  });

  test('failed events say so in the rail, leave the stories showing and Try again loads them', async ({
    page,
    api,
  }) => {
    asVisitor(api);
    const stories = answerStories(api, { '': LATEST });
    answerLanding(api, [], 404);
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(landing.eventsError).toContainText("Upcoming events didn't load.");
    await expect(landing.riverRows).toHaveCount(5);
    answerLanding(api, NEXT_FOUR);
    await landing.eventsTryAgain.click();

    await expect(landing.rows).toHaveCount(4);
    expect(stories.asked).toEqual(['']);
  });

  test('failed stories say so, leave the rail showing and Try again loads them', async ({
    page,
    api,
  }) => {
    asVisitor(api);
    answerStories(api, {}, 404);
    const events = answerLanding(api, NEXT_FOUR);
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(landing.storiesError).toContainText("Stories didn't load.");
    await expect(landing.storiesError).toContainText('Check your connection, then try again.');
    await expect(landing.heading).toHaveText('The latest');
    await expect(landing.rows).toHaveCount(4);
    await expect(landing.joinCommunity).toBeVisible();
    await expect(landing.mostRead).toHaveCount(0);
    answerStories(api, { '': LATEST });
    await landing.storiesTryAgain.click();

    await expect(landing.lead).toHaveCount(1);
    await expect(landing.riverRows).toHaveCount(5);
    expect(events.asked).toEqual(['?take=4']);
  });

  test('a section shows only its stories under its name, and one with none says so', async ({
    page,
    api,
  }) => {
    asVisitor(api);
    const seen = answerStories(api, {
      '': LATEST,
      '?section=events': EVENTS_SECTION,
      '?section=training': NO_STORIES,
    });
    answerLanding(api, NEXT_FOUR);
    const landing = new WebLandingPage(page);

    await landing.open();
    await expect(landing.lead).toHaveCount(1);
    await landing.section('Events').click();

    await expect(page).toHaveURL(/\/\?section=events$/);
    await expect(landing.currentSection).toHaveText('Events');
    await expect(landing.heading).toHaveText('Events');
    await expect(landing.topStories).toHaveCount(0);
    await expect(landing.riverRows).toHaveCount(3);
    expect((await landing.stories(landing.riverRows)).map((story) => story.title)).toEqual([
      'Easter Sunrise 5K hits a record 142 sign-ups with ten days to go',
      'Twelve GTA churches will run the Toronto Half as one team this fall',
      'Women’s Hoops & Devotion Night is adding a second court after a waitlist of 60',
    ]);
    await expect(landing.rows).toHaveCount(4);
    await landing.section('Training').click();

    await expect(page).toHaveURL(/\/\?section=training$/);
    await expect(landing.heading).toHaveText('Training');
    await expect(landing.river).toContainText('No stories in Training yet this week.');
    await expect(landing.riverRows).toHaveCount(0);
    expect(seen.asked).toEqual(['', '?section=events', '?section=training']);
  });

  test('a section opens from its address, and an unknown one shows Latest', async ({
    page,
    api,
  }) => {
    asVisitor(api);
    const seen = answerStories(api, { '': LATEST, '?section=events': EVENTS_SECTION });
    answerLanding(api, NEXT_FOUR);
    const landing = new WebLandingPage(page);

    await landing.open('?section=events');

    await expect(landing.heading).toHaveText('Events');
    await expect(landing.riverRows).toHaveCount(3);
    await landing.open('?section=sports');

    await expect(landing.currentSection).toHaveText('Latest');
    await expect(landing.lead).toHaveCount(1);
    expect(seen.asked).toEqual(['?section=events', '']);
  });

  test('no stories at all say so, and Most read hides when nothing ranks', async ({
    page,
    api,
  }) => {
    asVisitor(api);
    answerStories(api, { '': NO_STORIES });
    answerLanding(api, NEXT_FOUR);
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(landing.heading).toHaveText('The latest');
    await expect(landing.river).toContainText('No stories yet. Check back soon.');
    await expect(landing.topStories).toHaveCount(0);
    await expect(landing.rows).toHaveCount(4);
    await expect(landing.mostRead).toHaveCount(0);
    answerStories(api, { '': { ...LATEST, mostRead: [] } });
    await landing.open();

    await expect(landing.riverRows).toHaveCount(5);
    await expect(landing.mostRead).toHaveCount(0);
  });

  test('skeletons stand in while the stories load', async ({ page, api }) => {
    asVisitor(api);
    let release: (reply: ApiReply) => void = () => undefined;
    answerStories(api, {});
    api.on('GET', '/api/public/stories', () => new Promise<ApiReply>((done) => (release = done)));
    answerLanding(api, NEXT_FOUR);
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(landing.storiesLoading).toBeAttached();
    await expect(landing.heading).toHaveText('Christian Fitness news');
    await expect(landing.rows).toHaveCount(4);
    release({ json: LATEST });

    await expect(landing.lead).toHaveCount(1);
    await expect(landing.storiesLoading).toHaveCount(0);
  });

  // L2-037: the river grows 12 at a time and stops at 60.
  test('More stories adds the next 12, keeps them when the next fail, and stops at 60', async ({
    page,
    api,
  }) => {
    const pageOf = (n: number, next: string | null): FrontPageFixture => ({
      ...NO_STORIES,
      latest: riverStories((n - 1) * 12 + 1, 12),
      nextCursor: next,
    });
    const pages: Record<string, FrontPageFixture> = {
      '': { ...LATEST, ...{ latest: riverStories(1, 12), nextCursor: 'c1' } },
      '?cursor=c1': pageOf(2, 'c2'),
      '?cursor=c2': pageOf(3, 'c3'),
      '?cursor=c3': pageOf(4, 'c4'),
      // A sixth page is on offer, which the river's bound must refuse.
      '?cursor=c4': pageOf(5, 'c5'),
    };
    asVisitor(api);
    answerStories(api, pages, 200);
    answerLanding(api, NEXT_FOUR);
    const landing = new WebLandingPage(page);

    await landing.open();
    await expect(landing.riverRows).toHaveCount(12);
    answerStories(api, {}, 404);
    await landing.moreStories.click();

    await expect(landing.moreError).toContainText("More stories didn't load.");
    await expect(landing.moreError).toContainText('The ones above are still here.');
    await expect(landing.riverRows).toHaveCount(12);
    const seen = answerStories(api, pages);
    await landing.moreTryAgain.click();

    await expect(landing.riverRows).toHaveCount(24);
    await expect(landing.riverRows.nth(12)).toContainText('Story 13');
    for (const count of [36, 48, 60]) {
      await landing.moreStories.click();
      await expect(landing.riverRows).toHaveCount(count);
    }
    await expect(landing.moreStories).toHaveCount(0);
    await expect(landing.riverEnd).toContainText(
      "That's the latest 60 stories. Choose a section above to see older ones.",
    );
    expect(seen.asked).toEqual(['?cursor=c1', '?cursor=c2', '?cursor=c3', '?cursor=c4']);
  });

  test('a river with no more stories offers no button', async ({ page, api }) => {
    asVisitor(api);
    answerStories(api, { '': LATEST });
    answerLanding(api, NEXT_FOUR);
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(landing.riverRows).toHaveCount(5);
    await expect(landing.moreStories).toHaveCount(0);
    await expect(landing.riverEnd).toHaveCount(0);
  });

  // L2-002: one column on a phone, two from LG, and the masthead stays at the top.
  test('on a phone everything stacks, nothing scrolls sideways and the masthead stays at the top', async ({
    page,
    api,
  }) => {
    asVisitor(api);
    answerStories(api, { '': LATEST });
    answerLanding(api, NEXT_FOUR);
    await page.setViewportSize({ width: 375, height: 800 });
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(landing.riverRows).toHaveCount(5);
    await expect(landing.rows).toHaveCount(4);
    const columns = await landing.columns();
    expect(columns.headlines).toBe(columns.lead);
    expect(columns.river).toBe(columns.lead);
    expect(columns.rail).toBe(columns.lead);
    expect(await landing.overflowsHorizontally()).toBe(false);
    await expect(landing.joinFree).toBeVisible();
    await landing.scrollToVerse();
    expect(await landing.mastheadTop()).toBe(0);
    await expect(landing.joinFree).toBeInViewport();
  });

  test('on a wide screen the lead sits beside the headlines and the river beside the rail', async ({
    page,
    api,
  }) => {
    asVisitor(api);
    answerStories(api, { '': LATEST });
    answerLanding(api, NEXT_FOUR);
    await page.setViewportSize({ width: 1280, height: 900 });
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(landing.riverRows).toHaveCount(5);
    const columns = await landing.columns();
    expect(columns.headlines).toBeGreaterThan(columns.lead);
    expect(columns.rail).toBeGreaterThan(columns.river);
    expect(columns.river).toBe(columns.lead);
    await landing.scrollToVerse();
    expect(await landing.mastheadTop()).toBe(0);
  });

  test('a signed-in member is sent to Home', async ({ page }) => {
    const home = new WebHomePage(page);
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(home.greeting).toBeVisible();
    await expect(page).toHaveURL(/\/home$/);
  });
});
