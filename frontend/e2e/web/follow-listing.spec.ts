import { expect, test } from '../fixtures/test';
import { answerListingFollows } from '../fixtures/listing-follows';
import { answerListingProfile, LAKESHORE, OKAFOR } from '../fixtures/listing-profile';
import { WebListingProfilePage } from '../page-objects/web/listing-profile.page';

// L2-056 AC1 to AC5, AC8 and AC9 (journey 8; ADR 0088): a member follows a listing from its profile,
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

  test('The button changes at once and is aria-disabled while its request is in flight, so a second press does nothing', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    answerListingProfile(api, [LAKESHORE]);
    const sent = answerListingFollows(
      api,
      [{ id: LAKESHORE.id, following: false, followers: 612 }],
      (n) => (n === 0 ? { hold: held } : null),
    );
    const profile = new WebListingProfilePage(page);
    await profile.open(LAKESHORE.id);

    await profile.followButton.click();

    await expect(profile.followButton).toHaveAttribute('aria-disabled', 'true');
    expect(await profile.followView()).toMatchObject({ pressed: 'true', check: true });
    await expect.poll(() => profile.followers()).toBe('613');
    await profile.pressFollowByKey('Enter');
    await profile.pressFollowByKey(' ');
    await expect(profile.followButton).toHaveAttribute('aria-pressed', 'true');
    expect(sent).toEqual([{ method: 'PUT', id: LAKESHORE.id }]);

    release();

    await expect(profile.followButton).not.toHaveAttribute('aria-disabled');
    expect(await profile.followView()).toMatchObject({ pressed: 'true', disabled: null });
    await expect.poll(() => profile.followers()).toBe('613');
    expect(sent).toEqual([{ method: 'PUT', id: LAKESHORE.id }]);
  });

  // One row per direction and failure: the button and the count go back, and a toast names the listing.
  for (const { what, following, fault, title } of [
    {
      what: 'a follow the server fails',
      following: false,
      fault: { status: 503, code: 'unavailable' },
      title: "We couldn't follow Lakeshore Runners Fellowship",
    },
    {
      what: 'an unfollow with no connection',
      following: true,
      fault: { abort: true },
      title: "We couldn't unfollow Lakeshore Runners Fellowship",
    },
    {
      what: 'a follow refused to a suspended member (account_suspended)',
      following: false,
      fault: { status: 403, code: 'account_suspended' },
      title: "We couldn't follow Lakeshore Runners Fellowship",
    },
    {
      what: 'the 61st change in an hour (too_many_attempts)',
      following: true,
      fault: { status: 429, code: 'too_many_attempts' },
      title: "We couldn't unfollow Lakeshore Runners Fellowship",
    },
  ]) {
    test(`After ${what}, the button goes back and a toast says to try again`, async ({
      page,
      api,
    }) => {
      answerListingProfile(api, [{ ...LAKESHORE, following }]);
      const sent = answerListingFollows(
        api,
        [{ id: LAKESHORE.id, following, followers: 612 }],
        () => fault,
      );
      const profile = new WebListingProfilePage(page);
      await profile.open(LAKESHORE.id);

      await profile.followButton.click();

      await expect(profile.failureToasts).toHaveCount(1);
      expect(await profile.failureToastViews()).toEqual([[title, 'Try again in a moment.']]);
      expect(await profile.followView()).toMatchObject({
        pressed: String(following),
        check: following,
        disabled: null,
      });
      expect(await profile.followers()).toBe('612');
      await expect(profile.followButton).toBeFocused();
      expect(sent).toHaveLength(1);
    });
  }
});
