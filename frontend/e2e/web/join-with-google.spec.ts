import { expect, SIGNED_IN, test, XSRF_TOKEN } from '../fixtures/test';
import { answerGoogleFinish } from '../fixtures/google';
import type { ApiHandlers, ApiReply } from '../fixtures/api-handlers';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebJoinPage } from '../page-objects/web/join.page';

const NO_ACCOUNT: ApiReply = {
  status: 404,
  json: { status: 404, code: 'no_account', account: 'grace.thompson@gmail.com' },
};

const PENDING = { email: 'grace.thompson@gmail.com', name: 'Grace Thompson' };

/** Answers "Finish your profile"'s read of the Google account, counting each read. */
function answerPending(api: ApiHandlers, reply: ApiReply = { json: PENDING }): { reads: number } {
  const seen = { reads: 0 };
  api.on('GET', '/api/account/google', () => {
    seen.reads += 1;
    return reply;
  });
  return seen;
}

/** Answers the Google join with `reply`, recording each body it was sent. */
function answerGoogleJoin(api: ApiHandlers, reply: ApiReply = { status: 201, json: SIGNED_IN }) {
  const sent: unknown[] = [];
  api.on('POST', '/api/account/join/google', (request) => {
    sent.push(request.postDataJSON());
    return reply;
  });
  return sent;
}

// L2-003 AC8, AC9, AC10, L2-049 AC12: back on Join from Google, an account that already exists
// signs in; one with no profile shows "Finish your profile" with the Google account in place of the
// email and password, the name filled in from Google, and "Create profile" makes the account. The
// API's side is JoinWithGoogleTests.
test.describe('Member app, join with Google', () => {
  test('a Google account that already has a profile is signed in and lands on Home', async ({
    page,
    api,
  }) => {
    const finished = answerGoogleFinish(api, { json: SIGNED_IN });
    const home = new WebHomePage(page);

    await page.goto('/join?google=returned');

    await expect(home.greeting).toHaveText('Welcome, Grace');
    expect(finished).toEqual([{ token: XSRF_TOKEN }]);
  });

  test(
    'a Google account with no profile finishes it: the account in place of email and password, then Home',
    { tag: '@critical' },
    async ({ page, api }) => {
      answerGoogleFinish(api, NO_ACCOUNT);
      answerPending(api);
      const sent = answerGoogleJoin(api);
      const join = new WebJoinPage(page);
      const home = new WebHomePage(page);

      await page.goto('/join?google=returned');

      await expect(join.heading).toHaveText('Finish your profile');
      await expect(join.lead).toHaveText('Google filled in the basics. Tell us a little more.');
      await expect(join.ssoAccountEmail).toHaveText('grace.thompson@gmail.com');
      await expect(join.ssoAccountVia).toHaveText('Signing in with Google');
      await expect(join.ssoAccountAvatar).toHaveText('G');
      await expect(join.googleButton).toHaveCount(0);
      await expect(join.divider).toHaveCount(0);
      await expect(join.labels).toHaveText(['Name', 'Home church']);
      await expect(join.fullName).toHaveValue('Grace Thompson');
      await expect(join.fullName).toHaveAccessibleDescription(
        'From your Google account — change it if you like',
      );
      await expect(join.submitButton).toHaveText('Create profile');

      await join.homeChurch.fill('Grace Fellowship, Scarborough');
      await join.choose('Running');
      await join.age.check();
      await join.submit();

      await expect(home.greeting).toHaveText('Welcome, Grace');
      expect(sent).toEqual([
        {
          ageConfirmed: true,
          fullName: 'Grace Thompson',
          homeChurch: 'Grace Fellowship, Scarborough',
          interests: ['running'],
        },
      ]);
    },
  );

  test('"Create my profile" from Sign in opens "Finish your profile" without finishing again', async ({
    page,
    api,
  }) => {
    const finished = answerGoogleFinish(api, NO_ACCOUNT);
    const pending = answerPending(api);
    const join = new WebJoinPage(page);

    await page.goto('/join?google=finish');

    await expect(join.ssoAccountEmail).toHaveText('grace.thompson@gmail.com');
    expect(finished).toHaveLength(0);
    expect(pending.reads).toBe(1);
    await expect.poll(() => new URL(page.url()).search).toBe('');
  });

  test('a Google account with no name leaves Name blank, and the avatar shows the email', async ({
    page,
    api,
  }) => {
    answerPending(api, { json: { email: 'grace.thompson@gmail.com', name: null } });
    const join = new WebJoinPage(page);

    await page.goto('/join?google=finish');

    await expect(join.fullName).toHaveValue('');
    await expect(join.ssoAccountAvatar).toHaveText('G');
  });

  test('while the account is being created, the button reads "Creating your profile…" and is disabled', async ({
    page,
    api,
  }) => {
    answerPending(api);
    let answer!: () => void;
    const held = new Promise<void>((resolve) => (answer = resolve));
    api.on('POST', '/api/account/join/google', async () => {
      await held;
      return { status: 201, json: SIGNED_IN };
    });
    const join = new WebJoinPage(page);

    await page.goto('/join?google=finish');
    await join.age.check();
    await join.submit();

    await expect(join.submitButton).toHaveText('Creating your profile…');
    await expect(join.submitButton).toBeDisabled();
    await expect(join.submitButton).toHaveAttribute('aria-busy', 'true');
    answer();
  });

  test('a blank name is named and nothing is sent', async ({ page, api }) => {
    answerPending(api);
    const sent = answerGoogleJoin(api);
    const join = new WebJoinPage(page);

    await page.goto('/join?google=finish');
    await join.fullName.fill('   ');
    await join.age.check();
    await join.submit();

    await expect(join.alertTitle).toHaveText('Check your details');
    await expect(join.alertLinks).toHaveText(['Enter your name.']);
    await expect(join.fieldError('Name')).toHaveText('Enter your name.');
    await expect(join.fullName).toHaveAttribute('aria-invalid', 'true');
    expect(sent).toHaveLength(0);
  });

  test('without the age confirmation, it is named and nothing is sent', async ({ page, api }) => {
    answerPending(api);
    const sent = answerGoogleJoin(api);
    const join = new WebJoinPage(page);

    await page.goto('/join?google=finish');
    await join.submit();

    await expect(join.alertLinks).toHaveText(["Confirm you're 16 or older to create a profile"]);
    await expect(join.ageError).toHaveText("Confirm you're 16 or older to create a profile");
    await expect(join.age).toHaveAttribute('aria-invalid', 'true');
    expect(sent).toHaveLength(0);
  });

  test('"Change" forgets the Google account and shows the email form', async ({ page, api }) => {
    answerPending(api);
    let forgotten = 0;
    api.on('DELETE', '/api/account/google', () => {
      forgotten += 1;
      return { status: 204 };
    });
    const join = new WebJoinPage(page);

    await page.goto('/join?google=finish');
    await join.change.focus();
    await page.keyboard.press('Enter');

    await expect(join.heading).toHaveText('Create your profile');
    await expect(join.googleButton).toHaveText('Sign up with Google');
    await expect(join.ssoAccount).toHaveCount(0);
    await expect(join.labels).toHaveText(['Name', 'Email', 'Password', 'Home church']);
    expect(forgotten).toBe(1);
  });

  test('a Google account whose email is not verified shows what to do, on the email form', async ({
    page,
    api,
  }) => {
    answerPending(api, {
      status: 401,
      json: { status: 401, code: 'google_email_unverified' },
    });
    const join = new WebJoinPage(page);

    await page.goto('/join?google=finish');

    await expect(join.alertTitle).toHaveText("Your Google email isn't verified");
    await expect(join.heading).toHaveText('Create your profile');
    await expect(join.ssoAccount).toHaveCount(0);
  });

  test('back from Google with a suspended account, Join says so', async ({ page, api }) => {
    answerGoogleFinish(api, { status: 403, json: { status: 403, code: 'account_suspended' } });
    const join = new WebJoinPage(page);

    await page.goto('/join?google=returned');

    await expect(join.alertTitle).toHaveText('Your account is suspended');
  });

  test('an email that already has a profile is named, with a way to sign in', async ({
    page,
    api,
  }) => {
    answerPending(api);
    answerGoogleJoin(api, { status: 409, json: { status: 409, code: 'email_taken' } });
    const join = new WebJoinPage(page);

    await page.goto('/join?google=finish');
    await join.age.check();
    await join.submit();

    await expect(join.alertTitle).toHaveText('This email already has a profile');
    await expect(join.alert.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
    await expect(join.ssoAccountEmail).toHaveText('grace.thompson@gmail.com');
  });

  test('a server error keeps the form and says the servers did not respond', async ({
    page,
    api,
  }) => {
    answerPending(api);
    answerGoogleJoin(api, { status: 500, json: { status: 500 } });
    const join = new WebJoinPage(page);

    await page.goto('/join?google=finish');
    await join.homeChurch.fill('Grace Fellowship');
    await join.age.check();
    await join.submit();

    await expect(join.alertTitle).toHaveText("We couldn't create your profile");
    await expect(join.homeChurch).toHaveValue('Grace Fellowship');
    await expect(join.submitButton).toBeEnabled();
  });
});
