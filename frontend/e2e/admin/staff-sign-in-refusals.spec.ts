import { expect, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { AdminServerErrorPage } from '../page-objects/admin/server-error.page';
import { AdminStaffSignInPage } from '../page-objects/admin/staff-sign-in.page';

const EMAIL = 'dana@christianfitness.ca';
const PASSWORD = 'abundantlife';

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    json: { status, code, title: 'A sentence from the server the screen never shows' },
  };
}

/** Refuses every sign-in with `reply`. */
function refuseSignIn(api: ApiHandlers, reply: ApiReply): void {
  api.on('POST', '/api/admin/session', () => reply);
}

// L2-018 AC2, AC3, L2-032 AC1: a refused staff sign-in shows one form alert, which takes focus;
// no field is marked, what was typed stays, and the server's own words are never shown (ADR 0011).
test.describe('Admin app, staff sign-in refusals', () => {
  test('wrong credentials show one generic message that names neither field', async ({
    page,
    api,
  }) => {
    refuseSignIn(api, problem(401, 'invalid_credentials'));
    const signIn = new AdminStaffSignInPage(page);

    await signIn.open();
    await signIn.fill(EMAIL, 'not-her-password');
    await signIn.submitAndAwaitAnswer();

    await expect(signIn.alertTitle).toHaveText('Email or password is incorrect');
    await expect(signIn.alertText).toHaveText('Check both and try again.');
    await expect(signIn.alert).toBeFocused();
    for (const input of await signIn.inputs.all()) {
      await expect(input).not.toHaveAttribute('aria-invalid');
    }
    await expect(signIn.email).toHaveValue(EMAIL);
    await expect(signIn.password).toHaveValue('not-her-password');
    await expect(signIn.submitButton).toBeEnabled();
    expect(signIn.location()).toBe('/sign-in');
  });

  test('a member without a staff role is told the admin console is for the team', async ({
    page,
    api,
  }) => {
    refuseSignIn(api, problem(403, 'not_staff'));
    const signIn = new AdminStaffSignInPage(page);

    await signIn.open();
    await signIn.fill('grace.thompson@gmail.com', PASSWORD);
    await signIn.submitAndAwaitAnswer();

    await expect(signIn.alertTitle).toHaveText("This account isn't on the team");
    await expect(signIn.alertText).toHaveText(
      'The admin console is for the Christian Fitness team. On the team? Ask a community director to give you staff access.',
    );
    await expect(signIn.alert).toBeFocused();
    expect(signIn.location()).toBe('/sign-in');
  });

  // L2-018 AC3 with L2-004 AC3 (ADR 0014): the member sign-in's pause, counted in both apps.
  test('5 failed sign-ins in 15 minutes pause sign-in, keep what was typed and leave Sign in enabled', async ({
    page,
    api,
  }) => {
    refuseSignIn(api, problem(429, 'too_many_attempts'));
    const signIn = new AdminStaffSignInPage(page);

    await signIn.open();
    await signIn.fill(EMAIL, PASSWORD);
    await signIn.submitAndAwaitAnswer();

    await expect(signIn.alertTitle).toHaveText('Sign-in paused for 15 minutes');
    await expect(signIn.alertText).toHaveText(
      'Too many attempts, so we paused sign-in to keep the account safe. Wait 15 minutes, then try again.',
    );
    await expect(signIn.alert).toBeFocused();
    await expect(signIn.email).toHaveValue(EMAIL);
    await expect(signIn.password).toHaveValue(PASSWORD);
    await expect(signIn.submitButton).toBeEnabled();
    expect(signIn.location()).toBe('/sign-in');
  });

  for (const [why, reply] of [
    ['a server error', problem(500, 'server_error')],
    ['a refused token', problem(400, 'antiforgery_failed')],
    ['a 403 for another reason', problem(403, 'forbidden')],
  ] as const) {
    test(`${why} shows "We couldn't sign you in" and stays on the form`, async ({ page, api }) => {
      refuseSignIn(api, reply);
      const signIn = new AdminStaffSignInPage(page);
      const serverError = new AdminServerErrorPage(page);

      await signIn.open();
      await signIn.fill(EMAIL, PASSWORD);
      await signIn.submitAndAwaitAnswer();

      await expect(signIn.alertTitle).toHaveText("We couldn't sign you in");
      await expect(signIn.alertText).toHaveText(
        'Something went wrong on our side. Try again in a moment.',
      );
      await expect(signIn.email).toHaveValue(EMAIL);
      await expect(serverError.heading).toHaveCount(0);
    });
  }

  test('trying again after a refusal clears the message while it waits', async ({ page, api }) => {
    refuseSignIn(api, problem(401, 'invalid_credentials'));
    const signIn = new AdminStaffSignInPage(page);

    await signIn.open();
    await signIn.fill(EMAIL, 'not-her-password');
    await signIn.submitAndAwaitAnswer();
    await expect(signIn.alert).toHaveCount(1);

    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    api.on('POST', '/api/admin/session', async () => {
      await answered;
      return problem(401, 'invalid_credentials');
    });
    await signIn.submit();

    await expect(signIn.alert).toHaveCount(0);
    answer();
    await expect(signIn.alert).toHaveCount(1);
  });
});
