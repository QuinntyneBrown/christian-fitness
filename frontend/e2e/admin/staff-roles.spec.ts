import {
  expect,
  MODERATOR_SIGNED_IN,
  STAFF_SIGNED_IN,
  test,
  type ApiHandlers,
} from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';
import { AdminForbiddenPage } from '../page-objects/admin/forbidden.page';

const LEAD =
  'Events and Services are run by admins. As a moderator, you look after members from the Dashboard and Members.';
const NOTE = 'Need to manage events or services? Ask a community director to make you an admin.';

/** The session answers a signed-in Moderator (L2-019; ADR 0020). */
function signedInAsModerator(api: ApiHandlers): void {
  api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
}

// L2-019 AC5 (ADR 0020): a Moderator's navigation lists only the areas their role opens.
test.describe('Admin app, a Moderator', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the navigation lists Dashboard and Members only, and names the role', async ({
    page,
    api,
  }) => {
    signedInAsModerator(api);
    const shell = new AdminShell(page);

    await shell.open();

    await expect(shell.heading).toHaveText('Dashboard');
    await expect(shell.navItems).toHaveText(['Dashboard', 'Members']);
    expect(
      await shell.navItems.evaluateAll((items) => items.map((i) => i.getAttribute('href'))),
    ).toEqual(['/', '/members']);
    await expect(shell.currentItem).toHaveText('Dashboard');
    await expect(shell.userName).toHaveText('Joel Mensah');
    await expect(shell.userRole).toHaveText('Moderator');
  });

  test('Members opens from the navigation', async ({ page, api }) => {
    signedInAsModerator(api);
    const shell = new AdminShell(page);

    await shell.open();
    await shell.navItem('Members').click();

    await expect(shell.heading).toHaveText('Members');
    expect(shell.location()).toBe('/members');
    await expect(shell.currentItem).toHaveText('Members');
  });
});

// L2-019 AC5 (ADR 0020): an area the role does not open shows "Admins only" in its place, with the
// address kept, so a reload asks again.
test.describe('Admin app, a Moderator on an Admins-only area', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const path of ['/events', '/services']) {
    test(`opening ${path} by its address shows "Admins only" as the mock draws it`, async ({
      page,
      api,
    }) => {
      signedInAsModerator(api);
      const shell = new AdminShell(page);
      const forbidden = new AdminForbiddenPage(page);

      await shell.open(path);

      await expect(forbidden.heading).toHaveText('Admins only');
      await expect(forbidden.heading).toBeFocused();
      await expect(forbidden.main).toHaveCount(1);
      await expect(forbidden.lead).toHaveText(LEAD);
      await expect(forbidden.buttons).toHaveCount(0);
      await expect(forbidden.links).toHaveCount(1);
      await expect(forbidden.dashboardLink).toHaveText('Go to dashboard');
      await expect(forbidden.dashboardLink).toHaveAttribute('href', '/');
      await expect(forbidden.note).toHaveText(NOTE);
      expect(forbidden.location()).toBe(path);
      expect(await forbidden.title()).toBe('Admins only · Christian Fitness Admin');
      await expect(shell.sidebar).toHaveCount(0);
      const box = await forbidden.dashboardLinkBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
    });
  }

  test('Go to dashboard, by keyboard, opens the Dashboard', async ({ page, api }) => {
    signedInAsModerator(api);
    const shell = new AdminShell(page);
    const forbidden = new AdminForbiddenPage(page);

    await shell.open('/events');
    await expect(forbidden.heading).toBeFocused();
    await forbidden.goToDashboardByKeyboard();

    await expect(shell.heading).toHaveText('Dashboard');
    expect(shell.location()).toBe('/');
    await expect(shell.navItems).toHaveText(['Dashboard', 'Members']);
  });

  // L2-019 AC4: an Admin made Moderator while signed in meets the new role on their next screen.
  test('an Admin made Moderator while working meets "Admins only" on their next move to Events', async ({
    page,
    api,
  }) => {
    let demoted = false;
    api.on('GET', '/api/admin/session', () => ({
      json: demoted ? MODERATOR_SIGNED_IN : STAFF_SIGNED_IN,
    }));
    const shell = new AdminShell(page);
    const forbidden = new AdminForbiddenPage(page);

    await shell.open('/');
    await expect(shell.navItems).toHaveText(['Dashboard', 'Events', 'Services', 'Members']);
    demoted = true;
    await shell.navItem('Events').click();

    await expect(forbidden.heading).toHaveText('Admins only');
    expect(forbidden.location()).toBe('/events');
  });
});
