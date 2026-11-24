import { expect, test } from '../fixtures/test';
import { WebEventsPage } from '../page-objects/web/events.page';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebJoinPage } from '../page-objects/web/join.page';
import { WebOfflinePage } from '../page-objects/web/offline.page';

const OFFLINE_TEXT = "Check your Wi-Fi or data, then try again when you're back online.";

// L2-043 AC7, AC8, AC9 (ADR 0046): member offline banner and offline screen.
test.describe('Member app, offline banner and screen', () => {
  test('losing the network on an open screen shows a polite warning banner and hides it when back online', async ({
    page,
  }) => {
    const home = new WebHomePage(page);
    const offline = new WebOfflinePage(page);

    await home.open();
    await expect(home.greeting).toHaveText('Welcome, Grace');
    await expect(offline.banner).toHaveCount(0);

    await page.context().setOffline(true);
    await expect(offline.banner).toBeVisible();
    await expect(offline.bannerText).toHaveText(
      "You're offline. Pages you've opened stay on screen. Check your connection to load new updates.",
    );
    await expect(home.greeting).toHaveText('Welcome, Grace');

    await page.context().setOffline(false);
    await expect(offline.banner).toHaveCount(0);
  });

  test('shows "You\'re offline" with Try again and Go to home, focusing the heading', async ({
    page,
  }) => {
    const offline = new WebOfflinePage(page);

    await offline.open({ from: '/events?category=run' });

    await expect(offline.heading).toHaveText("You're offline");
    await expect.poll(() => offline.title()).toBe("You're offline · Christian Fitness");
    await expect(offline.main).toHaveCount(1);
    await expect(offline.code).toHaveText('Offline');
    await expect(offline.code).toHaveAttribute('aria-hidden', 'true');
    await expect(offline.text).toHaveText(OFFLINE_TEXT);
    await expect(offline.heading).toBeFocused();
    await expect(offline.actions).toHaveText(['Try again', 'Go to home']);
    await expect(offline.action('Try again')).toHaveAttribute('href', '/events?category=run');
    await expect(offline.action('Go to home')).toHaveAttribute('href', '/');
  });

  test('"Try again" never leaves the app or loops to /offline', async ({ page }) => {
    const offline = new WebOfflinePage(page);

    await offline.open({ from: '//elsewhere.example/phish' });
    await expect(offline.action('Try again')).toHaveAttribute('href', '/');

    await offline.open({ from: '/offline' });
    await expect(offline.action('Try again')).toHaveAttribute('href', '/');
  });

  test('navigating to another route while offline shows the offline screen, keeps the URL, and Try again loads it when back online', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/events', () => ({ json: { events: [], nextCursor: null } }));
    const home = new WebHomePage(page);
    const events = new WebEventsPage(page);
    const offline = new WebOfflinePage(page);

    await home.open();
    await expect(home.greeting).toHaveText('Welcome, Grace');

    await page.context().setOffline(true);
    await page
      .getByRole('navigation', { name: 'Primary', exact: true })
      .getByRole('link', { name: 'Events' })
      .click();

    await expect(offline.heading).toHaveText("You're offline");
    await expect.poll(() => offline.title()).toBe("You're offline · Christian Fitness");
    expect(offline.location()).toBe('/events');
    await expect(offline.action('Try again')).toHaveAttribute('href', '/events');

    await page.context().setOffline(false);
    await offline.tab();
    await expect(offline.action('Try again')).toBeFocused();
    await offline.pressEnter();

    await expect(events.heading).toHaveText('Events');
    await expect(offline.heading).toHaveCount(0);
  });

  test('a write that fails while offline stays on its own screen and keeps what was typed', async ({
    page,
  }) => {
    const join = new WebJoinPage(page);
    const offline = new WebOfflinePage(page);

    await join.open();
    await join.fill({
      fullName: 'Grace Thompson',
      email: 'grace@example.org',
      password: 'abundantlife',
    });

    await page.context().setOffline(true);
    await join.submitButton.click();

    await expect(join.heading).toHaveText('Create your profile');
    await expect(offline.heading).toHaveCount(0);
    await expect(join.fullName).toHaveValue('Grace Thompson');
    await page.context().setOffline(false);
  });
});
