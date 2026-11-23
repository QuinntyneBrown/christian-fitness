import { expect, SIGNED_IN, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { WebForgotPasswordPage } from '../page-objects/web/forgot-password.page';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebServerErrorPage } from '../page-objects/web/server-error.page';
import { WebSignInPage } from '../page-objects/web/sign-in.page';

const EMAIL = 'grace.thompson@gmail.com';
const PASSWORD = 'abundantlife';
/** The member the fixture's answers treat as suspended (staff suspend members in slice 27.1). */
const SUSPENDED_EMAIL = 'tsimmons22@gmail.com';

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    // A server sentence the screen must never show (L2-032 AC1).
    json: { type: 'about:blank', title: 'Server words', detail: 'Server detail', status, code },
  };
}

/** Answers each sign-in with the next reply (the last one repeats); answers how many were sent. */
function answerSignIn(api: ApiHandlers, ...replies: ApiReply[]): () => number {
  let sent = 0;
  api.on('POST', '/api/session', () => replies[Math.min(++sent, replies.length) - 1]!);
  return () => sent;
}

// L2-004 AC2: a wrong password or an unknown email gets one generic message that names neither
// field (mock `invalid`, ADR 0009).
test.describe('Member app, sign-in refusals', () => {
  test('wrong credentials show "Email or password is incorrect" and mark no field', async ({
    page,
    api,
  }) => {
    answerSignIn(api, problem(401, 'invalid_credentials'));
    const signIn = new WebSignInPage(page);

    await signIn.open();
    await signIn.fill(EMAIL, 'not-her-password');
    await signIn.submitAndAwaitAnswer();

    await expect(signIn.alertTitle).toHaveText('Email or password is incorrect');
    await expect(signIn.alertText).toHaveText('Check both and try again.');
    await expect(signIn.alert).toHaveAttribute('role', 'alert');
    await expect(signIn.alert).toBeFocused();
    await expect(signIn.email).not.toHaveAttribute('aria-invalid');
    await expect(signIn.password).not.toHaveAttribute('aria-invalid');
    await expect(signIn.email).toHaveValue(EMAIL);
    await expect(signIn.password).toHaveValue('not-her-password');
    await expect(signIn.submitButton).toHaveText('Sign in');
    await expect(signIn.submitButton).toBeEnabled();
    await expect(signIn.form).not.toContainText('Server');
    expect(signIn.location()).toBe('/sign-in');
  });

  test('after wrong credentials, the right ones sign the member in', async ({ page, api }) => {
    const sent = answerSignIn(api, problem(401, 'invalid_credentials'), { json: SIGNED_IN });
    const signIn = new WebSignInPage(page);
    const home = new WebHomePage(page);

    await signIn.open();
    await signIn.fill(EMAIL, 'not-her-password');
    await signIn.submitAndAwaitAnswer();
    await expect(signIn.alertTitle).toHaveText('Email or password is incorrect');
    await signIn.fill(EMAIL, PASSWORD);
    await signIn.submit();

    await expect(home.greeting).toHaveText('Welcome, Grace');
    expect(sent()).toBe(2);
  });

  // L2-004 AC3: 5 failures for the email in 15 minutes pause sign-in (mock `error`, ADR 0011).
  test('too many attempts show "Sign-in paused for 15 minutes" and keep the form', async ({
    page,
    api,
  }) => {
    const sent = answerSignIn(api, problem(429, 'too_many_attempts'));
    const signIn = new WebSignInPage(page);

    await signIn.open();
    await signIn.fill(EMAIL, PASSWORD);
    await signIn.submitAndAwaitAnswer();

    await expect(signIn.alertTitle).toHaveText('Sign-in paused for 15 minutes');
    await expect(signIn.alertText).toHaveText(
      'Too many attempts, so we paused sign-in to keep your account safe. Reset your password',
    );
    await expect(signIn.alert).toHaveAttribute('role', 'alert');
    await expect(signIn.alert).toBeFocused();
    await expect(signIn.email).not.toHaveAttribute('aria-invalid');
    await expect(signIn.password).not.toHaveAttribute('aria-invalid');
    await expect(signIn.email).toHaveValue(EMAIL);
    await expect(signIn.password).toHaveValue(PASSWORD);
    // The pause is the server's, per email: the button stays, and the server answers again.
    await expect(signIn.submitButton).toBeEnabled();
    await expect(signIn.form).not.toContainText('Server');
    await signIn.submitAndAwaitAnswer();
    expect(sent()).toBe(2);
    expect(signIn.location()).toBe('/sign-in');
  });

  // L2-004 AC3 with L2-044 AC1: the paused member can get back in now by resetting their password
  // (mock `error`).
  test('"Reset your password" in the paused message opens Forgot password, by keyboard', async ({
    page,
    api,
  }) => {
    answerSignIn(api, problem(429, 'too_many_attempts'));
    const signIn = new WebSignInPage(page);
    const forgot = new WebForgotPasswordPage(page);

    await signIn.open();
    await signIn.fill(EMAIL, PASSWORD);
    await signIn.submitAndAwaitAnswer();
    await expect(signIn.alert).toBeFocused();

    await expect(signIn.resetLink).toHaveAttribute('href', '/forgot-password');
    await page.keyboard.press('Tab');
    await expect(signIn.resetLink).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(forgot.heading).toHaveText('Reset your password');
    expect(signIn.location()).toBe('/forgot-password');
  });

  // L2-004 AC4: a suspended member is told to contact the team (mock `suspended`, ADR 0011).
  test('a suspended account shows "Your account is suspended" with whom to contact', async ({
    page,
    api,
  }) => {
    answerSignIn(api, problem(403, 'account_suspended'));
    const signIn = new WebSignInPage(page);

    await signIn.open();
    await signIn.fill(SUSPENDED_EMAIL, PASSWORD);
    await signIn.submitAndAwaitAnswer();

    await expect(signIn.alertTitle).toHaveText('Your account is suspended');
    await expect(signIn.alertText).toHaveText(
      'Contact the Christian Fitness team to talk it through.',
    );
    await expect(signIn.alert).toBeFocused();
    await expect(signIn.email).not.toHaveAttribute('aria-invalid');
    await expect(signIn.email).toHaveValue(SUSPENDED_EMAIL);
    await expect(signIn.submitButton).toBeEnabled();
    await expect(signIn.form).not.toContainText('Server');
    expect(signIn.location()).toBe('/sign-in');
  });

  for (const [why, reply] of [
    ['a forbidden answer with another code', problem(403, 'forbidden')],
    ['a 429 with another code', problem(429, 'rate_limited')],
    ['a server error', problem(500, 'server_error')],
    ['an unavailable server', problem(503, 'server_error')],
    ['a refused antiforgery token', problem(400, 'antiforgery_failed')],
  ] as const) {
    test(`${why} shows "We couldn't sign you in" and keeps the form`, async ({ page, api }) => {
      answerSignIn(api, reply);
      const signIn = new WebSignInPage(page);
      const serverError = new WebServerErrorPage(page);

      await signIn.open();
      await signIn.fill(EMAIL, PASSWORD);
      await signIn.submitAndAwaitAnswer();

      await expect(signIn.alertTitle).toHaveText("We couldn't sign you in");
      await expect(signIn.alertText).toHaveText(
        'Something went wrong on our side. Try again in a moment.',
      );
      await expect(signIn.alert).toBeFocused();
      await expect(signIn.email).toHaveValue(EMAIL);
      await expect(signIn.submitButton).toBeEnabled();
      await expect(serverError.heading).toHaveCount(0);
      expect(signIn.location()).toBe('/sign-in');
    });
  }
});
