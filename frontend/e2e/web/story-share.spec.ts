import { answerStoryImages } from '../fixtures/admin-stories';
import { answerAsVisitor } from '../fixtures/claims';
import { SIGNED_IN, expect, test } from '../fixtures/test';
import { answerStories, CHURCH_GYM, REST_DAY, STORY_NOW } from '../fixtures/stories';
import { WebStoryPage } from '../page-objects/web/story.page';

// L2-061 AC3, AC4 (journey 24; ADR 0105; mocks `story/default`, `link-copied`, `plain`): Copy link
// puts the story's address on the clipboard and reads "Link copied" for about 2 seconds, or shows
// the address selected when the clipboard refuses; a story pointing to a published listing or
// event ends with its next step card, which takes a visitor to sign in and back.
test.describe('Member app, share a story and take its next step', () => {
  test('Copy link puts the address on the clipboard and reads "Link copied" for about 2 seconds', async ({
    page,
    api,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.clock.install({ time: STORY_NOW });
    answerAsVisitor(api, SIGNED_IN);
    answerStoryImages(api);
    answerStories(api, [CHURCH_GYM]);
    const story = new WebStoryPage(page);
    await story.open(CHURCH_GYM.slug);

    await story.copyLink.click();

    await expect(story.copyLink).toHaveText('Link copied');
    await expect(story.copyStatus).toHaveText('Link copied');
    expect(await story.clipboard()).toBe(new URL(`/stories/${CHURCH_GYM.slug}`, page.url()).href);
    // The exact 2,000 ms is CopiedFlag's unit test: real time also runs on an installed clock.
    await page.clock.fastForward(2_000);
    await expect(story.copyLink).toHaveText('Copy link');
    await expect(story.copyStatus).toHaveText('');
  });

  test('When the clipboard refuses, the address shows selected so it can be copied by hand', async ({
    page,
    api,
  }) => {
    await page.addInitScript(() => {
      navigator.clipboard.writeText = () =>
        Promise.reject(new DOMException('Refused', 'NotAllowedError'));
    });
    answerAsVisitor(api, SIGNED_IN);
    answerStories(api, [REST_DAY]);
    const story = new WebStoryPage(page);
    await story.open(REST_DAY.slug);

    await story.copyLink.click();

    const address = new URL(`/stories/${REST_DAY.slug}`, page.url()).href;
    await expect(story.address).toHaveValue(address);
    await expect(story.address).toBeFocused();
    expect(await story.addressSelection()).toEqual([0, address.length]);
    await expect(story.copyLink).toHaveText('Copy link');
  });

  test(
    'A visitor follows the next step card and is taken to sign in, then returned to it',
    { tag: '@critical' },
    async ({ page, api }) => {
      await page.clock.setFixedTime(STORY_NOW);
      answerAsVisitor(api, SIGNED_IN);
      answerStoryImages(api);
      answerStories(api, [CHURCH_GYM]);
      const story = new WebStoryPage(page);
      await story.open(CHURCH_GYM.slug);

      await expect(story.nextLabel).toHaveText('In the directory');
      await expect(story.nextTitle).toHaveText('Find church sports ministries near you');
      await expect(story.next).toHaveAttribute('href', CHURCH_GYM.next!.link);
      await story.markDocument();
      await story.next.click();

      await expect(page).toHaveURL(
        `/sign-in?returnUrl=${encodeURIComponent(CHURCH_GYM.next!.link)}`,
      );
      expect(await story.isSameDocument()).toBe(true);
    },
  );

  test('An event next step reads "From this story"; a story without one shows no card', async ({
    page,
    api,
  }) => {
    answerAsVisitor(api, SIGNED_IN);
    answerStories(api, [
      {
        ...REST_DAY,
        next: {
          kind: 'event',
          text: 'Run the Sunrise 5K',
          link: '/events/0193a9c0-0000-7000-8000-00000000e501',
        },
      },
      { ...CHURCH_GYM, image: null, next: null },
    ]);
    const story = new WebStoryPage(page);

    await story.open(REST_DAY.slug);
    await expect(story.nextLabel).toHaveText('From this story');
    await expect(story.nextTitle).toHaveText('Run the Sunrise 5K');

    await story.open(CHURCH_GYM.slug);
    await expect(story.headlines).toHaveText(CHURCH_GYM.headline);
    await expect(story.next).toHaveCount(0);
  });
});
