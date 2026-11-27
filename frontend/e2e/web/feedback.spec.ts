import { answerStoryImages } from '../fixtures/admin-stories';
import { answerAsVisitor } from '../fixtures/claims';
import { expect, SIGNED_IN, test } from '../fixtures/test';
import { answerHome } from '../fixtures/events';
import {
  answerFeedbackForm,
  answerFeedbackSend,
  feedbackProblem,
  MEMBER_EMAIL,
} from '../fixtures/feedback';
import { answerStories, CHURCH_GYM, STORY_NOW } from '../fixtures/stories';
import { WebFeedbackPage } from '../page-objects/web/feedback.page';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebSignInPage } from '../page-objects/web/sign-in.page';
import { WebStoryPage } from '../page-objects/web/story.page';

const SAID = [
  {
    quote: '“I never know if an event got moved.”',
    did: 'Change alerts for every event you’re going to',
    when: 'March 2026',
  },
  {
    quote: '“Can I join a whole series instead of every date?”',
    did: 'Join a series in one tap',
    when: 'February 2026',
  },
  {
    quote: '“The newsletter is too long on my phone.”',
    did: 'A shorter Weekly with one big story',
    when: 'January 2026',
  },
];

// L2-063 AC1 and L2-008 AC5 (ADR 0109): "Send feedback" in the member footer opens the form, in
// the app, about the page the member was on; a visitor signs in first and comes back.
test.describe('Member app, send feedback: from the footer', () => {
  test('Send feedback opens the form about the page the member came from', async ({
    page,
    api,
  }) => {
    answerHome(api, { nextEvent: null, suggested: [] });
    const asked = answerFeedbackForm(api);
    const home = new WebHomePage(page);
    await home.open();
    await page.evaluate(() => ((window as { cfStayed?: boolean }).cfStayed = true));

    await home.footerLink('Send feedback').click();

    const feedback = new WebFeedbackPage(page);
    await expect(page).toHaveURL(/\/feedback\?about=page:home$/);
    await expect(page).toHaveTitle('Send feedback · Christian Fitness');
    await expect(feedback.chipLabel).toHaveText('About this page');
    await expect(feedback.chipValue).toHaveText('Home');
    expect(asked).toEqual(['page:home']);
    // Opened in the app: the page was not loaded again.
    expect(await page.evaluate(() => (window as { cfStayed?: boolean }).cfStayed)).toBe(true);
  });

  test('a visitor is asked to sign in first and comes back to the same form', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/session', () => ({ status: 401, json: { code: 'unauthenticated' } }));
    const feedback = new WebFeedbackPage(page);

    await feedback.open('?about=page:events');

    await expect(page).toHaveURL(/\/sign-in\?/);
    expect(new URL(page.url()).searchParams.get('returnUrl')).toBe('/feedback?about=page:events');
  });
});

// L2-063 AC1, AC3 and AC5 (ADR 0109; mock `feedback/default`, `invalid`): the form asks what it is
// about, a note whose question follows the choice, and the email choice, beside "You said, we
// did"; an empty note sends nothing.
test.describe('Member app, send feedback: the form', () => {
  test('the form asks what it is about, the note and the email choice, beside You said, we did', async ({
    page,
    api,
  }) => {
    answerFeedbackForm(api);
    const feedback = new WebFeedbackPage(page);

    await feedback.open('?about=page:events/series/:id');

    await expect(feedback.heading).toHaveText('Send feedback');
    await expect(feedback.lead).toHaveText(
      'Tell us what’s working, what isn’t, and what you wish was here.',
    );
    expect(await feedback.kindChoices()).toEqual({
      labels: ['Idea', 'Something’s off', 'Correction', 'Thanks'],
      chosen: 'Idea',
    });
    expect(await feedback.kindValues()).toEqual(['idea', 'problem', 'correction', 'thanks']);
    await expect(feedback.chipValue).toHaveText('Event series');
    await expect(feedback.noteLabel).toHaveText('What would make this better?');
    await expect(feedback.noteHint).toHaveText(
      'For example: show which week of the plan each session is',
    );
    await expect(feedback.note).toHaveAttribute('aria-describedby', 'f-text-hint');
    await expect(feedback.screenshotGroup).toHaveCount(0);
    await expect(feedback.mayEmail).toBeChecked();
    expect(await feedback.mayEmailText()).toBe(`You can email me at ${MEMBER_EMAIL} about this`);
    await expect(feedback.sendButton).toHaveText('Send feedback');
    await expect(feedback.aside.getByRole('heading', { level: 2 })).toHaveText('You said, we did');
    await expect(feedback.saidLead).toHaveText('Recent changes that started as member feedback.');
    expect(await feedback.saidViews()).toEqual(SAID);
  });

  test('the note asks the question of the kind chosen', async ({ page, api }) => {
    answerFeedbackForm(api);
    const feedback = new WebFeedbackPage(page);
    await feedback.open();

    for (const [kind, question] of [
      ['Something’s off', 'What happened?'],
      ['Correction', 'What should it say?'],
      ['Thanks', 'What’s been good?'],
      ['Idea', 'What would make this better?'],
    ]) {
      await feedback.chooseKind(kind);
      await expect(feedback.kind(kind)).toBeChecked();
      await expect(feedback.noteLabel).toHaveText(question);
    }
    await feedback.chooseKind('Correction');
    await expect(feedback.noteHint).toHaveText(
      'The detail that’s wrong, and the right one if you know it',
    );
  });

  test('About this page can be removed, and with no page the form has no chip', async ({
    page,
    api,
  }) => {
    answerFeedbackForm(api);
    const feedback = new WebFeedbackPage(page);
    await feedback.open('?about=page:profile');
    await expect(feedback.chipValue).toHaveText('Profile');

    await feedback.removePage.click();

    await expect(feedback.chip).toHaveCount(0);
    await expect(feedback.note).toBeFocused();
  });

  test('an about the server does not know shows no chip', async ({ page, api }) => {
    const asked = answerFeedbackForm(api);
    const feedback = new WebFeedbackPage(page);

    await feedback.open('?about=page:nowhere');

    await expect(feedback.heading).toHaveText('Send feedback');
    await expect(feedback.mayEmail).toBeChecked();
    await expect(feedback.chip).toHaveCount(0);
    expect(asked).toEqual(['page:nowhere']);
  });

  test('an empty note sends nothing and is marked, and Send feedback is never disabled', async ({
    page,
    api,
  }) => {
    answerFeedbackForm(api);
    const posted: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/feedback') {
        posted.push(request.url());
      }
    });
    const feedback = new WebFeedbackPage(page);
    await feedback.open('?about=page:home');
    await expect(feedback.sendButton).toBeEnabled();

    await feedback.note.fill('   ');
    await feedback.sendButton.click();

    await expect(feedback.noteError).toHaveText('Tell us a little more first.');
    await expect(feedback.note).toHaveAttribute('aria-invalid', 'true');
    await expect(feedback.note).toHaveAttribute('aria-describedby', 'f-text-error');
    await expect(feedback.note).toBeFocused();
    await expect(feedback.sendButton).toBeEnabled();
    expect(posted).toEqual([]);
  });
});

// L2-063 AC6, AC7 and AC9 (ADR 0109; mock `submitting`, `success`, `error`): a note is sent with
// its kind, the page and the email choice; the button reads "Sending…" meanwhile, and "Got it.
// Thank you." replaces the form; a failure or the hourly limit keeps what was written.
test.describe('Member app, send feedback: sending', () => {
  test(
    'while it is on its way the button reads Sending… and the form holds still, then the thanks replaces it',
    { tag: '@critical' },
    async ({ page, api }) => {
      answerFeedbackForm(api);
      let answer: () => void = () => undefined;
      const answered = new Promise<void>((resolve) => (answer = resolve));
      const sent = answerFeedbackSend(api, async () => {
        await answered;
        return { status: 204 };
      });
      const feedback = new WebFeedbackPage(page);
      await feedback.open('?about=page:events/series/:id');
      await expect(feedback.chipValue).toHaveText('Event series');
      await feedback.note.fill(
        '  Could the series page show which week of the plan each session is?  ',
      );

      await feedback.sendAndAwaitRequest();

      // The browser has sent the request; the fixture's handler records it a moment later.
      await expect
        .poll(() => sent)
        .toEqual([
          {
            kind: 'idea',
            text: 'Could the series page show which week of the plan each session is?',
            about: 'page:events/series/:id',
            mayEmail: 'true',
            screenshot: null,
          },
        ]);
      await expect(feedback.sendButton).toHaveText('Sending…');
      await expect(feedback.sendButton).toBeDisabled();
      await expect(feedback.sendButton).toHaveAttribute('aria-busy', 'true');
      await expect(feedback.note).toHaveJSProperty('readOnly', true);
      await expect(feedback.kind('Thanks')).toBeDisabled();
      await expect(feedback.removePage).toBeDisabled();
      await expect(feedback.mayEmail).toBeDisabled();

      answer();

      await expect(feedback.done).toHaveAttribute('role', 'status');
      await expect(feedback.done).toBeFocused();
      await expect(feedback.doneTitle).toHaveText('Got it. Thank you.');
      await expect(feedback.doneText).toHaveText(
        'Dana and the team read every note. If we need more detail we’ll email you, and we’ll let you know when it’s fixed.',
      );
      await expect(feedback.form).toHaveCount(0);
      await expect(feedback.backHome).toHaveAttribute('href', '/home');

      await feedback.sendMore.click();

      await expect(feedback.done).toHaveCount(0);
      expect(await feedback.kindChoices()).toMatchObject({ chosen: 'Idea' });
      await expect(feedback.note).toHaveValue('');
      await expect(feedback.chipValue).toHaveText('Event series');
      await expect(feedback.mayEmail).toBeChecked();
      await expect(feedback.sendButton).toHaveText('Send feedback');
    },
  );

  test('the kind chosen, no page and no email are sent as the member left them', async ({
    page,
    api,
  }) => {
    answerFeedbackForm(api);
    const sent = answerFeedbackSend(api);
    const feedback = new WebFeedbackPage(page);
    await feedback.open('?about=page:profile');
    await expect(feedback.chipValue).toHaveText('Profile');
    await feedback.chooseKind('Thanks');
    await feedback.removePage.click();
    await feedback.mayEmail.uncheck();
    await feedback.note.fill('The verse at the end of the newsletter is my long-run mantra.');

    await feedback.sendAndAwaitRequest();

    await expect(feedback.doneTitle).toHaveText('Got it. Thank you.');
    await expect(feedback.doneText).toHaveText(
      'Dana and the team read every note. If we need more detail we’ll message you here, and we’ll let you know when it’s fixed.',
    );
    expect(sent).toEqual([
      {
        kind: 'thanks',
        text: 'The verse at the end of the newsletter is my long-run mantra.',
        about: null,
        mayEmail: 'false',
        screenshot: null,
      },
    ]);
  });

  for (const failure of [
    { why: 'a server error', reply: feedbackProblem(500, 'server_error') },
    { why: 'no answer', reply: { abort: true } },
  ]) {
    test(`${failure.why} shows a message above the form and keeps what was written`, async ({
      page,
      api,
    }) => {
      answerFeedbackForm(api);
      answerFeedbackSend(api, () => failure.reply);
      const feedback = new WebFeedbackPage(page);
      await feedback.open('?about=page:home');
      await feedback.chooseKind('Correction');
      await feedback.mayEmail.uncheck();
      await feedback.note.fill(
        'Could the series page show which week of the plan each session is?',
      );

      await feedback.sendAndAwaitRequest();

      await expect(feedback.alert).toHaveAttribute('role', 'alert');
      await expect(feedback.alert).toBeFocused();
      await expect(feedback.alertTitle).toHaveText("We couldn't send your feedback");
      await expect(feedback.alertText).toHaveText(
        'Something went wrong on our side. What you wrote is still here, so try again in a moment.',
      );
      await expect(feedback.note).toHaveValue(
        'Could the series page show which week of the plan each session is?',
      );
      expect(await feedback.kindChoices()).toMatchObject({ chosen: 'Correction' });
      await expect(feedback.chipValue).toHaveText('Home');
      await expect(feedback.mayEmail).not.toBeChecked();
      await expect(feedback.sendButton).toHaveText('Send feedback');
      await expect(feedback.sendButton).toBeEnabled();
    });
  }

  test('the eleventh note in an hour is refused and what was written is kept', async ({
    page,
    api,
  }) => {
    answerFeedbackForm(api);
    answerFeedbackSend(api, () => feedbackProblem(429, 'too_many_attempts'));
    const feedback = new WebFeedbackPage(page);
    await feedback.open();
    await feedback.note.fill('One more idea.');

    await feedback.sendAndAwaitRequest();

    await expect(feedback.alertTitle).toHaveText('You’ve sent 10 notes this hour');
    await expect(feedback.alertText).toHaveText(
      'You can send more in an hour. What you wrote is still here.',
    );
    await expect(feedback.alert).toBeFocused();
    await expect(feedback.note).toHaveValue('One more idea.');
  });

  test('a note over 2,000 characters is never sent, and one the server finds too long is marked', async ({
    page,
    api,
  }) => {
    answerFeedbackForm(api);
    const sent = answerFeedbackSend(api, () =>
      feedbackProblem(400, 'validation_failed', { text: 'field_too_long' }),
    );
    const feedback = new WebFeedbackPage(page);
    await feedback.open();
    await feedback.note.fill('a'.repeat(2001));

    await feedback.sendButton.click();

    await expect(feedback.noteError).toHaveText('Keep it to 2,000 characters.');
    await expect(feedback.note).toBeFocused();
    expect(sent).toEqual([]);

    await feedback.note.fill('a'.repeat(2000));
    await feedback.sendAndAwaitRequest();

    await expect(feedback.noteError).toHaveText('Keep it to 2,000 characters.');
    await expect(feedback.note).toHaveAttribute('aria-invalid', 'true');
    await expect(feedback.note).toBeFocused();
    await expect(feedback.alert).toHaveCount(0);
    expect(sent).toHaveLength(1);
  });
});

// L2-063 AC4 (ADR 0109; mock `broken`): only "Something’s off" can carry one screenshot, a JPEG,
// PNG or WebP of at most 5 MB, named once chosen and removable; another type or size is refused in
// the browser and never sent, and the server's refusal is shown the same way.
test.describe('Member app, send feedback: a screenshot', () => {
  test('Something’s off asks what happened and sends one screenshot with the note', async ({
    page,
    api,
  }) => {
    answerFeedbackForm(api);
    const sent = answerFeedbackSend(api);
    const feedback = new WebFeedbackPage(page);
    await feedback.open('?about=page:events');
    await expect(feedback.screenshotGroup).toHaveCount(0);

    await feedback.chooseKind('Something’s off');

    await expect(feedback.noteLabel).toHaveText('What happened?');
    await expect(feedback.screenshotGroup).toContainText('Screenshot (optional)');
    await expect(feedback.addScreenshot).toHaveText('Add a screenshot');
    await expect(feedback.screenshotHint).toHaveText('JPEG, PNG or WebP, up to 5 MB');
    await expect(feedback.screenshotInput).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp',
    );
    await feedback.chooseScreenshot('add-to-calendar.png', 'image/png', 2048);
    await expect(feedback.screenshotName).toHaveText('add-to-calendar.png');
    await feedback.note.fill('The Add to calendar button opens a blank page on my phone.');

    await feedback.sendAndAwaitRequest();

    await expect(feedback.doneTitle).toHaveText('Got it. Thank you.');
    expect(sent).toEqual([
      {
        kind: 'problem',
        text: 'The Add to calendar button opens a blank page on my phone.',
        about: 'page:events',
        mayEmail: 'true',
        screenshot: { name: 'add-to-calendar.png', type: 'image/png', size: 2048 },
      },
    ]);
  });

  test('a removed screenshot, or one left on another kind, is not sent', async ({ page, api }) => {
    answerFeedbackForm(api);
    const sent = answerFeedbackSend(api);
    const feedback = new WebFeedbackPage(page);
    await feedback.open();
    await feedback.chooseKind('Something’s off');
    await feedback.chooseScreenshot('first.png', 'image/png', 2048);

    await feedback.removeScreenshot.click();

    await expect(feedback.screenshotName).toHaveText('No screenshot chosen');
    await feedback.chooseScreenshot('second.webp', 'image/webp', 1024);
    await feedback.chooseKind('Idea');
    await expect(feedback.screenshotGroup).toHaveCount(0);
    await feedback.note.fill('Could the plan show the week?');
    await feedback.sendAndAwaitRequest();

    await expect(feedback.doneTitle).toHaveText('Got it. Thank you.');
    expect(sent.map((note) => [note.kind, note.screenshot])).toEqual([['idea', null]]);
  });

  for (const file of [
    { why: 'a GIF', name: 'party.gif', type: 'image/gif', size: 2048 },
    { why: 'a PNG over 5 MB', name: 'huge.png', type: 'image/png', size: 5 * 1024 * 1024 + 1 },
  ]) {
    test(`${file.why} is refused with what is allowed and never sent`, async ({ page, api }) => {
      answerFeedbackForm(api);
      const sent = answerFeedbackSend(api);
      const feedback = new WebFeedbackPage(page);
      await feedback.open();
      await feedback.chooseKind('Something’s off');

      await feedback.chooseScreenshot(file.name, file.type, file.size);

      await expect(feedback.screenshotError).toHaveText('Use a JPEG, PNG or WebP image up to 5 MB');
      await expect(feedback.screenshotName).toHaveText('No screenshot chosen');
      await feedback.note.fill('It still breaks.');
      await feedback.sendAndAwaitRequest();
      expect(sent.map((note) => note.screenshot)).toEqual([null]);
    });
  }

  for (const code of ['image_too_large', 'image_type_not_allowed']) {
    test(`the server's ${code} is shown on the screenshot and what was written is kept`, async ({
      page,
      api,
    }) => {
      answerFeedbackForm(api);
      answerFeedbackSend(api, () =>
        feedbackProblem(400, 'validation_failed', { screenshot: code }),
      );
      const feedback = new WebFeedbackPage(page);
      await feedback.open();
      await feedback.chooseKind('Something’s off');
      await feedback.chooseScreenshot('screen.png', 'image/png', 2048);
      await feedback.note.fill('It still breaks.');

      await feedback.sendAndAwaitRequest();

      await expect(feedback.screenshotError).toHaveText('Use a JPEG, PNG or WebP image up to 5 MB');
      await expect(feedback.addScreenshot).toBeFocused();
      await expect(feedback.alert).toHaveCount(0);
      await expect(feedback.note).toHaveValue('It still breaks.');
    });
  }
});

// L2-061 AC5 and L2-063 AC2 (ADR 0109; mocks `story/default`, `feedback/correction`): at the end of
// a story, "Spotted a mistake? Send a correction" opens Send feedback in the app with Correction
// chosen and the story as what it is about; a visitor signs in first and comes back to it.
test.describe('Member app, send feedback: a correction from a story', () => {
  const ABOUT = `story:${CHURCH_GYM.id}`;
  const LABEL = `Story › ${CHURCH_GYM.headline}`;

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(STORY_NOW);
  });

  test('Send a correction opens the form as a correction about the story, and sends it', async ({
    page,
    api,
  }) => {
    answerStoryImages(api);
    answerStories(api, [CHURCH_GYM]);
    const asked = answerFeedbackForm(api, { [ABOUT]: LABEL });
    const sent = answerFeedbackSend(api);
    const story = new WebStoryPage(page);
    await story.open(CHURCH_GYM.slug);
    await expect(story.correction).toHaveText('Spotted a mistake? Send a correction');
    await expect(story.sendCorrection).toHaveAttribute(
      'href',
      `/feedback?about=story:${CHURCH_GYM.id}&kind=correction`,
    );
    await page.evaluate(() => ((window as { cfStayed?: boolean }).cfStayed = true));

    await story.sendCorrection.click();

    const feedback = new WebFeedbackPage(page);
    await expect(feedback.heading).toHaveText('Send feedback');
    expect(await feedback.kindChoices()).toMatchObject({ chosen: 'Correction' });
    await expect(feedback.noteLabel).toHaveText('What should it say?');
    await expect(feedback.chipValue).toHaveText(LABEL);
    expect(asked).toEqual([ABOUT]);
    expect(await page.evaluate(() => (window as { cfStayed?: boolean }).cfStayed)).toBe(true);

    await feedback.note.fill('RCCG Jesus House is missing from the list of churches.');
    await feedback.sendAndAwaitRequest();

    await expect(feedback.doneTitle).toHaveText('Got it. Thank you.');
    expect(sent).toEqual([
      {
        kind: 'correction',
        text: 'RCCG Jesus House is missing from the list of churches.',
        about: ABOUT,
        mayEmail: 'true',
        screenshot: null,
      },
    ]);
  });

  test('a visitor who sends a correction signs in first and comes back to it', async ({
    page,
    api,
  }) => {
    answerAsVisitor(api, SIGNED_IN);
    answerStoryImages(api);
    answerStories(api, [CHURCH_GYM]);
    const story = new WebStoryPage(page);
    await story.open(CHURCH_GYM.slug);

    await story.sendCorrection.click();

    await expect(page).toHaveURL(/\/sign-in\?/);
    expect(new URL(page.url()).searchParams.get('returnUrl')).toBe(
      `/feedback?about=story:${CHURCH_GYM.id}&kind=correction`,
    );
    answerFeedbackForm(api, { [ABOUT]: LABEL });
    const signIn = new WebSignInPage(page);
    await signIn.fill(MEMBER_EMAIL, 'abundantlife');
    await signIn.submit();

    const feedback = new WebFeedbackPage(page);
    await expect(feedback.chipValue).toHaveText(LABEL);
    expect(await feedback.kindChoices()).toMatchObject({ chosen: 'Correction' });
  });
});
