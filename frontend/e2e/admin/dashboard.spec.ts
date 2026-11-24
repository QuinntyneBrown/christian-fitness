import { activity, answerActivity, BUSY_WEEKS } from '../fixtures/admin-dashboard';
import { MODERATOR_SIGNED_IN } from '../fixtures/api-handlers';
import { expect, test } from '../fixtures/test';
import { AdminDashboardPage } from '../page-objects/admin/dashboard.page';

// L2-020 AC4 (ADR 0058): staff see the new members, registrations and messages of each of the
// last eight weeks, the current week first.
test.describe('Admin app, the Dashboard community activity', () => {
  test('shows each week newest first with its three counts, the current week named', async ({
    page,
    api,
  }) => {
    const asked = answerActivity(api, BUSY_WEEKS);
    const dashboard = new AdminDashboardPage(page);

    await dashboard.open();

    await expect(dashboard.heading).toHaveText('Dashboard');
    await expect.poll(() => dashboard.title()).toBe('Dashboard · Christian Fitness Admin');
    await expect(dashboard.activityHeading).toBeVisible();
    await expect(dashboard.columnHeaders).toHaveText([
      'Week of',
      'New members',
      'Registrations',
      'Messages',
    ]);
    await expect(dashboard.rows).toHaveCount(8);
    expect(await dashboard.rowTexts()).toEqual([
      ['Apr 13 (this week)', '6', '14', '187'],
      ['Apr 6', '40', '88', '1,204'],
      ['Mar 30', '27', '70', '902'],
      ['Mar 23', '31', '63', '721'],
      ['Mar 16', '22', '57', '640'],
      ['Mar 9', '9', '38', '498'],
      ['Mar 2', '18', '44', '523'],
      ['Feb 23', '12', '31', '410'],
    ]);
    expect(asked.asked).toBe(1);
  });

  // Mock admin-dashboard/loading: a gate holds the answer, so no clock is needed.
  test('while the activity loads, the table is busy with skeleton rows', async ({ page, api }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    api.on('GET', '/api/admin/dashboard/activity', async () => {
      await gate;
      return activity(BUSY_WEEKS);
    });
    const dashboard = new AdminDashboardPage(page);

    await dashboard.open();

    await expect(dashboard.loading).toBeVisible();
    await expect(dashboard.heading).toHaveText('Dashboard');
    release();
    await expect(dashboard.rows).toHaveCount(8);
    await expect(dashboard.loading).toHaveCount(0);
  });

  // Mock admin-dashboard/empty; the fixture's default answer is eight quiet weeks.
  test('with no activity in any week, says where it comes from', async ({ page }) => {
    const dashboard = new AdminDashboardPage(page);

    await dashboard.open();

    await expect(dashboard.emptyTitle).toHaveText('No activity yet');
    await expect(dashboard.emptyText).toHaveText(
      'New members, registrations and messages show up here week by week.',
    );
    await expect(dashboard.table).toHaveCount(0);
  });

  // Mock admin-dashboard/error.
  test('when it does not load, shows the generic error, and Try again asks again', async ({
    page,
    api,
  }) => {
    let fail = true;
    api.on('GET', '/api/admin/dashboard/activity', () =>
      fail
        ? { status: 404, json: { code: 'a_secret_code', detail: 'A sentence from the server' } }
        : activity(BUSY_WEEKS),
    );
    const dashboard = new AdminDashboardPage(page);

    await dashboard.open();

    await expect(dashboard.error).toHaveAttribute('role', 'alert');
    await expect(dashboard.errorTitle).toHaveText("Activity didn't load");
    await expect(dashboard.errorText).toHaveText(
      "We couldn't reach the server. Try again in a moment.",
    );
    await expect(dashboard.error).not.toContainText('A sentence from the server');
    fail = false;
    await dashboard.tryAgainButton.click();
    await expect(dashboard.rows).toHaveCount(8);
    await expect(dashboard.error).toHaveCount(0);
  });

  // Mock admin-dashboard/moderator: a Moderator sees the activity too.
  test('a Moderator sees the same activity', async ({ page, api }) => {
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    answerActivity(api, BUSY_WEEKS);
    const dashboard = new AdminDashboardPage(page);

    await dashboard.open();

    await expect(dashboard.rows).toHaveCount(8);
  });
});
