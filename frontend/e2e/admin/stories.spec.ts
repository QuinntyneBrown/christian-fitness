import {
  IN_REVIEW,
  NO_STORIES,
  STORIES_NOW,
  STORY_COUNTS,
  STORY_ROWS,
  storyList,
} from '../fixtures/admin-stories';
import { bylineList } from '../fixtures/admin-bylines';
import { expect, MODERATOR_SIGNED_IN, test, type ApiHandlers } from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';
import { AdminBylinesPage } from '../page-objects/admin/bylines.page';
import { AdminForbiddenPage } from '../page-objects/admin/forbidden.page';
import { AdminStoriesPage } from '../page-objects/admin/stories.page';

/** Answers the list with `reply` and records each query string asked for. */
function answerStories(api: ApiHandlers, reply = storyList()): string[] {
  const asked: string[] = [];
  api.on('GET', '/api/admin/stories', (request) => {
    asked.push(new URL(request.url()).search);
    return reply;
  });
  return asked;
}

// L2-068 (ADR 0097): Admins list every story, newest activity first, with its status, when and
// reads; the stories in review are called out; tabs filter by status and the address keeps the
// choice; more than 50 are paged.
test.describe('Admin app, the Stories page', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(STORIES_NOW);
  });

  // L2-068 AC1, AC2, AC3, AC9: mock admin-stories/default.
  test('lists every story with its byline, section, status, when and reads, as the default mock draws it', async ({
    page,
    api,
  }) => {
    answerStories(api);
    const stories = new AdminStoriesPage(page);

    await stories.open();

    await expect(stories.heading).toHaveText('Stories');
    await expect.poll(() => page.title()).toBe('Stories · Christian Fitness Admin');
    await expect(stories.subtitle).toHaveText(
      'What members read on the front page, in RSS and in the Weekly.',
    );
    await expect(stories.bylinesLink).toHaveAttribute('href', '/stories/bylines');
    await expect(stories.newStoryLink).toHaveAttribute('href', '/stories/new');
    expect(await stories.reviewCardTexts()).toEqual([
      [
        'Waiting for your review · Submitted 1 hour ago',
        'Fasting and training: what a dietitian wants you to know',
        'Priya Raman · Nutrition',
      ],
    ]);
    await expect(stories.reviewCards).toHaveAttribute('href', `/stories/${IN_REVIEW.id}`);
    expect(await stories.tabTexts()).toEqual([
      'All 8',
      'Draft 1',
      'In review 1',
      'Scheduled 1',
      'Published 5',
    ]);
    await expect(stories.currentTab).toHaveText(/^All/);
    expect(await stories.headings()).toEqual(['Story', 'Section', 'Status', 'When', 'Reads']);
    expect(await stories.rowTexts()).toEqual([
      [
        STORY_ROWS[0].headline,
        'Priya Raman',
        'Nutrition',
        'In review',
        'Submitted 1 hour ago',
        '—',
      ],
      [STORY_ROWS[1].headline, 'Naomi Clarke', 'Community', 'Draft', 'Edited yesterday', '—'],
      [STORY_ROWS[2].headline, 'CF Team', 'Events', 'Scheduled', 'Sat Apr 18, 6:00 AM', '—'],
      [STORY_ROWS[3].headline, 'Naomi Clarke', 'Community', 'Published', 'Today, 7:12 AM', '3,412'],
      [STORY_ROWS[4].headline, 'CF Team', 'Events', 'Published', 'Today, 5:04 AM', '1,980'],
      [STORY_ROWS[5].headline, 'Marcus Bell', 'Pros', 'Published', 'Today, 3:30 AM', '2,206'],
      [
        STORY_ROWS[6].headline,
        'Pastor Ruth Adeyemi',
        'Faith & Body',
        'Published',
        'Yesterday',
        '5,871',
      ],
      [STORY_ROWS[7].headline, 'Marcus Bell', 'Training', 'Published', 'Apr 8', '4,340'],
    ]);
    await expect(stories.readsCell(0)).toContainText('Not published');
    await expect(stories.rowLink(STORY_ROWS[3].headline)).toHaveAttribute(
      'href',
      `/stories/${STORY_ROWS[3].id}`,
    );
    await expect(stories.pagination).toHaveCount(0);
  });

  // L2-068 AC3: the tab is current, the address carries it and the list asks for it.
  test('choosing a tab shows its stories and puts the choice in the address', async ({
    page,
    api,
  }) => {
    const asked = answerStories(api);
    const stories = new AdminStoriesPage(page);
    await stories.open();
    await expect(stories.rows).toHaveCount(8);
    answerStories(api, storyList({ items: [STORY_ROWS[1]] }));

    await stories.tab('Draft').click();

    await expect(stories.rows).toHaveCount(1);
    expect(stories.location()).toBe('/stories?status=draft');
    await expect(stories.currentTab).toHaveText('Draft 1');
    expect(asked[0]).toBe('');
  });

  test('the address names the tab and page it opens on', async ({ page, api }) => {
    const asked = answerStories(api, storyList({ items: [STORY_ROWS[2]], page: 2, pageCount: 2 }));
    const stories = new AdminStoriesPage(page);

    await stories.open('/stories?status=scheduled&page=2');

    await expect(stories.rows).toHaveCount(1);
    await expect(stories.currentTab).toHaveText('Scheduled 1');
    expect(asked).toEqual(['?status=scheduled&page=2']);
  });

  // L2-068 AC2: at most three call-outs, then "All {n} in review" opens the In review tab.
  test('with more than three in review, three are called out and the rest are one link away', async ({
    page,
    api,
  }) => {
    const waiting = [0, 1, 2].map((n) => ({
      ...IN_REVIEW,
      id: `${IN_REVIEW.id.slice(0, -1)}${n}`,
      headline: `Waiting story ${n}`,
    }));
    answerStories(
      api,
      storyList({ counts: { ...STORY_COUNTS, all: 11, review: 4 }, inReview: waiting }),
    );
    const stories = new AdminStoriesPage(page);

    await stories.open();

    await expect(stories.reviewCards).toHaveCount(3);
    await expect(stories.allInReviewLink).toHaveText('All 4 in review');
    await expect(stories.allInReviewLink).toHaveAttribute('href', '/stories?status=review');
  });

  test('with one story in review, no "All in review" link shows', async ({ page, api }) => {
    answerStories(api);
    const stories = new AdminStoriesPage(page);

    await stories.open();

    await expect(stories.reviewCards).toHaveCount(1);
    await expect(stories.allInReviewLink).toHaveCount(0);
  });

  // L2-068 AC8: 50 to a page.
  test('more than 50 stories are paged, and a page is asked for by its address', async ({
    page,
    api,
  }) => {
    const asked = answerStories(api, storyList({ pageCount: 2 }));
    const stories = new AdminStoriesPage(page);
    await stories.open();
    await expect(stories.pageLink(2)).toBeVisible();
    answerStories(api, storyList({ items: [STORY_ROWS[7]], page: 2, pageCount: 2 }));

    await stories.pageLink(2).click();

    await expect(stories.rows).toHaveCount(1);
    expect(stories.location()).toBe('/stories?page=2');
    expect(asked).toEqual(['']);
  });

  // L2-068 AC6: mocks admin-stories/loading, empty and error.
  test('while the stories load, skeleton rows are busy', async ({ page, api }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    api.on('GET', '/api/admin/stories', async () => {
      await gate;
      return storyList();
    });
    const stories = new AdminStoriesPage(page);

    await stories.open();

    await expect(stories.loading).toBeVisible();
    await expect(stories.newStoryLink).toBeVisible();
    release();
    await expect(stories.rows).toHaveCount(8);
    await expect(stories.loading).toHaveCount(0);
  });

  test('with no stories at all, the empty state offers New story', async ({ page, api }) => {
    answerStories(api, NO_STORIES);
    const stories = new AdminStoriesPage(page);

    await stories.open();

    await expect(stories.emptyTitle).toHaveText('No stories yet');
    await expect(stories.emptyNewStory).toHaveAttribute('href', '/stories/new');
    await expect(stories.table).toHaveCount(0);
    await expect(stories.reviewCards).toHaveCount(0);
  });

  test('when the stories do not load, Try again asks again', async ({ page, api }) => {
    let fail = true;
    api.on('GET', '/api/admin/stories', () =>
      fail ? { status: 404, json: { status: 404, code: 'not_found' } } : storyList(),
    );
    const stories = new AdminStoriesPage(page);

    await stories.open();
    await expect(stories.errorTitle).toHaveText("Stories didn't load");
    fail = false;
    await stories.tryAgainButton.click();

    await expect(stories.rows).toHaveCount(8);
  });

  // L2-068 AC9 (L2-077): Bylines beside New story opens the bylines list.
  test('Bylines opens the bylines list', async ({ page, api }) => {
    answerStories(api);
    api.on('GET', '/api/admin/stories/bylines', () => bylineList());
    const stories = new AdminStoriesPage(page);
    const bylines = new AdminBylinesPage(page);
    await stories.open();

    await stories.bylinesLink.click();

    await expect(bylines.heading).toHaveText('Bylines');
    expect(stories.location()).toBe('/stories/bylines');
  });

  test('Stories in the navigation opens the Stories list', async ({ page, api }) => {
    answerStories(api);
    const shell = new AdminShell(page);
    const stories = new AdminStoriesPage(page);
    await shell.open('/');
    await expect(shell.heading).toHaveText('Dashboard');

    await shell.navItem('Stories').click();

    await expect(stories.heading).toHaveText('Stories');
    expect(stories.location()).toBe('/stories');
    await expect(shell.currentItem).toHaveText('Stories');
  });

  // L2-068 AC5: the navigation counts the stories in review, in words for assistive technology.
  test('the navigation counts the stories in review', async ({ page, api }) => {
    answerStories(api);
    api.on('GET', '/api/admin/counts', () => ({
      json: { suggestions: 0, storiesInReview: 1, newFeedback: 0 },
    }));
    const shell = new AdminShell(page);

    await shell.open('/stories');

    await expect(shell.navCount('Stories')).toHaveText('1');
    await expect(shell.navCount('Stories')).toHaveAttribute('aria-label', '1 story to review');
  });

  // L2-068 AC7: a Moderator meets "Admins only", the address kept.
  test('a Moderator opening Stories sees Admins only', async ({ page, api }) => {
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    const shell = new AdminShell(page);
    const forbidden = new AdminForbiddenPage(page);

    await shell.open('/stories');

    await expect(forbidden.heading).toHaveText('Admins only');
    expect(forbidden.location()).toBe('/stories');
  });

  // Names are rendered as text, never as HTML.
  test('headlines and bylines are rendered as text', async ({ page, api }) => {
    answerStories(
      api,
      storyList({
        inReview: [],
        items: [{ ...STORY_ROWS[1], headline: '<b>Bold</b>', byline: '<i>Writer</i>' }],
      }),
    );
    const stories = new AdminStoriesPage(page);

    await stories.open();

    await expect(stories.rows).toHaveCount(1);
    expect((await stories.rowTexts())[0].slice(0, 2)).toEqual(['<b>Bold</b>', '<i>Writer</i>']);
  });
});
