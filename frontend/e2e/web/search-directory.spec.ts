import { expect, test } from '../fixtures/test';
import { answerDirectory, CAST } from '../fixtures/directory';
import { WebDirectoryPage } from '../page-objects/web/directory.page';

// L2-054 AC4 and AC5 (journey 5; ADR 0077, ADR 0082): a search of 2 or more characters, sent
// 300 ms after the last keystroke, lists the matches grouped by kind, combines with the kind and
// lives in the address as `q`; with no match the screen says so and Clear search clears both
// (mocks `directory/search`, `directory/no-results`).
test.describe('Member app, search the directory', () => {
  test('Typing a search asks once, after the last keystroke, and lists the matches grouped by kind', async ({
    page,
    api,
  }) => {
    const asked = answerDirectory(api, CAST);
    const directory = new WebDirectoryPage(page);
    await directory.open();
    await expect(directory.rows).toHaveCount(12);

    await directory.pressSearch('basketball');

    await expect(page).toHaveURL(/\/directory\?q=basketball$/);
    await expect(directory.rows).toHaveCount(4);
    expect(await directory.groupViews()).toEqual([
      expect.objectContaining({ heading: 'Organizations', names: ['Faith & Footwork'] }),
      expect.objectContaining({ heading: 'Instructors', names: ['Tasha Grant'] }),
      expect.objectContaining({ heading: 'Ambassadors', names: ['Priya Nair'] }),
      expect.objectContaining({
        heading: 'Church Ministries',
        names: ['St. Paul’s Sports Ministry'],
      }),
    ]);
    expect(asked.map((a) => a.q)).toEqual([null, 'basketball']);
    await expect(directory.chip('All')).toContainText('12');
  });

  test('One character is not a search; the second one is', async ({ page, api }) => {
    const asked = answerDirectory(api, CAST);
    await page.clock.install();
    const directory = new WebDirectoryPage(page);
    await directory.open();
    await expect(directory.rows).toHaveCount(12);

    await directory.typeSearch('e');
    await page.clock.fastForward(1000);
    await directory.typeSearch('et');
    await page.clock.fastForward(300);

    await expect(page).toHaveURL(/\/directory\?q=et$/);
    expect(asked.map((a) => a.q)).toEqual([null, 'et']);
  });

  test('A search combines with the chosen kind, and an address with a search opens on it', async ({
    page,
    api,
  }) => {
    const asked = answerDirectory(api, CAST);
    const directory = new WebDirectoryPage(page);
    await directory.open('?kind=instructor');
    await expect(directory.rows).toHaveCount(2);

    await directory.typeSearch('basketball');

    await expect(page).toHaveURL(/\/directory\?kind=instructor&q=basketball$/);
    await expect(directory.rows).toHaveCount(1);
    expect(asked.at(-1)).toEqual({ kind: 'instructor', q: 'basketball', cursor: null });

    await directory.open('?q=etobicoke');

    await expect(directory.search).toHaveValue('etobicoke');
    await expect(directory.chip('All')).toHaveAttribute('aria-current', 'page');
    expect(await directory.groupViews()).toEqual([
      expect.objectContaining({
        heading: 'Organizations',
        names: ['Lakeshore Runners Fellowship'],
      }),
      expect.objectContaining({ heading: 'Ambassadors', names: ['Michael Chen'] }),
    ]);
  });

  test('With no match the screen says so, shows the search as text, and Clear search clears the search and the kind', async ({
    page,
    api,
  }) => {
    answerDirectory(api, CAST);
    const directory = new WebDirectoryPage(page);
    await directory.open('?kind=company');
    await expect(directory.rows).toHaveCount(2);

    await directory.typeSearch('<b>aquafit</b>');

    await expect(directory.noResultsHeading).toBeVisible();
    await expect(directory.noResultsText).toHaveText(
      'Nothing in the directory matches “<b>aquafit</b>”. Know someone who should be listed? Our team checks every suggestion.',
    );
    await expect(directory.main.locator('b')).toHaveCount(0);
    await expect(directory.rows).toHaveCount(0);

    await directory.clearSearch.click();

    await expect(page).toHaveURL(/\/directory$/);
    await expect(directory.search).toHaveValue('');
    await expect(directory.chip('All')).toHaveAttribute('aria-current', 'page');
    await expect(directory.rows).toHaveCount(12);
  });

  test('The field takes at most 100 characters', async ({ page, api }) => {
    answerDirectory(api, CAST);
    const directory = new WebDirectoryPage(page);
    await directory.open();

    await directory.typeSearch('x'.repeat(150));

    await expect(directory.search).toHaveValue('x'.repeat(100));
    await expect(page).toHaveURL(new RegExp(`q=${'x'.repeat(100)}$`));
  });
});
