import { answerStoryImages } from '../fixtures/admin-stories';
import { answerAsVisitor } from '../fixtures/claims';
import { SIGNED_IN, expect, test } from '../fixtures/test';
import { answerStories, CHURCH_GYM, REST_DAY, STORY_NOW } from '../fixtures/stories';
import { WebStoryPage } from '../page-objects/web/story.page';

// L2-061 AC6 (journey 24; ADR 0105; mock `story/default`): "Keep reading" holds three other
// stories as the API orders them (same section first, newest first), each with image, section,
// title, author and age, leading to that story; below it the Weekly's name and cadence lead to
// Subscribe.
test.describe('Member app, keep reading after a story', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(STORY_NOW);
  });

  test('Keep reading shows three cards with image, section, title, author and age, then the Weekly', async ({
    page,
    api,
  }) => {
    answerAsVisitor(api, SIGNED_IN);
    answerStoryImages(api);
    answerStories(api, [CHURCH_GYM]);
    const story = new WebStoryPage(page);

    await story.open(CHURCH_GYM.slug);

    await expect(story.keepReading.getByRole('heading', { level: 2 })).toHaveText('Keep reading');
    expect(await story.cardViews()).toEqual([
      {
        href: '/stories/tuesday-walking-group',
        image: '/api/stories/images/0193a9c00000700080000000000000a2.jpg',
        section: 'Community',
        title: 'The Tuesday walking group that got 40 seniors off the couch and into the park',
        meta: 'Priya Raman · Yesterday',
      },
      {
        href: '/stories/easter-sunrise-record',
        image: null,
        section: 'Events',
        title: 'Easter Sunrise 5K hits a record 142 sign-ups with ten days to go',
        meta: 'CF Team · 4 hours ago',
      },
      {
        href: '/stories/okafor-coaching-strength',
        image: null,
        section: 'Pros',
        title: 'Danielle Okafor on coaching strength without the shame',
        meta: 'Marcus Bell · 6 hours ago',
      },
    ]);
    await expect(story.subscribe.getByRole('heading', { level: 2 })).toHaveText(
      'The Abundant Weekly',
    );
    await expect(story.subscribe).toContainText('Every Saturday, 7 AM.');
    await expect(story.subscribe.getByRole('link', { name: 'Subscribe free' })).toHaveAttribute(
      'href',
      '/subscribe',
    );
  });

  test('A card opens its story in the app', async ({ page, api }) => {
    answerAsVisitor(api, SIGNED_IN);
    answerStoryImages(api);
    const asked = answerStories(api, [
      CHURCH_GYM,
      { ...REST_DAY, slug: 'easter-sunrise-record', headline: 'Easter Sunrise 5K record' },
    ]);
    const story = new WebStoryPage(page);
    await story.open(CHURCH_GYM.slug);
    await story.markDocument();

    await story.cards.nth(1).click();

    await expect(story.headlines).toHaveText('Easter Sunrise 5K record');
    expect(story.location()).toBe('/stories/easter-sunrise-record');
    expect(await story.isSameDocument()).toBe(true);
    expect(asked).toEqual([CHURCH_GYM.slug, 'easter-sunrise-record']);
  });

  test('With no other stories, Keep reading does not show but the Weekly does', async ({
    page,
    api,
  }) => {
    answerAsVisitor(api, SIGNED_IN);
    answerStories(api, [REST_DAY]);
    const story = new WebStoryPage(page);

    await story.open(REST_DAY.slug);

    await expect(story.headlines).toHaveText(REST_DAY.headline);
    await expect(story.keepReading).toHaveCount(0);
    await expect(story.subscribe).toBeVisible();
  });
});
