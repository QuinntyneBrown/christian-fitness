import { expect, SIGNED_IN, test, type ApiHandlers } from '../fixtures/test';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebSignInPage } from '../page-objects/web/sign-in.page';

const EMAIL = 'grace.thompson@gmail.com';
const PASSWORD = 'abundantlife';

/** A visitor: `GET /api/session` is 401 until sign-in succeeds, then answers Grace's session. */
function answerAsVisitor(api: ApiHandlers): void {
  api.on('GET', '/api/session', () => ({
    status: 401,
    headers: { 'content-type': 'application/problem+json' },
    json: { status: 401, code: 'unauthenticated' },
  }));
  api.on('POST', '/api/session', () => {
    api.on('GET', '/api/session', () => ({ json: SIGNED_IN }));
    return { json: SIGNED_IN };
  });
}

// L2-004 AC6: a visitor who opens a member route is sent to sign in and returned to that route
// afterwards; a return address that is not a path inside the app opens Home (ADR 0011).
test.describe('Member app, returning after sign-in', () => {
  test('a visitor opening a member route signs in and is returned to it', async ({ page, api }) => {
    answerAsVisitor(api);
    const home = new WebHomePage(page);
    const signIn = new WebSignInPage(page);

    // Home is the one member route so far; its query tells the return from the default.
    await home.open('?welcome=back');
    await expect(signIn.heading).toHaveText('Welcome back');
    expect(signIn.location()).toBe('/sign-in?returnUrl=%2Fhome%3Fwelcome%3Dback');
    await signIn.fill(EMAIL, PASSWORD);
    await signIn.submit();

    await expect(home.greeting).toHaveText('Welcome, Grace');
    expect(home.location()).toBe('/home?welcome=back');
  });

  for (const [why, returnUrl] of [
    ['another site', 'https://evil.example/home'],
    ['a protocol-relative address', '//evil.example/home'],
    ['a backslash the browser reads as a slash', '/\\evil.example/home'],
    ['a script', 'javascript:alert(1)'],
    ['the sign-in screen itself', '/sign-in?returnUrl=%2Fhome'],
    ['a relative path', 'home?welcome=back'],
  ] as const) {
    test(`a return address to ${why} opens Home instead`, async ({ page, api }) => {
      answerAsVisitor(api);
      const signIn = new WebSignInPage(page);
      const home = new WebHomePage(page);

      await signIn.open(returnUrl);
      await signIn.fill(EMAIL, PASSWORD);
      await signIn.submit();

      await expect(home.greeting).toHaveText('Welcome, Grace');
      expect(home.location()).toBe('/home');
    });
  }
});
