import { expect, test } from '../fixtures/test';
import { WebServerErrorPage } from '../page-objects/web/server-error.page';
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
