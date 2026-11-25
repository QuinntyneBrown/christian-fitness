import { expect, test } from '../fixtures/test';
import { answerListingFollows } from '../fixtures/listing-follows';
import { answerListingProfile, LAKESHORE, OKAFOR } from '../fixtures/listing-profile';
import { WebListingProfilePage } from '../page-objects/web/listing-profile.page';

// L2-056 AC1 to AC4, AC8 and AC9 (journey 8; ADR 0088): a member follows a listing from its profile,
// and presses the pressed Follow to stop, with no confirmation (mocks `listing-profile/default` and
// `one-off`). The Directory's rows are in `follow-directory.spec.ts`.
test.describe('Member app, follow a listing', () => {
  test('Follow on the profile follows the listing: pressed, a check mark and one more follower', async ({
    page,
    api,
  }) => {
    answerListingProfile(api, [LAKESHORE]);
    const sent = answerListingFollows(api, [
      { id: LAKESHORE.id, following: false, followers: 612 },
    ]);
    const profile = new WebListingProfilePage(page);
    await profile.open(LAKESHORE.id);
    expect(await profile.followView()).toEqual({
      label: 'Follow',
      name: 'Follow Lakeshore Runners Fellowship',
      pressed: 'false',
      check: false,
      disabled: null,
    });

    await profile.followButton.click();

    await expect(profile.followButton).toHaveAttribute('aria-pressed', 'true');
    expect(await profile.followView()).toEqual({
      label: 'Follow',
      name: 'Follow Lakeshore Runners Fellowship',
      pressed: 'true',
      check: true,
      disabled: null,
    });
    await expect.poll(() => profile.followers()).toBe('613');
    expect(sent).toEqual([{ method: 'PUT', id: LAKESHORE.id }]);
  });

  test('The pressed Follow stops following at once, with no confirmation, and one follower fewer', async ({
    page,
    api,
  }) => {
    answerListingProfile(api, [{ ...OKAFOR, following: true, followers: 2140 }]);
    const sent = answerListingFollows(api, [{ id: OKAFOR.id, following: true, followers: 2140 }]);
    const profile = new WebListingProfilePage(page);
    await profile.open(OKAFOR.id);
    await expect(profile.followButton).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => profile.followers()).toBe('2,140');

    await profile.followButton.click();

    await expect(profile.followButton).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => profile.followers()).toBe('2,139');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(sent).toEqual([{ method: 'DELETE', id: OKAFOR.id }]);
  });
});
