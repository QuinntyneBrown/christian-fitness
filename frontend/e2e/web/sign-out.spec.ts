import { expect, test, XSRF_TOKEN, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebMemberShell } from '../page-objects/web/member-shell.page';
import { WebServerErrorPage } from '../page-objects/web/server-error.page';
import { WebSignInPage } from '../page-objects/web/sign-in.page';
import { WebStartPage } from '../page-objects/web/start.page';

const SIGNED_OUT: ApiReply = {
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
  api.on('DELETE', '/api/session', (request) => {
    sent.push(request.headers()['x-xsrf-token']);
    if (reply.status === 204 || reply.status === 401) {
      api.on('GET', '/api/session', () => SIGNED_OUT);
    }
    return reply;
  });
  return sent;
}

// The member sign-in guard (ADR 0007, 0009): a member route opens only with a session.
test.describe('Member app, member routes need a session', () => {
  test('a visitor opening Home is sent to sign in', async ({ page, api }) => {
    api.on('GET', '/api/session', () => SIGNED_OUT);
    const signIn = new WebSignInPage(page);
    const home = new WebHomePage(page);

    await home.open();

    await expect(signIn.heading).toHaveText('Welcome back');
    // L2-004 AC6: the guard records the route asked for, to return there after signing in.
    expect(signIn.location()).toBe('/sign-in?returnUrl=%2Fhome');
    await expect(home.greeting).toHaveCount(0);
  });

  test('a signed-in member opening Home sees it in the member shell', async ({ page }) => {
    const home = new WebHomePage(page);
    const shell = new WebMemberShell(page);

    await home.open();

    await expect(home.greeting).toHaveText('Welcome, Grace');
    await expect(shell.lockup).toHaveAttribute('href', '/home');
    await expect(shell.signOutButton).toBeEnabled();
  });
});

// L2-004 AC5, L2-008 AC4: Sign out in the app header ends the session on the server.
test.describe('Member app, sign out', () => {
  test('Sign out ends the session and returns the member to the start', async ({ page, api }) => {
    const sent = answerSignOut(api, { status: 204 });
    const home = new WebHomePage(page);
    const shell = new WebMemberShell(page);
    const start = new WebStartPage(page);
    const signIn = new WebSignInPage(page);

    await home.open();
    await expect(home.greeting).toHaveText('Welcome, Grace');
    await shell.signOut();

    await expect.poll(() => shell.location()).toBe('/');
    await expect.poll(() => start.title()).toBe('Christian Fitness');
    await expect(shell.header).toHaveCount(0);
    expect(sent).toEqual([XSRF_TOKEN]);

    // The session is gone: Home now sends them to sign in.
    await home.open();
    await expect(signIn.heading).toHaveText('Welcome back');
  });

  test('a session that had already ended counts as signed out', async ({ page, api }) => {
    answerSignOut(api, SIGNED_OUT);
    const home = new WebHomePage(page);
    const shell = new WebMemberShell(page);

    await home.open();
    await expect(home.greeting).toHaveText('Welcome, Grace');
    await shell.signOut();

    await expect.poll(() => shell.location()).toBe('/');
  });

  test('while signing out, the button is disabled and busy', async ({ page, api }) => {
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    api.on('DELETE', '/api/session', async () => {
      await answered;
      return { status: 204 };
    });
    const home = new WebHomePage(page);
    const shell = new WebMemberShell(page);

    await home.open();
    await expect(home.greeting).toHaveText('Welcome, Grace');
    await shell.signOut();

    await expect(shell.signOutButton).toBeDisabled();
    await expect(shell.signOutButton).toHaveAttribute('aria-busy', 'true');

    answer();

    await expect.poll(() => shell.location()).toBe('/');
  });

  test('a failed sign-out keeps the member on Home with Sign out enabled', async ({
    page,
    api,
  }) => {
    answerSignOut(api, {
      status: 500,
      headers: { 'content-type': 'application/problem+json' },
      json: { status: 500, code: 'server_error' },
    });
    const home = new WebHomePage(page);
    const shell = new WebMemberShell(page);
    const serverError = new WebServerErrorPage(page);

    await home.open();
    await expect(home.greeting).toHaveText('Welcome, Grace');
    await shell.signOutAndAwaitAnswer();

    await expect(shell.signOutButton).toBeEnabled();
    await expect(shell.signOutButton).not.toHaveAttribute('aria-busy', 'true');
    await expect(home.greeting).toHaveText('Welcome, Grace');
    await expect(serverError.heading).toHaveCount(0);
    expect(shell.location()).toBe('/home');
  });

  test('a member signs out with the keyboard alone', async ({ page, api }) => {
    answerSignOut(api, { status: 204 });
    const home = new WebHomePage(page);
    const shell = new WebMemberShell(page);

    await home.open();
    await expect(home.greeting).toHaveText('Welcome, Grace');
    await shell.signOutByKeyboard();

    await expect.poll(() => shell.location()).toBe('/');
  });

  for (const viewport of [
    { name: 'a phone', width: 360, height: 740 },
    { name: 'a desktop', width: 1280, height: 800 },
  ]) {
    test(`on ${viewport.name}, Sign out is a target of at least 44 × 44 px`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const home = new WebHomePage(page);
      const shell = new WebMemberShell(page);

      await home.open();
      await expect(shell.signOutButton).toBeVisible();

      const box = await shell.signOutBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    });
  }
});
