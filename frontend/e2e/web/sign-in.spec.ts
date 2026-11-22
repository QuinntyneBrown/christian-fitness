import { expect, SIGNED_IN, test, XSRF_TOKEN, type ApiHandlers } from '../fixtures/test';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebJoinPage } from '../page-objects/web/join.page';
import { WebSignInPage } from '../page-objects/web/sign-in.page';

const EMAIL = 'grace.thompson@gmail.com';
const PASSWORD = 'abundantlife';

interface SentSignIn {
  body: unknown;
  token: string | undefined;
}

/** Answers sign-in with Grace's session and records each body and antiforgery header sent. */
function answerSignIn(api: ApiHandlers): SentSignIn[] {
  const sent: SentSignIn[] = [];
  api.on('POST', '/api/session', (request) => {
    sent.push({ body: request.postDataJSON(), token: request.headers()['x-xsrf-token'] });
    return { json: SIGNED_IN };
  });
  return sent;
}

// L2-004 AC1, L2-030 AC3: a registered member signs in, with the antiforgery token, and lands on
// Home. The cookie itself is the API's (backend SignInTests); the screen sees only the answer.
test.describe('Member app, sign in', () => {
  test('a member signs in with their email and password and lands on Home', async ({
    page,
    api,
  }) => {
    const sent = answerSignIn(api);
    const signIn = new WebSignInPage(page);
    const home = new WebHomePage(page);

    await signIn.open();
    await expect.poll(() => signIn.title()).toBe('Sign in · Christian Fitness');
    await signIn.fill(EMAIL, PASSWORD);
    await signIn.submit();

    await expect(home.greeting).toHaveText('Welcome, Grace');
    expect(home.location()).toBe('/home');
    expect(sent).toEqual([{ body: { email: EMAIL, password: PASSWORD }, token: XSRF_TOKEN }]);
  });

  test('shows the form the mock draws', async ({ page }) => {
    const signIn = new WebSignInPage(page);

    await signIn.open();

    await expect(signIn.heading).toHaveText('Welcome back');
    await expect(signIn.lead).toHaveText('Sign in to see your events and messages.');
    await expect(signIn.main).toHaveCount(1);
    await expect(signIn.inputs).toHaveCount(2);
    await expect(signIn.email).toHaveAttribute('type', 'email');
    await expect(signIn.email).toHaveAttribute('autocomplete', 'email');
    await expect(signIn.password).toHaveAttribute('type', 'password');
    await expect(signIn.password).toHaveAttribute('autocomplete', 'current-password');
    await expect(signIn.submitButton).toHaveText('Sign in');
    await expect(signIn.alt).toHaveText('New here? Create a profile');
    await expect(signIn.joinLink).toHaveAttribute('href', '/join');
    await expect(signIn.links).toHaveText(['Forgot your password?', 'Create a profile']);
    await expect(signIn.forgotLink).toHaveAttribute('href', '/forgot-password');
    await expect(signIn.alert).toHaveCount(0);
  });

  test('while signing in, the button reads "Signing in…" and is disabled', async ({
    page,
    api,
  }) => {
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    api.on('POST', '/api/session', async () => {
      await answered;
      return { json: SIGNED_IN };
    });
    const signIn = new WebSignInPage(page);
    const home = new WebHomePage(page);

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

    await expect(home.greeting).toHaveText('Welcome, Grace');
  });

  test('a member signs in with the keyboard alone', async ({ page, api }) => {
    const sent = answerSignIn(api);
    const signIn = new WebSignInPage(page);
    const home = new WebHomePage(page);

    await signIn.open();
    await expect(signIn.heading).toHaveText('Welcome back');
    await signIn.signInByKeyboard(EMAIL, PASSWORD);

    await expect(home.greeting).toHaveText('Welcome, Grace');
    expect(sent.map((s) => s.body)).toEqual([{ email: EMAIL, password: PASSWORD }]);
  });
});

// Slices 2.1 and 2.2 pointed Join's links at /sign-in; they now open this screen.
test.describe('Member app, the way from Join to sign in', () => {
  test('"Sign in" under the Join form opens the sign-in screen', async ({ page }) => {
    const join = new WebJoinPage(page);
    const signIn = new WebSignInPage(page);

    await join.open();
    await join.signInLink.click();

    await expect(signIn.heading).toHaveText('Welcome back');
    expect(signIn.location()).toBe('/sign-in');
  });

  test('"Sign in instead?" on a taken email opens the sign-in screen', async ({ page, api }) => {
    api.on('POST', '/api/account/join', () => ({
      status: 409,
      headers: { 'content-type': 'application/problem+json' },
      json: { status: 409, code: 'email_taken' },
    }));
    const join = new WebJoinPage(page);
    const signIn = new WebSignInPage(page);

    await join.open();
    await join.fill({ fullName: 'Grace Thompson', email: EMAIL, password: PASSWORD });
    await join.submitAndAwaitAnswer();
    await join.fieldErrorLink('Email').click();

    await expect(signIn.heading).toHaveText('Welcome back');
    await expect.poll(() => signIn.title()).toBe('Sign in · Christian Fitness');
    expect(signIn.location()).toBe('/sign-in');
  });
});
