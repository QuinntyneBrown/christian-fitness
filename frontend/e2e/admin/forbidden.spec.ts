import { expect, STAFF_SIGNED_IN, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';
import { AdminForbiddenPage } from '../page-objects/admin/forbidden.page';
import { AdminStaffSignInPage } from '../page-objects/admin/staff-sign-in.page';

const LEAD =
  "The admin console is for the Christian Fitness team, and this account doesn't have staff access right now.";
const NOTE = 'On the team? Ask a community director to give you staff access.';

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    json: { status, code, title: 'A sentence from the server the screen never shows' },
  };
}

/** The staff role was taken away: the session answers 403 `not_staff` (ADR 0011). */
function roleRemoved(api: ApiHandlers): void {
  api.on('GET', '/api/admin/session', () => problem(403, 'not_staff'));
}

// L2-047 (ADR 0014): a read refused 403 shows "Staff only" in place of the screen, with the URL
// staff opened or were moving to in the address bar.
test.describe('Admin app, forbidden screen', () => {
  test('a 403 to the session shows "Staff only" as the mock draws it, URL unchanged', async ({
    page,
    api,
  }) => {
    roleRemoved(api);
    const shell = new AdminShell(page);
    const forbidden = new AdminForbiddenPage(page);

    await shell.open('/events');

    await expect(forbidden.heading).toHaveText('Staff only');
    await expect(forbidden.heading).toBeFocused();
    await expect(forbidden.main).toHaveCount(1);
    await expect(forbidden.lead).toHaveText(LEAD);
    await expect(forbidden.buttons).toHaveCount(1);
    await expect(forbidden.signOutButton).toHaveText('Sign out');
    await expect(forbidden.signOutButton).toBeEnabled();
    await expect(forbidden.note).toHaveText(NOTE);
    expect(forbidden.location()).toBe('/events');
    expect(await forbidden.title()).toBe('Staff only · Christian Fitness Admin');
    await expect(shell.sidebar).toHaveCount(0);
    const box = await forbidden.signOutBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test('a role taken away while staff work shows "Staff only" on their next screen', async ({
    page,
    api,
  }) => {
    let removed = false;
    api.on('GET', '/api/admin/session', () =>
      removed ? problem(403, 'not_staff') : { json: STAFF_SIGNED_IN },
    );
    const shell = new AdminShell(page);
    const forbidden = new AdminForbiddenPage(page);

    await shell.open('/');
    await expect(shell.heading).toHaveText('Dashboard');
    removed = true;
    await shell.navItem('Members').click();

    await expect(forbidden.heading).toHaveText('Staff only');
    expect(forbidden.location()).toBe('/members');
  });

  test('Sign out reads "Signing out…" while it waits, ends the session and opens Staff sign in', async ({
    page,
    api,
  }) => {
    roleRemoved(api);
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    let signedOut = 0;
    api.on('DELETE', '/api/admin/session', async () => {
      await answered;
      signedOut++;
      return { status: 204 };
    });
    const shell = new AdminShell(page);
    const forbidden = new AdminForbiddenPage(page);
    const signIn = new AdminStaffSignInPage(page);

    await shell.open('/');
    await expect(forbidden.heading).toBeFocused();
    await forbidden.signOutByKeyboard();

    await expect(forbidden.signOutButton).toHaveText('Signing out…');
    await expect(forbidden.signOutButton).toBeDisabled();
    answer();

    await expect(signIn.heading).toHaveText('Staff sign in');
    expect(signIn.location()).toBe('/sign-in');
    expect(signedOut).toBe(1);
  });

  test('a failed sign-out leaves "Staff only" with Sign out enabled again', async ({
    page,
    api,
  }) => {
    roleRemoved(api);
    api.on('DELETE', '/api/admin/session', () => problem(500, 'server_error'));
    const shell = new AdminShell(page);
    const forbidden = new AdminForbiddenPage(page);

    await shell.open('/');
    await forbidden.signOut();

    await expect(forbidden.signOutButton).toHaveText('Sign out');
    await expect(forbidden.signOutButton).toBeEnabled();
    await expect(forbidden.heading).toHaveText('Staff only');
  });
});
