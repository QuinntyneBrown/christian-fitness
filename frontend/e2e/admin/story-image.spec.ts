import {
  answerStoryImages,
  DRAFT_STORY,
  REVIEW_STORY,
  STORIES_NOW,
  STORY_OPTIONS,
  storyRefusal,
  type StoryFixture,
} from '../fixtures/admin-stories';
import { expect, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { StoryEditorPage } from '../page-objects/admin/story-editor.page';

const BASE = '/api/admin/stories';
const KEY = '0123456789abcdef0123456789abcd01.jpg';

/**
 * Answers the editor's choices, `story` and its saves, and an upload with `upload`; returns the
 * saves' bodies and the number of uploads, in order.
 */
function answerEditor(
  api: ApiHandlers,
  story: StoryFixture,
  upload: () => ApiReply,
): { saves: Record<string, unknown>[]; uploads: number } {
  const asked = { saves: [] as Record<string, unknown>[], uploads: 0 };
  api.on('GET', `${BASE}/options`, () => ({ json: STORY_OPTIONS }));
  api.on('GET', `${BASE}/${story.id}`, () => ({ json: story }));
  api.on('PUT', `${BASE}/${story.id}`, (request) => {
    const body = request.postDataJSON() as Record<string, unknown>;
    asked.saves.push(body);
    return { json: { ...story, ...body, version: story.version + asked.saves.length } };
  });
  api.on('POST', `${BASE}/images`, () => {
    asked.uploads++;
    return upload();
  });
  answerStoryImages(api);
  return asked;
}

// L2-069 AC9 (ADR 0097): a story with no lead image offers the dropzone; a JPEG, PNG or WebP at
// least 1600 px wide is uploaded, cropped to the largest 16:9 rectangle at its centre and saved
// with the story; Replace image swaps it; a refused image says why and keeps the story as it was.
test.describe('Admin app, the story lead image', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: STORIES_NOW });
  });

  // Mock admin-story-editor/draft.
  test('a story with no lead image offers the dropzone, and an image added is shown and saved', async ({
    page,
    api,
  }) => {
    const asked = answerEditor(api, DRAFT_STORY, () => ({
      status: 201,
      json: { imageKey: KEY, width: 2000, height: 1500 },
    }));
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);
    await expect(editor.dropzone).toHaveAccessibleName('Add a lead image');
    await expect(editor.dropzone).toHaveAccessibleDescription('16:9, at least 1600 px wide');

    await editor.chooseImage('lead.jpg');

    await expect(editor.photo).toHaveAttribute('src', `/api/stories/images/${KEY}`);
    await expect(editor.replaceImage).toBeVisible();
    await expect(editor.dropzone).toHaveCount(0);
    await page.clock.runFor(2000);
    await expect
      .poll(() => asked.saves.at(-1)?.['image'])
      .toEqual({
        key: KEY,
        crop: { x: 0, y: 188, width: 2000, height: 1125 },
      });
  });

  // Mock admin-story-editor/default.
  test('Replace image swaps the lead image for the new one', async ({ page, api }) => {
    const story: StoryFixture = {
      ...REVIEW_STORY,
      image: {
        key: '0123456789abcdef0123456789abcd00.png',
        crop: { x: 0, y: 0, width: 1600, height: 900 },
      },
    };
    const asked = answerEditor(api, story, () => ({
      status: 201,
      json: { imageKey: KEY, width: 3200, height: 1600 },
    }));
    const editor = new StoryEditorPage(page);
    await editor.open(story.id);
    await expect(editor.photo).toHaveAttribute('src', `/api/stories/images/${story.image!.key}`);

    await editor.replaceWith('wide.jpg');

    await expect(editor.photo).toHaveAttribute('src', `/api/stories/images/${KEY}`);
    await page.clock.runFor(2000);
    await expect
      .poll(() => asked.saves.at(-1)?.['image'])
      .toEqual({
        key: KEY,
        crop: { x: 178, y: 0, width: 2844, height: 1600 },
      });
  });

  test('an image the rules refuse says why and keeps the dropzone', async ({ page, api }) => {
    const asked = answerEditor(api, DRAFT_STORY, () =>
      storyRefusal(400, 'validation_failed', { image: 'image_invalid' }),
    );
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);

    await editor.chooseImage('small.png');

    await expect(editor.alertTitle).toHaveText('Choose another image');
    await expect(editor.alert).toContainText(
      'Use a JPEG, PNG or WebP image at least 1600 px wide and up to 5 MB.',
    );
    await expect(editor.dropzone).toBeVisible();
    expect([asked.uploads, asked.saves]).toEqual([1, []]);
  });

  test('an upload that fails says so and keeps the dropzone', async ({ page, api }) => {
    answerEditor(api, DRAFT_STORY, () => ({ abort: true }));
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);

    await editor.chooseImage('lead.jpg');

    await expect(editor.alertTitle).toHaveText("We couldn't add the image");
    await expect(editor.dropzone).toBeVisible();
  });

  test('while the image uploads the dropzone is busy', async ({ page, api }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    answerEditor(api, DRAFT_STORY, () => ({ status: 201, json: {} }));
    api.on('POST', `${BASE}/images`, async () => {
      await gate;
      return { status: 201, json: { imageKey: KEY, width: 1600, height: 900 } };
    });
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);

    await editor.chooseImage('lead.jpg');

    await expect(editor.dropzone).toHaveAttribute('aria-busy', 'true');
    await expect(editor.dropzone).toContainText('Uploading');
    release();
    await expect(editor.photo).toBeVisible();
  });
});
