import { expect, test } from '../fixtures/test';
import { AdminNotFoundPage } from '../page-objects/admin/not-found.page';
import { AdminStartPage } from '../page-objects/admin/start.page';

// L2-043 AC1, AC2, AC7: a URL no route matches shows the not-found screen with two ways back.
test.describe('Admin app, not found', () => {
  test('a URL no route matches shows "Page not found" and keeps the URL', async ({ page }) => {
    const notFound = new AdminNotFoundPage(page);

    await notFound.open('/members/no-such-member');

    await expect(notFound.heading).toHaveText('Page not found');
    await expect.poll(() => notFound.title()).toBe('Page not found · Christian Fitness Admin');
    expect(notFound.location()).toBe('/members/no-such-member');
    await expect(notFound.main).toHaveCount(1);
    await expect(notFound.code).toHaveText('404');
    await expect(notFound.code).toHaveAttribute('aria-hidden', 'true');
    await expect(notFound.heading).toBeFocused();
  });

  test('offers "Go to dashboard" and "Manage events", and the keyboard follows "Go to dashboard"', async ({
    page,
  }) => {
    const notFound = new AdminNotFoundPage(page);
    const start = new AdminStartPage(page);

    await notFound.open();

    await expect(notFound.actions).toHaveText(['Go to dashboard', 'Manage events']);
    await expect(notFound.action('Go to dashboard')).toHaveAttribute('href', '/');
    await expect(notFound.action('Manage events')).toHaveAttribute('href', '/events');

    await notFound.tab();
    await expect(notFound.action('Go to dashboard')).toBeFocused();
    await notFound.pressEnter();

    await expect.poll(() => start.title()).toBe('Christian Fitness Admin');
    await expect(start.main).toHaveCount(1);
    await expect(notFound.heading).toHaveCount(0);
  });
});
