import { answerPreferences } from '../fixtures/preferences';
import { expect, test, XSRF_TOKEN, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { WebDeleteAccountDialog } from '../page-objects/web/delete-account.dialog';
import { WebMemberShell } from '../page-objects/web/member-shell.page';
import { PreferencesPage } from '../page-objects/web/preferences.page';

const TEXT =
  "If you delete your account, you'll be signed out immediately and your event places will go back to other members. Your profile, registrations and follows are removed after 30 days. Messages you sent will show as removed. Messages others sent you aren't affected. You can restore your account during the 30 days; after that, deletion can't be undone.";

const SIGNED_OUT: ApiReply = {
  status: 401,
  headers: { 'content-type': 'application/problem+json' },
  json: { status: 401, code: 'unauthenticated' },
};

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    // A server sentence the dialog must never show (L2-032 AC1).
    json: { type: 'about:blank', title: 'Server words', detail: 'Server detail', status, code },
  };
}

interface SentDeletion {
  body: unknown;
  token: string | undefined;
}

/**
 * Answers `POST /api/account/deletion` with `reply`, after `held` when given; a 204 ends the
 * session, as on the server. Answers each body and antiforgery header sent.
 */
function answerDeletion(api: ApiHandlers, reply: ApiReply, held?: Promise<void>): SentDeletion[] {
  const sent: SentDeletion[] = [];
  api.on('POST', '/api/account/deletion', async (request) => {
    sent.push({ body: request.postDataJSON(), token: request.headers()['x-xsrf-token'] });
    await held;
    if (reply.status === 204) api.on('GET', '/api/session', () => SIGNED_OUT);
    return reply;
  });
  return sent;
}

/** Opens Preferences and the dialog from Your data's "Delete account". */
async function openDialog(preferences: PreferencesPage): Promise<void> {
  await preferences.open();
  await preferences.deleteAccount.click();
}

// L2-066 AC4, AC5 (journey 36; mocks preferences/default, dialogs/delete-account): "Delete
// account" in Your data opens the dialog that names the account and says what happens; typing
// "delete" and confirming asks the API once, signs the member out and lands on the front page.
test.describe('Member app, Preferences: delete your account', () => {
  test(
    'typing "delete" and confirming deletes the account and lands signed out on the front page',
    { tag: '@critical' },
    async ({ page, api }) => {
      answerPreferences(api);
      const sent = answerDeletion(api, { status: 204 });
      const preferences = new PreferencesPage(page);
      const dialog = new WebDeleteAccountDialog(page);
      const shell = new WebMemberShell(page);

      await preferences.open();
      await expect(preferences.deleteRow.locator('.pref__legend')).toHaveText(
        'Delete your account',
      );
      await expect(preferences.deleteRow.locator('.pref__desc')).toHaveText(
        'Erases your profile and sent message text after 30 days',
      );
      await preferences.deleteAccount.click();

      await expect(dialog.byRole()).toBeVisible();
      await expect(dialog.title).toHaveText('Delete your account?');
      await expect(dialog.subtitle).toHaveText('Grace Thompson · grace.thompson@gmail.com');
      await expect(dialog.text).toHaveText(TEXT);
      await expect(dialog.keepButton).toBeFocused();
      await dialog.confirm.fill('delete');
      await dialog.deleteButton.click();

      await expect.poll(() => shell.location()).toBe('/');
      await expect(shell.header).toHaveCount(0);
      await expect(dialog.dialog).toHaveCount(0);
      expect(sent).toEqual([{ body: { confirm: 'delete' }, token: XSRF_TOKEN }]);
    },
  );

  test('while it is on its way, both buttons are disabled and the second reads "Deleting…"', async ({
    page,
    api,
  }) => {
    answerPreferences(api);
    let answer!: () => void;
    answerDeletion(api, { status: 204 }, new Promise<void>((resolve) => (answer = resolve)));
    const preferences = new PreferencesPage(page);
    const dialog = new WebDeleteAccountDialog(page);

    await openDialog(preferences);
    await dialog.confirm.fill('delete');
    await dialog.deleteButton.click();

    await expect(dialog.deleteButton).toHaveText('Deleting…');
    await expect(dialog.deleteButton).toBeDisabled();
    await expect(dialog.deleteButton).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.keepButton).toBeDisabled();
    await expect(dialog.confirm).toHaveAttribute('readonly');
    answer();
    await expect.poll(() => preferences.path()).toBe('/');
  });

  test('another word marks the field, says what to type and sends nothing', async ({
    page,
    api,
  }) => {
    answerPreferences(api);
    const sent = answerDeletion(api, { status: 204 });
    const preferences = new PreferencesPage(page);
    const dialog = new WebDeleteAccountDialog(page);

    await openDialog(preferences);
    await dialog.confirm.fill('delet');
    await dialog.deleteButton.click();

    await expect(dialog.confirmError).toHaveText('Type the word delete to confirm.');
    await expect(dialog.confirm).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.confirm).toHaveAttribute('aria-describedby', 'f-confirm-error');
    await expect(dialog.confirm).toHaveValue('delet');
    await expect(dialog.confirm).toBeFocused();
    expect(sent).toEqual([]);

    // The word in any case, with spaces around it, is the word (ADR 0118).
    await dialog.confirm.fill(' Delete ');
    await dialog.deleteButton.click();
    await expect.poll(() => preferences.path()).toBe('/');
    expect(sent.map((s) => s.body)).toEqual([{ confirm: ' Delete ' }]);
  });

  const refusals: [string, ApiReply, string, string][] = [
    [
      'a failure',
      problem(500, 'error'),
      "We couldn't delete your account",
      'Nothing was changed. Try again in a moment.',
    ],
    [
      'no answer',
      { abort: true },
      "We couldn't delete your account",
      'Nothing was changed. Try again in a moment.',
    ],
    [
      'a staff account',
      problem(403, 'staff_account'),
      "We can't delete this account",
      "Staff accounts can't be deleted here. Ask an Admin.",
    ],
  ];
  for (const [name, reply, title, text] of refusals) {
    test(`${name} keeps the dialog with its alert and the word as typed`, async ({ page, api }) => {
      answerPreferences(api);
      answerDeletion(api, reply);
      const preferences = new PreferencesPage(page);
      const dialog = new WebDeleteAccountDialog(page);

      await openDialog(preferences);
      await dialog.confirm.fill('delete');
      await dialog.deleteButton.click();

      await expect(dialog.alertTitle).toHaveText(title);
      await expect(dialog.alertText).toHaveText(text);
      await expect(dialog.alert).toHaveAttribute('role', 'alert');
      await expect(dialog.alert).toBeFocused();
      await expect(dialog.dialog).not.toContainText('Server');
      await expect(dialog.confirm).toHaveValue('delete');
      await expect(dialog.deleteButton).toHaveText('Delete my account');
      await expect(dialog.deleteButton).toBeEnabled();
      expect(preferences.path()).toBe('/preferences');
    });
  }

  test('"Keep my account", Close and Escape leave with nothing sent and focus on the opener', async ({
    page,
    api,
  }) => {
    answerPreferences(api);
    const sent = answerDeletion(api, { status: 204 });
    const preferences = new PreferencesPage(page);
    const dialog = new WebDeleteAccountDialog(page);

    await openDialog(preferences);
    await dialog.confirm.fill('delete');
    await dialog.keepButton.click();
    await expect(dialog.dialog).toHaveCount(0);
    await expect(preferences.deleteAccount).toBeFocused();

    await preferences.deleteAccount.click();
    await dialog.closeButton.click();
    await expect(dialog.dialog).toHaveCount(0);

    await preferences.deleteAccount.press('Enter');
    await dialog.pressEscape();
    await expect(dialog.dialog).toHaveCount(0);
    await expect(preferences.deleteAccount).toBeFocused();

    expect(sent).toEqual([]);
    expect(preferences.path()).toBe('/preferences');
  });
});
