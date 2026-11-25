import { expect, test } from '../fixtures/test';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebJoinPage } from '../page-objects/web/join.page';
import { WebServerErrorPage } from '../page-objects/web/server-error.page';
import { WebSignInPage } from '../page-objects/web/sign-in.page';
import { WebStartPage } from '../page-objects/web/start.page';

const OWNED = "That's on us, not you, and we've been notified. Try again in a moment.";

// L2-043 AC4, AC6, AC7: the server-error screen, opened the way the interceptor opens it.
test.describe('Member app, server error', () => {
  test('shows "Something went wrong" with the reference the response carried', async ({ page }) => {
    const serverError = new WebServerErrorPage(page);

    await serverError.open({ reference: 'CF-4BF92F35', from: '/events/42' });

    await expect(serverError.heading).toHaveText('Something went wrong');
    await expect.poll(() => serverError.title()).toBe('Something went wrong · Christian Fitness');
    await expect(serverError.main).toHaveCount(1);
    await expect(serverError.code).toHaveText('500');
    await expect(serverError.code).toHaveAttribute('aria-hidden', 'true');
    await expect(serverError.text).toHaveText(
      `${OWNED} If it keeps happening, quote reference CF-4BF92F35.`,
    );
    await expect(serverError.heading).toBeFocused();
  });

  test('leaves the reference out when there is none or it is not well formed', async ({ page }) => {
    const serverError = new WebServerErrorPage(page);

    await serverError.open({ from: '/events/42' });
    await expect(serverError.text).toHaveText(OWNED);

    await serverError.open({ reference: '<b>CF-1</b> call 555-0100', from: '/events/42' });
    await expect(serverError.text).toHaveText(OWNED);
  });

  test('"Try again" loads the URL that failed and "Go to home" loads home', async ({ page }) => {
    const serverError = new WebServerErrorPage(page);

    await serverError.open({ reference: 'CF-4BF92F35', from: '/events/42?when=week' });

    await expect(serverError.actions).toHaveText(['Try again', 'Go to home']);
    await expect(serverError.action('Try again')).toHaveAttribute('href', '/events/42?when=week');
    await expect(serverError.action('Go to home')).toHaveAttribute('href', '/');
  });

  test('"Try again" never leaves the app', async ({ page }) => {
    const serverError = new WebServerErrorPage(page);

    await serverError.open({ from: '//elsewhere.example/phish' });

    await expect(serverError.action('Try again')).toHaveAttribute('href', '/');
  });

  test('the keyboard follows "Try again" back to the screen that failed', async ({ page }) => {
    const serverError = new WebServerErrorPage(page);
    const start = new WebStartPage(page);

    await serverError.open({ reference: 'CF-4BF92F35', from: '/' });

    await expect(serverError.heading).toBeFocused();
    await serverError.tab();
    await expect(serverError.action('Try again')).toBeFocused();
    await serverError.pressEnter();

    await expect.poll(() => start.title()).toBe('Christian Fitness');
    await expect(serverError.heading).toHaveCount(0);
  });
});

// L2-043 AC4 and AC5, through serverErrorInterceptor: the first screens that call the API.
test.describe('Member app, server error from the API', () => {
  test(
    'a 5xx while loading shows the server-error screen and keeps the URL',
    { tag: '@critical' },
    async ({ page, api }) => {
      api.on('GET', '/api/session', () => ({
        status: 500,
        json: { status: 500, code: 'server_error', reference: 'CF-4BF92F35' },
      }));
      const home = new WebHomePage(page);
      const serverError = new WebServerErrorPage(page);

      await home.open();

      await expect(serverError.heading).toHaveText('Something went wrong');
      await expect(serverError.text).toHaveText(
        `${OWNED} If it keeps happening, quote reference CF-4BF92F35.`,
      );
      await expect.poll(() => serverError.title()).toBe('Something went wrong · Christian Fitness');
      expect(serverError.location()).toBe('/home');
      await expect(serverError.action('Try again')).toHaveAttribute('href', '/home');
      await expect(home.greeting).toHaveCount(0);
    },
  );

  test('a 4xx while loading leaves the app to handle it: a 401 goes to sign in', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/session', () => ({
      status: 401,
      json: { status: 401, code: 'unauthenticated' },
    }));
    const home = new WebHomePage(page);
    const signIn = new WebSignInPage(page);
    const serverError = new WebServerErrorPage(page);

    await home.open();

    await expect(signIn.heading).toHaveText('Welcome back');
    await expect(serverError.heading).toHaveCount(0);
  });

  test('a 5xx to a write leaves the screen that sent it in place', async ({ page, api }) => {
    api.on('POST', '/api/account/join', () => ({
      status: 500,
      json: { status: 500, code: 'server_error', reference: 'CF-4BF92F35' },
    }));
    const join = new WebJoinPage(page);
    const serverError = new WebServerErrorPage(page);

    await join.open();
    await join.fill({
      fullName: 'Grace Thompson',
      email: 'grace@example.org',
      password: 'abundantlife',
    });
    await join.submitAndAwaitAnswer();

    await expect(join.heading).toHaveText('Create your profile');
    await expect(serverError.heading).toHaveCount(0);
    expect(serverError.location()).toBe('/join');
    // The form comes back as it was; the message is slice 2.2's (the mock's error state).
    await expect(join.submitButton).toHaveText('Create profile');
    await expect(join.submitButton).toBeEnabled();
    await expect(join.fullName).toHaveValue('Grace Thompson');
    await expect(join.fullName).not.toHaveAttribute('readonly');
  });
});
