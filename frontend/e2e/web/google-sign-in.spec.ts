import { expect, test } from '../fixtures/test';
import { answerGoogleStart, FAKE_GOOGLE_PATH } from '../fixtures/google';
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
