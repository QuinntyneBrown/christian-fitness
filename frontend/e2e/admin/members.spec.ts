import { answerMembers, CAST_MEMBERS, manyMembers, memberList } from '../fixtures/admin-members';
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

  test('a tab that does not load keeps the search and the tabs, and Try again asks for that tab', async ({
    page,
    api,
  }) => {
    let fail = false;
    const asked: (string | null)[] = [];
    api.on('GET', '/api/admin/members', (request) => {
      const status = new URL(request.url()).searchParams.get('status');
      asked.push(status);
      if (fail) return { abort: true };
      return memberList(
        CAST_MEMBERS.filter((m) => status === 'all' || m.status === status),
        { total: 7 },
      );
    });
    const members = new AdminMembersPage(page);
    await members.open();
    await expect(members.subtitle).toHaveText('7 members');
    fail = true;

    await members.tab('Flagged').click();

    await expect(members.errorTitle).toHaveText("Members didn't load");
    // The count goes with the list it came with.
    await expect(members.subtitle).toHaveCount(0);
    await expect(members.search).toBeVisible();
    await expect(members.currentTab).toHaveText('Flagged');
    fail = false;
    await members.tryAgainButton.click();
    expect(await members.names()).toEqual(['Kevin Brooks']);
    await expect(members.subtitle).toHaveText('7 members');
    expect(asked).toEqual(['all', 'flagged', 'flagged']);
  });

  test("a refusal shows the same error state, never the server's words", async ({ page, api }) => {
    api.on('GET', '/api/admin/members', () => problem(400, 'validation_failed'));
    const members = new AdminMembersPage(page);

    await members.open();

    await expect(members.errorTitle).toHaveText("Members didn't load");
    await expect(members.error).not.toContainText('A sentence from the server');
  });
});

// L2-028 AC3 and AC4 (ADR 0022): a status tab keeps the members with that status; the URL names it.
test.describe('Admin app, the Members page filtered by status', () => {
  test('the tabs are links to each status, All current at first', async ({ page, api }) => {
    answerMembers(api);
    const members = new AdminMembersPage(page);

    await members.open();

    await expect(members.tabLinks).toHaveText(['All', 'Active', 'Flagged', 'Suspended']);
    await expect(members.currentTab).toHaveText('All');
    await expect(members.tab('All')).toHaveAttribute('href', '/members');
    await expect(members.tab('Active')).toHaveAttribute('href', '/members?status=active');
    await expect(members.tab('Flagged')).toHaveAttribute('href', '/members?status=flagged');
    await expect(members.tab('Suspended')).toHaveAttribute('href', '/members?status=suspended');
  });

  test('the Flagged tab asks for flagged members only and marks itself current, without reloading', async ({
    page,
    api,
  }) => {
    const asked = answerMembers(api);
    const members = new AdminMembersPage(page);
    await members.open();
    await expect(members.rows).toHaveCount(7);
    await members.mark();

    await members.tab('Flagged').click();

    await expect(members.currentTab).toHaveText('Flagged');
    await expect(members.rows).toHaveCount(1);
    expect(await members.rowTexts()).toEqual([
      ['Kevin Brooks', 'kbrooks.fit@gmail.com', 'Not given', 'Apr 2, 2026', '0', 'Flagged'],
    ]);
    expect(members.location()).toBe('/members?status=flagged');
    // The count is the community's, whatever the tab.
    await expect(members.subtitle).toHaveText('7 members');
    expect(asked).toEqual([
      { status: 'all', q: null, page: null },
      { status: 'flagged', q: null, page: null },
    ]);
    expect(await members.marked()).toBe(true);
  });

  test('the keyboard opens a tab too', async ({ page, api }) => {
    const asked = answerMembers(api);
    const members = new AdminMembersPage(page);
    await members.open();
    await expect(members.rows).toHaveCount(7);

    await members.focusAndPressEnter(members.tab('Active'));

    await expect(members.currentTab).toHaveText('Active');
    await expect(members.rows).toHaveCount(5);
    expect(asked.at(-1)).toEqual({ status: 'active', q: null, page: null });
  });

  test('opening /members?status=suspended shows the Suspended tab at once', async ({
    page,
    api,
  }) => {
    const asked = answerMembers(api);
    const members = new AdminMembersPage(page);

    await members.open('?status=suspended');

    await expect(members.currentTab).toHaveText('Suspended');
    expect(await members.names()).toEqual(['Tyler Simmons']);
    expect(asked).toEqual([{ status: 'suspended', q: null, page: null }]);
  });

  test('Back returns to the tab before', async ({ page, api }) => {
    answerMembers(api);
    const members = new AdminMembersPage(page);
    await members.open();
    await members.tab('Flagged').click();
    await expect(members.rows).toHaveCount(1);

    await page.goBack();

    await expect(members.currentTab).toHaveText('All');
    await expect(members.rows).toHaveCount(7);
  });

  // Mock admin-members/tab-empty.
  test('a status with nobody in it says so, with nothing to clear', async ({ page, api }) => {
    answerMembers(
      api,
      CAST_MEMBERS.filter((m) => m.status === 'active'),
    );
    const members = new AdminMembersPage(page);

    await members.open('?status=flagged');

    await expect(members.currentTab).toHaveText('Flagged');
    await expect(members.emptyTitle).toHaveText('No flagged members');
    await expect(members.emptyText).toHaveText(
      'A member staff flag appears here until they are reinstated or suspended.',
    );
    await expect(members.clearSearchButton).toHaveCount(0);
    await expect(members.table).toHaveCount(0);
    await expect(members.subtitle).toHaveText('5 members');
  });
});

// L2-028 AC2 and AC4 (ADR 0022): the search keeps the members whose name or email contains it.
test.describe('Admin app, the Members page searched', () => {
  test('typing asks once, after the last key, and the URL names the search', async ({
    page,
    api,
  }) => {
    const asked = answerMembers(api);
    const members = new AdminMembersPage(page);
    await members.open();
    await expect(members.rows).toHaveCount(7);
    await members.mark();

    await members.type('grace');

    await expect(members.rows).toHaveCount(1);
    expect(await members.names()).toEqual(['Grace Thompson']);
    await expect.poll(() => members.location()).toBe('/members?q=grace');
    // One question for the whole word, not one a letter.
    expect(asked).toEqual([
      { status: 'all', q: null, page: null },
      { status: 'all', q: 'grace', page: null },
    ]);
    await expect(members.search).toHaveValue('grace');
    await expect(members.search).toBeFocused();
    await expect(members.subtitle).toHaveText('7 members');
    expect(await members.marked()).toBe(true);
  });

  test('a space typed after a word stays in the field while the list is asked for', async ({
    page,
    api,
  }) => {
    const asked = answerMembers(api);
    const members = new AdminMembersPage(page);
    await members.open();
    await expect(members.rows).toHaveCount(7);

    await members.type('grace ');

    await expect(members.rows).toHaveCount(1);
    await expect(members.search).toHaveValue('grace ');
    expect(asked.at(-1)).toEqual({ status: 'all', q: 'grace', page: null });
  });

  test('typing does not fill the history: Back leaves the Members page', async ({ page, api }) => {
    answerMembers(api);
    const members = new AdminMembersPage(page);
    await page.goto('/events');
    await members.open();
    await expect(members.rows).toHaveCount(7);
    await members.type('gr');
    await expect(members.rows).toHaveCount(1);
    await members.type('ace');
    await expect.poll(() => members.location()).toBe('/members?q=grace');

    await page.goBack();

    await expect.poll(() => members.location()).toBe('/events');
  });

  test('opening /members?q=gmail shows the search in the field and its members', async ({
    page,
    api,
  }) => {
    const asked = answerMembers(api);
    const members = new AdminMembersPage(page);

    await members.open('?q=gmail');

    await expect(members.search).toHaveValue('gmail');
    expect(await members.names()).toEqual([
      'Grace Thompson',
      'Priya Nair',
      'Kevin Brooks',
      'Tyler Simmons',
    ]);
    expect(asked).toEqual([{ status: 'all', q: 'gmail', page: null }]);
  });

  test('a tab keeps the search, and the search keeps the tab', async ({ page, api }) => {
    const asked = answerMembers(api);
    const members = new AdminMembersPage(page);
    await members.open('?q=gmail');
    await expect(members.rows).toHaveCount(4);
    await expect(members.tab('Active')).toHaveAttribute('href', '/members?status=active&q=gmail');

    await members.tab('Active').click();

    await expect(members.currentTab).toHaveText('Active');
    expect(await members.names()).toEqual(['Grace Thompson', 'Priya Nair']);
    expect(members.location()).toBe('/members?status=active&q=gmail');
    await expect(members.search).toHaveValue('gmail');

    await members.search.fill('');
    await members.type('priya');

    await expect(members.rows).toHaveCount(1);
    await expect.poll(() => members.location()).toBe('/members?status=active&q=priya');
    expect(asked.at(-1)).toEqual({ status: 'active', q: 'priya', page: null });
  });

  // Mock admin-members/no-results.
  test('a search nobody matches names the term and Clear search brings everyone back', async ({
    page,
    api,
  }) => {
    answerMembers(api);
    const members = new AdminMembersPage(page);
    await members.open();
    await expect(members.rows).toHaveCount(7);

    await members.type('Jessica');

    await expect(members.emptyTitle).toHaveText('No members match “Jessica”');
    await expect(members.emptyText).toHaveText('Check the spelling, or search by email instead.');
    await expect(members.table).toHaveCount(0);
    await expect(members.search).toHaveValue('Jessica');
    await expect(members.tabLinks).toHaveCount(4);

    await members.clearSearchButton.click();

    await expect(members.rows).toHaveCount(7);
    await expect(members.search).toHaveValue('');
    expect(members.location()).toBe('/members');
    await expect(members.search).toBeFocused();
  });

  test('the term is shown as text, never as HTML', async ({ page, api }) => {
    answerMembers(api);
    const members = new AdminMembersPage(page);

    await members.open('?q=%3Cb%3EJess%3C%2Fb%3E');

    await expect(members.emptyTitle).toHaveText('No members match “<b>Jess</b>”');
    await expect(members.bold()).toHaveCount(0);
  });

  test('Escape in the search clears it and brings everyone back', async ({ page, api }) => {
    answerMembers(api);
    const members = new AdminMembersPage(page);
    await members.open('?q=grace');
    await expect(members.rows).toHaveCount(1);

    await members.search.press('Escape');

    await expect(members.rows).toHaveCount(7);
    await expect(members.search).toHaveValue('');
    await expect.poll(() => members.location()).toBe('/members');
  });
});

// L2-028 AC1 (ADR 0022): 25 members to a page, with links to the other pages.
test.describe('Admin app, the Members page in pages', () => {
  test('31 members show 25, a summary and the pages; page 2 shows the rest', async ({
    page,
    api,
  }) => {
    const asked = answerMembers(api, manyMembers(31));
    const members = new AdminMembersPage(page);
    await members.open();
    await expect(members.rows).toHaveCount(25);
    await expect(members.paginationSummary).toHaveText('Showing 1–25 of 31 members');
    await expect(members.currentPage).toHaveText('1');
    await expect(members.previousPage).toHaveAttribute('aria-disabled', 'true');
    await expect(members.pageLink(2)).toHaveAttribute('href', '/members?page=2');
    await expect(members.nextPage).toHaveAttribute('href', '/members?page=2');
    await members.mark();

    await members.pageLink(2).click();

    await expect(members.rows).toHaveCount(6);
    expect((await members.names())[0]).toBe('Member 026');
    await expect(members.paginationSummary).toHaveText('Showing 26–31 of 31 members');
    await expect(members.currentPage).toHaveText('2');
    await expect(members.nextPage).toHaveAttribute('aria-disabled', 'true');
    await expect(members.previousPage).toHaveAttribute('href', '/members');
    expect(members.location()).toBe('/members?page=2');
    expect(asked).toEqual([
      { status: 'all', q: null, page: null },
      { status: 'all', q: null, page: '2' },
    ]);
    expect(await members.marked()).toBe(true);
    // Focus follows to the list, so a keyboard user reads the new page from its top.
    await expect(members.tableRegion).toBeFocused();
  });

  test('the pages stay in place while the next page loads', async ({ page, api }) => {
    const all = manyMembers(31);
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    api.on('GET', '/api/admin/members', async (request) => {
      const asked = new URL(request.url()).searchParams.get('page');
      if (asked !== '2') return memberList(all.slice(0, 25), { matches: 31, total: 31 });
      await gate;
      return memberList(all.slice(25), { matches: 31, total: 31, page: 2 });
    });
    const members = new AdminMembersPage(page);
    await members.open();
    await expect(members.rows).toHaveCount(25);

    await members.focusAndPressEnter(members.nextPage);

    await expect(members.loading).toBeVisible();
    await expect(members.currentPage).toHaveText('2');
    await expect(members.paginationSummary).toHaveCount(0);
    release();
    await expect(members.rows).toHaveCount(6);
    await expect(members.paginationSummary).toHaveText('Showing 26–31 of 31 members');
  });

  test('the pages of one list do not stand under another while it loads', async ({ page, api }) => {
    const all = manyMembers(31);
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    api.on('GET', '/api/admin/members', async (request) => {
      if (new URL(request.url()).searchParams.get('status') === 'all') {
        return memberList(all.slice(0, 25), { matches: 31, total: 31 });
      }
      await gate;
      return memberList([], { matches: 0, total: 31 });
    });
    const members = new AdminMembersPage(page);
    await members.open();
    await expect(members.pagination).toBeVisible();

    await members.tab('Flagged').click();

    await expect(members.loading).toBeVisible();
    await expect(members.pagination).toHaveCount(0);
    release();
    await expect(members.emptyTitle).toHaveText('No flagged members');
    await expect(members.pagination).toHaveCount(0);
  });

  test('a page past the last shows the last page the API answers', async ({ page, api }) => {
    answerMembers(api, manyMembers(31));
    const members = new AdminMembersPage(page);

    await members.open('?page=9');

    await expect(members.rows).toHaveCount(6);
    await expect(members.currentPage).toHaveText('2');
    await expect(members.paginationSummary).toHaveText('Showing 26–31 of 31 members');
  });

  test('a search or a tab returns to the first page, and the pages keep the search', async ({
    page,
    api,
  }) => {
    const asked = answerMembers(api, manyMembers(60));
    const members = new AdminMembersPage(page);
    await members.open('?page=2');
    await expect(members.rows).toHaveCount(25);
    await expect(members.tab('Active')).toHaveAttribute('href', '/members?status=active');

    await members.type('member 0');

    await expect.poll(() => members.location()).toBe('/members?q=member%200');
    await expect(members.currentPage).toHaveText('1');
    await expect(members.paginationSummary).toHaveText('Showing 1–25 of 60 members');
    await expect(members.pageLink(3)).toHaveAttribute('href', '/members?q=member%200&page=3');
    expect(asked.at(-1)).toEqual({ status: 'all', q: 'member 0', page: null });
  });
});
