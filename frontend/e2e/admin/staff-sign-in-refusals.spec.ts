import { answerGoogleStart, FAKE_GOOGLE_PATH } from '../fixtures/google';
import { expect, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { AdminServerErrorPage } from '../page-objects/admin/server-error.page';
import { AdminStaffSignInPage } from '../page-objects/admin/staff-sign-in.page';

const START_PATH = '/api/admin/session/google/start';
const COMPLETE_PATH = '/api/admin/session/google';

function problem(status: number, code: string, extra: Record<string, unknown> = {}): ApiReply {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    json: { status, code, title: 'A sentence from the server the screen never shows', ...extra },
  };
}

/** Refuses every finish with `reply`; answers how many finishes were asked for. */
function refuseComplete(api: ApiHandlers, reply: ApiReply): () => number {
  let asked = 0;
  api.on('POST', COMPLETE_PATH, () => {
    asked++;
    return reply;
  });
  return () => asked;
}

// L2-018 AC3, AC4, AC8, AC10, L2-049 AC5, AC7, AC11, AC13 (ADR 0062, ADR 0100): a refused Google
// sign-in shows one notice or alert, which takes focus; nobody is signed in, the address loses
// Google's marker, and the server's own words are never shown.
test.describe('Admin app, staff Google sign-in refusals', () => {
  test('an account outside the team domain is named, and the button offers another account', async ({
    page,
    api,
  }) => {
    refuseComplete(api, problem(403, 'wrong_domain', { account: 'dana.reyes@gmail.com' }));
    const starts = answerGoogleStart(api, undefined, START_PATH);
    const signIn = new AdminStaffSignInPage(page);

    await signIn.returnFromGoogle('returned');

    await expect(signIn.noticeTitle).toHaveText("That's not a staff account");
    await expect(signIn.noticeAccount).toHaveText('dana.reyes@gmail.com');
    await expect(signIn.noticeText).toHaveText(
      'Only @christian.fitness accounts can open the console. Pick your work account instead.',
    );
    await expect(signIn.notice).toBeFocused();
    await expect(signIn.notice).toHaveAttribute('role', 'alert');
    await expect(signIn.alert).toHaveCount(0);
    await expect(signIn.googleButton).toHaveText('Try another Google account');
    expect(signIn.location()).toBe('/sign-in');

    // Google's chooser this time (ADR 0062).
    await signIn.chooseGoogle();
    await page.waitForURL((url) => url.pathname === FAKE_GOOGLE_PATH);
    expect(starts).toEqual([{ selectAccount: true }]);
  });

  test('an account of the domain with no console role is told an Admin can add it', async ({
    page,
    api,
  }) => {
    refuseComplete(api, problem(403, 'not_staff', { account: 'events@christian.fitness' }));
    const signIn = new AdminStaffSignInPage(page);

    await signIn.returnFromGoogle('returned');

    await expect(signIn.noticeTitle).toHaveText('No admin access yet');
    await expect(signIn.noticeAccount).toHaveText('events@christian.fitness');
    await expect(signIn.noticeText).toHaveText(
      'Your Workspace account is fine, but it hasn’t been given a console role. Ask an Admin to add you to the team.',
    );
    await expect(signIn.notice).toBeFocused();
    await expect(signIn.googleButton).toHaveText('Try another Google account');
  });

  test('the account is shown as text, never as markup', async ({ page, api }) => {
    refuseComplete(api, problem(403, 'not_staff', { account: '<b>events</b>@christian.fitness' }));
    const signIn = new AdminStaffSignInPage(page);

    await signIn.returnFromGoogle('returned');

    await expect(signIn.noticeAccount).toHaveText('<b>events</b>@christian.fitness');
    await expect(signIn.notice.locator('b')).toHaveCount(0);
  });

  test('Google sign-in that did not finish says so and asks the API nothing', async ({
    page,
    api,
  }) => {
    const finishes = refuseComplete(api, problem(500, 'server_error'));
    const signIn = new AdminStaffSignInPage(page);

    await signIn.returnFromGoogle('failed');

    await expect(signIn.alertTitle).toHaveText("Google sign-in didn't finish");
    await expect(signIn.alertText).toHaveText("You're not signed in. Try again in a moment.");
    await expect(signIn.alert).toBeFocused();
    await expect(signIn.googleButton).toHaveText('Sign in with Google');
    expect(signIn.location()).toBe('/sign-in');
    expect(finishes()).toBe(0);

    // A reload neither repeats the finish nor shows the message again.
    await page.reload();
    await expect(signIn.heading).toHaveText('Staff sign in');
    await expect(signIn.alert).toHaveCount(0);
  });

  for (const [why, reply] of [
    ['no Google identity came back', problem(401, 'google_email_unverified')],
    ['a server error', problem(500, 'server_error')],
    ['a 403 for another reason', problem(403, 'forbidden')],
  ] as const) {
    test(`${why} when finishing shows "Google sign-in didn't finish"`, async ({ page, api }) => {
      refuseComplete(api, reply);
      const signIn = new AdminStaffSignInPage(page);
      const serverError = new AdminServerErrorPage(page);

      await signIn.returnFromGoogle('returned');

      await expect(signIn.alertTitle).toHaveText("Google sign-in didn't finish");
      await expect(signIn.alertText).toHaveText("You're not signed in. Try again in a moment.");
      await expect(signIn.notice).toHaveCount(0);
      await expect(serverError.heading).toHaveCount(0);
      expect(signIn.location()).toBe('/sign-in');
    });
  }

  test('a suspended account is told it cannot open the console', async ({ page, api }) => {
    refuseComplete(api, problem(403, 'account_suspended'));
    const signIn = new AdminStaffSignInPage(page);

    await signIn.returnFromGoogle('returned');

    await expect(signIn.alertTitle).toHaveText('Your account is suspended');
    await expect(signIn.alertText).toHaveText("This account can't open the console.");
    await expect(signIn.alert).toBeFocused();
  });

  test('a start while sign-in is not set up says so and sends nobody to Google', async ({
    page,
    api,
  }) => {
    api.on('POST', START_PATH, () => problem(503, 'google_unavailable'));
    const signIn = new AdminStaffSignInPage(page);

    await signIn.open();
    await signIn.chooseGoogle();

    await expect(signIn.alertTitle).toHaveText("Sign-in isn't set up yet");
    await expect(signIn.alertText).toHaveText('Ask the person who runs Christian Fitness.');
    await expect(signIn.alert).toBeFocused();
    await expect(signIn.googleButton).toHaveText('Sign in with Google');
    await expect(signIn.googleButton).toBeEnabled();
    expect(signIn.location()).toBe('/sign-in');
  });

  test('too many starts from one network say to wait a few minutes', async ({ page, api }) => {
    api.on('POST', START_PATH, () => problem(429, 'too_many_attempts'));
    const signIn = new AdminStaffSignInPage(page);

    await signIn.open();
    await signIn.chooseGoogle();

    await expect(signIn.alertTitle).toHaveText('Too many attempts');
    await expect(signIn.alertText).toHaveText('Too many attempts. Try again in a few minutes.');
    await expect(signIn.googleButton).toBeEnabled();
  });

  test('a start that fails otherwise shows "Google sign-in didn\'t finish"', async ({
    page,
    api,
  }) => {
    api.on('POST', START_PATH, () => problem(500, 'server_error'));
    const signIn = new AdminStaffSignInPage(page);

    await signIn.open();
    await signIn.chooseGoogle();

    await expect(signIn.alertTitle).toHaveText("Google sign-in didn't finish");
    await expect(signIn.googleButton).toBeEnabled();
  });
});
