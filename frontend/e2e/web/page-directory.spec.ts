import { expect, test } from '../fixtures/test';
import { answerDirectory, manyListings } from '../fixtures/directory';
import { WebDirectoryPage } from '../page-objects/web/directory.page';

// L2-054 AC7 with L2-009 AC5 and AC7 (journey 5; ADR 0082): with more than 50 matches, reaching
// the end loads the next 50, with its own loading and failed states; the list stops at 200 and
// says so (mocks `directory/loading-more`, `directory/more-error`, `directory/capped`).
test.describe('Member app, page through the directory', () => {
  test('Reaching the end loads the next 50 until the last page, with the kind and search kept', async ({
    page,
    api,
  }) => {
    const asked = answerDirectory(api, manyListings(120));
    const directory = new WebDirectoryPage(page);
    await directory.open('?kind=organization&q=listing');
    await expect(directory.rows).toHaveCount(50);

    await directory.reachEnd();
    await expect(directory.rows).toHaveCount(100);
    await directory.reachEnd();
    await expect(directory.rows).toHaveCount(120);

    expect(asked).toEqual([
      { kind: 'organization', q: 'listing', cursor: null },
      { kind: 'organization', q: 'listing', cursor: '50' },
      { kind: 'organization', q: 'listing', cursor: '100' },
    ]);
    await expect(directory.rows.last()).toContainText('Listing 120');
    await expect(directory.cappedNote).toHaveCount(0);
    await expect(directory.loadingMore).toHaveCount(0);
  });

  test('While the next page loads, the end says "Loading more listings…"', async ({
    page,
    api,
  }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    answerDirectory(api, manyListings(60), (n) => (n === 1 ? { hold: held } : null));
    const directory = new WebDirectoryPage(page);
    await directory.open();
    await expect(directory.rows).toHaveCount(50);

    await directory.reachEnd();

    await expect(directory.loadingMore).toBeVisible();
    release();
    await expect(directory.rows).toHaveCount(60);
    await expect(directory.loadingMore).toHaveCount(0);
  });

  test('A next page that fails keeps the rows above and offers Try again, which loads it', async ({
    page,
    api,
  }) => {
    const asked = answerDirectory(api, manyListings(60), (n) =>
      n === 1 ? { status: 400, code: 'cursor_invalid' } : null,
    );
    const directory = new WebDirectoryPage(page);
    await directory.open();
    await expect(directory.rows).toHaveCount(50);

    await directory.reachEnd();

    await expect(directory.moreError).toBeVisible();
    await expect(directory.rows).toHaveCount(50);
    await directory.moreRetry.click();
    await expect(directory.rows).toHaveCount(60);
    expect(asked.map((a) => a.cursor)).toEqual([null, '50', '50']);
  });

  test('The list stops at 200 and says so, asking for no more', async ({ page, api }) => {
    const asked = answerDirectory(api, manyListings(260));
    const directory = new WebDirectoryPage(page);
    await directory.open();
    await expect(directory.rows).toHaveCount(50);

    for (const shown of [100, 150, 200]) {
      await directory.reachEnd();
      await expect(directory.rows).toHaveCount(shown);
    }

    await expect(directory.cappedNote).toBeVisible();
    await directory.reachEnd();
    await expect(directory.cappedNote).toBeVisible();
    expect(asked.map((a) => a.cursor)).toEqual([null, '50', '100', '150']);
  });
});
