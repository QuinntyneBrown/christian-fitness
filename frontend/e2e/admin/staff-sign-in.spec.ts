import type { Request } from '@playwright/test';
import { answerGoogleStart, FAKE_GOOGLE_PATH } from '../fixtures/google';
import {
  expect,
  STAFF_SIGNED_IN,
  test,
  XSRF_TOKEN,
  type ApiHandlers,
  type ApiReply,
} from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';
import { AdminNotFoundPage } from '../page-objects/admin/not-found.page';
import { AdminStaffSignInPage } from '../page-objects/admin/staff-sign-in.page';

const START_PATH = '/api/admin/session/google/start';
const COMPLETE_PATH = '/api/admin/session/google';

const NO_STAFF_SESSION: ApiReply = {
  status: 401,
  headers: { 'content-type': 'application/problem+json' },
  json: { status: 401, code: 'unauthenticated' },
};

interface Sent {
  body: unknown;
  token: string | undefined;
}

/**
 * Starts signed out; finishing Google sign-in answers Dana's staff session, which from then on is
 * hers, as on the server. Records each finish's body and antiforgery header.
 */
function answerComplete(api: ApiHandlers): Sent[] {
  const sent: Sent[] = [];
  api.on('GET', '/api/admin/session', () => NO_STAFF_SESSION);
  api.on('POST', COMPLETE_PATH, (request: Request) => {
    sent.push({ body: request.postDataJSON(), token: request.headers()['x-xsrf-token'] });
    api.on('GET', '/api/admin/session', () => ({ json: STAFF_SIGNED_IN }));
    return { json: STAFF_SIGNED_IN };
  });
  return sent;
}

// L2-018 AC1, AC2, L2-049 AC1, AC9, L2-021 AC1, L2-030 AC3: staff press "Sign in with Google", the
// page leaves for Google in a full-page redirect, and on their return the API finishes the sign-in
// and they land on the Dashboard. The domain, role and cookie checks are the API's (backend
// StaffGoogleSignInTests); Google itself is faked at the address the start answers.
test.describe('Admin app, staff sign in with Google', () => {
  test(
    'staff sign in with Google and land on the Dashboard',
    { tag: '@critical' },
    async ({ page, api }) => {
      const starts = answerGoogleStart(api, undefined, START_PATH);
      const finishes = answerComplete(api);
      const signIn = new AdminStaffSignInPage(page);
      const shell = new AdminShell(page);

      await signIn.open();
      await expect.poll(() => signIn.title()).toBe('Staff sign in · Christian Fitness Admin');
      await signIn.chooseGoogle();

      await page.waitForURL((url) => url.pathname === FAKE_GOOGLE_PATH);
      expect(starts).toEqual([{ selectAccount: false }]);

      await signIn.returnFromGoogle('returned');

      await expect(shell.heading).toHaveText('Dashboard');
      expect(shell.location()).toBe('/');
      await expect.poll(() => shell.title()).toBe('Dashboard · Christian Fitness Admin');
      await expect(shell.userName).toHaveText('Dana Reyes');
      await expect(shell.userRole).toHaveText('Admin');
      expect(finishes).toEqual([{ body: {}, token: XSRF_TOKEN }]);
    },
  );

  test('shows the one action the mock draws, and no field', async ({ page }) => {
    const signIn = new AdminStaffSignInPage(page);

    await signIn.open();

    await expect(signIn.brandName).toHaveText('Christian Fitness');
    await expect(signIn.heading).toHaveText('Staff sign in');
    await expect(signIn.lead).toHaveText('Use your @christian.fitness Google Workspace account.');
    await expect(signIn.leadDomain).toHaveText('@christian.fitness');
    await expect(signIn.main).toHaveCount(1);
    await expect(signIn.inputs).toHaveCount(0);
    await expect(signIn.buttons).toHaveText(['Sign in with Google']);
    await expect(signIn.googleButton).toBeEnabled();
    await expect(signIn.alert).toHaveCount(0);
    await expect(signIn.notice).toHaveCount(0);
    await expect(signIn.note).toHaveText(
      'Passwords and two-step verification are managed by Google Workspace. Leaving the team ends console access the same day.',
    );
  });

  test('while Google opens, the button reads "Opening Google…" and is disabled', async ({
    page,
    api,
  }) => {
    let answer!: () => void;
    const held = new Promise<void>((resolve) => (answer = resolve));
    answerGoogleStart(api, held, START_PATH);
    const signIn = new AdminStaffSignInPage(page);

    await signIn.open();
    await signIn.chooseGoogle();

    await expect(signIn.googleButton).toHaveText('Opening Google…');
    await expect(signIn.googleButton).toBeDisabled();
    await expect(signIn.googleButton).toHaveAttribute('aria-busy', 'true');

    answer();
    await page.waitForURL((url) => url.pathname === FAKE_GOOGLE_PATH);
  });

  test('staff sign in with the keyboard alone', async ({ page, api }) => {
    answerGoogleStart(api, undefined, START_PATH);
    answerComplete(api);
    const signIn = new AdminStaffSignInPage(page);
    const shell = new AdminShell(page);

    await signIn.open();
    await expect(signIn.heading).toHaveText('Staff sign in');
    await signIn.chooseGoogleByKeyboard();
    await page.waitForURL((url) => url.pathname === FAKE_GOOGLE_PATH);
    await signIn.returnFromGoogle('returned');

    await expect(shell.heading).toHaveText('Dashboard');
  });

  test('a cancel at Google returns to Staff sign in with no message', async ({ page, api }) => {
    let finished = 0;
    api.on('POST', COMPLETE_PATH, () => {
      finished++;
      return { json: STAFF_SIGNED_IN };
    });
    const signIn = new AdminStaffSignInPage(page);

    await signIn.open();

    await expect(signIn.googleButton).toHaveText('Sign in with Google');
    await expect(signIn.alert).toHaveCount(0);
    await expect(signIn.notice).toHaveCount(0);
    expect(finished).toBe(0);
  });
});

// L2-018 AC5 in the app: a staff route opens only with a staff session (ADR 0011).
test.describe('Admin app, staff routes need a staff session', () => {
  for (const path of ['/', '/members']) {
    test(`a visitor opening ${path} is sent to Staff sign in`, async ({ page, api }) => {
      api.on('GET', '/api/admin/session', () => NO_STAFF_SESSION);
      const signIn = new AdminStaffSignInPage(page);
      const shell = new AdminShell(page);

      await shell.open(path);

      await expect(signIn.heading).toHaveText('Staff sign in');
      expect(signIn.location()).toBe('/sign-in');
      await expect(shell.nav).toHaveCount(0);
    });
  }

  // L2-046 AC1: no code screen remains.
  test('/sign-in/verify is the not-found page', async ({ page }) => {
    const notFound = new AdminNotFoundPage(page);

    await notFound.open('/sign-in/verify');

    await expect(notFound.heading).toHaveText('Page not found');
    await expect.poll(() => notFound.title()).toBe('Page not found · Christian Fitness Admin');
  });
});
