import { answerMembers, CAST_MEMBERS, type AdminMemberFixture } from '../fixtures/admin-members';
import { problem } from '../fixtures/admin-events';
import { expect, test, type ApiHandlers } from '../fixtures/test';
import { AdminMembersPage } from '../page-objects/admin/members.page';
import { ModerateMemberDialog } from '../page-objects/admin/moderate-member.dialog';

const PRIYA = CAST_MEMBERS[2]!;
const KEVIN = CAST_MEMBERS[3]!;
const TYLER = CAST_MEMBERS[6]!;
const NOTE = 'Two members asked about messages from this account';

interface Sent {
  path: string;
  body: unknown;
}

/**
 * Answers the list from a copy of the cast and each flag, suspend or reinstate as the API does: the member
 * changes, their row is answered, and the list shows them changed from then on. Records what was
 * sent.
 */
function answerModeration(api: ApiHandlers, all: AdminMemberFixture[] = CAST_MEMBERS): Sent[] {
  const members = all.map((m) => ({ ...m }));
  const sent: Sent[] = [];
  answerMembers(api, members);
  api.on('POST', /^\/api\/admin\/members\/[^/]+\/(flag|suspend|reinstate)$/, (request) => {
    const path = new URL(request.url()).pathname;
    const body = request.postDataJSON() as { note: string } | null;
    sent.push({ path, body });
    const [, , , , id, action] = path.split('/');
    const member = members.find((m) => m.id === id)!;
    member.status = action === 'flag' ? 'flagged' : action === 'suspend' ? 'suspended' : 'active';
    member.note = body?.note ?? null;
    return { json: member };
  });
  return sent;
}

// L2-029 AC1 and AC9 (ADR 0028): each row shows its note and offers what its status allows.
test.describe('Admin app, the Members page before moderating', () => {
  test('a note shows under its status, and every row has Moderate', async ({ page, api }) => {
    answerMembers(api);
    const members = new AdminMembersPage(page);

    await members.open();

    await expect(members.rows).toHaveCount(7);
    expect(await members.notes()).toEqual([
      '',
      '',
      '',
      'Promoting supplements in 3 group chats',
      '',
      '',
      'Spam messages, suspended Apr 4',
    ]);
    // Every status allows something: Tyler Simmons, Suspended, can be reinstated.
    await expect(members.moderateButtons()).toHaveCount(7);
    await expect(members.moderateButton('Priya Nair')).toBeVisible();
    await expect(members.moderateButton('Kevin Brooks')).toBeVisible();
    await expect(members.moderateButton('Tyler Simmons')).toBeVisible();
  });

  test('a note is rendered as text, never as HTML', async ({ page, api }) => {
    answerMembers(api, [{ ...KEVIN, note: '<b>Spam</b>' }]);
    const members = new AdminMembersPage(page);

    await members.open();

    await expect(members.rows).toHaveCount(1);
    expect(await members.notes()).toEqual(['<b>Spam</b>']);
    await expect(members.bold()).toHaveCount(0);
  });
});

// L2-029 AC1 (ADR 0028; mock moderate-member/default).
test.describe('Admin app, flagging a member', () => {
  test('Moderate opens the dialog on Flag; a note flags the member and the list shows it', async ({
    page,
    api,
  }) => {
    const sent = answerModeration(api);
    const members = new AdminMembersPage(page);
    const dialog = new ModerateMemberDialog(page);
    await members.open();

    await members.moderateButton('Priya Nair').click();

    await expect(dialog.dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog.dialog).toHaveAccessibleName('Moderate Priya Nair');
    await expect(dialog.dialog).toHaveAccessibleDescription('priya.nair@gmail.com · Active');
    await expect(dialog.flagChoice).toBeChecked();
    await expect.poll(() => dialog.isFocused(dialog.flagChoice)).toBe(true);
    await expect(dialog.confirmation).toHaveCount(0);
    await expect(dialog.noteHint).toHaveText(
      "Staff see this on the member's row. 500 characters left.",
    );
    await expect(dialog.submitButton).toHaveText('Flag member');

    await dialog.note.fill(`  ${NOTE} `);
    await dialog.submitButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(sent).toEqual([{ path: `/api/admin/members/${PRIYA.id}/flag`, body: { note: NOTE } }]);
    await expect(members.toastTitle).toHaveText('Priya Nair flagged');
    await expect(members.toastText).toHaveText(
      'They can still use the app. Your note is on their row.',
    );
    await expect(members.rows).toHaveCount(7);
    expect((await members.rowTexts())[2]?.[5]).toBe('Flagged');
    expect((await members.notes())[2]).toBe(NOTE);
    // The row that opened the dialog was drawn again: focus goes to the list.
    await expect(members.tableRegion).toBeFocused();
  });

  test('the whole flag works from the keyboard', async ({ page, api }) => {
    const sent = answerModeration(api);
    const members = new AdminMembersPage(page);
    const dialog = new ModerateMemberDialog(page);
    await members.open();

    await members.focusAndPressEnter(members.moderateButton('Priya Nair'));
    await expect.poll(() => dialog.isFocused(dialog.flagChoice)).toBe(true);
    await page.keyboard.press('Tab');
    await expect(dialog.note).toBeFocused();
    await page.keyboard.type(NOTE);
    await page.keyboard.press('Tab');
    await expect(dialog.cancelButton).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.submitButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(dialog.dialog).toHaveCount(0);
    expect(sent).toHaveLength(1);
  });

  test('Cancel, Close, Escape and the scrim each close it, send nothing and give focus back', async ({
    page,
    api,
  }) => {
    const sent = answerModeration(api);
    const members = new AdminMembersPage(page);
    const dialog = new ModerateMemberDialog(page);
    await members.open();
    const closers = [
      () => dialog.cancelButton.click(),
      () => dialog.closeButton.click(),
      () => dialog.pressEscape(),
      () => dialog.clickScrim(),
    ];

    for (const close of closers) {
      await members.moderateButton('Priya Nair').click();
      await expect(dialog.dialog).toBeVisible();
      await dialog.note.fill(NOTE);
      await close();
      await expect(dialog.dialog).toHaveCount(0);
      await expect(members.moderateButton('Priya Nair')).toBeFocused();
    }

    expect(sent).toEqual([]);
    await expect(members.toast).toHaveCount(0);
  });

  test("the member's name is shown as text in the dialog", async ({ page, api }) => {
    answerModeration(api, [{ ...PRIYA, name: '<b>Priya</b>' }]);
    const members = new AdminMembersPage(page);
    const dialog = new ModerateMemberDialog(page);
    await members.open();

    await members.moderateButtons().first().click();

    await expect(dialog.title).toHaveText('Moderate <b>Priya</b>');
    await expect(dialog.dialog.locator('b')).toHaveCount(0);
  });
});

// L2-029 AC2 and AC5 (ADR 0028; mocks moderate-member/suspend, flagged, invalid, busy).
test.describe('Admin app, suspending a member', () => {
  test('Suspend asks for the note and the confirmation, names what is missing, then suspends', async ({
    page,
    api,
  }) => {
    const sent = answerModeration(api);
    const members = new AdminMembersPage(page);
    const dialog = new ModerateMemberDialog(page);
    await members.open();
    await members.moderateButton('Priya Nair').click();

    await dialog.suspendChoice.check();

    await expect(dialog.confirmation).toHaveAccessibleName(
      'Suspend Priya Nair and end their sessions',
    );
    await expect(dialog.confirmation).not.toBeChecked();
    await expect(dialog.submitButton).toHaveText('Suspend member');

    await dialog.submitButton.click();

    await expect(dialog.alertTitle).toHaveText('2 things to fix');
    await expect(dialog.alert).toBeFocused();
    await expect(dialog.alertLinks).toHaveText([
      'Write a note so other staff know why',
      'Confirm that Priya Nair should be suspended',
    ]);
    await expect(dialog.note).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.noteError).toHaveText('Write a note so other staff know why');
    await expect(dialog.confirmation).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.confirmationError).toHaveText(
      'Confirm that Priya Nair should be suspended',
    );
    expect(sent).toEqual([]);

    await dialog.alertLinks.nth(1).click();
    await expect(dialog.confirmation).toBeFocused();
    await page.keyboard.press('Space');
    await expect(dialog.confirmationError).toHaveCount(0);
    await dialog.alertLinks.first().click();
    await expect(dialog.note).toBeFocused();
    await dialog.note.fill('Spam messages to the Sunrise 5K group');
    await expect(dialog.noteError).toHaveCount(0);
    await dialog.submitButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(sent).toEqual([
      {
        path: `/api/admin/members/${PRIYA.id}/suspend`,
        body: { note: 'Spam messages to the Sunrise 5K group', confirmed: true },
      },
    ]);
    await expect(members.toastTitle).toHaveText('Priya Nair suspended');
    await expect(members.toastText).toHaveText(
      'They are signed out everywhere and cannot sign in.',
    );
    expect((await members.rowTexts())[2]?.[5]).toBe('Suspended');
    // A suspended row can still be moderated: it can be reinstated.
    await expect(members.moderateButton('Priya Nair')).toBeVisible();
  });

  test('a flag with no note names only the note', async ({ page, api }) => {
    const sent = answerModeration(api);
    const members = new AdminMembersPage(page);
    const dialog = new ModerateMemberDialog(page);
    await members.open();
    await members.moderateButton('Priya Nair').click();

    await dialog.submitButton.click();

    await expect(dialog.alertTitle).toHaveText('1 thing to fix');
    await expect(dialog.alertLinks).toHaveText(['Write a note so other staff know why']);
    expect(sent).toEqual([]);
  });

  test('every press that finds something missing moves focus back to the summary', async ({
    page,
    api,
  }) => {
    answerModeration(api);
    const members = new AdminMembersPage(page);
    const dialog = new ModerateMemberDialog(page);
    await members.open();
    await members.moderateButton('Priya Nair').click();
    await dialog.submitButton.click();
    await expect(dialog.alert).toBeFocused();
    await dialog.flagChoice.focus();
    await expect(dialog.alert).not.toBeFocused();

    await dialog.submitButton.click();

    await expect(dialog.alertTitle).toHaveText('1 thing to fix');
    await expect(dialog.alert).toBeFocused();
  });

  test('a note over 500 characters counts what is over and is not sent', async ({ page, api }) => {
    const sent = answerModeration(api);
    const members = new AdminMembersPage(page);
    const dialog = new ModerateMemberDialog(page);
    await members.open();
    await members.moderateButton('Priya Nair').click();

    await dialog.note.fill('n'.repeat(503));

    await expect(dialog.noteError).toHaveText('3 characters over');
    await dialog.submitButton.click();
    await expect(dialog.alertLinks).toHaveText(['Use 500 characters or fewer']);
    expect(sent).toEqual([]);
  });

  // Mock moderate-member/flagged-suspend.
  test('a Flagged member can be suspended once Suspend is chosen over Reinstate', async ({
    page,
    api,
  }) => {
    const sent = answerModeration(api);
    const members = new AdminMembersPage(page);
    const dialog = new ModerateMemberDialog(page);
    await members.open();
    await members.moderateButton('Kevin Brooks').click();
    await expect(dialog.dialog).toHaveAccessibleName('Moderate Kevin Brooks');
    await expect(dialog.note).toHaveCount(0);

    await dialog.suspendChoice.check();

    await expect(dialog.note).toHaveValue('');
    await expect(dialog.confirmation).toBeVisible();
    await dialog.note.fill('Still promoting supplements');
    await dialog.confirmation.check();
    await dialog.submitButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(sent).toEqual([
      {
        path: `/api/admin/members/${KEVIN.id}/suspend`,
        body: { note: 'Still promoting supplements', confirmed: true },
      },
    ]);
  });

  // Mock moderate-member/busy: a gate holds the answer, so no clock is needed.
  test('while the change is on its way the dialog holds still and cannot be closed', async ({
    page,
    api,
  }) => {
    answerMembers(api);
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let posts = 0;
    api.on('POST', `/api/admin/members/${PRIYA.id}/suspend`, async () => {
      posts += 1;
      await gate;
      return { json: { ...PRIYA, status: 'suspended', note: NOTE } };
    });
    const members = new AdminMembersPage(page);
    const dialog = new ModerateMemberDialog(page);
    await members.open();
    await members.moderateButton('Priya Nair').click();
    await dialog.suspendChoice.check();
    await dialog.note.fill(NOTE);
    await dialog.confirmation.check();

    await dialog.submitButton.click();

    await expect(dialog.submitButton).toHaveText('Saving…');
    await expect(dialog.submitButton).toBeDisabled();
    await expect(dialog.submitButton).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.cancelButton).toBeDisabled();
    await expect(dialog.note).toHaveAttribute('readonly', '');
    await expect(dialog.confirmation).toBeDisabled();
    await expect(dialog.flagChoice).toBeDisabled();
    await dialog.pressEscape();
    await dialog.clickScrim();
    await dialog.closeButton.click();
    await expect(dialog.dialog).toBeVisible();
    release();
    await expect(dialog.dialog).toHaveCount(0);
    expect(posts).toBe(1);
  });
});

// L2-029 AC4, AC6 and AC7 (ADR 0028; mocks moderate-member/refused, failed): refusals by code.
test.describe('Admin app, a moderation the API refuses', () => {
  for (const [why, reply, heading] of [
    [
      "staff's own account",
      problem(403, 'cannot_moderate_self'),
      "You can't moderate your own account",
    ],
    [
      'a Moderator moderating staff',
      problem(403, 'forbidden_role'),
      'Only an Admin can moderate staff',
    ],
    ['a status that moved', problem(409, 'status_conflict'), 'This member has changed'],
    ['a member who is gone', problem(404, 'member_not_found'), 'This member has changed'],
    ['a server error', problem(500, 'server_error'), "Couldn't save the change"],
    ['no answer', { abort: true }, "Couldn't save the change"],
  ] as const) {
    test(`${why} says "${heading}" and keeps the note`, async ({ page, api }) => {
      answerMembers(api);
      api.on('POST', `/api/admin/members/${PRIYA.id}/flag`, () => reply);
      const members = new AdminMembersPage(page);
      const dialog = new ModerateMemberDialog(page);
      await members.open();
      await members.moderateButton('Priya Nair').click();
      await dialog.note.fill(NOTE);

      await dialog.submitButton.click();

      await expect(dialog.alertTitle).toHaveText(heading);
      await expect(dialog.alert).toHaveAttribute('role', 'alert');
      await expect(dialog.alert).toBeFocused();
      await expect(dialog.alert).not.toContainText('A sentence from the server');
      await expect(dialog.note).toHaveValue(NOTE);
      await expect(dialog.note).not.toHaveAttribute('readonly', '');
      await expect(dialog.submitButton).toHaveText('Flag member');
      await expect(dialog.submitButton).toBeEnabled();
      await expect(members.toast).toHaveCount(0);
    });
  }

  test('after a failure, trying again saves the change', async ({ page, api }) => {
    const sent = answerModeration(api);
    let fail = true;
    const answer = (request: Parameters<Parameters<ApiHandlers['on']>[2]>[0]) => {
      if (fail) return problem(500, 'server_error');
      sent.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() });
      return { json: { ...PRIYA, status: 'flagged', note: NOTE } };
    };
    api.on('POST', `/api/admin/members/${PRIYA.id}/flag`, answer);
    const members = new AdminMembersPage(page);
    const dialog = new ModerateMemberDialog(page);
    await members.open();
    await members.moderateButton('Priya Nair').click();
    await dialog.note.fill(NOTE);
    await dialog.submitButton.click();
    await expect(dialog.alertTitle).toHaveText("Couldn't save the change");
    fail = false;

    await dialog.submitButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(sent).toEqual([{ path: `/api/admin/members/${PRIYA.id}/flag`, body: { note: NOTE } }]);
    await expect(members.toastTitle).toHaveText('Priya Nair flagged');
  });
});

// L2-029 AC3 (ADR 0029; mocks moderate-member/flagged, suspended).
test.describe('Admin app, reinstating a member', () => {
  test('a Flagged member is offered Reinstate first, with no note, and is Active again', async ({
    page,
    api,
  }) => {
    const sent = answerModeration(api);
    const members = new AdminMembersPage(page);
    const dialog = new ModerateMemberDialog(page);
    await members.open();

    await members.moderateButton('Kevin Brooks').click();

    await expect(dialog.dialog).toHaveAccessibleName('Moderate Kevin Brooks');
    await expect(dialog.dialog).toHaveAccessibleDescription('kbrooks.fit@gmail.com · Flagged');
    await expect(dialog.reinstateChoice).toBeChecked();
    await expect.poll(() => dialog.isFocused(dialog.reinstateChoice)).toBe(true);
    await expect(dialog.flagChoice).toHaveCount(0);
    await expect(dialog.suspendChoice).not.toBeChecked();
    await expect(dialog.note).toHaveCount(0);
    await expect(dialog.confirmation).toHaveCount(0);
    await expect(dialog.submitButton).toHaveText('Reinstate member');

    await dialog.submitButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(sent).toEqual([{ path: `/api/admin/members/${KEVIN.id}/reinstate`, body: null }]);
    await expect(members.toastTitle).toHaveText('Kevin Brooks reinstated');
    await expect(members.toastText).toHaveText('They are Active again and can sign in.');
    expect((await members.rowTexts())[3]?.[5]).toBe('Active');
    expect((await members.notes())[3]).toBe('');
    await expect(members.tableRegion).toBeFocused();
  });

  test('a Suspended member can only be reinstated: no choice, no field, and the dialog says what it means', async ({
    page,
    api,
  }) => {
    const sent = answerModeration(api);
    const members = new AdminMembersPage(page);
    const dialog = new ModerateMemberDialog(page);
    await members.open();

    await members.moderateButton('Tyler Simmons').click();

    await expect(dialog.dialog).toHaveAccessibleName('Reinstate Tyler Simmons');
    await expect(dialog.dialog).toHaveAccessibleDescription('tsimmons22@gmail.com · Suspended');
    await expect(dialog.dialog).toBeFocused();
    await expect(dialog.actions).toHaveCount(0);
    await expect(dialog.note).toHaveCount(0);
    await expect(dialog.confirmation).toHaveCount(0);
    await expect(dialog.info).toHaveAttribute('role', 'status');
    await expect(dialog.info).toContainText('Tyler Simmons will be able to sign in again');
    await expect(dialog.info).toContainText(
      'Their status goes back to Active and the note on their row is cleared.',
    );
    await expect(dialog.submitButton).toHaveText('Reinstate member');

    await dialog.submitButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(sent).toEqual([{ path: `/api/admin/members/${TYLER.id}/reinstate`, body: null }]);
    await expect(members.toastTitle).toHaveText('Tyler Simmons reinstated');
    expect((await members.rowTexts())[6]?.[5]).toBe('Active');
    expect((await members.notes())[6]).toBe('');
  });

  test('switching from Suspend back to Reinstate drops what Suspend asked for', async ({
    page,
    api,
  }) => {
    const sent = answerModeration(api);
    const members = new AdminMembersPage(page);
    const dialog = new ModerateMemberDialog(page);
    await members.open();
    await members.moderateButton('Kevin Brooks').click();
    await dialog.suspendChoice.check();
    await dialog.submitButton.click();
    await expect(dialog.alertTitle).toHaveText('2 things to fix');

    await dialog.reinstateChoice.check();

    await expect(dialog.alert).toHaveCount(0);
    await expect(dialog.note).toHaveCount(0);
    await dialog.submitButton.click();
    await expect(dialog.dialog).toHaveCount(0);
    expect(sent).toEqual([{ path: `/api/admin/members/${KEVIN.id}/reinstate`, body: null }]);
  });

  test('a reinstatement the API refuses says the member has changed', async ({ page, api }) => {
    answerMembers(api);
    api.on('POST', `/api/admin/members/${TYLER.id}/reinstate`, () =>
      problem(409, 'status_conflict'),
    );
    const members = new AdminMembersPage(page);
    const dialog = new ModerateMemberDialog(page);
    await members.open();
    await members.moderateButton('Tyler Simmons').click();

    await dialog.submitButton.click();

    await expect(dialog.alertTitle).toHaveText('This member has changed');
    await expect(dialog.alert).toBeFocused();
    await expect(dialog.submitButton).toBeEnabled();
    await expect(members.toast).toHaveCount(0);
  });
});
