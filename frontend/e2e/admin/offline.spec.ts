import { expect, test } from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';
import { AdminEventsPage } from '../page-objects/admin/events.page';
import { AdminOfflinePage } from '../page-objects/admin/offline.page';

const OFFLINE_TEXT = "Check your Wi-Fi or data, then try again when you're back online.";

// L2-043 AC7, AC8, AC9 (ADR 0046): admin offline banner and offline screen.
test.describe('Admin app, offline banner and screen', () => {
  test('losing the network in the admin shell shows the warning banner and hides it when back online', async ({
    page,
  }) => {
    const shell = new AdminShell(page);
    const offline = new AdminOfflinePage(page);

    await shell.open('/');
    await expect(shell.heading).toHaveText('Dashboard');
    await expect(offline.banner).toHaveCount(0);

    await page.context().setOffline(true);
    await expect(offline.banner).toBeVisible();
    await expect(offline.bannerText).toHaveText(
      "You're offline. Pages you've opened stay on screen. Check your connection to load new updates.",
    );
    await expect(shell.heading).toHaveText('Dashboard');

    await page.context().setOffline(false);
    await expect(offline.banner).toHaveCount(0);
  });

  test('shows "You\'re offline" in the admin app and navigating offline opens it while keeping the URL', async ({
    page,
  }) => {
    const shell = new AdminShell(page);
    const events = new AdminEventsPage(page);
    const offline = new AdminOfflinePage(page);

    await offline.open({ from: '/events' });
    await expect(offline.heading).toHaveText("You're offline");
    await expect.poll(() => offline.title()).toBe("You're offline · Christian Fitness Admin");
    await expect(offline.text).toHaveText(OFFLINE_TEXT);
    await expect(offline.actions).toHaveText(['Try again', 'Go to dashboard']);
    await expect(offline.action('Try again')).toHaveAttribute('href', '/events');
    await expect(offline.action('Go to dashboard')).toHaveAttribute('href', '/');

    await shell.open('/');
    await expect(shell.heading).toHaveText('Dashboard');
    await page.context().setOffline(true);
    await shell.navItem('Events').click();

    await expect(offline.heading).toHaveText("You're offline");
    expect(offline.location()).toBe('/events');

    await page.context().setOffline(false);
    await offline.action('Try again').click();
    await expect(events.heading).toHaveText('Events');
  });
});
