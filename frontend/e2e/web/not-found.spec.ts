import { expect, test } from '../fixtures/test';
import { WebNotFoundPage } from '../page-objects/web/not-found.page';
import { WebStartPage } from '../page-objects/web/start.page';

// L2-043 AC1, AC2, AC7: a URL no route matches shows the not-found screen with two ways back.
test.describe('Member app, not found', () => {
  test('a URL no route matches shows "Page not found" and keeps the URL', async ({ page }) => {
    const notFound = new WebNotFoundPage(page);

    await notFound.open('/no-such-page?from=an-old-link');

    await expect(notFound.heading).toHaveText('Page not found');
    await expect.poll(() => notFound.title()).toBe('Page not found · Christian Fitness');
    expect(notFound.location()).toBe('/no-such-page?from=an-old-link');
    await expect(notFound.main).toHaveCount(1);
    await expect(notFound.code).toHaveText('404');
    await expect(notFound.code).toHaveAttribute('aria-hidden', 'true');
    await expect(notFound.heading).toBeFocused();
  });

  test('offers "Go to home" and "Browse events", and the keyboard follows "Go to home"', async ({
    page,
  }) => {
    const notFound = new WebNotFoundPage(page);
    const start = new WebStartPage(page);

    await notFound.open();

    await expect(notFound.actions).toHaveText(['Go to home', 'Browse events']);
    await expect(notFound.action('Go to home')).toHaveAttribute('href', '/');
    await expect(notFound.action('Browse events')).toHaveAttribute('href', '/events');

    await expect(notFound.heading).toBeFocused();
    await notFound.tab();
    await expect(notFound.action('Go to home')).toBeFocused();
    await notFound.pressEnter();

    await expect.poll(() => start.title()).toBe('Christian Fitness');
    await expect(start.main).toHaveCount(1);
    await expect(notFound.heading).toHaveCount(0);
  });
});
