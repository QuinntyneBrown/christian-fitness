import { answerMembers, CAST_MEMBERS, memberList } from '../fixtures/admin-members';
import { problem } from '../fixtures/admin-events';
import { expect, test } from '../fixtures/test';
import { AdminMembersPage } from '../page-objects/admin/members.page';

// L2-028 AC1 (ADR 0022): the Members page lists the members with name, initials, email, church,
// joined date in Toronto, events attended and status, and says how many members there are.
test.describe('Admin app, the Members page', () => {
  test('lists the members as the default mock draws them', async ({ page, api }) => {
    const asked = answerMembers(api, CAST_MEMBERS, 2431);
    const members = new AdminMembersPage(page);

    await members.open();

    await expect(members.heading).toHaveText('Members');
    await expect.poll(() => members.title()).toBe('Members · Christian Fitness Admin');
    await expect(members.subtitle).toHaveText('2,431 members');
    await expect(members.search).toHaveAttribute('placeholder', 'Search name or email');
    await expect(members.search).toHaveValue('');
    await expect(members.rows).toHaveCount(7);
    expect(await members.rowTexts()).toEqual([
      [
        'Grace Thompson',
        'grace.thompson@gmail.com',
        'Grace Fellowship, Scarborough',
        'Jan 12, 2026',
        '9',
        'Active',
      ],
      [
        'Michael Chen',
        'mchen.runs@outlook.com',
        'Toronto Chinese Baptist',
        'Nov 3, 2025',
        '14',
        'Active',
      ],
      [
        'Priya Nair',
        'priya.nair@gmail.com',
        'Hope Church Mississauga',
        'Feb 20, 2026',
        '5',
        'Active',
      ],
      ['Kevin Brooks', 'kbrooks.fit@gmail.com', 'Not given', 'Apr 2, 2026', '0', 'Flagged'],
      ['Adaeze Kalu', 'adaeze.k@yahoo.ca', 'RCCG Jesus House', 'Dec 8, 2025', '11', 'Active'],
      ['Jordan Reid', 'jreid@rogers.com', 'The Meeting House', 'Mar 15, 2026', '2', 'Active'],
      ['Tyler Simmons', 'tsimmons22@gmail.com', 'Not given', 'Mar 30, 2026', '0', 'Suspended'],
    ]);
    await expect(members.avatars()).toHaveText(['GT', 'MC', 'PN', 'KB', 'AK', 'JR', 'TS']);
    // One page of members needs no pages under the table.
    await expect(members.pagination).toHaveCount(0);
    expect(asked).toEqual([{ status: 'all', q: null, page: null }]);
  });

  test('a status is a word in a badge, so colour is not its only carrier', async ({
    page,
    api,
  }) => {
    answerMembers(api);
    const members = new AdminMembersPage(page);

    await members.open();

    await expect(members.statuses()).toHaveText([
      'Active',
      'Active',
      'Active',
      'Flagged',
      'Active',
      'Active',
      'Suspended',
    ]);
    await expect(members.statuses().nth(3)).toHaveClass(/status--flagged/);
    await expect(members.statuses().nth(6)).toHaveClass(/status--suspended/);
    await expect(members.statuses().nth(0)).toHaveClass(/status--active/);
  });

  test('a join date is read in Toronto, whatever the instant says in UTC', async ({
    page,
    api,
  }) => {
    // 3:30 AM UTC on April 3 is 11:30 PM on April 2 in Toronto.
    answerMembers(api, [{ ...CAST_MEMBERS[3]!, joinedAt: '2026-04-03T03:30:00+00:00' }]);
    const members = new AdminMembersPage(page);

    await members.open();

    await expect(members.rows).toHaveCount(1);
    expect((await members.rowTexts())[0]?.[3]).toBe('Apr 2, 2026');
  });

  test('names, emails and churches are rendered as text, never as HTML', async ({ page, api }) => {
    answerMembers(api, [
      {
        ...CAST_MEMBERS[0]!,
        name: '<b>Grace</b>',
        email: '<b>grace</b>@gmail.com',
        homeChurch: '<b>Fellowship</b>',
      },
    ]);
    const members = new AdminMembersPage(page);

    await members.open();

    await expect(members.rows).toHaveCount(1);
    expect((await members.rowTexts())[0]?.slice(0, 3)).toEqual([
      '<b>Grace</b>',
      '<b>grace</b>@gmail.com',
      '<b>Fellowship</b>',
    ]);
    await expect(members.bold()).toHaveCount(0);
  });

  test('one member is counted in the singular', async ({ page, api }) => {
    answerMembers(api, [CAST_MEMBERS[0]!]);
    const members = new AdminMembersPage(page);

    await members.open();

    await expect(members.subtitle).toHaveText('1 member');
  });

  // Mock admin-members/loading: a gate holds the answer, so no clock is needed.
  test('while the members load, skeleton rows are busy and no count shows yet', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    api.on('GET', '/api/admin/members', async () => {
      await gate;
      return memberList(CAST_MEMBERS);
    });
    const members = new AdminMembersPage(page);

    await members.open();

    await expect(members.loading).toBeVisible();
    // Five columns, seven rows.
    await expect(members.skeletons).toHaveCount(35);
    await expect(members.subtitle).toHaveCount(0);
    await expect(members.search).toBeVisible();
    await expect(members.tabLinks).toHaveText(['All', 'Active', 'Flagged', 'Suspended']);
    release();
    await expect(members.rows).toHaveCount(7);
    await expect(members.loading).toHaveCount(0);
    await expect(members.subtitle).toHaveText('7 members');
  });

  // Mock admin-members/empty; the fixture's default answer is a community of nobody.
  test('with no members at all, says where members come from', async ({ page }) => {
    const members = new AdminMembersPage(page);

    await members.open();

    await expect(members.subtitle).toHaveText('0 members');
    await expect(members.emptyTitle).toHaveText('No members yet');
    await expect(members.emptyText).toHaveText(
      'Members appear here when they create an account in the member app.',
    );
    await expect(members.clearSearchButton).toHaveCount(0);
    await expect(members.table).toHaveCount(0);
  });
});

// L2-028 AC5 (ADR 0022): members that cannot be loaded show the error state; Try again asks again.
test.describe('Admin app, the Members page when the members do not load', () => {
  test('no answer shows "Members didn\'t load", and Try again loads them', async ({
    page,
    api,
  }) => {
    let fail = true;
    api.on('GET', '/api/admin/members', () => (fail ? { abort: true } : memberList(CAST_MEMBERS)));
    const members = new AdminMembersPage(page);

    await members.open();

    await expect(members.error).toHaveAttribute('role', 'alert');
    await expect(members.errorTitle).toHaveText("Members didn't load");
    await expect(members.errorText).toHaveText(
      "We couldn't reach the server. Try again in a moment.",
    );
    await expect(members.table).toHaveCount(0);
    await expect(members.subtitle).toHaveCount(0);
    fail = false;
    await members.tryAgainButton.click();
    await expect(members.rows).toHaveCount(7);
    await expect(members.error).toHaveCount(0);
    await expect(members.subtitle).toHaveText('7 members');
  });

  test("a refusal shows the same error state, never the server's words", async ({ page, api }) => {
    api.on('GET', '/api/admin/members', () => problem(400, 'validation_failed'));
    const members = new AdminMembersPage(page);

    await members.open();

    await expect(members.errorTitle).toHaveText("Members didn't load");
    await expect(members.error).not.toContainText('A sentence from the server');
  });
});
