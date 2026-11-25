import { answerDirectory, CAST, type DirectoryListingFixture } from '../fixtures/directory';
import { answerListingFollows } from '../fixtures/listing-follows';
import { expect, test } from '../fixtures/test';
import { WebDirectoryPage } from '../page-objects/web/directory.page';

const named = (name: string): DirectoryListingFixture => {
  const row = CAST.find((listing) => listing.name === name);
  if (!row) throw new Error(`No listing named ${name} in the directory cast`);
  return row;
};
const LAKESHORE = named('Lakeshore Runners Fellowship');
const FAITH = named('Faith & Footwork');

/** The cast with Lakeshore Runners Fellowship followed. */
const FOLLOWING_LAKESHORE = CAST.map((row) =>
  row.id === LAKESHORE.id ? { ...row, following: true } : row,
);

// L2-054 AC2 and AC9, L2-056 AC1 to AC3 (journey 8; ADR 0088): each Directory row ends with a Follow
// button that follows or unfollows the listing at once, goes back with a toast when the request
// fails (mocks `directory/default`, `follow-failed`), and keeps a 44 × 44 px target at XS.
test.describe('Member app, follow from the Directory', () => {
  test('Each row has a Follow button naming its listing, pressed where the member follows it', async ({
    page,
    api,
  }) => {
    answerDirectory(api, FOLLOWING_LAKESHORE);
    const directory = new WebDirectoryPage(page);

    await directory.open();

    await expect(directory.rows).toHaveCount(CAST.length);
    expect(await directory.followViews()).toEqual(
      CAST.map((row) => [`Follow ${row.name}`, row.id === LAKESHORE.id ? 'true' : 'false']),
    );
    expect(await directory.followView(LAKESHORE.name)).toEqual({
      label: 'Follow',
      name: 'Follow Lakeshore Runners Fellowship',
      pressed: 'true',
      check: true,
      disabled: null,
    });
  });

  test('A row’s Follow follows its listing, and pressing it again stops, without leaving the Directory', async ({
    page,
    api,
  }) => {
    answerDirectory(api, CAST);
    const sent = answerListingFollows(api, [{ id: FAITH.id, following: false, followers: 40 }]);
    const directory = new WebDirectoryPage(page);
    await directory.open();

    await directory.followButton(FAITH.name).click();

    await expect(directory.followButton(FAITH.name)).toHaveAttribute('aria-pressed', 'true');
    await expect(directory.followButton(FAITH.name)).not.toHaveAttribute('aria-disabled');
    await directory.followButton(FAITH.name).click();
    await expect(directory.followButton(FAITH.name)).toHaveAttribute('aria-pressed', 'false');
    await expect(directory.followButton(FAITH.name)).not.toHaveAttribute('aria-disabled');
    expect(sent).toEqual([
      { method: 'PUT', id: FAITH.id },
      { method: 'DELETE', id: FAITH.id },
    ]);
    await expect(page).toHaveURL(/\/directory$/);
    expect((await directory.followViews()).filter(([, pressed]) => pressed === 'true')).toEqual([]);
  });

  test('A follow that fails goes back to Follow and a toast names the listing', async ({
    page,
    api,
  }) => {
    answerDirectory(api, CAST);
    answerListingFollows(api, [{ id: FAITH.id, following: false, followers: 40 }], () => ({
      status: 503,
    }));
    const directory = new WebDirectoryPage(page);
    await directory.open();

    await directory.followButton(FAITH.name).click();

    await expect
      .poll(() => directory.failureToastViews())
      .toEqual([["We couldn't follow Faith & Footwork", 'Try again in a moment.']]);
    expect(await directory.followView(FAITH.name)).toMatchObject({
      pressed: 'false',
      check: false,
      disabled: null,
    });
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 360, height: 760 }, hasTouch: true, isMobile: true });

    test('At XS each row keeps its Follow button with a 44 × 44 px target', async ({
      page,
      api,
    }) => {
      answerDirectory(api, CAST);
      const directory = new WebDirectoryPage(page);

      await directory.open();

      await expect(directory.rows).toHaveCount(CAST.length);
      for (const row of CAST) {
        const target = await directory.followTarget(row.name);
        expect(target, row.name).toMatchObject({ width: 108, height: 36 });
        expect(target.targetWidth, row.name).toBeGreaterThanOrEqual(44);
        expect(target.targetHeight, row.name).toBeGreaterThanOrEqual(44);
      }
    });
  });
});
