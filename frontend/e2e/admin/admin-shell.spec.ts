import { expect, test, XSRF_TOKEN, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';
import { AdminStaffSignInPage } from '../page-objects/admin/staff-sign-in.page';

const NO_STAFF_SESSION: ApiReply = {
  status: 401,
  headers: { 'content-type': 'application/problem+json' },
  json: { status: 401, code: 'unauthenticated' },
};

/**
 * Answers sign-out with `reply`; once the session has ended (204 or 401) it is gone, as on the
 * server. Answers the antiforgery header of each sign-out sent.
 */
function answerSignOut(api: ApiHandlers, reply: ApiReply): (string | undefined)[] {
  const sent: (string | undefined)[] = [];
  api.on('DELETE', '/api/admin/session', (request) => {
    sent.push(request.headers()['x-xsrf-token']);
    if (reply.status === 204 || reply.status === 401) {
      api.on('GET', '/api/admin/session', () => NO_STAFF_SESSION);
    }
    return reply;
  });
  return sent;
}

// L2-021 AC1: at LG and wider the side navigation shows the four areas, with aria-current on the
// one showing. Each area is a stand-in with its heading until its slice (ADR 0011).
test.describe('Admin app, navigation at LG and wider', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the side navigation is one column of four links, Dashboard current', async ({ page }) => {
    const shell = new AdminShell(page);

    await shell.open();

    await expect(shell.brandName).toHaveText('Christian Fitness');
    await expect(shell.navItems).toHaveText(['Dashboard', 'Events', 'Services', 'Members']);
    expect(
      await shell.navItems.evaluateAll((items) => items.map((i) => i.getAttribute('href'))),
    ).toEqual(['/', '/events', '/services', '/members']);
    await expect(shell.currentItem).toHaveCount(1);
    await expect(shell.currentItem).toHaveText('Dashboard');
    expect(await shell.navIsOneRow()).toBe(false);
    await expect(shell.userName).toBeVisible();
    await expect(shell.main).toHaveCount(1);
  });

  test('choosing an area opens it in the app and moves aria-current to it', async ({ page }) => {
    const shell = new AdminShell(page);

    await shell.open();
    await expect(shell.heading).toHaveText('Dashboard');
    await shell.markDocument();
    await shell.navItem('Events').click();

    await expect(shell.heading).toHaveText('Events');
    expect(shell.location()).toBe('/events');
    await expect.poll(() => shell.title()).toBe('Events · Christian Fitness Admin');
    await expect(shell.currentItem).toHaveCount(1);
    await expect(shell.currentItem).toHaveText('Events');
    expect(await shell.documentIsMarked()).toBe(true);
  });

  test('the keyboard reaches an area and opens it', async ({ page }) => {
    const shell = new AdminShell(page);

    await shell.open();
    await expect(shell.heading).toHaveText('Dashboard');
    await shell.tabToAndPress(shell.navItem('Members'));

    await expect(shell.heading).toHaveText('Members');
    await expect(shell.currentItem).toHaveText('Members');
  });

  for (const [path, area] of [
    ['/services', 'Services'],
    ['/members', 'Members'],
  ] as const) {
    test(`opening ${path} marks ${area} current`, async ({ page }) => {
      const shell = new AdminShell(page);

      await shell.open(path);

      await expect(shell.heading).toHaveText(area);
      await expect(shell.currentItem).toHaveText(area);
    });
  }
});

// L2-021 AC2 (as corrected in ADR 0011): below LG the sidebar is a band; the links sit in one row
// that scrolls within itself, the page never scrolls sideways, and Sign out stays reachable.
test.describe('Admin app, navigation below LG', () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test('the links sit in one row, nothing overflows the page and Sign out is 44 px', async ({
    page,
  }) => {
    const shell = new AdminShell(page);

    await shell.open();

    await expect(shell.heading).toHaveText('Dashboard');
    expect(await shell.navIsOneRow()).toBe(true);
    expect(await shell.pageOverflowX()).toBe(0);
    await expect(shell.userName).toBeHidden();
    await expect(shell.signOutButton).toBeVisible();
    const box = await shell.signOutBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test('the last link scrolls into reach and opens its area', async ({ page }) => {
    const shell = new AdminShell(page);

    await shell.open();
    await shell.navItem('Members').click();

    await expect(shell.heading).toHaveText('Members');
    await expect(shell.currentItem).toHaveText('Members');
    expect(await shell.pageOverflowX()).toBe(0);
  });
});

// L2-018 AC6: Sign out ends the staff session on the server and returns to Staff sign in.
test.describe('Admin app, sign out', () => {
  test('Sign out ends the session and returns staff to Staff sign in', async ({ page, api }) => {
    const sent = answerSignOut(api, { status: 204 });
    const shell = new AdminShell(page);
    const signIn = new AdminStaffSignInPage(page);

    await shell.open();
    await expect(shell.heading).toHaveText('Dashboard');
    await shell.signOut();

    await expect(signIn.heading).toHaveText('Staff sign in');
    expect(signIn.location()).toBe('/sign-in');
    expect(sent).toEqual([XSRF_TOKEN]);
  });

  test('a session that had already ended still returns staff to Staff sign in', async ({
    page,
    api,
  }) => {
    answerSignOut(api, NO_STAFF_SESSION);
    const shell = new AdminShell(page);
    const signIn = new AdminStaffSignInPage(page);

    await shell.open();
    await expect(shell.heading).toHaveText('Dashboard');
    await shell.tabToAndPress(shell.signOutButton);

    await expect(signIn.heading).toHaveText('Staff sign in');
  });

  test('a failed sign-out keeps staff where they are with Sign out enabled', async ({
    page,
    api,
  }) => {
    answerSignOut(api, {
      status: 500,
      headers: { 'content-type': 'application/problem+json' },
      json: { status: 500, code: 'server_error' },
    });
    const shell = new AdminShell(page);

    await shell.open();
    await expect(shell.heading).toHaveText('Dashboard');
    const answered = page.waitForResponse(
      (r) =>
        r.request().method() === 'DELETE' && new URL(r.url()).pathname === '/api/admin/session',
    );
    await shell.signOut();
    await answered;

    await expect(shell.signOutButton).toBeEnabled();
    await expect(shell.heading).toHaveText('Dashboard');
    expect(shell.location()).toBe('/');
  });
});
