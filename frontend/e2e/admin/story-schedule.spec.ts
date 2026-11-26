import {
  DRAFT_STORY,
  REVIEW_STORY,
  SCHEDULED_STORY,
  STORIES_NOW,
  STORY_OPTIONS,
  storyRefusal,
  type StoryFixture,
} from '../fixtures/admin-stories';
import { expect, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { StoryEditorPage } from '../page-objects/admin/story-editor.page';

const BASE = '/api/admin/stories';

/** Saturday April 18, 6:00 AM in Toronto: the mock's scheduled time. */
const SATURDAY_6AM = '2026-04-18T10:00:00Z';

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
    schedule: 'scheduled',
    unschedule: 'draft',
    publish: 'published',
  };
  api.on('GET', `${BASE}/options`, () => ({ json: STORY_OPTIONS }));
  api.on('GET', `${BASE}/${story.id}`, () => ({ json: story }));
  api.on('POST', new RegExp(`^${BASE}/${story.id}/([a-z-]+)$`), (request) => {
    const action = new URL(request.url()).pathname.split('/').pop()!;
    const body = request.postDataJSON() as Record<string, unknown>;
    asked.push({ action, body });
    const fields = Object.fromEntries(
      Object.entries(body).filter(([key]) => key !== 'publishDate' && key !== 'publishTime'),
    );
    return (
      reply(action, body) ?? {
        json: {
          ...story,
          ...fields,
          status: statusAfter[action],
          version: story.version + 1,
          savedAt: STORIES_NOW.toISOString(),
          publishedAt: action === 'publish' ? STORIES_NOW.toISOString() : null,
          publishAt: action === 'schedule' ? SATURDAY_6AM : null,
        },
      }
    );
  });
  return asked;
}

/** The one toast on screen says what happened. */
async function expectToast(editor: StoryEditorPage, title: string, text: string): Promise<void> {
  await expect(editor.toastTitle).toHaveText([title]);
  await expect(editor.toastText).toHaveText([text]);
}

// L2-069 AC2, AC3, AC4, AC7 (ADR 0104): with a date and time chosen, the primary action reads
// "Schedule" (or "Approve & schedule") and makes the story Scheduled; a Scheduled story offers
// Unschedule and Publish now; a time not after now, or a missing date or time, schedules nothing,
// names it above the story and marks the field.
test.describe('Admin app, scheduling a story', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: STORIES_NOW });
  });

  // Mock admin-story-editor/draft, then admin-story-editor/scheduled.
  test(
    'a Draft with a date and time chosen reads Schedule, and Schedule makes it Scheduled for that time',
    { tag: '@critical' },
    async ({ page, api }) => {
      const asked = answerActions(api, DRAFT_STORY);
      const editor = new StoryEditorPage(page);
      await editor.open(DRAFT_STORY.id);
      await expect(editor.whenNow).toBeChecked();
      await expect(editor.publishDate).toHaveCount(0);

      await editor.whenSchedule.check();
      await editor.publishDate.fill('2026-04-18');
      await editor.publishTime.fill('06:00');

      await expect(editor.actionButtons).toHaveText(['Send for review', 'Schedule']);
      await editor.action('Schedule').click();

      await expect(editor.status).toHaveText('Scheduled');
      await expectToast(editor, 'Scheduled', 'It goes out Sat Apr 18, 6:00 AM.');
      await expect(editor.actionButtons).toHaveText(['Unschedule', 'Publish now']);
      await expect(editor.whenSchedule).toBeChecked();
      await expect(editor.publishDate).toHaveValue('2026-04-18');
      await expect(editor.publishTime).toHaveValue('06:00');
      expect(asked).toHaveLength(1);
      expect(asked[0].action).toBe('schedule');
      expect(asked[0].body).toMatchObject({
        headline: DRAFT_STORY.headline,
        section: 'community',
        version: DRAFT_STORY.version,
        publishDate: '2026-04-18',
        publishTime: '06:00',
      });
    },
  );

  test('a story In review with a date and time chosen reads Approve & schedule', async ({
    page,
    api,
  }) => {
    const asked = answerActions(api, REVIEW_STORY);
    const editor = new StoryEditorPage(page);
    await editor.open(REVIEW_STORY.id);

    await editor.whenSchedule.check();
    await expect(editor.actionButtons).toHaveText(['Back to draft', 'Approve & schedule']);
    await editor.whenNow.check();
    await expect(editor.actionButtons).toHaveText(['Back to draft', 'Approve & publish']);
    await editor.whenSchedule.check();
    await editor.publishDate.fill('2026-04-18');
    await editor.publishTime.fill('06:00');
    await editor.action('Approve & schedule').click();

    await expectToast(editor, 'Approved and scheduled', 'It goes out Sat Apr 18, 6:00 AM.');
    expect(asked.map((a) => a.action)).toEqual(['schedule']);
  });

  // Mock admin-story-editor/scheduled.
  test('a Scheduled story shows its time and offers Unschedule, which makes it a Draft', async ({
    page,
    api,
  }) => {
    const asked = answerActions(api, SCHEDULED_STORY);
    const editor = new StoryEditorPage(page);
    await editor.open(SCHEDULED_STORY.id);

    await expect(editor.status).toHaveText('Scheduled');
    await expect(editor.whenSchedule).toBeChecked();
    await expect(editor.whenSchedule).toBeDisabled();
    await expect(editor.publishDate).toHaveValue('2026-04-18');
    await expect(editor.publishTime).toHaveValue('06:00');
    await expect(editor.actionButtons).toHaveText(['Unschedule', 'Publish now']);

    await editor.action('Unschedule').click();

    await expect(editor.status).toHaveText('Draft');
    await expectToast(editor, 'Unscheduled', 'It is a Draft again and will not go out.');
    await expect(editor.actionButtons).toHaveText(['Send for review', 'Publish now']);
    await expect(editor.whenNow).toBeChecked();
    await expect(editor.whenNow).toBeEnabled();
    expect(asked).toEqual([{ action: 'unschedule', body: { version: SCHEDULED_STORY.version } }]);
  });

  test('Publish now on a Scheduled story publishes it before its time', async ({ page, api }) => {
    const asked = answerActions(api, SCHEDULED_STORY);
    const editor = new StoryEditorPage(page);
    await editor.open(SCHEDULED_STORY.id);

    await editor.action('Publish now').click();

    await expect(editor.status).toHaveText('Published');
    await expectToast(editor, 'Published', 'It is on the front page and in the Events feed.');
    expect(asked.map((a) => a.action)).toEqual(['publish']);
    expect(asked[0].body).toMatchObject({ version: SCHEDULED_STORY.version });
    expect(asked[0].body).not.toHaveProperty('publishDate');
  });

  test('a time that is not after now schedules nothing, says so above the story and marks the date', async ({
    page,
    api,
  }) => {
    answerActions(api, DRAFT_STORY, () =>
      storyRefusal(400, 'validation_failed', { publishDate: 'publish_at_in_past' }),
    );
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);
    await editor.whenSchedule.check();
    await editor.publishDate.fill('2026-04-15');
    await editor.publishTime.fill('08:00');

    await editor.action('Schedule').click();

    await expect(editor.alertTitle).toHaveText('Choose a time after now');
    await expect(editor.alert).toContainText(
      'A scheduled story goes out at a date and time still to come.',
    );
    await expect(editor.alert).toBeFocused();
    await expect(editor.publishDate).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.publishDate).toHaveAccessibleDescription('Pick a date and time after now');
    await expect(editor.status).toHaveText('Draft');
    await editor.publishDate.fill('2026-04-16');
    await expect(editor.publishDate).not.toHaveAttribute('aria-invalid');
  });

  test('Schedule with no date or time names both above the story and marks them', async ({
    page,
    api,
  }) => {
    answerActions(api, DRAFT_STORY, () =>
      storyRefusal(400, 'validation_failed', {
        publishDate: 'publish_date_required',
        publishTime: 'publish_time_required',
      }),
    );
    const editor = new StoryEditorPage(page);
    await editor.open(DRAFT_STORY.id);
    await editor.whenSchedule.check();

    await editor.action('Schedule').click();

    await expect(editor.alertTitle).toHaveText('Add a date and a time before scheduling');
    await expect(editor.publishDate).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.publishTime).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.publishTime).toHaveAccessibleDescription('Pick a time');
  });
});
