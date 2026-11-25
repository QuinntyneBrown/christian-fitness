import {
  DRAFT_STORY,
  newStory,
  PUBLISHED_STORY,
  REVIEW_STORY,
  STORIES_NOW,
  STORY_OPTIONS,
  STORY_ROWS,
  storyList,
  storyRefusal,
  type StoryFixture,
} from '../fixtures/admin-stories';
import { expect, MODERATOR_SIGNED_IN, test, type ApiHandlers } from '../fixtures/test';
import { AdminForbiddenPage } from '../page-objects/admin/forbidden.page';
import { AdminNotFoundPage } from '../page-objects/admin/not-found.page';
import { AdminStoriesPage } from '../page-objects/admin/stories.page';
import { StoryEditorPage } from '../page-objects/admin/story-editor.page';

const BASE = '/api/admin/stories';

/** Answers the editor's choices and `story` at its address; records each save's body. */
function answerStory(api: ApiHandlers, story: StoryFixture): Record<string, unknown>[] {
  const saves: Record<string, unknown>[] = [];
  let version = story.version;
  api.on('GET', `${BASE}/options`, () => ({ json: STORY_OPTIONS }));
  api.on('GET', `${BASE}/${story.id}`, () => ({ json: { ...story, version } }));
  api.on('PUT', `${BASE}/${story.id}`, (request) => {
    const body = request.postDataJSON() as Record<string, unknown>;
    saves.push(body);
    version += 1;
    return { json: { ...story, ...body, version, savedAt: STORIES_NOW.toISOString() } };
  });
  return saves;
}

// L2-069 AC1, AC8, AC11, AC12, AC15 and L2-068 AC4 (ADR 0097): the editor opens a story or an
// empty Draft, saves a Draft or a story In review 2 seconds after typing stops, says when, keeps
// the text when a save fails, and offers the newer version when someone else saved first.
test.describe('Admin app, the story editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: STORIES_NOW });
  });

  // L2-069 AC1, L2-077 AC8: mock admin-story-editor/default.
  test('opens a story In review with its words, its status, when it was saved and its Publishing panel', async ({
    page,
    api,
  }) => {
    answerStory(api, REVIEW_STORY);
    const editor = new StoryEditorPage(page);

    await editor.open(REVIEW_STORY.id);

    await expect(editor.heading).toHaveText('Edit story');
    await expect.poll(() => page.title()).toBe('Edit story · Christian Fitness Admin');
    await expect(editor.backLink).toHaveAttribute('href', '/stories');
    await expect(editor.status).toHaveText('In review');
    await expect(editor.saved).toHaveText('Saved 2 min ago');
    await expect(editor.headline).toHaveValue(REVIEW_STORY.headline);
    await expect(editor.summary).toHaveValue(REVIEW_STORY.summary);
    await expect(editor.story).toHaveValue(REVIEW_STORY.text);
    await expect(editor.options(editor.placement)).toHaveText([
      'Lead story',
      'Top headlines',
      'The latest',
    ]);
    expect(await editor.selectedText(editor.placement)).toBe('Top headlines');
    await expect(editor.weekly).toBeChecked();
    expect(await editor.selectedText(editor.section)).toBe('Nutrition');
    await expect(editor.options(editor.byline)).toHaveText([
      'Choose a byline',
      ...STORY_OPTIONS.bylines.map((b) => b.name),
    ]);
    expect(await editor.selectedText(editor.byline)).toBe('Priya Raman');
    await expect(editor.options(editor.pointsTo)).toHaveText([
      'Nothing',
      'Event · Easter Sunrise 5K',
      'Event · Saturday Park Bootcamp',
      'Listing · Lena Park, RD',
      'Listing · Lakeshore Runners Fellowship',
    ]);
    expect(await editor.selectedText(editor.pointsTo)).toBe('Listing · Lena Park, RD');
    await expect(editor.nextStepText).toHaveValue('Book a session with Lena');
    await expect(editor.nextStepLink).toHaveValue(REVIEW_STORY.nextStepLink!);
    await expect(editor.slugPrefix).toHaveText('/stories/');
    await expect(editor.slug).toHaveValue('fasting-and-training');
  });

  // L2-068 AC4: a row's title opens its story in the editor.
  test('a story chosen on Stories opens in the editor', async ({ page, api }) => {
    api.on('GET', BASE, () => storyList());
    answerStory(api, REVIEW_STORY);
    const stories = new AdminStoriesPage(page);
    const editor = new StoryEditorPage(page);
    await stories.open();

    await stories.rowLink(STORY_ROWS[0].headline).click();

    await expect(editor.headline).toHaveValue(REVIEW_STORY.headline);
    expect(editor.location()).toBe(`/stories/${REVIEW_STORY.id}`);
  });

  // L2-069 AC1, AC11 and L2-068 AC4: mock admin-story-editor/new; the Draft is kept on the first pause.
  test('New story opens an empty Draft, kept 2 seconds after the first words', async ({
    page,
    api,
  }) => {
    api.on('GET', BASE, () => storyList());
    api.on('GET', `${BASE}/options`, () => ({ json: STORY_OPTIONS }));
    const created: Record<string, unknown>[] = [];
    api.on('POST', BASE, (request) => {
      created.push(request.postDataJSON() as Record<string, unknown>);
      return { status: 201, json: newStory({ headline: 'Pickleball nights' }) };
    });
    const stories = new AdminStoriesPage(page);
    const editor = new StoryEditorPage(page);
    await stories.open();
    await stories.newStoryLink.click();
    await expect(editor.heading).toHaveText('New story');
    await expect(editor.status).toHaveText('Draft');
    await expect(editor.saved).toHaveText('Not saved yet');
    await expect(editor.headline).toHaveValue('');
    expect(await editor.selectedText(editor.placement)).toBe('The latest');
    expect(await editor.selectedText(editor.section)).toBe('Choose a section');

    await editor.headline.fill('Pickleball nights');
    await page.clock.fastForward(1_900);
    expect(created).toHaveLength(0);
    await page.clock.fastForward(100);

    await expect(editor.saved).toHaveText('Saved just now');
    expect(created).toEqual([expect.objectContaining({ headline: 'Pickleball nights' })]);
    expect(editor.location()).toBe(`/stories/${newStory().id}`);
  });

  // L2-069 AC11: each keystroke restarts the pause; the save carries the version last read.
  test('a Draft is saved 2 seconds after typing stops, over the version it was read at', async ({
    page,
    api,
  }) => {
    const saves = answerStory(api, DRAFT_STORY);
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);
    await expect(editor.saved).toHaveText('Saved yesterday');

    await editor.summary.fill('Four courts');
    await page.clock.fastForward(1_500);
    await editor.summary.fill('Four courts, one waiting list.');
    await page.clock.fastForward(1_500);
    expect(saves).toHaveLength(0);
    await page.clock.fastForward(500);
    await expect(editor.saved).toHaveText('Saved just now');
    await editor.section.selectOption({ label: 'Faith & Body' });
    await page.clock.fastForward(2_000);

    await expect.poll(() => saves.length).toBe(2);
    expect(saves[0]).toEqual(
      expect.objectContaining({
        summary: 'Four courts, one waiting list.',
        headline: DRAFT_STORY.headline,
        version: DRAFT_STORY.version,
      }),
    );
    expect(saves[1]).toEqual(
      expect.objectContaining({ section: 'faith-and-body', version: DRAFT_STORY.version + 1 }),
    );
  });

  // L2-069 AC11: mock admin-story-editor/failed.
  test('a failed save says so above the story and keeps what was written', async ({
    page,
    api,
  }) => {
    answerStory(api, DRAFT_STORY);
    api.on('PUT', `${BASE}/${DRAFT_STORY.id}`, () => ({ status: 503 }));
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);
    await expect(editor.headline).toHaveValue(DRAFT_STORY.headline);

    await editor.story.fill('Wednesday nights are full.');
    await page.clock.fastForward(2_000);

    await expect(editor.alertTitle).toHaveText("We couldn't save your changes");
    await expect(editor.alert).toContainText(
      'What you wrote is still here. Try again in a moment.',
    );
    await expect(editor.alert).toBeFocused();
    await expect(editor.saved).toHaveText('Not saved');
    await expect(editor.story).toHaveValue('Wednesday nights are full.');
  });

  // L2-069 AC12: mock admin-story-editor/conflict.
  test('a save over a version someone else saved offers the newer version and keeps what was typed until chosen', async ({
    page,
    api,
  }) => {
    answerStory(api, DRAFT_STORY);
    api.on('PUT', `${BASE}/${DRAFT_STORY.id}`, () => storyRefusal(409, 'story_changed'));
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);
    await expect(editor.headline).toHaveValue(DRAFT_STORY.headline);
    await editor.headline.fill('My headline');
    await page.clock.fastForward(2_000);
    await expect(editor.alertTitle).toHaveText('Someone else saved this story');
    await expect(editor.headline).toHaveValue('My headline');
    const theirs = { ...DRAFT_STORY, version: DRAFT_STORY.version + 1, headline: 'Their headline' };
    api.on('GET', `${BASE}/${DRAFT_STORY.id}`, () => ({ json: theirs }));

    await editor.loadNewerButton.click();

    await expect(editor.headline).toHaveValue('Their headline');
    await expect(editor.alert).toHaveCount(0);
  });

  test('Keep my version saves what was typed over the newer version', async ({ page, api }) => {
    answerStory(api, DRAFT_STORY);
    let refused = false;
    const saves: Record<string, unknown>[] = [];
    api.on('PUT', `${BASE}/${DRAFT_STORY.id}`, (request) => {
      const body = request.postDataJSON() as Record<string, unknown>;
      if (!refused) {
        refused = true;
        return storyRefusal(409, 'story_changed');
      }
      saves.push(body);
      return { json: { ...DRAFT_STORY, ...body, version: 9, savedAt: STORIES_NOW.toISOString() } };
    });
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);
    await expect(editor.headline).toHaveValue(DRAFT_STORY.headline);
    await editor.headline.fill('My headline');
    await page.clock.fastForward(2_000);
    await expect(editor.alertTitle).toHaveText('Someone else saved this story');
    api.on('GET', `${BASE}/${DRAFT_STORY.id}`, () => ({
      json: { ...DRAFT_STORY, version: 8, headline: 'Their headline' },
    }));

    await editor.keepMineButton.click();

    await expect(editor.saved).toHaveText('Saved just now');
    expect(saves).toEqual([expect.objectContaining({ headline: 'My headline', version: 8 })]);
    await expect(editor.headline).toHaveValue('My headline');
    await expect(editor.alert).toHaveCount(0);
  });

  // L2-069 AC11: a Published story changes only on Update.
  test('a Published story is not saved as it is typed', async ({ page, api }) => {
    const saves = answerStory(api, PUBLISHED_STORY);
    const editor = new StoryEditorPage(page);
    await editor.open(PUBLISHED_STORY.id);
    await expect(editor.status).toHaveText('Published');
    await expect(editor.saved).toHaveText('Published today, 7:12 AM');

    await editor.summary.fill('A changed summary');
    await page.clock.fastForward(5_000);

    await expect(editor.summary).toHaveValue('A changed summary');
    expect(saves).toHaveLength(0);
  });

  // L2-069 AC15: mocks admin-story-editor/loading and error, and the admin not-found page.
  test('while the story loads, the bar and skeletons show', async ({ page, api }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    api.on('GET', `${BASE}/options`, () => ({ json: STORY_OPTIONS }));
    api.on('GET', `${BASE}/${DRAFT_STORY.id}`, async () => {
      await gate;
      return { json: DRAFT_STORY };
    });
    const editor = new StoryEditorPage(page);

    await editor.open(DRAFT_STORY.id);

    await expect(editor.loading).toBeVisible();
    await expect(editor.backLink).toHaveAttribute('href', '/stories');
    release();
    await expect(editor.headline).toHaveValue(DRAFT_STORY.headline);
    await expect(editor.loading).toHaveCount(0);
  });

  test('when the story does not load, Try again asks again and Stories goes back', async ({
    page,
    api,
  }) => {
    let fail = true;
    api.on('GET', `${BASE}/options`, () => ({ json: STORY_OPTIONS }));
    api.on('GET', `${BASE}/${DRAFT_STORY.id}`, () =>
      fail ? { abort: true } : { json: DRAFT_STORY },
    );
    const editor = new StoryEditorPage(page);

    await editor.open(DRAFT_STORY.id);
    await expect(editor.errorTitle).toHaveText("This story didn't load");
    await expect(editor.errorStoriesLink).toHaveAttribute('href', '/stories');
    fail = false;
    await editor.tryAgainButton.click();

    await expect(editor.headline).toHaveValue(DRAFT_STORY.headline);
  });

  test('a story that does not exist shows the not-found page at its address', async ({
    page,
    api,
  }) => {
    const missing = '0193b000-0000-7000-8000-000000005799';
    api.on('GET', `${BASE}/options`, () => ({ json: STORY_OPTIONS }));
    api.on('GET', `${BASE}/${missing}`, () => storyRefusal(404, 'not_found'));
    const editor = new StoryEditorPage(page);
    const notFound = new AdminNotFoundPage(page);

    await editor.open(missing);

    await expect(notFound.heading).toHaveText('Page not found');
    expect(editor.location()).toBe(`/stories/${missing}`);
  });

  test('a Moderator opening New story sees Admins only', async ({ page, api }) => {
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    const editor = new StoryEditorPage(page);
    const forbidden = new AdminForbiddenPage(page);

    await editor.openNew();

    await expect(forbidden.heading).toHaveText('Admins only');
    expect(forbidden.location()).toBe('/stories/new');
  });
});
