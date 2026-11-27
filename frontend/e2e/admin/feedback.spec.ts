import {
  answerInbox,
  CALENDAR_BUG,
  FEEDBACK_NOW,
  NOTES,
  SCREENSHOT,
  SERIES_IDEA,
  STORY_CORRECTION,
  VERSE_THANKS,
} from '../fixtures/admin-feedback';
import { expect, MODERATOR_SIGNED_IN, test } from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';
import { AdminFeedbackPage } from '../page-objects/admin/feedback.page';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FEEDBACK_NOW);
});

// L2-074 AC1 to AC3 (mock admin-feedback/default): every note newest first with who, when, the
// start of its text and its kind and status in words; four counted tabs; the chosen note in full.
test.describe('Admin app, Feedback: the inbox', () => {
  test('lists the notes with the first chosen and shown in full, as the default mock draws it @critical', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/admin/counts', () => ({
      json: { suggestions: 0, storiesInReview: 0, newFeedback: 2 },
    }));
    answerInbox(api);
    const inbox = new AdminFeedbackPage(page);
    const shell = new AdminShell(page);

    await inbox.open();

    await expect(inbox.heading).toHaveText('Feedback');
    await expect.poll(() => page.title()).toBe('Feedback · Christian Fitness Admin');
    await expect(inbox.subtitle).toHaveText(
      'Ideas, bugs, corrections and thanks from members. Everyone hears back.',
    );
    await expect(shell.currentItem).toContainText('Feedback');
    await expect(shell.navCount('Feedback')).toHaveText('2');
    await expect(shell.navCount('Feedback')).toHaveAttribute('aria-label', '2 new notes');
    expect(await inbox.tabTexts()).toEqual(['All 4', 'New 2', 'Replied 1', 'Resolved 1']);
    await expect(inbox.currentTab).toContainText('All');
    expect(await inbox.rowValues()).toEqual([
      ['Michael Chen', '35 min ago', 'Something’s off, New', true],
      ['Adaeze Kalu', '2 hours ago', 'Correction, New', true],
      ['Grace Thompson', 'Yesterday', 'Idea, Replied', false],
      ['Priya Nair', 'Apr 13', 'Thanks, Resolved', false],
    ]);
    await expect(inbox.currentRow).toContainText('Michael Chen');
    await expect(inbox.kindTag).toHaveText('Something’s off');
    await expect(inbox.status).toHaveText('New');
    await expect(inbox.when).toHaveText('35 min ago');
    await expect(inbox.noteHeading).toHaveText('Something’s off from Michael Chen');
    await expect(inbox.noteText).toHaveText(CALENDAR_BUG.text);
    expect(await inbox.factTexts()).toEqual([
      'Michael Chen',
      'Events › Easter Sunrise 5K',
      'iOS · Safari 18',
    ]);
    await expect(inbox.senderEmail).toHaveText('mchen.runs@outlook.com');
    await expect(inbox.reply).toHaveAccessibleName('Reply to Michael');
    await expect(inbox.replyHint).toHaveText(
      'Let them know we can reproduce it and when to expect a fix',
    );
    await expect(inbox.sendButton).toHaveText('Send reply');
    await expect(inbox.resolveButton).toBeVisible();
    await expect(inbox.storyLink).toHaveCount(0);
    await expect(inbox.screenshot).toHaveCount(0);
    const wide = await inbox.layout();
    expect([wide.overflowX, wide.sideBySide]).toEqual([0, true]);
  });

  test('a tab shows only its notes and is current; choosing a note keeps both in the address', async ({
    page,
    api,
  }) => {
    const calls = answerInbox(api);
    const inbox = new AdminFeedbackPage(page);
    await inbox.open();
    await expect(inbox.rows).toHaveCount(4);

    await inbox.tab('Replied').click();

    await expect(inbox.rows).toHaveCount(1);
    await expect(inbox.currentTab).toContainText('Replied');
    await expect(inbox.noteHeading).toHaveText('Idea from Grace Thompson');
    await expect(inbox.replies).toHaveText(['Good idea, Grace. It is on the list for May.']);
    expect(inbox.path()).toBe('/feedback?status=replied');
    expect(calls.lists).toEqual([null, 'replied']);

    await inbox.tab('All').click();
    await inbox.row('Priya Nair').click();

    await expect(inbox.noteHeading).toHaveText('Thanks from Priya Nair');
    await expect(inbox.currentRow).toContainText('Priya Nair');
    expect(inbox.path()).toBe(`/feedback?note=${VERSE_THANKS.id}`);
    expect(await inbox.factTexts()).toContain('Newsletter');
  });

  test('a tab with none reads "Nothing here."; with no feedback at all an empty state says where notes come from', async ({
    page,
    api,
  }) => {
    answerInbox(api, [CALENDAR_BUG]);
    const inbox = new AdminFeedbackPage(page);

    await inbox.open('?status=resolved');
    await expect(inbox.nothingHere).toHaveText('Nothing here.');
    await expect(inbox.detail).toHaveCount(0);

    answerInbox(api, []);
    await inbox.open();
    await expect(inbox.empty).toContainText('No feedback yet');
    await expect(inbox.empty).toContainText('Send feedback');
  });

  test('skeletons show while it loads; when it does not, Try again', async ({ page, api }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let fail = true;
    answerInbox(api);
    api.on('GET', '/api/admin/feedback', async () => {
      await gate;
      return fail
        ? { abort: true }
        : { json: { counts: { all: 0, new: 0, replied: 0, resolved: 0 }, items: [] } };
    });
    const inbox = new AdminFeedbackPage(page);

    await inbox.open();

    await expect(inbox.loading).toContainText('Loading feedback');
    release();
    await expect(inbox.error).toContainText("Feedback didn't load");
    fail = false;
    await inbox.tryAgainButton.click();
    await expect(inbox.empty).toContainText('No feedback yet');
  });

  // L2-074 AC10: below LG the list comes first and the note follows, with no sideways scroll.
  test('on a phone the list comes first and the note follows in one column', async ({
    page,
    api,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    answerInbox(api);
    const inbox = new AdminFeedbackPage(page);

    await inbox.open();
    await expect(inbox.noteText).toBeVisible();

    expect(await inbox.layout()).toEqual({ overflowX: 0, listFirst: true, sideBySide: false });
  });
});

// L2-074 AC3, AC4 and AC8 (mocks correction, screenshot, suspended, moderator).
test.describe('Admin app, Feedback: a correction, a screenshot and a suspended sender', () => {
  test('an Admin opens the story of a correction, and sees the screenshot from the staff-only address', async ({
    page,
    api,
  }) => {
    answerInbox(api);
    api.on('GET', `/api/admin/feedback/${STORY_CORRECTION.id}/screenshot`, () => ({
      body: SCREENSHOT,
      headers: { 'content-type': 'image/png' },
    }));
    const inbox = new AdminFeedbackPage(page);

    await inbox.open(`?note=${STORY_CORRECTION.id}`);

    await expect(inbox.noteHeading).toHaveText('Correction from Adaeze Kalu');
    await expect(inbox.storyLink).toHaveAttribute('href', `/stories/${STORY_CORRECTION.storyId}`);
    await expect(inbox.screenshot).toHaveAttribute(
      'src',
      `/api/admin/feedback/${STORY_CORRECTION.id}/screenshot`,
    );
    await expect(inbox.reply).toHaveAccessibleName('Reply to Adaeze');
    expect(await inbox.factTexts()).toContain(
      'Story › Twelve GTA churches will run the Toronto Half',
    );
  });

  test('a Moderator answers feedback but is not offered the story; a suspended sender is labelled', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    answerInbox(api, [
      {
        ...STORY_CORRECTION,
        hasScreenshot: false,
        sender: { ...STORY_CORRECTION.sender, suspended: true },
      },
    ]);
    const inbox = new AdminFeedbackPage(page);

    await inbox.open();

    await expect(inbox.noteHeading).toHaveText('Correction from Adaeze Kalu');
    await expect(inbox.suspended).toHaveText('Suspended');
    await expect(inbox.sendButton).toBeVisible();
    await expect(inbox.storyLink).toHaveCount(0);
  });
});

// L2-074 AC5 to AC7 (mocks replying, replied, resolved, failed).
test.describe('Admin app, Feedback: replying and resolving', () => {
  test('a reply is sent, kept in the thread, empties the box, marks the note Replied and says how it went', async ({
    page,
    api,
  }) => {
    const calls = answerInbox(api);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const inbox = new AdminFeedbackPage(page);
    await inbox.open();
    await inbox.reply.fill('Thanks, Michael. A fix goes out this week.');
    await page.route(`**/api/admin/feedback/${CALENDAR_BUG.id}/replies`, async (route) => {
      await gate;
      await route.fallback();
    });

    await inbox.sendButton.click();

    await expect(inbox.sendButton).toHaveText('Sending…');
    await expect(inbox.sendButton).toHaveAttribute('aria-busy', 'true');
    await expect(inbox.reply).toHaveAttribute('readonly', '');
    release();
    await expect(inbox.status).toHaveText('Replied');
    await expect(inbox.replies).toHaveText(['Thanks, Michael. A fix goes out this week.']);
    await expect(inbox.reply).toHaveValue('');
    await expect(inbox.toastTitle).toHaveText('Reply sent');
    await expect(inbox.toastText).toHaveText('Reply sent. Michael Chen gets it by email.');
    expect(calls.replies).toEqual([
      { id: CALENDAR_BUG.id, text: 'Thanks, Michael. A fix goes out this week.' },
    ]);
    // The row is no longer New, and the tabs count again.
    expect((await inbox.rowValues())[0]).toEqual([
      'Michael Chen',
      '35 min ago',
      'Something’s off, Replied',
      false,
    ]);
    expect(await inbox.tabTexts()).toEqual(['All 4', 'New 1', 'Replied 2', 'Resolved 1']);
  });

  test('an empty reply is not sent and the box says to write one; a message reply does not claim an email', async ({
    page,
    api,
  }) => {
    const calls = answerInbox(api);
    const inbox = new AdminFeedbackPage(page);
    await inbox.open(`?note=${STORY_CORRECTION.id}`);
    api.on('GET', `/api/admin/feedback/${STORY_CORRECTION.id}/screenshot`, () => ({
      body: SCREENSHOT,
      headers: { 'content-type': 'image/png' },
    }));
    await expect(inbox.noteHeading).toHaveText('Correction from Adaeze Kalu');

    await inbox.sendButton.click();

    await expect(inbox.replyError).toHaveText('Write a reply before sending.');
    await expect(inbox.reply).toHaveAttribute('aria-invalid', 'true');
    await expect(inbox.reply).toBeFocused();
    expect(calls.replies).toEqual([]);

    await inbox.reply.fill('Fixed, thank you.');
    await expect(inbox.replyError).toHaveCount(0);
    await inbox.sendButton.click();

    await expect(inbox.toastText).toHaveText(
      'Adaeze Kalu gets it as a message from Christian Fitness.',
    );
  });

  test('a reply that fails says so, keeps the reply in the box and leaves the status', async ({
    page,
    api,
  }) => {
    answerInbox(api);
    api.on('POST', `/api/admin/feedback/${CALENDAR_BUG.id}/replies`, () => ({
      status: 409,
      json: { code: 'member_unreachable' },
    }));
    const inbox = new AdminFeedbackPage(page);
    await inbox.open();
    await inbox.reply.fill('Thanks for letting us know.');

    await inbox.sendButton.click();

    await expect(inbox.failure).toContainText('We couldn’t send your reply');
    await expect(inbox.failure).toContainText('Nothing was changed. Your reply is still here.');
    await expect(inbox.reply).toHaveValue('Thanks for letting us know.');
    await expect(inbox.status).toHaveText('New');
    await expect(inbox.sendButton).toHaveText('Send reply');
  });

  test('Mark resolved makes the note Resolved and offers Reopen, which makes it New again; a failure says so', async ({
    page,
    api,
  }) => {
    const calls = answerInbox(api);
    const inbox = new AdminFeedbackPage(page);
    await inbox.open(`?note=${SERIES_IDEA.id}`);
    await expect(inbox.status).toHaveText('Replied');

    await inbox.resolveButton.click();

    await expect(inbox.status).toHaveText('Resolved');
    await expect(inbox.resolveButton).toHaveCount(0);
    await inbox.reopenButton.click();
    await expect(inbox.status).toHaveText('New');
    await expect(inbox.resolveButton).toBeVisible();
    expect([calls.resolved, calls.reopened]).toEqual([[SERIES_IDEA.id], [SERIES_IDEA.id]]);

    api.on('POST', `/api/admin/feedback/${SERIES_IDEA.id}/resolve`, () => ({ abort: true }));
    await inbox.resolveButton.click();
    await expect(inbox.failure).toContainText('We couldn’t change the status');
    await expect(inbox.status).toHaveText('New');
    expect(NOTES).toHaveLength(4);
  });
});
