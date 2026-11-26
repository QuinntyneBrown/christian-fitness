import { expect, SIGNED_IN, test, XSRF_TOKEN } from '../fixtures/test';
import { answerGoogleFinish, answerGoogleStart, FAKE_GOOGLE_PATH } from '../fixtures/google';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebJoinPage } from '../page-objects/web/join.page';
import { WebSignInPage } from '../page-objects/web/sign-in.page';

// L2-004 AC7, L2-003 AC7, L2-049 AC1, AC9, AC10: Google comes first on Sign in and Join, above "or
// with email" and the email form; pressing its button reads "Opening Google…", disables it and
// leaves for Google in a full-page redirect. The address is the API's (backend
// StartGoogleSignInTests); the fixture's Google is a local page, so nothing loads from Google.
test.describe('Member app, start Google sign-in', () => {
  test('Sign in shows "Continue with Google" first, above "or with email" and the email form', async ({
    page,
  }) => {
    const signIn = new WebSignInPage(page);

    await signIn.open();

    await expect(signIn.googleButton).toHaveText('Continue with Google');
    await expect(signIn.googleButton).toHaveAttribute('type', 'button');
    await expect(signIn.divider).toHaveText('or with email');
    await expect(signIn.parts).toHaveCount(3);
    await expect(signIn.parts.nth(0)).toHaveClass(/google-button/);
    await expect(signIn.parts.nth(1)).toHaveAttribute('role', 'separator');
    await expect(signIn.parts.nth(2)).toHaveClass(/auth__fields/);
    await expect(signIn.passwordLabelRow).toHaveText(/Password\s*Forgot password\?/);
    // The mark is bundled with the button, never an image from Google.
    await expect(signIn.googleButton.locator('svg.google-g')).toHaveCount(1);
    await expect(signIn.googleButton.locator('img')).toHaveCount(0);
  });

  test(
    'pressing "Continue with Google" reads "Opening Google…", disables it and leaves for Google',
    { tag: '@critical' },
    async ({ page, api }) => {
      let answer!: () => void;
      const started = answerGoogleStart(api, new Promise<void>((resolve) => (answer = resolve)));
      const signIn = new WebSignInPage(page);

      await signIn.open('/events');
      await signIn.continueWithGoogle();

      await expect(signIn.googleButton).toHaveText('Opening Google…');
      await expect(signIn.googleButton).toBeDisabled();
      await expect(signIn.googleButton).toHaveAttribute('aria-busy', 'true');
      answer();
      await page.waitForURL((url) => url.pathname === FAKE_GOOGLE_PATH);
      expect(started).toEqual([{ intent: 'sign-in', returnUrl: '/events' }]);
    },
  );

  test('with no return address, the start sends none', async ({ page, api }) => {
    const started = answerGoogleStart(api);
    const signIn = new WebSignInPage(page);

    await signIn.open();
    await signIn.continueWithGoogle();

    await page.waitForURL((url) => url.pathname === FAKE_GOOGLE_PATH);
    expect(started).toEqual([{ intent: 'sign-in', returnUrl: null }]);
  });

  test('Join shows "Sign up with Google" first, and pressing it leaves for Google to join', async ({
    page,
    api,
  }) => {
    const started = answerGoogleStart(api);
    const join = new WebJoinPage(page);

    await join.open();
    await expect(join.googleButton).toHaveText('Sign up with Google');
    await expect(join.divider).toHaveText('or with email');
    await expect(join.parts.nth(0)).toHaveClass(/google-button/);
    await expect(join.parts.nth(1)).toHaveAttribute('role', 'separator');
    await expect(join.parts.nth(2)).toHaveClass(/auth__fields/);
    await join.googleButton.click();

    await page.waitForURL((url) => url.pathname === FAKE_GOOGLE_PATH);
    expect(started).toEqual([{ intent: 'join' }]);
  });

  test('the button works by keyboard and is at least 44 px tall', async ({ page, api }) => {
    answerGoogleStart(api);
    const signIn = new WebSignInPage(page);

    await signIn.open();
    const box = await signIn.googleButton.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await signIn.googleButton.focus();
    await page.keyboard.press('Enter');

    await page.waitForURL((url) => url.pathname === FAKE_GOOGLE_PATH);
  });
});

// L2-004 AC8, L2-049 AC4, AC6: Google sends the browser back to Sign in with `google=returned`;
// the screen finishes the sign-in with `POST /api/session/google` (the identity is in the API's
// cookie, backend CompleteGoogleSignInTests) and lands on the kept return address, else Home.
test.describe('Member app, finish Google sign-in', () => {
  test(
    'back from Google, the member is signed in and lands where they were going',
    { tag: '@critical' },
    async ({ page, api }) => {
      const finished = answerGoogleFinish(api, { json: SIGNED_IN });

      await page.goto('/sign-in?google=returned&returnUrl=%2Fevents');

      await page.waitForURL((url) => url.pathname === '/events');
      expect(finished).toEqual([{ token: XSRF_TOKEN }]);
    },
  );

  test('with no return address, the member lands on Home', async ({ page, api }) => {
    const finished = answerGoogleFinish(api, { json: SIGNED_IN });
    const home = new WebHomePage(page);

    await page.goto('/sign-in?google=returned');

    await expect(home.greeting).toHaveText('Welcome, Grace');
    expect(home.location()).toBe('/home');
    expect(finished).toHaveLength(1);
  });

  test('a return address outside the app is not followed', async ({ page, api }) => {
    answerGoogleFinish(api, { json: SIGNED_IN });
    const home = new WebHomePage(page);

    await page.goto('/sign-in?google=returned&returnUrl=https%3A%2F%2Fevil.example%2F');

    await expect(home.greeting).toHaveText('Welcome, Grace');
    expect(home.location()).toBe('/home');
  });

  test('a plain visit, or a cancel at Google, finishes nothing', async ({ page, api }) => {
    const finished = answerGoogleFinish(api, { json: SIGNED_IN });
    const signIn = new WebSignInPage(page);

    await page.goto('/sign-in?returnUrl=%2Fevents');

    await expect(signIn.googleButton).toHaveText('Continue with Google');
    expect(finished).toEqual([]);
  });
});

// L2-049 AC3, AC5, AC7, AC11, L2-004 AC10, AC11, L2-003 AC11: a Google sign-in that is refused or
// doesn't finish says so on the screen that started it, in the alert above the form, and the
// `google` marker leaves the address so a reload neither repeats the finish nor the message.
test.describe('Member app, Google sign-in refused', () => {
  test("back from a failed attempt, Sign in says it didn't finish", async ({ page, api }) => {
    const finished = answerGoogleFinish(api, { json: SIGNED_IN });
    const signIn = new WebSignInPage(page);

    await page.goto('/sign-in?google=failed&returnUrl=%2Fevents');

    await expect(signIn.alertTitle).toHaveText("Google sign-in didn't finish");
    await expect(signIn.alert).toContainText(
      "You're not signed in. Try again, or sign in with your email below.",
    );
    await expect(signIn.alert).toBeFocused();
    await expect.poll(() => signIn.location()).toBe('/sign-in?returnUrl=%2Fevents');
    expect(finished).toEqual([]);
  });

  test("back from a failed attempt, Join says it didn't finish", async ({ page }) => {
    const join = new WebJoinPage(page);

    await page.goto('/join?google=failed');

    await expect(join.alertTitle).toHaveText("Google sign-up didn't finish");
    await expect(join.alert).toContainText(
      'Nothing was created. Try again, or create your profile with your email below.',
    );
    await expect.poll(() => new URL(page.url()).search).toBe('');
  });

  test('too many starts from this network show "Too many attempts" on Sign in and Join', async ({
    page,
    api,
  }) => {
    api.on('POST', '/api/session/google/start', () => ({
      status: 429,
      json: { status: 429, code: 'too_many_attempts' },
    }));
    const signIn = new WebSignInPage(page);
    const join = new WebJoinPage(page);

    await signIn.open();
    await signIn.continueWithGoogle();
    await expect(signIn.alertTitle).toHaveText('Too many attempts');
    await expect(signIn.alert).toContainText('Too many attempts. Try again in a few minutes.');
    await expect(signIn.googleButton).toHaveText('Continue with Google');
    await expect(signIn.googleButton).toBeEnabled();

    await join.open();
    await join.googleButton.click();
    await expect(join.alertTitle).toHaveText('Too many attempts');
    await expect(join.googleButton).toHaveText('Sign up with Google');
  });

  test("Google unavailable says the attempt didn't finish", async ({ page, api }) => {
    api.on('POST', '/api/session/google/start', () => ({
      status: 503,
      json: { status: 503, code: 'google_unavailable' },
    }));
    const signIn = new WebSignInPage(page);

    await signIn.open();
    await signIn.continueWithGoogle();

    await expect(signIn.alertTitle).toHaveText("Google sign-in didn't finish");
  });

  test('an unverified Google email is refused with what to do', async ({ page, api }) => {
    answerGoogleFinish(api, {
      status: 401,
      json: { status: 401, code: 'google_email_unverified' },
    });
    const signIn = new WebSignInPage(page);

    await page.goto('/sign-in?google=returned');

    await expect(signIn.alertTitle).toHaveText("Your Google email isn't verified");
    await expect(signIn.alert).toContainText(
      "Your Google account's email isn't verified. Verify it with Google, or join with email.",
    );
    await expect.poll(() => signIn.location()).toBe('/sign-in');
  });

  test('a suspended account is told so', async ({ page, api }) => {
    answerGoogleFinish(api, { status: 403, json: { status: 403, code: 'account_suspended' } });
    const signIn = new WebSignInPage(page);

    await page.goto('/sign-in?google=returned');

    await expect(signIn.alertTitle).toHaveText('Your account is suspended');
  });

  test("a finish that fails says it didn't finish", async ({ page, api }) => {
    answerGoogleFinish(api, { status: 500, json: { status: 500, code: 'server_error' } });
    const signIn = new WebSignInPage(page);

    await page.goto('/sign-in?google=returned');

    await expect(signIn.alertTitle).toHaveText("Google sign-in didn't finish");
  });
});
