import { expect, test } from '../fixtures/test';
import { answerDirectory, CAST } from '../fixtures/directory';
import { WebDirectoryPage } from '../page-objects/web/directory.page';

// L2-054 AC1, AC2, AC6, AC8 and L2-008 AC1, AC2 (journey 5; ADR 0082): members open Directory from
// the navigation and see the published listings grouped by kind, each row with its mark, name,
// Verified mark, tagline, area and hosting count (mock `directory/default`, `loading`, `empty`, `error`).
test.describe('Member app, browse the directory', () => {
  test('Directory groups the listings by kind, each in name order under its plural name and blurb', async ({
    page,
    api,
  }) => {
    answerDirectory(api, CAST);
    const directory = new WebDirectoryPage(page);

    await directory.open();

    await expect(directory.heading).toHaveText('Directory');
    await expect(directory.subtitle).toHaveText(
      'The churches, clubs, coaches and companies behind every event. Follow one to see their new dates first.',
    );
    await expect(directory.rows).toHaveCount(12);
    expect(await directory.groupViews()).toEqual([
      {
        heading: 'Organizations',
        blurb: 'Clubs and groups that run events',
        names: ['Christian Fitness', 'Faith & Footwork', 'Lakeshore Runners Fellowship'],
      },
      {
        heading: 'People',
        blurb: 'Speakers, pastors and community voices',
        names: ['Rev. James Whitfield'],
      },
      {
        heading: 'Instructors',
        blurb: 'Certified coaches who lead sessions',
        names: ['Danielle Okafor', 'Tasha Grant'],
      },
      {
        heading: 'Ambassadors',
        blurb: 'Members who welcome newcomers',
        names: ['Michael Chen', 'Priya Nair'],
      },
      {
        heading: 'Companies',
        blurb: 'Sponsors and local businesses',
        names: ['Kingdom Fuel Nutrition', 'Northline Athletic'],
      },
      {
        heading: 'Church Ministries',
        blurb: 'Fitness and health ministries of local churches',
        names: ['Grace Fellowship Move Ministry', 'St. Paul’s Sports Ministry'],
      },
    ]);
  });

  test('Each row shows its mark, name, Verified mark, tagline, area and what it hosts, and a Follow button', async ({
    page,
    api,
  }) => {
    answerDirectory(api, CAST);
    await page.setViewportSize({ width: 1280, height: 900 });
    const directory = new WebDirectoryPage(page);

    await directory.open();

    await expect(directory.rows).toHaveCount(12);
    const rows = await directory.rowViews();
    expect(rows[0]).toEqual({
      href: `/directory/${CAST[0].id}`,
      initials: 'CF',
      shape: 'square',
      photo: null,
      name: 'Christian Fitness',
      verified: true,
      tagline: 'Faith-first fitness community for the GTA',
      area: 'Toronto-wide',
      hosting: '1 hosting',
      hostingSome: true,
    });
    expect(rows[3]).toEqual(
      expect.objectContaining({
        initials: 'JW',
        shape: 'round',
        hosting: 'No events yet',
        hostingSome: false,
      }),
    );
    expect(rows[4]).toEqual(
      expect.objectContaining({
        name: 'Danielle Okafor',
        initials: '',
        shape: 'round',
        photo: '/api/directory/photos/0f8e1c2d3b4a59687766554433221100.jpg',
      }),
    );
    expect(rows[6]).toEqual(expect.objectContaining({ initials: 'MC', shape: 'round' }));
    expect(rows[9]).toEqual(
      expect.objectContaining({
        name: 'Northline Athletic',
        initials: 'NA',
        shape: 'square',
        verified: false,
      }),
    );
    expect(rows[11]).toEqual(
      expect.objectContaining({ initials: 'SP', hosting: '3 hosting', hostingSome: true }),
    );
    await expect(directory.followButtons).toHaveCount(CAST.length);
  });

  test('A kind with no listing shows no group, and a name is shown as text, never as markup', async ({
    page,
    api,
  }) => {
    answerDirectory(api, [{ ...CAST[1], name: '<b>Faith</b> & Footwork' }, CAST[10]]);
    const directory = new WebDirectoryPage(page);

    await directory.open();

    await expect(directory.rows).toHaveCount(2);
    expect(await directory.groupViews()).toEqual([
      expect.objectContaining({ heading: 'Organizations', names: ['<b>Faith</b> & Footwork'] }),
      expect.objectContaining({
        heading: 'Church Ministries',
        names: ['Grace Fellowship Move Ministry'],
      }),
    ]);
    await expect(directory.main.locator('.listing-row__name b')).toHaveCount(0);
  });

  test('While the directory loads, skeleton rows show under the heading, search and chips', async ({
    page,
    api,
  }) => {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => (release = resolve));
    answerDirectory(api, CAST, () => ({ hold }));
    const directory = new WebDirectoryPage(page);

    await directory.open();

    await expect(directory.loadingLabel).toBeAttached();
    await expect(directory.skeletonRows).not.toHaveCount(0);
    await expect(directory.heading).toHaveText('Directory');
    await expect(directory.search).toBeVisible();
    await expect(directory.chips).toHaveCount(7);
    await expect(directory.rows).toHaveCount(0);
    release();
    await expect(directory.rows).toHaveCount(12);
    await expect(directory.loading).toHaveCount(0);
  });

  test('With nobody listed, an empty state says so and points to Events', async ({ page }) => {
    const directory = new WebDirectoryPage(page);

    await directory.open();

    await expect(directory.emptyHeading).toBeVisible();
    await expect(directory.emptyText).toHaveText(
      'Churches, clubs, coaches and companies appear here once our team has checked them.',
    );
    await expect(directory.browseEventsLink).toHaveAttribute('href', '/events');
    await expect(directory.rows).toHaveCount(0);
  });

  test('When the directory cannot be loaded, an error state offers Try again, which loads it', async ({
    page,
    api,
  }) => {
    const asked = answerDirectory(api, CAST, (n) => (n === 0 ? { abort: true } : null));
    const directory = new WebDirectoryPage(page);

    await directory.open();

    await expect(directory.errorHeading).toBeVisible();
    await expect(directory.rows).toHaveCount(0);
    await directory.retryButton.click();
    await expect(directory.rows).toHaveCount(12);
    await expect(directory.errorHeading).toHaveCount(0);
    expect(asked).toHaveLength(2);
  });

  test('From MD the header shows the six destinations with Directory current', async ({
    page,
    api,
  }) => {
    answerDirectory(api, CAST);
    await page.setViewportSize({ width: 1024, height: 800 });
    const directory = new WebDirectoryPage(page);

    await directory.open();

    await expect(directory.navLinks).toHaveText([
      'Home',
      'Events',
      'Directory',
      'Services',
      'Messages',
    ]);
    await expect(directory.currentNavLink).toHaveText('Directory');
  });

  test('At 360 px the bottom bar shows all six destinations, uncut, with 44 px targets, and opens Directory', async ({
    page,
    api,
  }) => {
    answerDirectory(api, CAST);
    await page.setViewportSize({ width: 360, height: 760 });
    const directory = new WebDirectoryPage(page);
    await page.goto('/home');

    await expect(directory.mobileItems).toHaveText([
      'Home',
      'Events',
      'Directory',
      'Services',
      'Messages',
      'Profile',
    ]);
    const items = await directory.mobileItems.evaluateAll((links) =>
      links.map((link) => ({
        width: link.getBoundingClientRect().width,
        height: link.getBoundingClientRect().height,
        cut: link.scrollWidth > link.clientWidth,
      })),
    );
    for (const item of items) {
      expect(item.width).toBeGreaterThanOrEqual(44);
      expect(item.height).toBeGreaterThanOrEqual(44);
      expect(item.cut).toBe(false);
    }
    await directory.mobileItems.filter({ hasText: 'Directory' }).click();

    await expect(page).toHaveURL(/\/directory$/);
    await expect(directory.heading).toHaveText('Directory');
    await expect(directory.mobileCurrentItem).toHaveText('Directory');
  });
});
