import { expect, test, type ApiHandlers, type ApiReply, SIGNED_IN } from '../fixtures/test';
import { FULL_PROFILE } from '../fixtures/profiles';
import { WebEditProfileDialog } from '../page-objects/web/edit-profile.dialog';
import { WebProfilePage } from '../page-objects/web/profile.page';

const SAVE_PATH = `/api/members/${SIGNED_IN.memberId}/profile`;

/** The mock's `invalid-limits` bio: Grace's 106 characters and two more sentences, 313 in all. */
const LONG_BIO =
  `${FULL_PROFILE.bio} Sundays I walk with my sister after church, and on weekdays I squeeze in ` +
  'a run before the kids wake up. Looking for people to train with this spring and summer, and ' +
  'for a walking group on Sunday afternoons.';
/** Grace's three goals and three more: one too many. */
const SIX_GOALS = [
  ...FULL_PROFILE.goals,
  'Run with the Sunrise 5K Crew every week',
  'Try a retreat',
  'Learn to swim',
].join('\n');

const REFUSED = "Some of your changes weren't accepted. Check each field and try again.";
const FAILED = 'Nothing was lost. Check your connection and try again.';

function problem(status: number, code: string, errors?: Record<string, string[]>): ApiReply {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    json: { type: 'about:blank', title: 'Refused', status, code, ...(errors ? { errors } : {}) },
  };
}

/** Answers `GET /api/profile/me` with Grace's profile and each save with the next reply. */
function answerSaves(api: ApiHandlers, ...replies: ApiReply[]): { bodies: unknown[] } {
  api.on('GET', '/api/profile/me', () => ({ json: FULL_PROFILE }));
  const sent = { bodies: [] as unknown[] };
  api.on('PUT', SAVE_PATH, (request) => {
    sent.bodies.push(request.postDataJSON());
    return replies[Math.min(sent.bodies.length, replies.length) - 1];
  });
  return sent;
}

// L2-006 AC6 (ADR 0024): a cleared name, a bio over 300 or more than 5 goals is named in the
// dialog, nothing is sent and every value is kept (mock `invalid`, `invalid-limits`).
test.describe('Member app, edit my profile: the dialog names each field to fix', () => {
  test('a cleared name is named, nothing is sent, and typing a name clears it', async ({
    page,
    api,
  }) => {
    const sent = answerSaves(api, { json: FULL_PROFILE });
    const profile = new WebProfilePage(page);
    const dialog = new WebEditProfileDialog(page);

    await profile.open();
    await profile.editButton.click();
    await dialog.name.fill('');
    await dialog.saveButton.click();

    await expect(dialog.alertTitle).toHaveText('Check your profile');
    await expect(dialog.alert).toHaveAttribute('role', 'alert');
    await expect(dialog.alert).toBeFocused();
    await expect(dialog.alertLinks).toHaveText(['Enter your name so people know who you are']);
    await expect(dialog.name).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.name).toHaveAccessibleDescription(
      'Enter your name so people know who you are',
    );
    await expect(dialog.fieldError('Full name')).toHaveText(
      'Enter your name so people know who you are',
    );
    await expect(dialog.bio).not.toHaveAttribute('aria-invalid');
    expect(await dialog.values()).toEqual({
      name: '',
      homeChurch: 'Grace Fellowship, Scarborough',
      city: 'Toronto, ON',
      bio: FULL_PROFILE.bio,
      goals: FULL_PROFILE.goals.join('\n'),
      interests: ['Running', 'Strength', 'Basketball', 'Nutrition'],
    });
    expect(sent.bodies).toEqual([]);

    await dialog.alertLinks.click();
    await expect(dialog.name).toBeFocused();
    await dialog.name.fill('Grace');
    await expect(dialog.name).not.toHaveAttribute('aria-invalid');
    await expect(dialog.fieldError('Full name')).toHaveCount(0);
    await expect(dialog.alert).toHaveCount(0);
  });

  test('a bio over 300 characters and a sixth goal are both named, and nothing is sent', async ({
    page,
    api,
  }) => {
    const sent = answerSaves(api, { json: FULL_PROFILE });
    const profile = new WebProfilePage(page);
    const dialog = new WebEditProfileDialog(page);

    await profile.open();
    await profile.editButton.click();
    await dialog.bio.fill(LONG_BIO);
    await dialog.goals.fill(SIX_GOALS);
    await dialog.saveButton.click();

    await expect(dialog.alertTitle).toHaveText('Check your profile');
    await expect(dialog.alert).toBeFocused();
    await expect(dialog.alertLinks).toHaveText([
      'Keep your bio to 300 characters',
      'Choose up to 5 goals',
    ]);
    await expect(dialog.bio).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.bio).toHaveAccessibleDescription('Keep your bio to 300 characters');
    await expect(dialog.fieldHint('About')).toHaveCount(0);
    await expect(dialog.goals).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.goals).toHaveAccessibleDescription('Choose up to 5 goals');
    await expect(dialog.name).not.toHaveAttribute('aria-invalid');
    await expect(dialog.bio).toHaveValue(LONG_BIO);
    await expect(dialog.goals).toHaveValue(SIX_GOALS);
    expect(sent.bodies).toEqual([]);

    await dialog.alertLinks.filter({ hasText: 'Choose up to 5 goals' }).click();
    await expect(dialog.goals).toBeFocused();
  });
});

// L2-006 AC7 (ADR 0024): a refused or unanswered save keeps the dialog open with a generic
// message, and nothing changes (mock `refused`, `failed`).
test.describe('Member app, edit my profile: a save that does not go through', () => {
  test("a save the API refuses shows the generic message, never the server's words", async ({
    page,
    api,
  }) => {
    const sent = answerSaves(
      api,
      problem(400, 'field_too_long', { bio: ['<b>Server sentence</b> for bio'] }),
      { json: { ...FULL_PROFILE, city: 'Scarborough, ON' } },
    );
    const profile = new WebProfilePage(page);
    const dialog = new WebEditProfileDialog(page);

    await profile.open();
    await profile.editButton.click();
    await dialog.city.fill('Scarborough, ON');
    await dialog.saveAndAwaitAnswer();

    await expect(dialog.byRole()).toBeVisible();
    await expect(dialog.alertTitle).toHaveText('Check your profile');
    await expect(dialog.alertText).toHaveText(REFUSED);
    await expect(dialog.alert).toBeFocused();
    await expect(dialog.alertLinks).toHaveCount(0);
    await expect(dialog.dialog).not.toContainText('Server sentence');
    await expect(dialog.city).toHaveValue('Scarborough, ON');
    await expect(dialog.saveButton).toBeEnabled();
    await expect(dialog.saveButton).toHaveText('Save changes');

    await dialog.saveAndAwaitAnswer();

    await expect(dialog.dialog).toHaveCount(0);
    await expect(profile.facts).toHaveText(['Grace Fellowship, Scarborough', 'Scarborough, ON']);
    expect(sent.bodies).toHaveLength(2);
  });

  test('another member’s profile refused with forbidden shows the same generic message', async ({
    page,
    api,
  }) => {
    answerSaves(api, problem(403, 'forbidden'));
    const profile = new WebProfilePage(page);
    const dialog = new WebEditProfileDialog(page);

    await profile.open();
    await profile.editButton.click();
    await dialog.saveAndAwaitAnswer();

    await expect(dialog.alertTitle).toHaveText('Check your profile');
    await expect(dialog.alertText).toHaveText(REFUSED);
    await expect(dialog.byRole()).toBeVisible();

    // The page behind is hidden from assistive technology while the dialog shows.
    await dialog.cancelButton.click();
    await expect(profile.heading).toHaveText('Grace Thompson');
    await expect(profile.facts).toHaveText(['Grace Fellowship, Scarborough', 'Toronto, ON']);
  });

  test('a server error keeps the dialog and every value, and says nothing was lost', async ({
    page,
    api,
  }) => {
    const sent = answerSaves(api, problem(503, 'server_error'));
    const profile = new WebProfilePage(page);
    const dialog = new WebEditProfileDialog(page);

    await profile.open();
    await profile.editButton.click();
    await dialog.name.fill('Grace T. Thompson');
    await dialog.interest('Cycling').click();
    await dialog.saveAndAwaitAnswer();

    await expect(dialog.alertTitle).toHaveText("We couldn't save your changes");
    await expect(dialog.alertText).toHaveText(FAILED);
    await expect(dialog.alert).toBeFocused();
    expect(new URL(page.url()).pathname).toBe('/profile');
    expect(await dialog.values()).toEqual({
      name: 'Grace T. Thompson',
      homeChurch: 'Grace Fellowship, Scarborough',
      city: 'Toronto, ON',
      bio: FULL_PROFILE.bio,
      goals: FULL_PROFILE.goals.join('\n'),
      interests: ['Running', 'Strength', 'Basketball', 'Nutrition', 'Cycling'],
    });
    expect(sent.bodies).toHaveLength(1);

    await dialog.cancelButton.click();
    await expect(profile.heading).toHaveText('Grace Thompson');
  });

  test('while saving, the fields hold still and nothing closes the dialog', async ({
    page,
    api,
  }) => {
    answerSaves(api);
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    api.on('PUT', SAVE_PATH, async () => {
      await answered;
      return { json: { ...FULL_PROFILE, name: 'Grace T. Thompson' } };
    });
    const profile = new WebProfilePage(page);
    const dialog = new WebEditProfileDialog(page);

    await profile.open();
    await profile.editButton.click();
    await dialog.name.fill('Grace T. Thompson');
    await dialog.saveAndAwaitRequest();

    await expect(dialog.saveButton).toHaveText('Saving…');
    await expect(dialog.saveButton).toBeDisabled();
    await expect(dialog.saveButton).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.cancelButton).toBeDisabled();
    await expect(dialog.name).toHaveAttribute('readonly', '');
    await expect(dialog.bio).toHaveAttribute('readonly', '');
    await expect(dialog.goals).toHaveAttribute('readonly', '');
    await expect(dialog.interest('Cycling')).toBeDisabled();
    await dialog.closeButton.click();
    await dialog.pressEscape();
    await dialog.clickScrim();
    await expect(dialog.byRole()).toBeVisible();

    answer();

    await expect(dialog.dialog).toHaveCount(0);
    await expect(profile.heading).toHaveText('Grace T. Thompson');
  });
});
