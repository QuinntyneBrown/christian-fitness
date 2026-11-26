import {
  answerStoryImages,
  DRAFT_STORY,
  newStory,
  REVIEW_PREVIEW,
  REVIEW_STORY,
  STORIES_NOW,
  STORY_OPTIONS,
  storyRefusal,
} from '../fixtures/admin-stories';
import { expect, MODERATOR_SIGNED_IN, test } from '../fixtures/test';
import { AdminForbiddenPage } from '../page-objects/admin/forbidden.page';
import { AdminNotFoundPage } from '../page-objects/admin/not-found.page';
import { StoryEditorPage } from '../page-objects/admin/story-editor.page';
import { StoryPreviewPage } from '../page-objects/admin/story-preview.page';

const BASE = '/api/admin/stories';

// L2-069 AC10, AC13 (ADR 0097): Preview shows a story as readers will see it, whatever its status,
// to Admins only, with its text rendered by the one sanitising renderer.
test.describe('Admin app, the story preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: STORIES_NOW });
  });

  // Mock admin-story-preview/default.
  test('shows a story In review as readers will see it, under a bar that says it is a preview', async ({
    page,
    api,
  }) => {
    api.on('GET', `${BASE}/${REVIEW_STORY.id}/preview`, () => ({ json: REVIEW_PREVIEW }));
    const preview = new StoryPreviewPage(page);

    await preview.open(REVIEW_STORY.id);

    await expect(preview.banner).toHaveText(
      'Preview · In review. Only Admins can see this page. Readers see the story once it is published. Close preview',
    );
    await expect(preview.closeLink).toHaveAttribute('href', `/stories/${REVIEW_STORY.id}`);
    await expect.poll(() => page.title()).toBe('Preview · Christian Fitness Admin');
    await expect(preview.section).toHaveText('Nutrition');
    await expect(preview.heading).toHaveText(REVIEW_STORY.headline);
    await expect(preview.dek).toHaveText(REVIEW_STORY.summary);
    await expect(preview.author).toHaveText('Priya Raman');
    await expect(preview.image).toHaveCount(0);
    await expect(preview.blocks).toHaveText([
      'For many members, Lent means giving something up.',
      '“Fasting and training can live together.”',
      'Before you start',
      'Drink water firstAsk Lena',
      'RestEat after',
      '<b>Not bold</b>',
    ]);
    await expect(preview.quote).toHaveText('“Fasting and training can live together.”');
    await expect(preview.body.locator('h2')).toHaveText('Before you start');
    await expect(preview.body.locator('ul > li')).toHaveText(['Drink water first', 'Ask Lena']);
    await expect(preview.body.locator('ol > li')).toHaveText(['Rest', 'Eat after']);
    await expect(preview.body.locator('em')).toHaveText('something');
    await expect(preview.body.locator('strong')).toHaveText('water');
    await expect(preview.body.locator('b')).toHaveCount(0);
    await expect(preview.bodyLinks).toHaveCount(1);
    await expect(preview.bodyLinks).toHaveAttribute('href', 'https://example.org/lena');
    await expect(preview.nextLabel).toHaveText('In the directory');
    await expect(preview.nextTitle).toHaveText('Book a session with Lena');
  });

  // L2-069 AC9: the lead image above the story, at 16:9.
  test('a story with a lead image shows it above the story', async ({ page, api }) => {
    const key = '0123456789abcdef0123456789abcd01.jpg';
    answerStoryImages(api);
    api.on('GET', `${BASE}/${REVIEW_STORY.id}/preview`, () => ({
      json: {
        ...REVIEW_PREVIEW,
        image: { key, crop: { x: 0, y: 188, width: 2000, height: 1125 } },
      },
    }));
    const preview = new StoryPreviewPage(page);

    await preview.open(REVIEW_STORY.id);

    await expect(preview.image).toHaveAttribute('src', `/api/stories/images/${key}`);
    await expect(preview.image).toHaveAttribute('alt', '');
  });

  test('a story with no next step shows no card', async ({ page, api }) => {
    api.on('GET', `${BASE}/${REVIEW_STORY.id}/preview`, () => ({
      json: { ...REVIEW_PREVIEW, status: 'draft', next: null },
    }));
    const preview = new StoryPreviewPage(page);

    await preview.open(REVIEW_STORY.id);

    await expect(preview.banner).toContainText('Preview · Draft.');
    await expect(preview.heading).toHaveText(REVIEW_STORY.headline);
    await expect(preview.next).toHaveCount(0);
  });

  // Mocks admin-story-preview/loading and error.
  test('while it loads skeletons show, and when it fails Try again asks again', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let fail = true;
    api.on('GET', `${BASE}/${REVIEW_STORY.id}/preview`, async () => {
      await gate;
      return fail ? { abort: true } : { json: REVIEW_PREVIEW };
    });
    const preview = new StoryPreviewPage(page);

    await preview.open(REVIEW_STORY.id);
    await expect(preview.loading).toBeVisible();
    await expect(preview.banner).toContainText('Preview · loading.');
    release();

    await expect(preview.errorTitle).toHaveText("The preview didn't load");
    await expect(preview.banner).toContainText('Preview · not loaded.');
    await expect(preview.editorLink).toHaveAttribute('href', `/stories/${REVIEW_STORY.id}`);
    fail = false;
    await preview.tryAgainButton.click();
    await expect(preview.heading).toHaveText(REVIEW_STORY.headline);
  });

  test('a story that does not exist shows the not-found page at its address', async ({
    page,
    api,
  }) => {
    const missing = '0193b000-0000-7000-8000-000000005799';
    api.on('GET', `${BASE}/${missing}/preview`, () => storyRefusal(404, 'not_found'));
    const preview = new StoryPreviewPage(page);
    const notFound = new AdminNotFoundPage(page);

    await preview.open(missing);

    await expect(notFound.heading).toHaveText('Page not found');
    expect(preview.location()).toBe(`/stories/${missing}/preview`);
  });

  test('a Moderator sees Admins only', async ({ page, api }) => {
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    const preview = new StoryPreviewPage(page);
    const forbidden = new AdminForbiddenPage(page);

    await preview.open(REVIEW_STORY.id);

    await expect(forbidden.heading).toHaveText('Admins only');
    expect(forbidden.location()).toBe(`/stories/${REVIEW_STORY.id}/preview`);
  });

  // L2-069 AC13: the editor's Preview opens the preview in a new tab.
  test("the editor's Preview opens the story's preview in a new tab", async ({ page, api }) => {
    api.on('GET', `${BASE}/options`, () => ({ json: STORY_OPTIONS }));
    api.on('GET', `${BASE}/${REVIEW_STORY.id}`, () => ({ json: REVIEW_STORY }));
    api.on('GET', `${BASE}/${REVIEW_STORY.id}/preview`, () => ({ json: REVIEW_PREVIEW }));
    const editor = new StoryEditorPage(page);
    await editor.open(REVIEW_STORY.id);

    await expect(editor.previewLink).toHaveAttribute('target', '_blank');
    await expect(editor.previewLink).toHaveAttribute('rel', 'noopener');
    await expect(editor.previewLink).toHaveAccessibleName('Preview (opens in a new tab)');
    const [tab] = await Promise.all([
      page.context().waitForEvent('page'),
      editor.previewLink.click(),
    ]);

    await expect(new StoryPreviewPage(tab).heading).toHaveText(REVIEW_STORY.headline);
    expect(new URL(tab.url()).pathname).toBe(`/stories/${REVIEW_STORY.id}/preview`);
  });

  test('Preview is unavailable for a new story and for a story with no headline', async ({
    page,
    api,
  }) => {
    api.on('GET', `${BASE}/options`, () => ({ json: STORY_OPTIONS }));
    api.on('GET', `${BASE}/${DRAFT_STORY.id}`, () => ({ json: { ...DRAFT_STORY, headline: '' } }));
    api.on('POST', BASE, () => ({ status: 201, json: newStory() }));
    const editor = new StoryEditorPage(page);

    await editor.openNew();
    await expect(editor.previewUnavailable).toBeDisabled();
    await expect(editor.previewLink).toHaveCount(0);

    await editor.open(DRAFT_STORY.id);
    await expect(editor.previewUnavailable).toBeDisabled();
    await expect(editor.previewLink).toHaveCount(0);
  });
});
