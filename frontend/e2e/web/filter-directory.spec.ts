import { expect, test } from '../fixtures/test';
import { answerDirectory, CAST } from '../fixtures/directory';
import { WebDirectoryPage } from '../page-objects/web/directory.page';

// L2-054 AC3 and AC9 (journey 5; ADR 0071, ADR 0082): kind chips with counts narrow the directory
// to one kind, shown as one list without a heading, and keep it in the address
// (mock `directory/filtered`); at XS the chips scroll sideways and the page does not.
test.describe('Member app, filter the directory by kind', () => {
  test('The chips show All and each kind with its number of listings, All current', async ({
    page,
    api,
  }) => {
    answerDirectory(api, CAST);
    const directory = new WebDirectoryPage(page);

    await directory.open();

    await expect(directory.rows).toHaveCount(12);
    expect(await directory.chipViews()).toEqual([
      { label: 'All', count: '12', href: '/directory', current: true },
      { label: 'Organizations', count: '3', href: '/directory?kind=organization', current: false },
      { label: 'People', count: '1', href: '/directory?kind=person', current: false },
      { label: 'Instructors', count: '2', href: '/directory?kind=instructor', current: false },
      { label: 'Ambassadors', count: '2', href: '/directory?kind=ambassador', current: false },
      { label: 'Companies', count: '2', href: '/directory?kind=company', current: false },
      {
        label: 'Church Ministries',
        count: '2',
        href: '/directory?kind=church-ministry',
        current: false,
      },
    ]);
  });

  test("Choosing a kind sets the address, marks its chip and lists that kind's listings without a heading", async ({
    page,
    api,
  }) => {
    const asked = answerDirectory(api, CAST);
    const directory = new WebDirectoryPage(page);
    await directory.open();
    await expect(directory.rows).toHaveCount(12);

    await directory.chooseKind('Instructors');

    await expect(page).toHaveURL(/\/directory\?kind=instructor$/);
    await expect(directory.chip('Instructors')).toHaveAttribute('aria-current', 'page');
    await expect(directory.chip('All')).not.toHaveAttribute('aria-current', 'page');
    await expect(directory.rows).toHaveCount(2);
    expect(await directory.groupViews()).toEqual([
      { heading: null, blurb: null, names: ['Danielle Okafor', 'Tasha Grant'] },
    ]);
    expect(asked.at(-1)).toEqual({ kind: 'instructor', q: null, cursor: null });

    await page.goBack();

    await expect(directory.chip('All')).toHaveAttribute('aria-current', 'page');
    await expect(directory.rows).toHaveCount(12);
  });

  test('An address with a kind opens on it; one the app does not know shows All', async ({
    page,
    api,
  }) => {
    const asked = answerDirectory(api, CAST);
    const directory = new WebDirectoryPage(page);

    await directory.open('?kind=church-ministry');

    await expect(directory.chip('Church Ministries')).toHaveAttribute('aria-current', 'page');
    await expect(directory.rows).toHaveCount(2);

    await directory.open('?kind=Church%20Ministry');

    await expect(directory.chip('All')).toHaveAttribute('aria-current', 'page');
    await expect(directory.rows).toHaveCount(12);
    expect(asked.map((a) => a.kind)).toEqual(['church-ministry', null]);
  });

  test('A kind with nobody listed says so and offers the whole directory', async ({
    page,
    api,
  }) => {
    answerDirectory(
      api,
      CAST.filter((listing) => listing.kind !== 'person'),
    );
    const directory = new WebDirectoryPage(page);

    await directory.open('?kind=person');

    await expect(directory.main.getByText('Nothing here yet', { exact: true })).toBeVisible();
    await expect(directory.chip('People')).toContainText('0');
    await directory.main.getByRole('button', { name: 'Show all' }).click();
    await expect(page).toHaveURL(/\/directory$/);
    await expect(directory.rows).toHaveCount(11);
  });

  test('At XS the chips scroll sideways without the page scrolling, and the area moves under the tagline', async ({
    page,
    api,
  }) => {
    answerDirectory(api, CAST);
    await page.setViewportSize({ width: 360, height: 760 });
    const directory = new WebDirectoryPage(page);

    await directory.open();

    await expect(directory.rows).toHaveCount(12);
    expect(await directory.sidewaysScroll()).toEqual({ page: false, chips: true });
    expect(new Set(await directory.visibleAreaPlacement())).toEqual(new Set(['under-tagline']));

    await page.setViewportSize({ width: 1024, height: 800 });

    await expect
      .poll(async () => new Set(await directory.visibleAreaPlacement()))
      .toEqual(new Set(['column']));
    expect(await directory.sidewaysScroll()).toEqual({ page: false, chips: false });
  });
});
