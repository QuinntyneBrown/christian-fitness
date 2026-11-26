import { expect, test } from '../fixtures/test';
import { answerHome } from '../fixtures/events';
import { answerFeedbackForm, MEMBER_EMAIL } from '../fixtures/feedback';
import { WebFeedbackPage } from '../page-objects/web/feedback.page';
import { WebHomePage } from '../page-objects/web/home.page';

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
