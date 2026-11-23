import { expect, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { WebForgotPasswordPage } from '../page-objects/web/forgot-password.page';
import { WebServerErrorPage } from '../page-objects/web/server-error.page';

const EMAIL = 'grace.thompson@gmail.com';
const INVALID = 'Enter an email address like name@example.com';

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    // A server sentence the screen must never show (L2-032 AC1).
    json: { type: 'about:blank', title: 'Server words', detail: 'Server detail', status, code },
  };
}

/** Answers each reset request with the next reply (the last one repeats); answers how many were sent. */
function answerReset(api: ApiHandlers, ...replies: ApiReply[]): () => number {
  let sent = 0;
  api.on(
    'POST',
    '/api/account/password-reset',
    () => replies[Math.min(++sent, replies.length) - 1]!,
  );
  return () => sent;
}

// L2-044 AC5 and AC7: a blank or malformed email is named before anything is sent, a refusal by
// the server marks the field the same way, and a failure keeps the email (mocks `invalid`, `error`).
test.describe('Member app, reset request refusals', () => {
  for (const [why, typed] of [
    ['a blank email', ''],
    ['an email with no dot in the domain', 'grace.thompson@gmail'],
    ['an email with a space', 'grace thompson@gmail.com'],
  ] as const) {
    test(`${why} is named on the field and in a summary, and nothing is sent`, async ({
      page,
      api,
    }) => {
      const sent = answerReset(api, { status: 202 });
      const forgot = new WebForgotPasswordPage(page);

      await forgot.open();
      await forgot.fill(typed);
      await forgot.submit();

      await expect(forgot.alertTitle).toHaveText('Check your email address');
      await expect(forgot.alert).toBeFocused();
      await expect(forgot.alertLinks).toHaveText([INVALID]);
      await expect(forgot.email).toHaveAttribute('aria-invalid', 'true');
      await expect(forgot.email).toHaveAttribute('aria-describedby', 'f-email-error');
      await expect(forgot.emailError).toHaveText(INVALID);
      await expect(forgot.email).toHaveValue(typed);
      await expect(forgot.heading).toHaveText('Reset your password');
      expect(sent()).toBe(0);
    });
  }

  test("the summary's link moves focus to the field", async ({ page }) => {
    const forgot = new WebForgotPasswordPage(page);

    await forgot.open();
    await forgot.fill('grace.thompson@gmail');
    await forgot.submit();
    await forgot.alertLinks.first().click();

    await expect(forgot.email).toBeFocused();
    expect(forgot.location()).toBe('/forgot-password');
  });

  test('editing the email clears its error, and a valid email is then sent', async ({
    page,
    api,
  }) => {
    const sent = answerReset(api, { status: 202 });
    const forgot = new WebForgotPasswordPage(page);

    await forgot.open();
    await forgot.fill('grace.thompson@gmail');
    await forgot.submit();
    await expect(forgot.email).toHaveAttribute('aria-invalid', 'true');
    await forgot.fill(EMAIL);

    await expect(forgot.email).not.toHaveAttribute('aria-invalid');
    await expect(forgot.alert).toHaveCount(0);
    await forgot.submit();
    await expect(forgot.heading).toHaveText('Check your email');
    expect(sent()).toBe(1);
  });

  test('a 400 refusal by the server marks the field as invalid', async ({ page, api }) => {
    answerReset(api, problem(400, 'validation_failed'));
    const forgot = new WebForgotPasswordPage(page);

    await forgot.open();
    await forgot.fill(EMAIL);
    await forgot.awaitAnswer(() => forgot.submit());

    await expect(forgot.alertTitle).toHaveText('Check your email address');
    await expect(forgot.email).toHaveAttribute('aria-invalid', 'true');
    await expect(forgot.emailError).toHaveText(INVALID);
    await expect(forgot.form).not.toContainText('Server');
    await expect(forgot.submitButton).toBeEnabled();
  });

  for (const [why, reply] of [
    ['a server error', problem(500, 'server_error')],
    ['an unavailable server', problem(503, 'server_error')],
    ['a refused antiforgery token', problem(400, 'antiforgery_failed')],
  ] as const) {
    test(`${why} shows "We couldn't send the email" and keeps the email`, async ({ page, api }) => {
      answerReset(api, reply);
      const forgot = new WebForgotPasswordPage(page);
      const serverError = new WebServerErrorPage(page);

      await forgot.open();
      await forgot.fill(EMAIL);
      await forgot.awaitAnswer(() => forgot.submit());

      await expect(forgot.alertTitle).toHaveText("We couldn't send the email");
      await expect(forgot.alertText).toHaveText(
        'Something went wrong on our side. Try again in a minute.',
      );
      await expect(forgot.alert).toBeFocused();
      await expect(forgot.email).toHaveValue(EMAIL);
      await expect(forgot.email).not.toHaveAttribute('aria-invalid');
      await expect(forgot.submitButton).toHaveText('Send reset link');
      await expect(forgot.submitButton).toBeEnabled();
      await expect(forgot.form).not.toContainText('Server');
      await expect(serverError.heading).toHaveCount(0);
      expect(forgot.location()).toBe('/forgot-password');
    });
  }

  // L2-034 AC3: the eleventh reset request from one address in an hour (mock `limited`, ADR 0014).
  test('too many requests from one network say so and keep the email', async ({ page, api }) => {
    const sent = answerReset(api, problem(429, 'rate_limited'));
    const forgot = new WebForgotPasswordPage(page);

    await forgot.open();
    await forgot.fill(EMAIL);
    await forgot.awaitAnswer(() => forgot.submit());

    await expect(forgot.alertTitle).toHaveText('Too many requests');
    await expect(forgot.alertText).toHaveText(
      'Too many reset links were asked for from this network in the last hour. Try again later.',
    );
    await expect(forgot.alert).toBeFocused();
    await expect(forgot.alertLinks).toHaveCount(0);
    await expect(forgot.email).toHaveValue(EMAIL);
    await expect(forgot.email).not.toHaveAttribute('aria-invalid');
    await expect(forgot.submitButton).toBeEnabled();
    await expect(forgot.form).not.toContainText('Server');
    expect(forgot.location()).toBe('/forgot-password');
    expect(sent()).toBe(1);
  });

  test('after a failure, trying again sends the link', async ({ page, api }) => {
    const sent = answerReset(api, problem(503, 'server_error'), { status: 202 });
    const forgot = new WebForgotPasswordPage(page);

    await forgot.open();
    await forgot.fill(EMAIL);
    await forgot.awaitAnswer(() => forgot.submit());
    await expect(forgot.alertTitle).toHaveText("We couldn't send the email");
    await forgot.submit();

    await expect(forgot.heading).toHaveText('Check your email');
    expect(sent()).toBe(2);
  });
});
