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

const DAY = 24 * 60 * 60 * 1000;

// L2-061 AC12 (journey 24; ADR 0105): a read counts once per browser per story per 24 hours, kept
// in local storage by a hashed id, with no cookie.
test.describe('Member app, count a story read', () => {
  test('A read counts when the story shows, not again on a reload within 24 hours, and again after', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(STORY_NOW);
    answerAsVisitor(api, SIGNED_IN);
    answerStoryImages(api);
    answerStories(api, [CHURCH_GYM, REST_DAY]);
    const counted = answerStoryReads(api);
    const story = new WebStoryPage(page);

    await story.open(CHURCH_GYM.slug);
    await expect.poll(() => counted).toEqual([CHURCH_GYM.id]);
    await page.clock.setFixedTime(new Date(STORY_NOW.getTime() + DAY - 60_000));
    await story.open(CHURCH_GYM.slug);
    await expect(story.headlines).toHaveText(CHURCH_GYM.headline);
    const kept = await story.storedReads();
    // Another story's read comes after the reload's, so a read the reload sent would show first.
    await story.open(REST_DAY.slug);
    await expect.poll(() => counted).toEqual([CHURCH_GYM.id, REST_DAY.id]);
    await page.clock.setFixedTime(new Date(STORY_NOW.getTime() + DAY));
    await story.open(CHURCH_GYM.slug);

    await expect.poll(() => counted).toEqual([CHURCH_GYM.id, REST_DAY.id, CHURCH_GYM.id]);
    expect(kept).not.toBeNull();
    expect(kept).not.toContain(CHURCH_GYM.id);
    expect(kept).not.toContain(CHURCH_GYM.slug);
    // The antiforgery token is the API's own; counting a read sets no cookie.
    expect(await story.cookies()).toEqual(['__Host-cf-xsrf']);
  });

  test('A story that does not show counts no read', async ({ page, api }) => {
    answerAsVisitor(api, SIGNED_IN);
    answerStories(api, []);
    const counted = answerStoryReads(api);
    const story = new WebStoryPage(page);

    await story.open('no-such-story');

    await expect(story.heading).toHaveText('Page not found');
    expect(counted).toEqual([]);
  });
});
