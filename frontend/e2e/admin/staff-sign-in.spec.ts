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

const EMAIL = 'dana@christianfitness.ca';
const PASSWORD = 'abundantlife';

const NO_STAFF_SESSION: ApiReply = {
  status: 401,
  headers: { 'content-type': 'application/problem+json' },
  json: { status: 401, code: 'unauthenticated' },
};

interface SentSignIn {
  body: unknown;
  token: string | undefined;
}

/**
 * Starts signed out; sign-in answers Dana's staff session and from then on the session is hers,
 * as on the server. Records each body and antiforgery header sent.
 */
function answerSignIn(api: ApiHandlers): SentSignIn[] {
  const sent: SentSignIn[] = [];
  api.on('GET', '/api/admin/session', () => NO_STAFF_SESSION);
  api.on('POST', '/api/admin/session', (request) => {
    sent.push({ body: request.postDataJSON(), token: request.headers()['x-xsrf-token'] });
    api.on('GET', '/api/admin/session', () => ({ json: STAFF_SIGNED_IN }));
    return { json: STAFF_SIGNED_IN };
  });
  return sent;
}

// L2-018 AC1, L2-021 AC1, L2-030 AC3: staff sign in, with the antiforgery token, and land on the
// Dashboard in the admin layout. The cookie itself is the API's (backend StaffSignInTests).
test.describe('Admin app, staff sign in', () => {
  test('staff sign in with their work email and password and land on the Dashboard', async ({
    page,
    api,
  }) => {
    const sent = answerSignIn(api);
    const signIn = new AdminStaffSignInPage(page);
    const shell = new AdminShell(page);

    await signIn.open();
    await expect.poll(() => signIn.title()).toBe('Staff sign in · Christian Fitness Admin');
    await signIn.fill(EMAIL, PASSWORD);
    await signIn.submit();

    await expect(shell.heading).toHaveText('Dashboard');
    expect(shell.location()).toBe('/');
    await expect.poll(() => shell.title()).toBe('Dashboard · Christian Fitness Admin');
    await expect(shell.navItems).toHaveText(['Dashboard', 'Events', 'Services', 'Members']);
    await expect(shell.currentItem).toHaveText('Dashboard');
    await expect(shell.userName).toHaveText('Dana Reyes');
    await expect(shell.userRole).toHaveText('Admin');
    await expect(shell.userInitials).toHaveText('DR');
    expect(sent).toEqual([{ body: { email: EMAIL, password: PASSWORD }, token: XSRF_TOKEN }]);
  });

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
    // "Two-step verification required" waits until slice 9.2 makes it true (ADR 0011).
    await expect(signIn.note).toHaveCount(0);
  });

  test('while signing in, the button reads "Signing in…" and is disabled', async ({
    page,
    api,
  }) => {
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    api.on('POST', '/api/admin/session', async () => {
      await answered;
      return { json: STAFF_SIGNED_IN };
    });
    const signIn = new AdminStaffSignInPage(page);
    const shell = new AdminShell(page);

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

    await expect(shell.heading).toHaveText('Dashboard');
  });

  test('staff sign in with the keyboard alone', async ({ page, api }) => {
    const sent = answerSignIn(api);
    const signIn = new AdminStaffSignInPage(page);
    const shell = new AdminShell(page);

    await signIn.open();
    await expect(signIn.heading).toHaveText('Staff sign in');
    await signIn.signInByKeyboard(EMAIL, PASSWORD);

    await expect(shell.heading).toHaveText('Dashboard');
    expect(sent.map((s) => s.body)).toEqual([{ email: EMAIL, password: PASSWORD }]);
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
