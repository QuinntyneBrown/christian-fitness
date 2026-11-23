import type { Request } from '@playwright/test';
import { expect, test, XSRF_TOKEN, type ApiHandlers } from '../fixtures/test';
import { WebResetPasswordPage } from '../page-objects/web/reset-password.page';
import { WebSignInPage } from '../page-objects/web/sign-in.page';

const TOKEN = 'k3Jx9QwP2mV8sT4yLb7NcR1dF6hZ0aE5gU-iO_pWq2X';
const EMAIL = 'grace.thompson@gmail.com';
const PASSWORD = 'graceandgrit';

interface SentRequest {
  path: string;
  body: unknown;
  xsrf: string | undefined;
}

/** Answers the link's check with Grace's email and the save with 204; records every request. */
function answerReset(api: ApiHandlers, email = EMAIL): SentRequest[] {
  const sent: SentRequest[] = [];
  const record = (request: Request): void => {
    const url = new URL(request.url());
    sent.push({
      path: url.pathname + url.search,
      body: request.postDataJSON(),
      xsrf: request.headers()['x-xsrf-token'],
    });
  };
  api.on('POST', '/api/account/password-reset/check', (request) => {
    record(request);
    return { json: { email } };
  });
  api.on('POST', '/api/account/password-reset/complete', (request) => {
    record(request);
    return { status: 204 };
  });
  return sent;
}

// L2-045 AC1, AC2 and AC3: the emailed link opens the Reset password screen, which checks the link,
// names the account and saves a new password, after which the member signs in again. That the
// password changed, the link was spent and every session ended is the API's to prove (backend
// PasswordResetCompleteTests); the screen sends the token only in a body.
test.describe('Member app, choose a new password', () => {
  test('the emailed link opens the form the mock draws, naming the account', async ({
    page,
    api,
  }) => {
    answerReset(api);
    const reset = new WebResetPasswordPage(page);

    await reset.open(TOKEN);

    await expect(reset.heading).toHaveText('Choose a new password');
    await expect(reset.lead).toHaveText(`For ${EMAIL}.`);
    await expect(reset.main).toHaveCount(1);
    await expect(reset.inputs).toHaveCount(2);
    await expect(reset.password).toHaveAttribute('type', 'password');
    await expect(reset.password).toHaveAttribute('autocomplete', 'new-password');
    await expect(reset.password).toHaveAttribute('aria-describedby', 'f-password-hint');
    await expect(reset.passwordHint).toHaveText('At least 8 characters');
    await expect(reset.confirm).toHaveAttribute('type', 'password');
    await expect(reset.confirm).toHaveAttribute('autocomplete', 'new-password');
    await expect(reset.submitButton).toHaveText('Save password');
    await expect(reset.alert).toHaveCount(0);
    await expect.poll(() => reset.title()).toBe('Reset password · Christian Fitness');
  });

  test('the token leaves the address bar and travels only in a request body', async ({
    page,
    api,
  }) => {
    const sent = answerReset(api);
    const reset = new WebResetPasswordPage(page);

    await reset.open(TOKEN);
    await expect(reset.lead).toHaveText(`For ${EMAIL}.`);

    expect(reset.location()).toBe('/reset-password');
    expect(sent).toEqual([
      { path: '/api/account/password-reset/check', body: { token: TOKEN }, xsrf: XSRF_TOKEN },
    ]);
  });

  test('while the link is checked, the screen says so', async ({ page, api }) => {
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    api.on('POST', '/api/account/password-reset/check', async () => {
      await answered;
      return { json: { email: EMAIL } };
    });
    const reset = new WebResetPasswordPage(page);

    await reset.open(TOKEN);

    await expect(reset.heading).toHaveText('Choose a new password');
    await expect(reset.lead).toHaveText('Checking your link…');
    await expect(reset.form).toHaveAttribute('aria-busy', 'true');
    await expect(reset.inputs).toHaveCount(0);

    answer();

    await expect(reset.lead).toHaveText(`For ${EMAIL}.`);
    await expect(reset.form).not.toHaveAttribute('aria-busy');
  });

  test('a member saves a new password and is told to sign in with it', async ({ page, api }) => {
    const sent = answerReset(api);
    const reset = new WebResetPasswordPage(page);

    await reset.open(TOKEN);
    await reset.fill(PASSWORD, PASSWORD);
    await reset.submit();

    await expect(reset.heading).toHaveText('Password saved');
    await expect(reset.heading).toBeFocused();
    await expect(reset.lead).toHaveText(
      "You can sign in with your new password now. We've signed you out on your other devices.",
    );
    await expect(reset.actionLink).toHaveText('Sign in');
    await expect(reset.actionLink).toHaveAttribute('href', '/sign-in');
    await expect(reset.alt).toHaveCount(0);
    await expect(reset.inputs).toHaveCount(0);
    await expect(page.locator('form')).toHaveCount(0);
    expect(sent.slice(1)).toEqual([
      {
        path: '/api/account/password-reset/complete',
        body: { token: TOKEN, password: PASSWORD },
        xsrf: XSRF_TOKEN,
      },
    ]);
  });

  test('the email is named as text', async ({ page, api }) => {
    const email = '<b>grace</b>@example.org';
    answerReset(api, email);
    const reset = new WebResetPasswordPage(page);

    await reset.open(TOKEN);

    await expect(reset.lead).toHaveText(`For ${email}.`);
    await expect(reset.lead.locator('b')).toHaveCount(0);
  });

  test('while saving, the button reads "Saving…" and is disabled', async ({ page, api }) => {
    answerReset(api);
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    api.on('POST', '/api/account/password-reset/complete', async () => {
      await answered;
      return { status: 204 };
    });
    const reset = new WebResetPasswordPage(page);

    await reset.open(TOKEN);
    await reset.fill(PASSWORD, PASSWORD);
    await reset.submit();

    await expect(reset.submitButton).toHaveText('Saving…');
    await expect(reset.submitButton).toBeDisabled();
    await expect(reset.submitButton).toHaveAttribute('aria-busy', 'true');
    await expect(reset.password).toHaveAttribute('readonly', '');
    await expect(reset.confirm).toHaveAttribute('readonly', '');

    answer();

    await expect(reset.heading).toHaveText('Password saved');
  });

  test('"Sign in" opens the sign-in screen', async ({ page, api }) => {
    answerReset(api);
    const reset = new WebResetPasswordPage(page);
    const signIn = new WebSignInPage(page);

    await reset.open(TOKEN);
    await reset.fill(PASSWORD, PASSWORD);
    await reset.submit();
    await reset.actionLink.click();

    await expect(signIn.heading).toHaveText('Welcome back');
    expect(signIn.location()).toBe('/sign-in');
  });

  test('a member saves a new password with the keyboard alone', async ({ page, api }) => {
    const sent = answerReset(api);
    const reset = new WebResetPasswordPage(page);

    await reset.open(TOKEN);
    await expect(reset.lead).toHaveText(`For ${EMAIL}.`);
    await reset.saveByKeyboard(PASSWORD);

    await expect(reset.heading).toHaveText('Password saved');
    await page.keyboard.press('Tab');
    await expect(reset.actionLink).toBeFocused();
    expect(sent.map((s) => s.path)).toEqual([
      '/api/account/password-reset/check',
      '/api/account/password-reset/complete',
    ]);
  });
});
