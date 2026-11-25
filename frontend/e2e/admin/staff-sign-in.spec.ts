import type { Request } from '@playwright/test';
import {
  expect,
  STAFF_SIGNED_IN,
  test,
  XSRF_TOKEN,
  type ApiHandlers,
  type ApiReply,
} from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';
import { AdminStaffSignInPage } from '../page-objects/admin/staff-sign-in.page';
import { AdminTwoStepPage } from '../page-objects/admin/two-step.page';

const EMAIL = 'dana@christianfitness.ca';
const PASSWORD = 'abundantlife';
const CODE = '481 920';

const NO_STAFF_SESSION: ApiReply = {
  status: 401,
  headers: { 'content-type': 'application/problem+json' },
  json: { status: 401, code: 'unauthenticated' },
};

interface Sent {
  path: string;
  body: unknown;
  token: string | undefined;
}

/**
 * Starts signed out; the password step answers 202 with no session, as the API does with its step
 * cookie (ADR 0013), and the code answers Dana's staff session, which from then on is hers, as on
 * the server. Records each path, body and antiforgery header sent.
 */
function answerSignIn(api: ApiHandlers): Sent[] {
  const sent: Sent[] = [];
  const record = (path: string) => (request: Request) =>
    sent.push({ path, body: request.postDataJSON(), token: request.headers()['x-xsrf-token'] });
  api.on('GET', '/api/admin/session', () => NO_STAFF_SESSION);
  api.on('POST', '/api/admin/session', (request) => {
    record('/api/admin/session')(request);
    return { status: 202 };
  });
  api.on('POST', '/api/admin/session/two-step', (request) => {
    record('/api/admin/session/two-step')(request);
    api.on('GET', '/api/admin/session', () => ({ json: STAFF_SIGNED_IN }));
    return { json: STAFF_SIGNED_IN };
  });
  return sent;
}

// L2-018 AC1, L2-046 AC1, AC2, L2-021 AC1, L2-030 AC3: staff sign in with their password, then the
// code from their authenticator app, with the antiforgery token, and land on the Dashboard in the
// admin layout. The cookies themselves are the API's (backend TwoStepTests).
test.describe('Admin app, staff sign in', () => {
  test(
    'staff sign in with their password and their code and land on the Dashboard',
    { tag: '@critical' },
    async ({ page, api }) => {
      const sent = answerSignIn(api);
      const signIn = new AdminStaffSignInPage(page);
      const twoStep = new AdminTwoStepPage(page);
      const shell = new AdminShell(page);

      await signIn.open();
      await expect.poll(() => signIn.title()).toBe('Staff sign in · Christian Fitness Admin');
      await signIn.fill(EMAIL, PASSWORD);
      await signIn.submit();

      await expect(twoStep.heading).toHaveText('Enter your code');
      expect(twoStep.location()).toBe('/sign-in/verify');
      await expect.poll(() => twoStep.title()).toBe('Enter your code · Christian Fitness Admin');
      await expect(shell.nav).toHaveCount(0);
      await twoStep.fill(CODE);
      await twoStep.submit();

      await expect(shell.heading).toHaveText('Dashboard');
      expect(shell.location()).toBe('/');
      await expect.poll(() => shell.title()).toBe('Dashboard · Christian Fitness Admin');
      await expect(shell.navItems).toHaveText([
        'Dashboard',
        'Events',
        'Event series',
        'Listings',
        'Services',
        'Members',
      ]);
      await expect(shell.currentItem).toHaveText('Dashboard');
      await expect(shell.userName).toHaveText('Dana Reyes');
      await expect(shell.userRole).toHaveText('Admin');
      await expect(shell.userInitials).toHaveText('DR');
      expect(sent).toEqual([
        {
          path: '/api/admin/session',
          body: { email: EMAIL, password: PASSWORD },
          token: XSRF_TOKEN,
        },
        { path: '/api/admin/session/two-step', body: { code: CODE }, token: XSRF_TOKEN },
      ]);
    },
  );

  test('shows the form the mock draws', async ({ page }) => {
    const signIn = new AdminStaffSignInPage(page);

    await signIn.open();

    await expect(signIn.brandName).toHaveText('Christian Fitness');
    await expect(signIn.heading).toHaveText('Staff sign in');
    await expect(signIn.lead).toHaveText('For the Christian Fitness team only.');
    await expect(signIn.main).toHaveCount(1);
    await expect(signIn.inputs).toHaveCount(2);
    await expect(signIn.email).toHaveAttribute('type', 'email');
    await expect(signIn.email).toHaveAttribute('autocomplete', 'username');
    await expect(signIn.password).toHaveAttribute('type', 'password');
    await expect(signIn.password).toHaveAttribute('autocomplete', 'current-password');
    await expect(signIn.submitButton).toHaveText('Sign in');
    await expect(signIn.alert).toHaveCount(0);
    // Every sign-in asks for a code now (L2-046, ADR 0013).
    await expect(signIn.note).toHaveText('Two-step verification required');
  });

  test('while signing in, the button reads "Signing in…" and is disabled', async ({
    page,
    api,
  }) => {
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    api.on('POST', '/api/admin/session', async () => {
      await answered;
      return { status: 202 };
    });
    const signIn = new AdminStaffSignInPage(page);
    const twoStep = new AdminTwoStepPage(page);

    await signIn.open();
    await signIn.fill(EMAIL, PASSWORD);
    await signIn.submit();

    await expect(signIn.submitButton).toHaveText('Signing in…');
    await expect(signIn.submitButton).toBeDisabled();
    await expect(signIn.submitButton).toHaveAttribute('aria-busy', 'true');
    for (const input of await signIn.inputs.all()) {
      await expect(input).toHaveAttribute('readonly', '');
    }
    await expect(signIn.email).toHaveValue(EMAIL);

    answer();

    await expect(twoStep.heading).toHaveText('Enter your code');
  });

  test('staff sign in with the keyboard alone', async ({ page, api }) => {
    const sent = answerSignIn(api);
    const signIn = new AdminStaffSignInPage(page);
    const twoStep = new AdminTwoStepPage(page);
    const shell = new AdminShell(page);

    await signIn.open();
    await expect(signIn.heading).toHaveText('Staff sign in');
    await signIn.signInByKeyboard(EMAIL, PASSWORD);
    await expect(twoStep.heading).toHaveText('Enter your code');
    await twoStep.verifyByKeyboard('481920');

    await expect(shell.heading).toHaveText('Dashboard');
    expect(sent.map((s) => s.body)).toEqual([
      { email: EMAIL, password: PASSWORD },
      { code: '481920' },
    ]);
  });
});

// L2-018 AC4 in the app: a staff route opens only with a staff session (ADR 0011).
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
});
