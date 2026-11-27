import {
  answerDesk,
  BLANK_FIELDS,
  desk,
  issue,
  ISSUE_FIELDS,
  NEWSLETTER_NOW,
} from '../fixtures/admin-newsletter';
import { expect, MODERATOR_SIGNED_IN, test } from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';
import { NewsletterDeskPage } from '../page-objects/admin/newsletter-desk.page';

const ADD_ONS =
  'Add-on emails (event alerts, training plan, devotions) are deferred until someone owns writing and scheduling them.';

// L2-070 AC1, AC2, AC4, AC10, AC11 (mock admin-newsletter/default): the heading names the
// newsletter, its confirmed subscribers and when it goes out; the next issue shows with its number,
// status and everything written and picked; the send card says when and to how many; Sent lists
// each issue with how many it went to.
test.describe('Admin app, Newsletter: the desk', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NEWSLETTER_NOW });
  });

  test('shows the next issue, the send card and the sent issues, as the default mock draws them @critical', async ({
    page,
    api,
  }) => {
    answerDesk(api);
    const desk = new NewsletterDeskPage(page);
    const shell = new AdminShell(page);

    await desk.open();

    await expect(desk.heading).toHaveText('Newsletter');
    await expect.poll(() => desk.title()).toBe('Newsletter · Christian Fitness Admin');
    await expect(desk.subtitle).toHaveText(
      'The Abundant Weekly · 6,800 subscribers · Every Saturday, 7 AM',
    );
    await expect(shell.currentItem).toHaveText('Newsletter');
    await expect(desk.issueTitle).toHaveText('Issue #49');
    await expect(desk.status).toHaveText('Draft');
    await expect(desk.subject).toHaveValue(ISSUE_FIELDS.subject);
    await expect(desk.note).toHaveValue(ISSUE_FIELDS.editorsNote);
    await expect(desk.lead).toHaveValue('okafor-interview');
    // A prompt for an issue with no big story yet, then every published story.
    const options = (await desk.leadOptions()).map((option) => option.trim());
    expect(options).toHaveLength(8);
    expect(options[0]).toBe('Choose a story');
    await expect(desk.alsoLegend).toHaveText('Also this week · 3 of 3');
    // Every published story but the big one; with three ticked the rest are unavailable.
    expect(await desk.alsoRowValues()).toEqual([
      [
        'A West End church turned its basement into a free gym. Two hundred neighbours now train there every week',
        'Community · 2 hours ago',
        false,
        true,
      ],
      [
        'Easter Sunrise 5K hits a record 142 sign-ups with ten days to go',
        'Events · 4 hours ago',
        false,
        true,
      ],
      [
        'Inside the Scarborough kitchen prepping 300 healthy meals a week for shift workers',
        'Nutrition · 5 hours ago',
        true,
        false,
      ],
      [
        'Why your rest day might be the most spiritual part of your training plan',
        'Faith & Body · 7 hours ago',
        true,
        false,
      ],
      [
        'Twelve GTA churches will run the Toronto Half as one team this fall',
        'Events · Yesterday',
        false,
        true,
      ],
      [
        'The Tuesday walking group that got 40 seniors off the couch and into the park',
        'Community · Yesterday',
        true,
        false,
      ],
    ]);
    await expect(desk.eventsHint).toHaveText(
      'Choose which of the next four events to feature. All four appear on the calendar.',
    );
    expect(await desk.eventValues()).toEqual([
      ['Easter Sunrise 5K', 'true'],
      ['Couch to 5K: Week 3', 'true'],
      ['Saturday Park Bootcamp', 'true'],
      ["Women's Hoops & Devotion Night", 'false'],
    ]);
    await expect(desk.verse).toHaveValue(
      'Come to me, all who are weary, and I will give you rest.',
    );
    await expect(desk.reference).toHaveValue('Matthew 11:28');
    await expect(desk.sendLabel).toHaveText('Goes out');
    await expect(desk.sendDate).toHaveText('Sat Apr 18');
    await expect(desk.sendMeta).toHaveText('7:00 AM Eastern · 6,800 people');
    await expect(desk.scheduleButton).toHaveText('Schedule issue');
    await expect(desk.previewLink).toHaveAttribute('href', '/newsletter/preview?issue=49');
    await expect(desk.previewLink).toHaveAttribute('target', '_blank');
    await expect(desk.testButton).toHaveText('Send me a test');
    await expect(desk.testStatus).toHaveText('');
    await expect(desk.addOnNote).toHaveText(ADD_ONS);
    await expect(desk.sentHeading).toBeVisible();
    expect(await desk.sentRowTexts()).toEqual([
      ['#48 · Apr 11', 'A church basement, 200 neighbours, and a lot of kettlebells', '6,812'],
      ['#47 · Apr 4', 'Holy Week on the move: five runs and one quiet walk', '6,790'],
    ]);
  });

  // L2-070 AC3: a new issue has the stories marked "Include in the Weekly" ticked, newest first.
  test('ticks the stories marked for the Weekly on an issue with nothing written yet', async ({
    page,
    api,
  }) => {
    answerDesk(api, issue(BLANK_FIELDS));
    const desk = new NewsletterDeskPage(page);

    await desk.open();

    await expect(desk.alsoLegend).toHaveText('Also this week · 3 of 3');
    await expect(desk.alsoBox(/Scarborough kitchen/)).toBeChecked();
    await expect(desk.alsoBox(/rest day/)).toBeChecked();
    await expect(desk.alsoBox(/walking group/)).toBeChecked();
    await expect(desk.lead).toHaveValue('');
    await expect(desk.subject).toHaveValue('');
  });

  // L2-070 AC12 (mocks loading and error): skeletons while it loads; Try again when it does not.
  test('shows skeletons while the newsletter loads, then the error state with Try again', async ({
    page,
    api,
  }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let fail = true;
    api.on('GET', '/api/admin/newsletter', async () => {
      await gate;
      return fail ? { abort: true } : desk();
    });
    const newsletter = new NewsletterDeskPage(page);

    await newsletter.open();

    await expect(newsletter.subtitle).toHaveText('The Abundant Weekly · Every Saturday, 7 AM');
    await expect(newsletter.loading).toContainText('Loading the newsletter');
    await expect(newsletter.skeletons.first()).toBeVisible();
    release();
    await expect(newsletter.errorTitle).toHaveText("The newsletter didn't load");
    await expect(newsletter.error).toHaveAttribute('role', 'alert');
    fail = false;
    await newsletter.tryAgainButton.click();
    await expect(newsletter.issueTitle).toHaveText('Issue #49');
  });

  // L2-070 AC12 (mock moderator; ADR 0064): a Moderator opens and uses it as an Admin does.
  test('a Moderator opens Newsletter from the navigation and schedules the issue', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    const calls = answerDesk(api);
    const desk = new NewsletterDeskPage(page);
    const shell = new AdminShell(page);

    await page.goto('/');
    await shell.navItem('Newsletter').click();
    await expect(desk.issueTitle).toHaveText('Issue #49');
    await desk.scheduleButton.click();

    await expect(desk.status).toHaveText('Scheduled');
    expect(calls.schedules).toHaveLength(1);
  });
});

// L2-070 AC2, AC14 (mocks default and autosaving): picking stories and events, and the autosave
// 2 seconds after typing stops with "Saved {time}".
test.describe('Admin app, Newsletter: building the issue', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NEWSLETTER_NOW });
  });

  test('unticking a story frees the others, and the fourth stays unavailable at three', async ({
    page,
    api,
  }) => {
    answerDesk(api);
    const desk = new NewsletterDeskPage(page);
    await desk.open();

    await desk.alsoBox(/rest day/).uncheck();

    await expect(desk.alsoLegend).toHaveText('Also this week · 2 of 3');
    await expect(desk.alsoBox(/West End church/)).toBeEnabled();
    await desk.alsoBox(/West End church/).check();
    await expect(desk.alsoLegend).toHaveText('Also this week · 3 of 3');
    await expect(desk.alsoBox(/rest day/)).toBeDisabled();
  });

  test('choosing a ticked story as the big story takes it out of the others', async ({
    page,
    api,
  }) => {
    answerDesk(api);
    const desk = new NewsletterDeskPage(page);
    await desk.open();

    await desk.lead.selectOption('sabbath-rest');

    await expect(desk.alsoLegend).toHaveText('Also this week · 2 of 3');
    await expect(desk.alsoBox(/rest day/)).toHaveCount(0);
    await expect(desk.alsoBox(/Danielle Okafor/)).not.toBeChecked();
  });

  test('saves the Draft 2 seconds after typing stops and says when', async ({ page, api }) => {
    const calls = answerDesk(api);
    const desk = new NewsletterDeskPage(page);
    await desk.open();
    await expect(desk.saved).toHaveCount(0);

    await desk.subject.fill('A new subject');
    await desk.eventToggle("Women's Hoops & Devotion Night").click();
    await page.clock.fastForward(1_900);
    expect(calls.saves).toEqual([]);
    await page.clock.fastForward(100);

    await expect(desk.saved).toHaveText('Saved 8:42 AM');
    await expect(desk.saved).toHaveAttribute('role', 'status');
    expect(calls.saves).toEqual([
      {
        ...ISSUE_FIELDS,
        subject: 'A new subject',
        eventIds: ['e-5k', 'e-couch', 'e-bootcamp', 'e-hoops'],
      },
    ]);
  });
});

// L2-070 AC5, AC6, AC8, AC9 (mocks invalid, submitting, scheduled, missed, missed-invalid,
// test-sent): scheduling, its refusals, unscheduling, a missed issue's later time, and the test.
test.describe('Admin app, Newsletter: scheduling and testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: NEWSLETTER_NOW });
  });

  test('an issue with nothing written is not scheduled and each field says what to add', async ({
    page,
    api,
  }) => {
    const calls = answerDesk(api, issue({ ...BLANK_FIELDS, alsoStoryIds: ['sabbath-rest'] }));
    const desk = new NewsletterDeskPage(page);
    await desk.open();

    await desk.scheduleButton.click();

    await expect(desk.subject).toHaveAttribute('aria-invalid', 'true');
    expect(await desk.errorOf(desk.subject)).toBe('Add a subject line before scheduling.');
    expect(await desk.errorOf(desk.note)).toBe("Add an editor's note before scheduling.");
    expect(await desk.errorOf(desk.lead)).toBe('Choose the big story before scheduling.');
    await expect(desk.subject).toBeFocused();
    expect(calls.schedules).toEqual([]);
    await expect(desk.status).toHaveText('Draft');

    await desk.subject.fill('Now it has one');
    await expect(desk.subject).not.toHaveAttribute('aria-invalid', 'true');
    await expect(desk.note).toHaveAttribute('aria-invalid', 'true');
  });

  test('a complete issue is scheduled and locked, and Unschedule to edit makes it a Draft again', async ({
    page,
    api,
  }) => {
    const calls = answerDesk(api);
    const desk = new NewsletterDeskPage(page);
    await desk.open();
    await desk.subject.fill('Typed just before scheduling');

    await desk.scheduleButton.click();

    await expect(desk.status).toHaveText('Scheduled');
    await expect(desk.sendLabel).toHaveText('Scheduled for');
    await expect(desk.unscheduleButton).toHaveText('Unschedule to edit');
    await expect(desk.scheduleButton).toHaveCount(0);
    expect(calls.schedules).toEqual([{ ...ISSUE_FIELDS, subject: 'Typed just before scheduling' }]);
    await expect(desk.subject).toHaveAttribute('readonly', '');
    await expect(desk.note).toHaveAttribute('readonly', '');
    await expect(desk.lead).toBeDisabled();
    await expect(desk.alsoBox(/rest day/)).toBeDisabled();
    await expect(desk.eventToggle('Easter Sunrise 5K')).toBeDisabled();
    await expect(desk.verse).toHaveAttribute('readonly', '');
    // Nothing typed before scheduling is saved a second time.
    await page.clock.fastForward(2_500);
    expect(calls.saves).toEqual([]);

    await desk.unscheduleButton.click();

    await expect(desk.status).toHaveText('Draft');
    await expect(desk.sendLabel).toHaveText('Goes out');
    await expect(desk.subject).not.toHaveAttribute('readonly', '');
    await expect(desk.scheduleButton).toHaveText('Schedule issue');
    expect(calls.unschedules).toBe(1);
  });

  test('while it schedules the button reads Scheduling… and the fields are read-only; a failure says so', async ({
    page,
    api,
  }) => {
    answerDesk(api);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    api.on('POST', '/api/admin/newsletter/issues/49/schedule', async () => {
      await gate;
      return { status: 503, json: { code: 'unavailable' } };
    });
    const desk = new NewsletterDeskPage(page);
    await desk.open();

    await desk.scheduleButton.click();

    await expect(desk.scheduleButton).toHaveText('Scheduling…');
    await expect(desk.scheduleButton).toHaveAttribute('aria-busy', 'true');
    await expect(desk.subject).toHaveAttribute('readonly', '');
    await expect(desk.lead).toBeDisabled();
    release();
    await expect(desk.failure).toHaveText("We couldn't schedule the issue. Try again in a moment.");
    await expect(desk.scheduleButton).toHaveText('Schedule issue');
    await expect(desk.subject).not.toHaveAttribute('readonly', '');
    await expect(desk.status).toHaveText('Draft');
  });

  test('a story no longer published is named under the big story', async ({ page, api }) => {
    answerDesk(api);
    api.on('POST', '/api/admin/newsletter/issues/49/schedule', () => ({
      status: 400,
      json: { code: 'validation_failed', fieldCodes: { leadStoryId: 'story_unavailable' } },
    }));
    const desk = new NewsletterDeskPage(page);
    await desk.open();

    await desk.scheduleButton.click();

    // The refusal arrives from the server: wait for it rather than read once.
    await expect
      .poll(() => desk.errorOf(desk.lead))
      .toBe('A story chosen is no longer published. Choose another.');
    await expect(desk.status).toHaveText('Draft');
  });

  test('Send me a test sends the issue as it stands and names the address', async ({
    page,
    api,
  }) => {
    const calls = answerDesk(api);
    const desk = new NewsletterDeskPage(page);
    await desk.open();
    await desk.subject.fill('Not saved yet');

    await desk.testButton.click();

    await expect(desk.testButton).toHaveText('Test sent');
    await expect(desk.testStatus).toHaveText('Test sent to dana@christian.fitness');
    expect(calls.tests).toEqual([{ ...ISSUE_FIELDS, subject: 'Not saved yet' }]);
  });

  test('a missed issue was due, and goes out later today at the time chosen', async ({
    page,
    api,
  }) => {
    const calls = answerDesk(api, issue({ missedSend: true }));
    const desk = new NewsletterDeskPage(page);
    await desk.open();

    await expect(desk.sendLabel).toHaveText('Was due');
    await expect(desk.sendTimeHint).toHaveText(
      'Today, Eastern time. It cannot be moved to another day.',
    );
    await expect(desk.scheduleButton).toHaveCount(0);
    await desk.rescheduleButton.click();
    expect(await desk.errorOf(desk.sendTime)).toBe('Choose a time later today.');
    expect(calls.schedules).toEqual([]);

    await desk.sendTime.fill('11:00');
    await desk.rescheduleButton.click();

    await expect(desk.status).toHaveText('Scheduled');
    await expect(desk.sendLabel).toHaveText('Scheduled for');
    await expect(desk.sendMeta).toHaveText('11:00 AM Eastern · 6,800 people');
    expect(calls.schedules).toEqual([{ ...ISSUE_FIELDS, sendTime: '11:00' }]);
  });
});
