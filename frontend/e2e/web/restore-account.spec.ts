import { answerGoogleFinish } from '../fixtures/google';
import {
  expect,
  SIGNED_IN,
  test,
  XSRF_TOKEN,
  type ApiHandlers,
  type ApiReply,
} from '../fixtures/test';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebSignInPage } from '../page-objects/web/sign-in.page';

const EMAIL = 'grace.thompson@gmail.com';
const PASSWORD = 'abundantlife';
const TITLE = 'Your account is set to be deleted on May 10, 2026.';
const TEXT =
  "Restore it to sign in again. Places you held at events went back to other members and aren't restored.";

/**
 * The API's answer to signing in to an account that is deleting (backend RestoreAccountTests):
 * 409 `account_deleting` with the account and when it is erased, after 20:00 in Toronto on May 10.
 */
const DELETING: ApiReply = {
  status: 409,
  headers: { 'content-type': 'application/problem+json' },
  json: {
    type: 'about:blank',
    title: 'Server words',
    status: 409,
    code: 'account_deleting',
    account: EMAIL,
    erasesAt: '2026-05-11T00:30:00Z',
  },
};

interface SentRestore {
  body: unknown;
  token: string | undefined;
}

/** Answers `POST path` with `reply`, after `held` when given; answers each body and token sent. */
function answerRestore(
  api: ApiHandlers,
  path: string,
  reply: ApiReply,
  held?: Promise<void>,
): SentRestore[] {
  const sent: SentRestore[] = [];
  api.on('POST', path, async (request) => {
    sent.push({ body: request.postDataJSON(), token: request.headers()['x-xsrf-token'] });
    await held;
    return reply;
  });
  return sent;
}

// L2-066 AC6 (journey 36; mock sign-in/deleting): signing in to an account that is deleting shows
// the notice with the day it is erased in place of the form; "Restore my account" restores it and
// signs the member in, by password or by Google, and "Keep it deleted" goes to the front page.
test.describe('Member app, Sign in: restore a deleting account', () => {
  test(
    'signing in by password shows the notice, and "Restore my account" restores it and signs in',
    { tag: '@critical' },
    async ({ page, api }) => {
      api.on('POST', '/api/session', () => DELETING);
      const restored = answerRestore(api, '/api/account/restore', { json: SIGNED_IN });
      const signIn = new WebSignInPage(page);
      const home = new WebHomePage(page);

      await signIn.open();
      await signIn.fill(EMAIL, PASSWORD);
      await signIn.submitAndAwaitAnswer();

      await expect(signIn.ssoNotice).toHaveAttribute('role', 'alert');
      await expect(signIn.ssoNotice).toBeFocused();
      await expect(signIn.ssoNoticeTitle).toHaveText(TITLE);
      await expect(signIn.ssoNoticeAccount).toHaveText(EMAIL);
      await expect(signIn.ssoNoticeText).toHaveText(TEXT);
      // The account is named as text, with no Google mark: it was a password sign-in.
      await expect(signIn.ssoNoticeAccount.locator('svg')).toHaveCount(0);
      await expect(signIn.keepItDeleted).toHaveAttribute('href', '/');
      // The notice stands in place of Google and the form, as in the mock.
      await expect(signIn.googleButton).toHaveCount(0);
      await expect(signIn.divider).toHaveCount(0);
      await expect(signIn.email).toHaveCount(0);
      await expect(signIn.alert).toHaveCount(0);
      await expect(signIn.joinLink).toBeVisible();

      await signIn.restore.click();

      await expect(home.greeting).toHaveText('Welcome, Grace');
      expect(home.location()).toBe('/home');
      expect(restored).toEqual([{ body: { email: EMAIL, password: PASSWORD }, token: XSRF_TOKEN }]);
    },
  );

  test('back from Google, the notice names the account, and Restore restores it by Google', async ({
    page,
    api,
  }) => {
    answerGoogleFinish(api, DELETING);
    const restored = answerRestore(api, '/api/account/restore/google', { json: SIGNED_IN });
    const signIn = new WebSignInPage(page);

    await page.goto('/sign-in?google=returned&returnUrl=%2Fevents');

    await expect(signIn.ssoNoticeTitle).toHaveText(TITLE);
    await expect(signIn.ssoNoticeAccount).toHaveText(EMAIL);
    await signIn.restore.click();

    await page.waitForURL((url) => url.pathname === '/events');
    expect(restored).toEqual([{ body: {}, token: XSRF_TOKEN }]);
  });

  test('while restoring, Restore is busy and disabled, and a failure keeps the notice', async ({
    page,
    api,
  }) => {
    api.on('POST', '/api/session', () => DELETING);
    let answer!: () => void;
    const restored = answerRestore(
      api,
      '/api/account/restore',
      {
        status: 500,
        headers: { 'content-type': 'application/problem+json' },
        json: { status: 500, code: 'error', detail: 'Server detail' },
      },
      new Promise<void>((resolve) => (answer = resolve)),
    );
    const signIn = new WebSignInPage(page);

    await signIn.open();
    await signIn.fill(EMAIL, PASSWORD);
    await signIn.submitAndAwaitAnswer();
    await signIn.restore.click();

    await expect(signIn.restore).toBeDisabled();
    await expect(signIn.restore).toHaveAttribute('aria-busy', 'true');
    answer();

    await expect(signIn.alertTitle).toHaveText("We couldn't sign you in");
    await expect(signIn.alertText).toHaveText(
      'Something went wrong on our side. Try again in a moment.',
    );
    await expect(signIn.ssoNoticeTitle).toHaveText(TITLE);
    await expect(signIn.restore).toBeEnabled();
    await expect(signIn.form).not.toContainText('Server');
    expect(signIn.location()).toBe('/sign-in');
    expect(restored).toHaveLength(1);
  });

  test('"Keep it deleted" goes to the front page and restores nothing', async ({ page, api }) => {
    // Refused, the visitor has no session, so the front page stays the front page.
    api.on('GET', '/api/session', () => ({
      status: 401,
      headers: { 'content-type': 'application/problem+json' },
      json: { status: 401, code: 'unauthenticated' },
    }));
    api.on('POST', '/api/session', () => DELETING);
    const restored = answerRestore(api, '/api/account/restore', { json: SIGNED_IN });
    const signIn = new WebSignInPage(page);

    await signIn.open();
    await signIn.fill(EMAIL, PASSWORD);
    await signIn.submitAndAwaitAnswer();
    await signIn.keepItDeleted.click();

    await expect.poll(() => signIn.location()).toBe('/');
    expect(restored).toEqual([]);
  });
});
