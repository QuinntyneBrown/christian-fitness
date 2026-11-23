import { expect, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { WebForgotPasswordPage } from '../page-objects/web/forgot-password.page';
import { WebResetPasswordPage } from '../page-objects/web/reset-password.page';
import { WebServerErrorPage } from '../page-objects/web/server-error.page';

const TOKEN = 'k3Jx9QwP2mV8sT4yLb7NcR1dF6hZ0aE5gU-iO_pWq2X';
const EMAIL = 'grace.thompson@gmail.com';
const PASSWORD = 'graceandgrit';
const SHORT = 'Use at least 8 characters';
const MISMATCH = 'Type the same password in both fields';

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    // A server sentence the screen must never show (L2-032 AC1).
    json: { type: 'about:blank', title: 'Server words', detail: 'Server detail', status, code },
  };
}

/** Answers each request to `path` with the next reply (the last one repeats); answers how many were sent. */
function answer(api: ApiHandlers, path: string, ...replies: ApiReply[]): () => number {
  let sent = 0;
  api.on('POST', path, () => replies[Math.min(++sent, replies.length) - 1]!);
  return () => sent;
}

const CHECK = '/api/account/password-reset/check';
const COMPLETE = '/api/account/password-reset/complete';

// L2-045 AC4, AC5 and AC6: an unusable link gives way to "This link has expired", a short or
// mismatched password is named before anything is sent, and a failure says so and keeps what was
// typed (mocks `error`, `invalid`, `failed`, `unchecked`).
test.describe('Member app, reset password refusals', () => {
  test('a link with no token is expired at once, and nothing is sent', async ({ page, api }) => {
    const checked = answer(api, CHECK, { json: { email: EMAIL } });
    const reset = new WebResetPasswordPage(page);

    await reset.open();

    await expect(reset.heading).toHaveText('This link has expired');
    await expect(reset.heading).toBeFocused();
    await expect(reset.lead).toHaveText(
      'Reset links last 30 minutes, and each one works once. Ask for a new one and use it right away.',
    );
    await expect(reset.actionLink).toHaveText('Send a new link');
    await expect(reset.actionLink).toHaveAttribute('href', '/forgot-password');
    await expect(reset.alt).toHaveText('Back to sign in');
    await expect(reset.backLink).toHaveAttribute('href', '/sign-in');
    await expect(reset.inputs).toHaveCount(0);
    expect(checked()).toBe(0);
  });

  test('a link the API calls expired shows "This link has expired"', async ({ page, api }) => {
    answer(api, CHECK, problem(410, 'reset_link_expired'));
    const reset = new WebResetPasswordPage(page);

    await reset.open(TOKEN);

    await expect(reset.heading).toHaveText('This link has expired');
    await expect(reset.form).not.toContainText('Server');
    expect(reset.location()).toBe('/reset-password');
  });

  test('"Send a new link" opens the Forgot password screen', async ({ page, api }) => {
    answer(api, CHECK, problem(410, 'reset_link_expired'));
    const reset = new WebResetPasswordPage(page);
    const forgot = new WebForgotPasswordPage(page);

    await reset.open(TOKEN);
    await reset.actionLink.click();

    await expect(forgot.heading).toHaveText('Reset your password');
    expect(forgot.location()).toBe('/forgot-password');
  });

  for (const [why, reply] of [
    ['a server error', problem(500, 'server_error')],
    ['an unavailable server', problem(503, 'server_error')],
    ['a refused antiforgery token', problem(400, 'antiforgery_failed')],
  ] as const) {
    test(`${why} while checking says so and offers to try again`, async ({ page, api }) => {
      answer(api, CHECK, reply);
      const reset = new WebResetPasswordPage(page);
      const serverError = new WebServerErrorPage(page);

      await reset.open(TOKEN);

      await expect(reset.heading).toHaveText("We couldn't check your link");
      await expect(reset.heading).toBeFocused();
      await expect(reset.lead).toHaveText(
        'Something went wrong on our side. Try again in a minute.',
      );
      await expect(reset.submitButton).toHaveText('Try again');
      await expect(reset.backLink).toHaveAttribute('href', '/sign-in');
      await expect(reset.form).not.toContainText('Server');
      await expect(serverError.heading).toHaveCount(0);
      expect(reset.location()).toBe('/reset-password');
    });
  }

  test('"Try again" checks the same link again and shows the form', async ({ page, api }) => {
    const bodies: unknown[] = [];
    let calls = 0;
    api.on('POST', CHECK, (request) => {
      bodies.push(request.postDataJSON());
      return ++calls === 1 ? problem(503, 'server_error') : { json: { email: EMAIL } };
    });
    const reset = new WebResetPasswordPage(page);

    await reset.open(TOKEN);
    await expect(reset.heading).toHaveText("We couldn't check your link");
    await reset.submitButton.click();

    await expect(reset.lead).toHaveText(`For ${EMAIL}.`);
    expect(bodies).toEqual([{ token: TOKEN }, { token: TOKEN }]);
  });

  test('passwords that differ are named on the confirm field, and nothing is sent', async ({
    page,
    api,
  }) => {
    answer(api, CHECK, { json: { email: EMAIL } });
    const saved = answer(api, COMPLETE, { status: 204 });
    const reset = new WebResetPasswordPage(page);

    await reset.open(TOKEN);
    await reset.fill(PASSWORD, 'graceandgrt');
    await reset.submit();

    await expect(reset.alertTitle).toHaveText("Your passwords don't match");
    await expect(reset.alert).toBeFocused();
    await expect(reset.alertLinks).toHaveText([MISMATCH]);
    await expect(reset.confirm).toHaveAttribute('aria-invalid', 'true');
    await expect(reset.confirm).toHaveAttribute('aria-describedby', 'f-confirm-error');
    await expect(reset.confirmError).toHaveText(MISMATCH);
    await expect(reset.password).not.toHaveAttribute('aria-invalid');
    await expect(reset.password).toHaveValue(PASSWORD);
    expect(saved()).toBe(0);
  });

  test('a short password is named on its field, with the mismatch, and nothing is sent', async ({
    page,
    api,
  }) => {
    answer(api, CHECK, { json: { email: EMAIL } });
    const saved = answer(api, COMPLETE, { status: 204 });
    const reset = new WebResetPasswordPage(page);

    await reset.open(TOKEN);
    await reset.fill('grace', 'grac');
    await reset.submit();

    await expect(reset.alertTitle).toHaveText('Check your new password');
    await expect(reset.alertLinks).toHaveText([SHORT, MISMATCH]);
    await expect(reset.password).toHaveAttribute('aria-invalid', 'true');
    await expect(reset.password).toHaveAttribute('aria-describedby', 'f-password-error');
    await expect(reset.passwordError).toHaveText(SHORT);
    await expect(reset.passwordHint).toHaveCount(0);
    await expect(reset.confirmError).toHaveText(MISMATCH);
    expect(saved()).toBe(0);
  });

  test("the summary's link moves focus to the field", async ({ page, api }) => {
    answer(api, CHECK, { json: { email: EMAIL } });
    const reset = new WebResetPasswordPage(page);

    await reset.open(TOKEN);
    await reset.fill(PASSWORD, 'graceandgrt');
    await reset.submit();
    await reset.alertLinks.first().click();

    await expect(reset.confirm).toBeFocused();
    expect(reset.location()).toBe('/reset-password');
  });

  test('editing a field clears its error, and matching passwords are then saved', async ({
    page,
    api,
  }) => {
    answer(api, CHECK, { json: { email: EMAIL } });
    const saved = answer(api, COMPLETE, { status: 204 });
    const reset = new WebResetPasswordPage(page);

    await reset.open(TOKEN);
    await reset.fill(PASSWORD, 'graceandgrt');
    await reset.submit();
    await expect(reset.confirm).toHaveAttribute('aria-invalid', 'true');
    await reset.confirm.fill(PASSWORD);

    await expect(reset.confirm).not.toHaveAttribute('aria-invalid');
    await expect(reset.alert).toHaveCount(0);
    await reset.submit();
    await expect(reset.heading).toHaveText('Password saved');
    expect(saved()).toBe(1);
  });

  test('a link that expires before saving shows "This link has expired"', async ({ page, api }) => {
    answer(api, CHECK, { json: { email: EMAIL } });
    answer(api, COMPLETE, problem(410, 'reset_link_expired'));
    const reset = new WebResetPasswordPage(page);

    await reset.open(TOKEN);
    await reset.fill(PASSWORD, PASSWORD);
    await reset.awaitSave(() => reset.submit());

    await expect(reset.heading).toHaveText('This link has expired');
    await expect(reset.heading).toBeFocused();
    await expect(reset.inputs).toHaveCount(0);
  });

  test('a 400 refusal by the server marks the new password', async ({ page, api }) => {
    answer(api, CHECK, { json: { email: EMAIL } });
    answer(api, COMPLETE, problem(400, 'validation_failed'));
    const reset = new WebResetPasswordPage(page);

    await reset.open(TOKEN);
    await reset.fill(PASSWORD, PASSWORD);
    await reset.awaitSave(() => reset.submit());

    await expect(reset.alertTitle).toHaveText('Check your new password');
    await expect(reset.password).toHaveAttribute('aria-invalid', 'true');
    await expect(reset.passwordError).toHaveText(SHORT);
    await expect(reset.confirm).not.toHaveAttribute('aria-invalid');
    await expect(reset.form).not.toContainText('Server');
    await expect(reset.submitButton).toBeEnabled();
  });

  for (const [why, reply] of [
    ['a server error', problem(500, 'server_error')],
    ['an unavailable server', problem(503, 'server_error')],
    ['a refused antiforgery token', problem(400, 'antiforgery_failed')],
  ] as const) {
    test(`${why} while saving shows "We couldn't save your password" and keeps both fields`, async ({
      page,
      api,
    }) => {
      answer(api, CHECK, { json: { email: EMAIL } });
      answer(api, COMPLETE, reply);
      const reset = new WebResetPasswordPage(page);
      const serverError = new WebServerErrorPage(page);

      await reset.open(TOKEN);
      await reset.fill(PASSWORD, PASSWORD);
      await reset.awaitSave(() => reset.submit());

      await expect(reset.alertTitle).toHaveText("We couldn't save your password");
      await expect(reset.alertText).toHaveText(
        'Something went wrong on our side. Try again in a minute.',
      );
      await expect(reset.alert).toBeFocused();
      await expect(reset.password).toHaveValue(PASSWORD);
      await expect(reset.confirm).toHaveValue(PASSWORD);
      await expect(reset.password).not.toHaveAttribute('aria-invalid');
      await expect(reset.submitButton).toHaveText('Save password');
      await expect(reset.submitButton).toBeEnabled();
      await expect(reset.form).not.toContainText('Server');
      await expect(serverError.heading).toHaveCount(0);
      expect(reset.location()).toBe('/reset-password');
    });
  }

  test('after a failure, trying again saves the password', async ({ page, api }) => {
    answer(api, CHECK, { json: { email: EMAIL } });
    const saved = answer(api, COMPLETE, problem(503, 'server_error'), { status: 204 });
    const reset = new WebResetPasswordPage(page);

    await reset.open(TOKEN);
    await reset.fill(PASSWORD, PASSWORD);
    await reset.awaitSave(() => reset.submit());
    await expect(reset.alertTitle).toHaveText("We couldn't save your password");
    await reset.submit();

    await expect(reset.heading).toHaveText('Password saved');
    expect(saved()).toBe(2);
  });
});
