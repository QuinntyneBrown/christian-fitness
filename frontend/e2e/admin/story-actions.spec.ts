import {
  DRAFT_STORY,
  PUBLISHED_STORY,
  REVIEW_STORY,
  STORIES_NOW,
  STORY_OPTIONS,
  storyRefusal,
  type StoryFixture,
} from '../fixtures/admin-stories';
import { expect, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { StoryEditorPage } from '../page-objects/admin/story-editor.page';

const BASE = '/api/admin/stories';

/** The one toast on screen says what happened. */
async function expectToast(editor: StoryEditorPage, title: string, text: string): Promise<void> {
  await expect(editor.toastTitle).toHaveText([title]);
  await expect(editor.toastText).toHaveText([text]);
}

/**
 * Answers the editor's choices and `story` at its address, and each status action with `reply`
 * (by default the story at its new status); returns each action's path and body, in order.
 */
function answerActions(
  api: ApiHandlers,
  story: StoryFixture,
  reply: (action: string, body: Record<string, unknown>) => ApiReply | undefined = () => undefined,
): { action: string; body: Record<string, unknown> }[] {
  const asked: { action: string; body: Record<string, unknown> }[] = [];
  const statusAfter: Record<string, StoryFixture['status']> = {
    submit: 'review',
    'return-to-draft': 'draft',
    publish: 'published',
    update: 'published',
    unpublish: 'draft',
  };
  api.on('GET', `${BASE}/options`, () => ({ json: STORY_OPTIONS }));
  api.on('GET', `${BASE}/${story.id}`, () => ({ json: story }));
  api.on('POST', new RegExp(`^${BASE}/${story.id}/([a-z-]+)$`), (request) => {
    const action = new URL(request.url()).pathname.split('/').pop()!;
    const body = request.postDataJSON() as Record<string, unknown>;
    asked.push({ action, body });
    return (
      reply(action, body) ?? {
        json: {
          ...story,
          ...body,
          status: statusAfter[action],
          version: story.version + 1,
          savedAt: STORIES_NOW.toISOString(),
          publishedAt:
            action === 'publish'
              ? STORIES_NOW.toISOString()
              : action === 'update'
                ? story.publishedAt
                : null,
        },
      }
    );
  });
  return asked;
}

// L2-069 AC2, AC3, AC6, AC7 (ADR 0097): the bar offers the actions the status allows; each sends
// one request over the version read, shows the new status and a toast naming what happened, and a
// Publish with something missing names it above the story and marks the field.
test.describe('Admin app, story status actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: STORIES_NOW });
  });

  // Mock admin-story-editor/draft.
  test('a Draft offers Send for review and Publish now, and Send for review makes it In review', async ({
    page,
    api,
  }) => {
    const asked = answerActions(api, DRAFT_STORY);
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);
    await expect(editor.actionButtons).toHaveText(['Send for review', 'Publish now']);

    await editor.action('Send for review').click();

    await expect(editor.status).toHaveText('In review');
    await expectToast(editor, 'Sent for review', 'It waits under In review on Stories.');
    await expect(editor.actionButtons).toHaveText(['Back to draft', 'Approve & publish']);
    expect(asked).toEqual([{ action: 'submit', body: { version: DRAFT_STORY.version } }]);
  });

  test('Back to draft makes a story In review a Draft again', async ({ page, api }) => {
    const asked = answerActions(api, REVIEW_STORY);
    const editor = new StoryEditorPage(page);
    await editor.open(REVIEW_STORY.id);

    await editor.action('Back to draft').click();

    await expect(editor.status).toHaveText('Draft');
    await expectToast(editor, 'Back to draft', 'It is a Draft again. No one was told.');
    expect(asked).toEqual([{ action: 'return-to-draft', body: { version: REVIEW_STORY.version } }]);
  });

  // Mock admin-story-editor/approved.
  test(
    'Approve & publish publishes what is written and says where it went',
    { tag: '@critical' },
    async ({ page, api }) => {
      const asked = answerActions(api, REVIEW_STORY);
      const editor = new StoryEditorPage(page);
      await editor.open(REVIEW_STORY.id);
      await editor.headline.fill('Fasting and training, approved');

      await editor.action('Approve & publish').click();

      await expect(editor.status).toHaveText('Published');
      await expectToast(
        editor,
        'Approved and published',
        'It is on the front page and in the Nutrition feed.',
      );
      await expect(editor.saved).toHaveText('Published today, 8:45 AM');
      expect(asked).toHaveLength(1);
      expect(asked[0].action).toBe('publish');
      expect(asked[0].body).toMatchObject({
        headline: 'Fasting and training, approved',
        section: 'nutrition',
        version: REVIEW_STORY.version,
      });
    },
  );

  test('Publish now on a Draft says it was published', async ({ page, api }) => {
    answerActions(api, DRAFT_STORY);
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);

    await editor.action('Publish now').click();

    await expect(editor.status).toHaveText('Published');
    await expectToast(editor, 'Published', 'It is on the front page and in the Community feed.');
  });

  // Mock admin-story-editor/invalid.
  test('Publish with no headline publishes nothing, names it above the story and marks it', async ({
    page,
    api,
  }) => {
    answerActions(api, { ...DRAFT_STORY, headline: '' }, () =>
      storyRefusal(400, 'validation_failed', { headline: 'headline_required' }),
    );
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);

    await editor.action('Publish now').click();

    await expect(editor.alertTitle).toHaveText('Add a headline before publishing');
    await expect(editor.alert).toContainText(
      'A story needs a headline, some text, a section and a byline to go out.',
    );
    await expect(editor.alert).toBeFocused();
    await expect(editor.headline).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.status).toHaveText('Draft');
    await editor.headline.fill('A headline at last');
    await expect(editor.headline).not.toHaveAttribute('aria-invalid');
  });

  test('a Publish missing several fields names each and marks the section and byline', async ({
    page,
    api,
  }) => {
    answerActions(api, DRAFT_STORY, () =>
      storyRefusal(400, 'validation_failed', {
        section: 'section_required',
        bylineId: 'byline_required',
      }),
    );
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);

    await editor.action('Publish now').click();

    await expect(editor.alertTitle).toHaveText('Add a section and a byline before publishing');
    await expect(editor.section).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.byline).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.headline).not.toHaveAttribute('aria-invalid');
  });

  test('while an action runs its button is busy and the story cannot be changed', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    answerActions(api, DRAFT_STORY);
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);
    api.on('POST', `${BASE}/${DRAFT_STORY.id}/submit`, async () => {
      await gate;
      return { json: { ...DRAFT_STORY, status: 'review', version: DRAFT_STORY.version + 1 } };
    });

    await editor.action('Send for review').click();

    await expect(editor.action('Send for review')).toHaveAttribute('aria-busy', 'true');
    await expect(editor.action('Publish now')).toBeDisabled();
    await expect(editor.headline).toHaveAttribute('readonly', '');
    release();
    await expect(editor.status).toHaveText('In review');
    await expect(editor.headline).not.toHaveAttribute('readonly');
  });

  test('an action over a version someone else saved offers the newer version', async ({
    page,
    api,
  }) => {
    answerActions(api, DRAFT_STORY, () => storyRefusal(409, 'story_changed'));
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);

    await editor.action('Send for review').click();

    await expect(editor.alertTitle).toHaveText('Someone else saved this story');
    await expect(editor.loadNewerButton).toBeVisible();
    await expect(editor.status).toHaveText('Draft');
  });

  test('an action that fails says so and keeps the story as it was', async ({ page, api }) => {
    answerActions(api, DRAFT_STORY, () => ({ abort: true }));
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);

    await editor.action('Send for review').click();

    await expect(editor.alertTitle).toHaveText("We couldn't change the story");
    await expect(editor.status).toHaveText('Draft');
    await expect(editor.action('Send for review')).toBeEnabled();
  });

  // Mock admin-story-editor/published; L2-069 AC5.
  test('a Published story offers Unpublish and Update, and Update sends what is written', async ({
    page,
    api,
  }) => {
    const asked = answerActions(api, PUBLISHED_STORY);
    const editor = new StoryEditorPage(page);
    await editor.open(PUBLISHED_STORY.id);
    await expect(editor.actionButtons).toHaveText(['Unpublish', 'Update']);
    await editor.summary.fill('A sharper summary.');

    await editor.action('Update').click();

    await expectToast(editor, 'Update published', 'Readers see the changes now.');
    await expect(editor.status).toHaveText('Published');
    expect(asked.map((a) => a.action)).toEqual(['update']);
    expect(asked[0].body).toMatchObject({
      summary: 'A sharper summary.',
      version: PUBLISHED_STORY.version,
    });
  });

  test('Unpublish makes a Published story a Draft again, with the Draft actions', async ({
    page,
    api,
  }) => {
    const asked = answerActions(api, PUBLISHED_STORY);
    const editor = new StoryEditorPage(page);
    await editor.open(PUBLISHED_STORY.id);

    await editor.action('Unpublish').click();

    await expect(editor.status).toHaveText('Draft');
    await expectToast(
      editor,
      'Unpublished',
      'It is a Draft again, off the front page, the feeds and its address.',
    );
    await expect(editor.actionButtons).toHaveText(['Send for review', 'Publish now']);
    expect(asked).toEqual([{ action: 'unpublish', body: { version: PUBLISHED_STORY.version } }]);
  });
});
