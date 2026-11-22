import { expect, test } from '../fixtures/test';
import { AdminServerErrorPage } from '../page-objects/admin/server-error.page';
import { AdminShell } from '../page-objects/admin/admin-shell.page';

const OWNED = "That's on us, not you, and we've been notified. Try again in a moment.";

// L2-043 AC4, AC6, AC7: the server-error screen, opened the way the interceptor opens it.
test.describe('Admin app, server error', () => {
  test('shows "Something went wrong" with the reference the response carried', async ({ page }) => {
    const serverError = new AdminServerErrorPage(page);

    await serverError.open({ reference: 'CF-4BF92F35', from: '/members' });

    await expect(serverError.heading).toHaveText('Something went wrong');
    await expect
      .poll(() => serverError.title())
      .toBe('Something went wrong · Christian Fitness Admin');
    await expect(serverError.main).toHaveCount(1);
    await expect(serverError.code).toHaveText('500');
    await expect(serverError.code).toHaveAttribute('aria-hidden', 'true');
    await expect(serverError.text).toHaveText(
      `${OWNED} If it keeps happening, quote reference CF-4BF92F35.`,
    );
    await expect(serverError.heading).toBeFocused();
    await expect(serverError.actions).toHaveText(['Try again', 'Go to dashboard']);
    await expect(serverError.action('Try again')).toHaveAttribute('href', '/members');
    await expect(serverError.action('Go to dashboard')).toHaveAttribute('href', '/');
  });

  test('leaves the reference out and stays in the app when the parameters are not its own', async ({
    page,
  }) => {
    const serverError = new AdminServerErrorPage(page);

    await serverError.open({ reference: 'cf-4bf92f35', from: 'https://elsewhere.example/' });

    await expect(serverError.text).toHaveText(OWNED);
    await expect(serverError.action('Try again')).toHaveAttribute('href', '/');
  });

  test('the keyboard follows "Try again" back to the screen that failed', async ({ page }) => {
    const serverError = new AdminServerErrorPage(page);
    const shell = new AdminShell(page);

    await serverError.open({ from: '/' });

    await expect(serverError.heading).toBeFocused();
    await serverError.tab();
    await expect(serverError.action('Try again')).toBeFocused();
    await serverError.pressEnter();

    await expect(shell.heading).toHaveText('Dashboard');
    await expect(serverError.heading).toHaveCount(0);
  });
});

// L2-043 AC4 in the admin app (ADR 0006, 0010): the admin app's client opens the server-error
// screen when a GET to the API fails with a 5xx, here the staff guard's request for the session.
test.describe('Admin app, a server failure opens the server-error screen', () => {
  test('the staff session request answering 500 shows "Something went wrong"', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/admin/session', () => ({
      status: 500,
      headers: { 'content-type': 'application/problem+json' },
      json: { status: 500, code: 'server_error', reference: 'CF-4BF92F35' },
    }));
    const serverError = new AdminServerErrorPage(page);
    const shell = new AdminShell(page);

    await shell.open('/events');

    await expect(serverError.heading).toHaveText('Something went wrong');
    await expect(serverError.text).toHaveText(
      `${OWNED} If it keeps happening, quote reference CF-4BF92F35.`,
    );
    await expect(serverError.action('Try again')).toHaveAttribute('href', '/events');
    expect(serverError.location()).toBe('/events');
    await expect(shell.nav).toHaveCount(0);
  });
});
