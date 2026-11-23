import { expect, STAFF_SIGNED_IN, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';
import { AdminStaffSignInPage } from '../page-objects/admin/staff-sign-in.page';

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    json: { status, code, title: 'A sentence from the server the screen never shows' },
  };
}

/** Answers the staff session as Dana's until `expire()` is called, then as expired. */
function sessionThatExpires(api: ApiHandlers): { expire: () => void; asked: () => number } {
  let expired = false;
  let asked = 0;
  api.on('GET', '/api/admin/session', () => {
    asked++;
    return expired ? problem(401, 'session_expired') : { json: STAFF_SIGNED_IN };
  });
  return { expire: () => (expired = true), asked: () => asked };
}

// L2-018 AC5 (ADR 0016): a staff session ends 30 minutes after its last request; the next request
// finds it expired and the admin app returns to Staff sign in, saying why.
test.describe('Admin app, idle session expiry', () => {
  test('moving to another area checks the session each time', async ({ page, api }) => {
    const session = sessionThatExpires(api);
    const shell = new AdminShell(page);

    await shell.open('/');
    await expect(shell.heading).toHaveText('Dashboard');
    const afterOpening = session.asked();
    await shell.navItem('Events').click();
    await expect(shell.heading).toHaveText('Events');
    await shell.navItem('Members').click();
    await expect(shell.heading).toHaveText('Members');

    expect(session.asked()).toBe(afterOpening + 2);
  });

  test('an expired session returns staff to Staff sign in with "Your session expired"', async ({
    page,
    api,
  }) => {
    const session = sessionThatExpires(api);
    const shell = new AdminShell(page);
    const signIn = new AdminStaffSignInPage(page);

    await shell.open('/');
    await expect(shell.heading).toHaveText('Dashboard');
    session.expire();
    await shell.navItem('Events').click();

    await expect(signIn.heading).toHaveText('Staff sign in');
    await expect(signIn.alertTitle).toHaveText('Your session expired');
    await expect(signIn.alertText).toHaveText(
      'You were signed out after 30 minutes without activity. Sign in again to carry on.',
    );
    await expect(signIn.alert).toBeFocused();
    expect(signIn.location()).toBe('/sign-in');
    expect(await signIn.title()).toBe('Staff sign in · Christian Fitness Admin');
    await expect(signIn.email).toHaveValue('');
    await expect(signIn.submitButton).toBeEnabled();
  });

  test('a reload of Staff sign in after the notice shows no notice', async ({ page, api }) => {
    const session = sessionThatExpires(api);
    const shell = new AdminShell(page);
    const signIn = new AdminStaffSignInPage(page);

    await shell.open('/');
    await expect(shell.heading).toHaveText('Dashboard');
    session.expire();
    await shell.navItem('Services').click();
    await expect(signIn.alertTitle).toHaveText('Your session expired');

    await page.reload();

    await expect(signIn.heading).toHaveText('Staff sign in');
    await expect(signIn.alert).toHaveCount(0);
  });

  // No session was ever open: nothing expired, so nothing is said.
  test('a first visit without a session opens Staff sign in with no notice', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/admin/session', () => problem(401, 'unauthenticated'));
    const shell = new AdminShell(page);
    const signIn = new AdminStaffSignInPage(page);

    await shell.open('/events');

    await expect(signIn.heading).toHaveText('Staff sign in');
    expect(signIn.location()).toBe('/sign-in');
    await expect(signIn.alert).toHaveCount(0);
  });
});
