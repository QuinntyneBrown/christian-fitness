import { answerStoryImages } from '../fixtures/admin-stories';
import { answerAsVisitor } from '../fixtures/claims';
import { SIGNED_IN, expect, test } from '../fixtures/test';
import {
  answerStories,
  answerStoryReads,
  CHURCH_GYM,
  REST_DAY,
  STORY_NOW,
} from '../fixtures/stories';
import { WebStoryPage } from '../page-objects/web/story.page';

// L2-061 AC1, AC2, AC7, AC9 to AC11, AC13 (journey 24; ADR 0105): anyone reads a published story at
// `/stories/<slug>` (mocks `story/default`, `plain`, `loading`, `error`): the masthead for a
// visitor or the member header, the head, the figure and the text as written; the not-found view
// for any other slug; skeletons while it loads and Try again when it does not.
test.describe('Member app, read a story', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(STORY_NOW);
  });

  test(
    'A visitor reads a story under the masthead: section, one h1, summary, author, age and reading time, image and text',
    { tag: '@critical' },
    async ({ page, api }) => {
      answerAsVisitor(api, SIGNED_IN);
      answerStoryImages(api);
      const asked = answerStories(api, [CHURCH_GYM]);
      const story = new WebStoryPage(page);

      await story.open(CHURCH_GYM.slug);

      expect(await story.headView()).toEqual({
        section: 'Community',
        headline: CHURCH_GYM.headline,
        summary: CHURCH_GYM.summary,
        author: 'Naomi Clarke',
        when: '2 hours ago · 6 min read',
      });
      await expect(story.headlines).toHaveCount(1);
      await expect(story.mastheadSignIn).toHaveAttribute('href', '/sign-in');
      await expect(story.mastheadJoin).toHaveAttribute('href', '/join');
      await expect(story.memberHeader).toHaveCount(0);
      await expect(story.backLink).toHaveText('All stories');
      await expect(story.backLink).toHaveAttribute('href', '/');
      await expect(story.image).toHaveAttribute(
        'src',
        `/api/stories/images/${CHURCH_GYM.image!.key}`,
      );
      await expect(story.paragraphs.first()).toHaveText(/^On a Tuesday night in March/);
      await expect(story.quotes).toHaveText([
        '“We talk about the body as a temple every Sunday. I wanted a room where we actually looked after one.”',
      ]);
      expect(await story.title()).toBe(CHURCH_GYM.headline);
      expect(await story.description()).toBe(CHURCH_GYM.summary);
      expect(asked).toEqual([CHURCH_GYM.slug]);
    },
  );

  test('A signed-in member reads a story under the member header', async ({ page, api }) => {
    answerStories(api, [REST_DAY]);
    const story = new WebStoryPage(page);

    await story.open(REST_DAY.slug);

    await expect(story.headlines).toHaveText(REST_DAY.headline);
    await expect(story.memberHeader).toBeVisible();
    await expect(story.masthead).toHaveCount(0);
  });

  test('A story with no summary or image shows neither, and short text reads "1 min read"', async ({
    page,
    api,
  }) => {
    answerAsVisitor(api, SIGNED_IN);
    answerStories(api, [REST_DAY]);
    const story = new WebStoryPage(page);

    await story.open(REST_DAY.slug);

    expect(await story.headView()).toEqual({
      section: 'Faith & Body',
      headline: REST_DAY.headline,
      summary: null,
      author: 'Pastor Ruth Adeyemi',
      when: 'Yesterday · 1 min read',
    });
    await expect(story.image).toHaveCount(0);
    expect(await story.description()).toBe('');
  });

  test('Words a writer typed as HTML show as text', async ({ page, api }) => {
    answerAsVisitor(api, SIGNED_IN);
    answerStories(api, [
      { ...REST_DAY, headline: '<b>Bold?</b>', summary: '<i>No</i>', text: '<img src=x>' },
    ]);
    const story = new WebStoryPage(page);

    await story.open(REST_DAY.slug);

    await expect(story.headlines).toHaveText('<b>Bold?</b>');
    await expect(story.paragraphs).toHaveText(['<img src=x>']);
    await expect(story.article.locator('b, i, img')).toHaveCount(0);
  });

  test('A slug that is not a published story shows the not-found view at its address', async ({
    page,
    api,
  }) => {
    answerAsVisitor(api, SIGNED_IN);
    answerStories(api, []);
    const story = new WebStoryPage(page);

    await story.open('draft-story');

    await expect(story.heading).toHaveText('Page not found');
    expect(story.location()).toBe('/stories/draft-story');
    await expect(story.article).toHaveCount(0);
  });

  // L2-061 AC8 (ADR 0105): a link the story had before it changed keeps working.
  test("A story's former link shows the story and puts its current link in the address bar", async ({
    page,
    api,
  }) => {
    answerAsVisitor(api, SIGNED_IN);
    const asked = answerStories(api, [REST_DAY], (slug) =>
      slug === 'rest-day-old-link' ? { json: REST_DAY } : undefined,
    );
    const story = new WebStoryPage(page);

    await story.open('rest-day-old-link');

    await expect(story.headlines).toHaveText(REST_DAY.headline);
    await expect.poll(() => story.location()).toBe(`/stories/${REST_DAY.slug}`);
    // The new tab's blank page and the story: the current link replaced the former one.
    expect(await story.historyLength()).toBe(2);
    expect(asked).toEqual(['rest-day-old-link']);
  });

  test('While the story loads, skeletons show; when it fails, Try again loads it and All stories leads home', async ({
    page,
    api,
  }) => {
    answerAsVisitor(api, SIGNED_IN);
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    answerStoryReads(api);
    let fail = true;
    api.on('GET', `/api/public/stories/${REST_DAY.slug}`, async () => {
      await held;
      return fail ? { abort: true } : { json: REST_DAY };
    });
    const story = new WebStoryPage(page);

    await story.open(REST_DAY.slug);
    await expect(story.loading).toContainText('Loading story');
    release();

    await expect(story.failure).toBeVisible();
    await expect(story.allStories).toHaveAttribute('href', '/');
    fail = false;
    await story.tryAgain.click();
    await expect(story.headlines).toHaveText(REST_DAY.headline);
  });
});
