import { expect, STAFF_SIGNED_IN, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';
import { AdminStaffSignInPage } from '../page-objects/admin/staff-sign-in.page';
import { AdminTwoStepPage } from '../page-objects/admin/two-step.page';

const EMAIL = 'dana@christianfitness.ca';
const PASSWORD = 'abundantlife';

const WRONG_CODE =
  "That code doesn't match. Codes change every 30 seconds, so enter the newest one.";
const FAILED = "We couldn't check your code. Try again in a moment.";

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    json: { status, code, title: 'A sentence from the server the screen never shows' },
  };
}

/** Answers the password step with a pending sign-in and every code with `reply`. */
function answerCode(api: ApiHandlers, reply: ApiReply): void {
  api.on('GET', '/api/admin/session', () => problem(401, 'unauthenticated'));
  api.on('POST', '/api/admin/session', () => ({ status: 202 }));
  api.on('POST', '/api/admin/session/two-step', () => reply);
}

/** The staff session a right code answers; from then on the session is Dana's, as on the server. */
function signedIn(api: ApiHandlers): ApiReply {
  api.on('GET', '/api/admin/session', () => ({ json: STAFF_SIGNED_IN }));
  return { json: STAFF_SIGNED_IN };
}

/** Signs in with the password and waits for the code screen. */
async function reachCodeScreen(signIn: AdminStaffSignInPage, twoStep: AdminTwoStepPage) {
  await signIn.open();
  await signIn.fill(EMAIL, PASSWORD);
  await signIn.submit();
  await expect(twoStep.heading).toHaveText('Enter your code');
}

// L2-046 AC1: the code screen as the mock draws it (mock `admin-two-step/default`; ADR 0013).
test.describe('Admin app, two-step verification', () => {
  test('shows the code screen the mock draws', async ({ page, api }) => {
    answerCode(api, { json: STAFF_SIGNED_IN });
    const signIn = new AdminStaffSignInPage(page);
    const twoStep = new AdminTwoStepPage(page);

    await reachCodeScreen(signIn, twoStep);

    await expect(twoStep.lead).toHaveText(
      'Open the authenticator app on your phone and enter the 6-digit code for Christian Fitness.',
    );
    await expect(twoStep.main).toHaveCount(1);
    await expect(twoStep.inputs).toHaveCount(1);
    await expect(twoStep.code).toHaveAttribute('autocomplete', 'one-time-code');
    await expect(twoStep.code).toHaveAttribute('inputmode', 'numeric');
    await expect(twoStep.code).toHaveAttribute('type', 'text');
    await expect(twoStep.code).toHaveClass('input input--code');
    await expect(twoStep.code).toHaveValue('');
    await expect(twoStep.submitButton).toHaveText('Verify');
    await expect(twoStep.note).toHaveText(
      'Lost your phone? Ask an Admin to set up two-step verification again.',
    );
    await expect(twoStep.codeError).toHaveCount(0);
    await expect(page.getByText('Trust this browser')).toHaveCount(0);
  });

  // L2-046 AC7: the busy state, held by a gate, no clock.
  test('while the code is checked, the button reads "Verifying…" and is disabled', async ({
    page,
    api,
  }) => {
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    answerCode(api, { json: STAFF_SIGNED_IN });
    api.on('POST', '/api/admin/session/two-step', async () => {
      await answered;
      return signedIn(api);
    });
    const signIn = new AdminStaffSignInPage(page);
    const twoStep = new AdminTwoStepPage(page);
    const shell = new AdminShell(page);
    await reachCodeScreen(signIn, twoStep);

    await twoStep.fill('481 920');
    await twoStep.submit();

    await expect(twoStep.submitButton).toHaveText('Verifying…');
    await expect(twoStep.submitButton).toBeDisabled();
    await expect(twoStep.submitButton).toHaveAttribute('aria-busy', 'true');
    await expect(twoStep.code).toHaveAttribute('readonly', '');
    await expect(twoStep.code).toHaveValue('481 920');

    answer();

    await expect(shell.heading).toHaveText('Dashboard');
  });
});

// L2-046 AC3 and AC7: a wrong code and a failure are said under the field, which keeps the code;
// the server's own words are never shown (mock states `invalid` and `failed`).
test.describe('Admin app, two-step refusals on the code screen', () => {
  for (const { name, reply, message } of [
    { name: 'a wrong code', reply: problem(401, 'invalid_code'), message: WRONG_CODE },
    { name: 'a server failure', reply: problem(500, 'server_error'), message: FAILED },
    {
      name: 'a refused antiforgery token',
      reply: problem(400, 'antiforgery_failed'),
      message: FAILED,
    },
  ]) {
    test(`${name} is said under the field and the code stays`, async ({ page, api }) => {
      answerCode(api, reply);
      const signIn = new AdminStaffSignInPage(page);
      const twoStep = new AdminTwoStepPage(page);
      await reachCodeScreen(signIn, twoStep);

      await twoStep.fill('481 902');
      await twoStep.submitAndAwaitAnswer();

      await expect(twoStep.codeError).toHaveText(message);
      await expect(twoStep.code).toHaveAttribute('aria-invalid', 'true');
      await expect(twoStep.code).toHaveAttribute('aria-describedby', 'f-code-error');
      await expect(twoStep.code).toHaveValue('481 902');
      await expect(twoStep.code).toBeFocused();
      await expect(twoStep.submitButton).toBeEnabled();
      await expect(page.getByText('A sentence from the server')).toHaveCount(0);
      expect(twoStep.location()).toBe('/sign-in/verify');
    });
  }

  test('after a wrong code, the right one still signs staff in', async ({ page, api }) => {
    answerCode(api, problem(401, 'invalid_code'));
    const signIn = new AdminStaffSignInPage(page);
    const twoStep = new AdminTwoStepPage(page);
    const shell = new AdminShell(page);
    await reachCodeScreen(signIn, twoStep);
    await twoStep.fill('481 902');
    await twoStep.submitAndAwaitAnswer();
    await expect(twoStep.codeError).toHaveText(WRONG_CODE);
    api.on('POST', '/api/admin/session/two-step', () => signedIn(api));

    await twoStep.fill('481 920');
    await twoStep.submit();

    await expect(shell.heading).toHaveText('Dashboard');
  });
});

// L2-046 AC4, AC5: an expired or locked pending sign-in goes back to Staff sign in with a notice
// that takes focus (mock states `two-step-expired` and `two-step-locked`).
test.describe('Admin app, two-step endings', () => {
  for (const { name, reply, title, text } of [
    {
      name: 'a pending sign-in older than 5 minutes',
      reply: problem(401, 'two_step_expired'),
      title: 'Sign in again',
      text: 'Your sign-in timed out before a code was entered. Sign in again to get a new code.',
    },
    {
      name: 'too many wrong codes',
      reply: problem(429, 'too_many_attempts'),
      title: 'Too many codes tried',
      text: 'For your security, wait 15 minutes, then sign in again.',
    },
  ]) {
    test(`${name} returns staff to Staff sign in with a notice`, async ({ page, api }) => {
      answerCode(api, reply);
      const signIn = new AdminStaffSignInPage(page);
      const twoStep = new AdminTwoStepPage(page);
      await reachCodeScreen(signIn, twoStep);

      await twoStep.fill('481 920');
      await twoStep.submitAndAwaitAnswer();

      await expect(signIn.heading).toHaveText('Staff sign in');
      expect(signIn.location()).toBe('/sign-in');
      await expect(signIn.alertTitle).toHaveText(title);
      await expect(signIn.alertText).toHaveText(text);
      await expect(signIn.alert).toBeFocused();
      await expect(signIn.email).toHaveValue('');
    });
  }

  test('opening Staff sign in afresh shows no notice', async ({ page, api }) => {
    answerCode(api, problem(401, 'two_step_expired'));
    const signIn = new AdminStaffSignInPage(page);
    const twoStep = new AdminTwoStepPage(page);
    await reachCodeScreen(signIn, twoStep);
    await twoStep.fill('481 920');
    await twoStep.submitAndAwaitAnswer();
    await expect(signIn.alertTitle).toHaveText('Sign in again');

    await signIn.open();

    await expect(signIn.heading).toHaveText('Staff sign in');
    await expect(signIn.alert).toHaveCount(0);
  });

  test('signing in again after the notice clears it and reaches the code screen', async ({
    page,
    api,
  }) => {
    answerCode(api, problem(401, 'two_step_expired'));
    const signIn = new AdminStaffSignInPage(page);
    const twoStep = new AdminTwoStepPage(page);
    await reachCodeScreen(signIn, twoStep);
    await twoStep.fill('481 920');
    await twoStep.submitAndAwaitAnswer();
    await expect(signIn.alertTitle).toHaveText('Sign in again');

    await signIn.fill(EMAIL, PASSWORD);
    await signIn.submit();

    await expect(twoStep.heading).toHaveText('Enter your code');
    await expect(twoStep.alert).toHaveCount(0);
  });
});

// L2-046 AC6: staff without two-step set up are refused at the password step (mock state
// `two-step-not-set-up`).
test.describe('Admin app, two-step not set up', () => {
  test('staff without two-step verification are told who can set it up', async ({ page, api }) => {
    api.on('POST', '/api/admin/session', () => problem(403, 'two_step_not_set_up'));
    const signIn = new AdminStaffSignInPage(page);

    await signIn.open();
    await signIn.fill(EMAIL, PASSWORD);
    await signIn.submitAndAwaitAnswer();

    await expect(signIn.alertTitle).toHaveText("Two-step verification isn't set up");
    await expect(signIn.alertText).toHaveText(
      'Ask an Admin to set it up for your account, then sign in again.',
    );
    await expect(signIn.alert).toBeFocused();
    await expect(signIn.email).toHaveValue(EMAIL);
    expect(signIn.location()).toBe('/sign-in');
  });
});
