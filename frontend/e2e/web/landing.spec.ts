import { expect, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import {
  answerFeatured,
  answerLanding,
  FEATURED_THREE,
  NEXT_THREE,
} from '../fixtures/public-events';
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

// L2-001 and L2-002: the public landing page.
test.describe('Member app, landing page', () => {
  test(
    'a visitor sees the headline, Join free, Sign in and the next three events in date order',
    { tag: '@critical' },
    async ({ page, api }) => {
      asVisitor(api);
      const seen = answerLanding(api, NEXT_THREE);
      const landing = new WebLandingPage(page);

      await landing.open();

      await expect(landing.heading).toHaveText('Life to the full.');
      await expect(landing.joinFree).toHaveAttribute('href', '/join');
      await expect(landing.signIn).toHaveAttribute('href', '/sign-in');
      await expect(landing.rows).toHaveCount(3);
      expect(await landing.events()).toEqual([
        {
          href: '/join',
          month: 'Apr',
          day: '18',
          title: 'Easter Sunrise 5K',
          meta: 'Sat 6:45 AM · Martin Goodman Trail, Marilyn Bell Park',
        },
        {
          href: '/join',
          month: 'Apr',
          day: '25',
          title: 'Saturday Park Bootcamp',
          meta: 'Sat 8:00 AM · Trillium Park, Ontario Place',
        },
        {
          href: '/join',
          month: 'Apr',
          day: '30',
          title: "Women's Hoops & Devotion Night",
          meta: 'Thu 7:00 PM · St. Lawrence Community Rec Centre',
        },
      ]);
      await expect(landing.verse).toHaveText(
        '“I came that they may have life and have it abundantly.”',
      );
      expect(seen.asked).toEqual(['?take=3']);
      await expect.poll(() => landing.title()).toBe('Christian Fitness');
    },
  );

  test('fewer than three events show only those, with no empty rows', async ({ page, api }) => {
    asVisitor(api);
    answerLanding(api, NEXT_THREE.slice(0, 2));
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(landing.rows).toHaveCount(2);
    await expect(landing.list).not.toContainText('No events posted yet.');
  });

  test('no events say so and ask the visitor to check back', async ({ page, api }) => {
    asVisitor(api);
    answerLanding(api, []);
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(landing.list).toContainText('No events posted yet.');
    await expect(landing.list).toContainText('Check back soon.');
    await expect(landing.rows).toHaveCount(0);
  });

  test('a failed list says so and Try again loads it', async ({ page, api }) => {
    asVisitor(api);
    answerLanding(api, [], 404);
    const landing = new WebLandingPage(page);

    await landing.open();
    await expect(landing.error).toContainText("Upcoming events didn't load.");
    answerLanding(api, NEXT_THREE);
    await landing.tryAgain.click();

    await expect(landing.rows).toHaveCount(3);
    await expect(landing.heading).toBeVisible();
  });

  // L2-001 AC5 to AC7: the professionals section, independent of the events.
  test('a visitor sees up to three professionals with public fields and each leads to Join', async ({
    page,
    api,
  }) => {
    asVisitor(api);
    answerLanding(api, NEXT_THREE);
    const seen = answerFeatured(api, FEATURED_THREE);
    const landing = new WebLandingPage(page);

    await landing.open();
    await landing.scrollToProfessionals();

    await expect(landing.professionals).toHaveCount(3);
    expect(await landing.professionalRows()).toEqual([
      {
        href: '/join',
        name: 'Danielle Okafor',
        text: 'Personal trainer · East York',
        price: 'From $70 / session',
        initials: 'DO',
      },
      {
        href: '/join',
        name: 'Marcus Lee',
        text: 'Registered dietitian · Ontario-wide',
        price: '$95 first consult',
        initials: 'ML',
      },
      {
        href: '/join',
        name: 'Rachel Adeyemi',
        text: 'Physiotherapist · Etobicoke',
        price: '$110 / visit',
        initials: 'RA',
      },
    ]);
    expect(seen.asked).toBe(1);
  });

  test('no professionals say so and ask the visitor to check back', async ({ page, api }) => {
    asVisitor(api);
    answerLanding(api, NEXT_THREE);
    answerFeatured(api, []);
    const landing = new WebLandingPage(page);

    await landing.open();
    await landing.scrollToProfessionals();

    await expect(landing.professionalsSection).toContainText('No professionals listed yet.');
    await expect(landing.professionalsSection).toContainText('Check back soon.');
    await expect(landing.professionals).toHaveCount(0);
  });

  test('a failed professionals list says so, Try again loads it and the events are unaffected', async ({
    page,
    api,
  }) => {
    asVisitor(api);
    answerLanding(api, NEXT_THREE);
    answerFeatured(api, [], 404);
    const landing = new WebLandingPage(page);

    await landing.open();
    await landing.scrollToProfessionals();
    await expect(landing.professionalsError).toContainText("Professionals didn't load.");
    await expect(landing.rows).toHaveCount(3);
    answerFeatured(api, FEATURED_THREE);
    await landing.professionalsTryAgain.click();

    await expect(landing.professionals).toHaveCount(3);
  });

  test('failed events leave the professionals showing', async ({ page, api }) => {
    asVisitor(api);
    answerLanding(api, [], 404);
    answerFeatured(api, FEATURED_THREE);
    const landing = new WebLandingPage(page);

    await landing.open();
    await landing.scrollToProfessionals();

    await expect(landing.error).toContainText("Upcoming events didn't load.");
    await expect(landing.professionals).toHaveCount(3);
  });

  test('a signed-in member is sent to Home', async ({ page }) => {
    const home = new WebHomePage(page);
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(home.greeting).toBeVisible();
    await expect(page).toHaveURL(/\/home$/);
  });

  test('on a phone the page does not scroll sideways and Join free is reachable', async ({
    page,
    api,
  }) => {
    asVisitor(api);
    answerLanding(api, NEXT_THREE);
    await page.setViewportSize({ width: 375, height: 800 });
    const landing = new WebLandingPage(page);

    await landing.open();

    await expect(landing.rows).toHaveCount(3);
    expect(await landing.overflowsHorizontally()).toBe(false);
    await expect(landing.joinFree).toBeVisible();
  });
});
