import { expect, test } from '../fixtures/test';
import { answerDirectory, CAST } from '../fixtures/directory';
import {
  answerEventImages,
  answerListingProfile,
  LAKESHORE,
  NORTHLINE,
  OKAFOR,
  PROFILES,
  SUNRISE_RUN,
  TEAM,
} from '../fixtures/listing-profile';
import { WebDirectoryPage } from '../page-objects/web/directory.page';
import { WebListingProfilePage } from '../page-objects/web/listing-profile.page';

// L2-055 AC1 to AC3, AC5, AC7, AC8 and AC9 (journey 6; ADR 0085): a member opens a listing's profile at
// `/directory/<id>` and reads its head, About, area, https website, followers and the year listed
// and what it hosts (mocks `listing-profile/default`, `person`, `one-off`, `unverified`, `loading`,
// `error`). Hosted series arrive with journey 11.
test.describe('Member app, listing profile', () => {
  test('The profile shows the mark, kind, Verified, name, tagline, About with focus tags and the key facts', async ({
    page,
    api,
  }) => {
    const asked = answerListingProfile(api, PROFILES);
    const profile = new WebListingProfilePage(page);

    await profile.open(LAKESHORE.id);

    expect(await profile.headView()).toEqual({
      initials: 'LR',
      shape: 'square',
      photo: null,
      kind: 'Organization',
      verified: 'Verified',
      name: 'Lakeshore Runners Fellowship',
      tagline: 'Beginner-friendly running club with a prayer at every finish',
    });
    await expect(profile.aboutText).toHaveText(LAKESHORE.description);
    await expect(profile.focusTags).toHaveText(['Running', 'Beginners', 'Race training']);
    expect(await profile.factViews()).toEqual([
      ['Area', 'Etobicoke'],
      ['Website', 'lakeshorerunners.ca (opens in a new tab)'],
      ['Followers', '612'],
      ['On Christian Fitness', 'Since 2025'],
    ]);
    expect(await profile.websiteView()).toEqual({
      text: 'lakeshorerunners.ca (opens in a new tab)',
      href: 'https://lakeshorerunners.ca/',
      target: '_blank',
      rel: 'noopener noreferrer',
    });
    await expect(profile.backLink).toHaveAttribute('href', '/directory');
    expect(await profile.title()).toBe('Listing · Christian Fitness');
    expect(asked).toEqual([LAKESHORE.id]);
  });

  test('A person shows a round photo, an unverified listing no Verified, and thousands read with a comma', async ({
    page,
    api,
  }) => {
    answerListingProfile(api, [
      { ...OKAFOR, followers: 2140 },
      { ...NORTHLINE, websiteUrl: 'https://www.northlineathletic.ca/shop' },
    ]);
    const profile = new WebListingProfilePage(page);

    await profile.open(OKAFOR.id);

    expect(await profile.headView()).toMatchObject({
      initials: '',
      shape: 'round',
      photo: `/api/directory/photos/${OKAFOR.photoKey}`,
      kind: 'Instructor',
      verified: 'Verified',
    });
    expect(await profile.factViews()).toEqual([
      ['Area', 'East York'],
      ['Followers', '2,140'],
      ['On Christian Fitness', 'Since 2024'],
    ]);

    await profile.open(NORTHLINE.id);

    expect(await profile.headView()).toMatchObject({ kind: 'Company', verified: null });
    expect(await profile.websiteView()).toMatchObject({
      text: 'northlineathletic.ca (opens in a new tab)',
      href: 'https://www.northlineathletic.ca/shop',
    });
  });

  test('Hosting counts the events still to come and lists each, leading to the event', async ({
    page,
    api,
  }) => {
    const later = {
      ...SUNRISE_RUN,
      id: '0193a9c0-0000-7000-8000-00000000e502',
      title: 'Hoops & Prayer',
      category: 'basketball' as const,
      startsAt: '2026-11-03T00:30:00Z',
      place: 'Regent Park Athletic Grounds',
      imageKey: 'a1b2c3d4e5f60718293a4b5c6d7e8f90.jpg',
    };
    answerListingProfile(api, [{ ...TEAM, hostingCount: 2, hosting: [SUNRISE_RUN, later] }]);
    answerEventImages(api);
    const profile = new WebListingProfilePage(page);

    await profile.open(TEAM.id);

    await expect(profile.hostingHeading).toHaveText('Hosting 2');
    expect(await profile.hostingViews()).toEqual([
      {
        href: `/events/${SUNRISE_RUN.id}`,
        image: '/images/events/run.jpg',
        meta: 'Run · Sat Apr 18',
        title: 'Easter Sunrise 5K',
        sub: '6:45 AM · Martin Goodman Trail, Marilyn Bell Park',
      },
      {
        href: `/events/${later.id}`,
        image: `/api/events/images/${later.imageKey}`,
        meta: 'Basketball · Mon Nov 2',
        title: 'Hoops & Prayer',
        sub: '7:30 PM · Regent Park Athletic Grounds',
      },
    ]);
    await expect(profile.hostingEmpty).toHaveCount(0);
  });

  test('A listing hosting nothing still to come says so, with no count', async ({ page, api }) => {
    answerListingProfile(api, PROFILES);
    const profile = new WebListingProfilePage(page);

    await profile.open(NORTHLINE.id);

    await expect(profile.hostingHeading).toHaveText('Hosting');
    await expect(profile.hostingEmpty).toHaveText(
      "Northline Athletic isn't hosting anything right now. Follow to hear when they post a date.",
    );
    await expect(profile.hostingRows).toHaveCount(0);
  });

  test('A website that is not https is not shown at all, neither as a link nor as text', async ({
    page,
    api,
  }) => {
    answerListingProfile(api, [{ ...LAKESHORE, websiteUrl: 'http://lakeshorerunners.ca' }]);
    const profile = new WebListingProfilePage(page);

    await profile.open(LAKESHORE.id);

    await expect(profile.name).toHaveText(LAKESHORE.name);
    expect((await profile.factViews()).map(([term]) => term)).toEqual([
      'Area',
      'Followers',
      'On Christian Fitness',
    ]);
    await expect(profile.main).not.toContainText('lakeshorerunners.ca');
  });

  test('Every word the listing gives is rendered as text, never as HTML', async ({ page, api }) => {
    const marked = {
      ...LAKESHORE,
      name: 'Lakeshore <b>Runners</b>',
      tagline: '<i>Fast</i> friends',
      description: '<img src=x onerror="alert(1)">Run with us',
      focus: ['<u>Running</u>'],
    };
    answerListingProfile(api, [marked]);
    const profile = new WebListingProfilePage(page);

    await profile.open(LAKESHORE.id);

    expect(await profile.headView()).toMatchObject({
      name: 'Lakeshore <b>Runners</b>',
      tagline: '<i>Fast</i> friends',
    });
    await expect(profile.aboutText).toHaveText('<img src=x onerror="alert(1)">Run with us');
    await expect(profile.focusTags).toHaveText(['<u>Running</u>']);
    await expect(profile.main.locator('b, i, u, img')).toHaveCount(0);
  });

  test('A listing that is not published or not there shows the not-found view', async ({
    page,
    api,
  }) => {
    answerListingProfile(api, []);
    const profile = new WebListingProfilePage(page);

    await profile.open(LAKESHORE.id);

    await expect(profile.heading).toHaveText('Page not found');
    await expect(profile.code).toHaveText('404');
    await expect(profile.action('Directory')).toHaveAttribute('href', '/directory');
  });

  test('While it loads skeletons show; a failure says so and Try again asks again', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    const asked = answerListingProfile(api, PROFILES, (n) =>
      n === 0 ? { hold: held, status: 400 } : null,
    );
    const profile = new WebListingProfilePage(page);

    await profile.open(LAKESHORE.id);

    await expect(profile.loading).toBeVisible();
    await expect(profile.loadingLabel).toBeAttached();
    await expect(profile.backLink).toHaveAttribute('href', '/directory');
    release();
    await expect(profile.errorHeading).toBeVisible();
    await expect(profile.errorText).toHaveText(
      "We couldn't load this profile. Check your connection and try again.",
    );
    await expect(profile.directoryAction).toHaveAttribute('href', '/directory');

    await profile.retryButton.click();

    await expect(profile.name).toHaveText(LAKESHORE.name);
    await expect(profile.errorHeading).toBeHidden();
    expect(asked).toEqual([LAKESHORE.id, LAKESHORE.id]);
  });

  test('A directory row leads to the listing profile', async ({ page, api }) => {
    answerDirectory(api, CAST);
    answerListingProfile(api, PROFILES);
    const directory = new WebDirectoryPage(page);
    const profile = new WebListingProfilePage(page);
    await directory.open();
    await expect(directory.rows).toHaveCount(CAST.length);

    await directory.openRow('Lakeshore Runners Fellowship');

    await expect(page).toHaveURL(`/directory/${LAKESHORE.id}`);
    await expect(profile.name).toHaveText(LAKESHORE.name);

    await profile.backLink.click();

    await expect(page).toHaveURL('/directory');
    await expect(directory.rows).toHaveCount(CAST.length);
  });
});
