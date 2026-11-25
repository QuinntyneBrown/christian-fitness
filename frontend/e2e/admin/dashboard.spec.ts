import {
  activity,
  answerActivity,
  answerAwaiting,
  BUSY_WEEKS,
  SOME_AWAITING,
  THREE_SUGGESTIONS,
  type AwaitingFixture,
} from '../fixtures/admin-dashboard';
import { MODERATOR_SIGNED_IN } from '../fixtures/api-handlers';
import { expect, test } from '../fixtures/test';
import { AdminDashboardPage } from '../page-objects/admin/dashboard.page';

// L2-020 AC4 (ADR 0000): staff see the new members, registrations and messages of each of the
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

// L2-020 AC7 to AC10 (slice 28.2; ADR 0060): the work waiting for staff, each item linked to the
// screen that resolves it, whatever the community activity does.
test.describe('Admin app, the Dashboard work awaiting staff', () => {
  test(
    'lists the pending applications then the flagged members, each with its Review link',
    { tag: '@critical' },
    async ({ page, api }) => {
      const asked = answerAwaiting(api, SOME_AWAITING);
      const dashboard = new AdminDashboardPage(page);

      await dashboard.open();

      await expect(dashboard.attentionHeading).toHaveText('Needs attention 4');
      await expect(dashboard.attentionItems).toHaveCount(4);
      expect(await dashboard.attentionTexts()).toEqual([
        {
          title: 'Hannah Bergstrom applied to list services',
          meta: 'Registered massage therapist · Apr 13',
          href: '/services',
        },
        {
          title: 'Samuel Osei applied to list services',
          meta: 'Strength coach · Apr 12',
          href: '/services',
        },
        {
          title: 'Lena Park, RD applied to list services',
          meta: 'Sports dietitian · Apr 10',
          href: '/services',
        },
        {
          title: 'Kevin Brooks was flagged',
          meta: 'Promoting supplements in 3 group chats',
          href: '/members?status=flagged',
        },
      ]);
      await expect(dashboard.seeAllLinks).toHaveCount(0);
      expect(asked.asked).toBe(1);
    },
  );

  // L2-020 AC11 (ADR 0090), mock admin-dashboard/default: the suggestions are one line, counted each.
  test('names the waiting suggestions in one line ahead of the applications, and Check opens Listings', async ({
    page,
    api,
  }) => {
    answerAwaiting(api, { ...SOME_AWAITING, suggestions: THREE_SUGGESTIONS });
    const dashboard = new AdminDashboardPage(page);

    await dashboard.open();

    await expect(dashboard.attentionHeading).toHaveText('Needs attention 7');
    await expect(dashboard.attentionItems).toHaveCount(5);
    expect((await dashboard.attentionTexts())[0]).toEqual({
      title: '3 listings suggested by members',
      meta: 'Eastside Ladies Who Lift, Coach Marcus Delaney, Rooted Physio',
      href: '/listings',
    });
    expect((await dashboard.attentionTexts())[1]?.title).toBe(
      'Hannah Bergstrom applied to list services',
    );
    expect(await dashboard.attentionActions()).toEqual([
      'Check 3 listings suggested by members',
      'Review Hannah Bergstrom applied to list services',
      'Review Samuel Osei applied to list services',
      'Review Lena Park, RD applied to list services',
      'Review Kevin Brooks was flagged',
    ]);
    await expect(dashboard.seeAllLinks).toHaveCount(0);
  });

  test('with more waiting than shown, says how many and links to all of them', async ({
    page,
    api,
  }) => {
    answerAwaiting(api, {
      applications: { total: 7, items: SOME_AWAITING.applications!.items },
      flaggedMembers: { total: 5, items: SOME_AWAITING.flaggedMembers.items },
    });
    const dashboard = new AdminDashboardPage(page);

    await dashboard.open();

    await expect(dashboard.attentionHeading).toHaveText('Needs attention 12');
    await expect(dashboard.seeAllLinks).toHaveText([
      'All 7 pending applications',
      'All 5 flagged members',
    ]);
    await expect(dashboard.seeAllLinks.nth(0)).toHaveAttribute('href', '/services');
    await expect(dashboard.seeAllLinks.nth(1)).toHaveAttribute('href', '/members?status=flagged');
  });

  test('renders what members wrote as text, never as markup', async ({ page, api }) => {
    answerAwaiting(api, {
      flaggedMembers: {
        total: 1,
        items: [{ id: 'x1', name: '<b>Kevin</b>', note: '<img src=x onerror=alert(1)>' }],
      },
    });
    const dashboard = new AdminDashboardPage(page);

    await dashboard.open();

    await expect(dashboard.attentionItems).toHaveCount(1);
    expect(await dashboard.attentionTexts()).toEqual([
      {
        title: '<b>Kevin</b> was flagged',
        meta: '<img src=x onerror=alert(1)>',
        href: '/members?status=flagged',
      },
    ]);
    await expect(dashboard.attention.locator('b, img')).toHaveCount(0);
  });

  // Mock admin-dashboard/loading.
  test('while it loads, the section is busy with skeleton rows', async ({ page, api }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    api.on('GET', '/api/admin/dashboard/awaiting', async () => {
      await gate;
      return { json: SOME_AWAITING };
    });
    const dashboard = new AdminDashboardPage(page);

    await dashboard.open();

    await expect(dashboard.attentionLoading).toBeVisible();
    release();
    await expect(dashboard.attentionItems).toHaveCount(4);
    await expect(dashboard.attentionLoading).toHaveCount(0);
  });

  // Mock admin-dashboard/empty; the fixture's default answer is nothing waiting.
  test('with nothing waiting, says staff are all caught up', async ({ page }) => {
    const dashboard = new AdminDashboardPage(page);

    await dashboard.open();

    await expect(dashboard.attentionHeading).toHaveText('Needs attention 0');
    await expect(dashboard.attentionEmpty.locator('.empty-state__title')).toHaveText(
      "You're all caught up",
    );
    await expect(dashboard.attentionEmpty.locator('.empty-state__text')).toHaveText(
      'New applications and member reports show up here as they come in.',
    );
    await expect(dashboard.attentionItems).toHaveCount(0);
  });

  // Mock admin-dashboard/partial, the other way round: the activity is up, this part is not.
  test('when it does not load, shows a generic error that Try again repeats, and the activity stays', async ({
    page,
    api,
  }) => {
    answerActivity(api, BUSY_WEEKS);
    let fail = true;
    api.on('GET', '/api/admin/dashboard/awaiting', () =>
      fail
        ? { status: 404, json: { code: 'a_secret_code', detail: 'A sentence from the server' } }
        : { json: SOME_AWAITING },
    );
    const dashboard = new AdminDashboardPage(page);

    await dashboard.open();

    await expect(dashboard.attentionError).toHaveAttribute('role', 'alert');
    await expect(dashboard.attentionError.locator('.empty-state__title')).toHaveText(
      "Work waiting didn't load",
    );
    await expect(dashboard.attentionError).not.toContainText('A sentence from the server');
    await expect(dashboard.rows).toHaveCount(8);
    fail = false;
    await dashboard.attentionTryAgain.click();
    await expect(dashboard.attentionItems).toHaveCount(4);
    await expect(dashboard.attentionError).toHaveCount(0);
  });

  test('when the activity does not load, the waiting work still shows', async ({ page, api }) => {
    answerAwaiting(api, SOME_AWAITING);
    api.on('GET', '/api/admin/dashboard/activity', () => ({
      status: 404,
      json: { code: 'a_secret_code' },
    }));
    const dashboard = new AdminDashboardPage(page);

    await dashboard.open();

    await expect(dashboard.errorTitle).toHaveText("Activity didn't load");
    await expect(dashboard.attentionItems).toHaveCount(4);
  });

  // Mock admin-dashboard/moderator: only what a Moderator may act on, which is the flagged members.
  test('a Moderator is shown the flagged members and no application', async ({ page, api }) => {
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    const moderators: AwaitingFixture = { flaggedMembers: SOME_AWAITING.flaggedMembers };
    answerAwaiting(api, moderators);
    const dashboard = new AdminDashboardPage(page);

    await dashboard.open();

    await expect(dashboard.attentionHeading).toHaveText('Needs attention 1');
    expect(await dashboard.attentionTexts()).toEqual([
      {
        title: 'Kevin Brooks was flagged',
        meta: 'Promoting supplements in 3 group chats',
        href: '/members?status=flagged',
      },
    ]);
    await expect(dashboard.attention).not.toContainText('applied to list services');
  });

  // L2-020 AC11 (ADR 0090): a Moderator reviews suggestions too; one is worded as one.
  test('a Moderator is shown a single suggestion as one listing suggested by a member', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    answerAwaiting(api, {
      flaggedMembers: { total: 0, items: [] },
      suggestions: { total: 1, items: [{ id: 's1', name: '<b>Rooted</b> Physio' }] },
    });
    const dashboard = new AdminDashboardPage(page);

    await dashboard.open();

    await expect(dashboard.attentionHeading).toHaveText('Needs attention 1');
    expect(await dashboard.attentionTexts()).toEqual([
      { title: '1 listing suggested by a member', meta: '<b>Rooted</b> Physio', href: '/listings' },
    ]);
    await expect(dashboard.attention.locator('b')).toHaveCount(0);
  });

  test('a Moderator with no flagged member is told only about reports', async ({ page, api }) => {
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    answerAwaiting(api, { flaggedMembers: { total: 0, items: [] } });
    const dashboard = new AdminDashboardPage(page);

    await dashboard.open();

    await expect(dashboard.attentionEmpty.locator('.empty-state__text')).toHaveText(
      'New member reports show up here as they come in.',
    );
  });
});
