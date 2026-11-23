import { expect, test, XSRF_TOKEN, type ApiHandlers } from '../fixtures/test';
import { WebForgotPasswordPage } from '../page-objects/web/forgot-password.page';
import { WebSignInPage } from '../page-objects/web/sign-in.page';

const EMAIL = 'grace.thompson@gmail.com';

interface SentRequest {
  body: unknown;
  token: string | undefined;
}

/** Answers each reset request 202 with no body and records each body and antiforgery header. */
function answerReset(api: ApiHandlers): SentRequest[] {
  const sent: SentRequest[] = [];
  api.on('POST', '/api/account/password-reset', (request) => {
    sent.push({ body: request.postDataJSON(), token: request.headers()['x-xsrf-token'] });
    return { status: 202 };
  });
  return sent;
}

// L2-044 AC1, AC2, AC4 and AC7: from Sign in, a member asks for a reset link and is told to check
// their email. Whether the email has an account is the API's to keep (backend
// PasswordResetDisclosureTests); the screen says the same either way.
test.describe('Member app, request a reset link', () => {
  test('"Forgot your password?" on Sign in opens the Forgot password screen', async ({ page }) => {
    const signIn = new WebSignInPage(page);
    const forgot = new WebForgotPasswordPage(page);

    await signIn.open();
    await expect(signIn.forgotLink).toHaveAttribute('href', '/forgot-password');
    await signIn.forgotLink.click();

    await expect(forgot.heading).toHaveText('Reset your password');
    expect(forgot.location()).toBe('/forgot-password');
    await expect.poll(() => forgot.title()).toBe('Forgot password · Christian Fitness');
  });

  test('shows the form the mock draws', async ({ page }) => {
    const forgot = new WebForgotPasswordPage(page);

    await forgot.open();

    await expect(forgot.heading).toHaveText('Reset your password');
    await expect(forgot.lead).toHaveText(
      "Enter the email you joined with and we'll send a link to choose a new one.",
    );
    await expect(forgot.main).toHaveCount(1);
    await expect(forgot.inputs).toHaveCount(1);
    await expect(forgot.email).toHaveAttribute('type', 'email');
    await expect(forgot.email).toHaveAttribute('autocomplete', 'email');
    await expect(forgot.submitButton).toHaveText('Send reset link');
    await expect(forgot.alt).toHaveText('Back to sign in');
    await expect(forgot.backLink).toHaveAttribute('href', '/sign-in');
    await expect(forgot.alert).toHaveCount(0);
  });

  test('a member asks for a link and is told to check their email', async ({ page, api }) => {
    const sent = answerReset(api);
    const forgot = new WebForgotPasswordPage(page);

    await forgot.open();
    await forgot.fill(EMAIL);
    await forgot.submit();

    await expect(forgot.heading).toHaveText('Check your email');
    await expect(forgot.heading).toBeFocused();
    await expect(forgot.lead).toHaveText(
      `If an account exists for ${EMAIL}, a reset link is on its way. It expires in 30 minutes.`,
    );
    await expect(forgot.leadEmail).toHaveText(EMAIL);
    await expect(forgot.backButton).toHaveText('Back to sign in');
    await expect(forgot.backButton).toHaveAttribute('href', '/sign-in');
    await expect(forgot.alt).toHaveText("Didn't get it? Check your spam folder or send it again.");
    await expect(forgot.inputs).toHaveCount(0);
    await expect(page.locator('form')).toHaveCount(0);
    expect(forgot.location()).toBe('/forgot-password');
    expect(sent).toEqual([{ body: { email: EMAIL }, token: XSRF_TOKEN }]);
  });

  test('the email is named as typed, as text', async ({ page, api }) => {
    answerReset(api);
    const forgot = new WebForgotPasswordPage(page);
    const typed = '<b>grace</b>@example.org';

    await forgot.open();
    await forgot.fill(typed);
    await forgot.submit();

    await expect(forgot.leadEmail).toHaveText(typed);
    await expect(forgot.leadEmail.locator('b')).toHaveCount(0);
  });

  test('while sending, the button reads "Sending…" and is disabled', async ({ page, api }) => {
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    api.on('POST', '/api/account/password-reset', async () => {
      await answered;
      return { status: 202 };
    });
    const forgot = new WebForgotPasswordPage(page);

    await forgot.open();
    await forgot.fill(EMAIL);
    await forgot.submit();

    await expect(forgot.submitButton).toHaveText('Sending…');
    await expect(forgot.submitButton).toBeDisabled();
    await expect(forgot.submitButton).toHaveAttribute('aria-busy', 'true');
    await expect(forgot.email).toHaveAttribute('readonly', '');
    await expect(forgot.email).toHaveValue(EMAIL);

    answer();

    await expect(forgot.heading).toHaveText('Check your email');
  });

  test('"send it again" sends the same email again', async ({ page, api }) => {
    const sent = answerReset(api);
    const forgot = new WebForgotPasswordPage(page);

    await forgot.open();
    await forgot.fill(EMAIL);
    await forgot.submit();
    await expect(forgot.heading).toHaveText('Check your email');
    await forgot.awaitAnswer(() => forgot.sendAgain.click());

    await expect(forgot.heading).toHaveText('Check your email');
    await expect(forgot.leadEmail).toHaveText(EMAIL);
    expect(sent.map((s) => s.body)).toEqual([{ email: EMAIL }, { email: EMAIL }]);
  });

  test('"Back to sign in" opens the sign-in screen', async ({ page, api }) => {
    answerReset(api);
    const forgot = new WebForgotPasswordPage(page);
    const signIn = new WebSignInPage(page);

    await forgot.open();
    await forgot.fill(EMAIL);
    await forgot.submit();
    await forgot.backButton.click();

    await expect(signIn.heading).toHaveText('Welcome back');
    expect(signIn.location()).toBe('/sign-in');
  });

  test('a member asks for a link with the keyboard alone', async ({ page, api }) => {
    const sent = answerReset(api);
    const forgot = new WebForgotPasswordPage(page);

    await forgot.open();
    await expect(forgot.heading).toHaveText('Reset your password');
    await forgot.requestByKeyboard(EMAIL);
    await expect(forgot.heading).toHaveText('Check your email');
    await page.keyboard.press('Tab');
    await expect(forgot.backButton).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(forgot.sendAgain).toBeFocused();
    await forgot.awaitAnswer(() => page.keyboard.press('Enter'));

    await expect(forgot.heading).toHaveText('Check your email');
    expect(sent.map((s) => s.body)).toEqual([{ email: EMAIL }, { email: EMAIL }]);
  });
});
