import { expect, test, type ApiHandlers, SIGNED_IN } from '../fixtures/test';
import { FULL_PROFILE, NEW_PROFILE } from '../fixtures/profiles';
import { WebEditProfileDialog } from '../page-objects/web/edit-profile.dialog';
import { WebProfilePage } from '../page-objects/web/profile.page';

const SAVE_PATH = `/api/members/${SIGNED_IN.memberId}/profile`;

/** Answers `GET /api/profile/me` with `profile`. */
function answerProfile(api: ApiHandlers, profile: unknown): void {
  api.on('GET', '/api/profile/me', () => ({ json: profile }));
}

/** Answers each save with the profile as the server would store it, and keeps every body sent. */
function answerSaves(api: ApiHandlers, saved: unknown): { bodies: unknown[] } {
  const sent = { bodies: [] as unknown[] };
  api.on('PUT', SAVE_PATH, (request) => {
    sent.bodies.push(request.postDataJSON());
    return { json: saved };
  });
  return sent;
}

/** Grace's profile as the server answers it after the save in the first spec. */
const SAVED = {
  ...FULL_PROFILE,
  name: 'Grace T. Thompson',
  city: 'Scarborough, ON',
  showHomeChurch: true,
  bio: 'Mom of two. Training for my first half marathon.',
  goals: ['Half marathon in the fall', 'Sleep before 11', 'Run with the Sunrise 5K Crew'],
  interests: ['running', 'strength', 'basketball', 'nutrition', 'cycling'],
};

// L2-006 AC1, AC2 and AC4 (ADR 0024): Edit profile opens a dialog with the current values, the
// home church hidden until shown; a valid save shows the new values and closes the dialog.
test.describe('Member app, edit my profile', () => {
  test('Edit profile opens a dialog with the current values, the home church hidden', async ({
    page,
    api,
  }) => {
    answerProfile(api, FULL_PROFILE);
    const profile = new WebProfilePage(page);
    const dialog = new WebEditProfileDialog(page);

    await profile.open();
    await profile.editButton.click();

    await expect(dialog.byRole()).toBeVisible();
    expect(await dialog.isModal()).toBe(true);
    await expect(dialog.title).toHaveText('Edit profile');
    await expect(dialog.name).toBeFocused();
    expect(await dialog.values()).toEqual({
      name: 'Grace Thompson',
      homeChurch: 'Grace Fellowship, Scarborough',
      city: 'Toronto, ON',
      showHomeChurch: false,
      bio: FULL_PROFILE.bio,
      goals: 'Half marathon in the fall\nStrength twice a week\nSleep before 11',
      interests: ['Running', 'Strength', 'Basketball', 'Nutrition'],
    });
    await expect(dialog.fieldHint('Home church')).toHaveText(
      'Hidden from other members unless you show it',
    );
    // 300 less the 106 characters of the bio.
    await expect(dialog.fieldHint('About')).toHaveText('A sentence or two. 194 characters left.');
    await expect(dialog.fieldHint('Goals this year')).toHaveText('One per line, up to 5');
    await expect(dialog.interestLegend).toHaveText('Into');
    await expect(dialog.interests).toHaveText([
      'Running',
      'Strength',
      'Basketball',
      'Walking groups',
      'Mobility',
      'Nutrition',
      'Cycling',
      'Retreats',
    ]);
    await expect(dialog.saveButton).toHaveText('Save changes');
    await expect(dialog.cancelButton).toHaveText('Cancel');
  });

  test('a valid save sends the changes, closes the dialog and shows the new values', async ({
    page,
    api,
  }) => {
    answerProfile(api, FULL_PROFILE);
    const sent = answerSaves(api, SAVED);
    const profile = new WebProfilePage(page);
    const dialog = new WebEditProfileDialog(page);

    await profile.open();
    await profile.editButton.click();
    await dialog.name.fill('  Grace T. Thompson ');
    await dialog.city.fill('Scarborough, ON');
    await dialog.showHomeChurch.check();
    await dialog.bio.fill('Mom of two. Training for my first half marathon.');
    // A blank line is not a goal; each line is trimmed.
    await dialog.goals.fill(
      'Half marathon in the fall\n\n  Sleep before 11 \nRun with the Sunrise 5K Crew',
    );
    await dialog.interest('Cycling').click();
    await expect(dialog.fieldHint('About')).toHaveText('A sentence or two. 252 characters left.');
    await dialog.saveAndAwaitAnswer();

    expect(sent.bodies).toEqual([
      {
        name: 'Grace T. Thompson',
        city: 'Scarborough, ON',
        homeChurch: 'Grace Fellowship, Scarborough',
        showHomeChurch: true,
        bio: 'Mom of two. Training for my first half marathon.',
        goals: ['Half marathon in the fall', 'Sleep before 11', 'Run with the Sunrise 5K Crew'],
        interests: ['running', 'strength', 'basketball', 'nutrition', 'cycling'],
      },
    ]);
    await expect(dialog.dialog).toHaveCount(0);
    await expect(dialog.scrim).toHaveCount(0);
    await expect(profile.heading).toHaveText('Grace T. Thompson');
    await expect(profile.avatar).toHaveText('GT');
    await expect(profile.facts).toHaveText(['Grace Fellowship, Scarborough', 'Scarborough, ON']);
    await expect(profile.bio).toHaveText('Mom of two. Training for my first half marathon.');
    await expect(profile.goals).toHaveText([
      'Half marathon in the fall',
      'Sleep before 11',
      'Run with the Sunrise 5K Crew',
    ]);
    await expect(profile.tags).toHaveText([
      'Running',
      'Strength',
      'Basketball',
      'Nutrition',
      'Cycling',
    ]);
    await expect(profile.editButton).toBeFocused();
  });

  test('a blank city, church and bio are sent as none', async ({ page, api }) => {
    answerProfile(api, FULL_PROFILE);
    const sent = answerSaves(api, { ...FULL_PROFILE, city: null, homeChurch: null, bio: null });
    const profile = new WebProfilePage(page);
    const dialog = new WebEditProfileDialog(page);

    await profile.open();
    await profile.editButton.click();
    await dialog.homeChurch.fill('  ');
    await dialog.city.fill('');
    await dialog.bio.fill(' ');
    await dialog.saveAndAwaitAnswer();

    expect(sent.bodies).toEqual([
      {
        name: 'Grace Thompson',
        city: null,
        homeChurch: null,
        showHomeChurch: false,
        bio: null,
        goals: FULL_PROFILE.goals,
        interests: FULL_PROFILE.interests,
      },
    ]);
    await expect(dialog.dialog).toHaveCount(0);
    await expect(profile.facts).toHaveCount(0);
    await expect(profile.emptyTexts.first()).toHaveText(
      'Add a short bio so people at events know who you are.',
    );
  });

  test('Cancel, Close, Escape and the scrim each close the dialog and change nothing', async ({
    page,
    api,
  }) => {
    answerProfile(api, FULL_PROFILE);
    const sent = answerSaves(api, SAVED);
    const profile = new WebProfilePage(page);
    const dialog = new WebEditProfileDialog(page);
    await profile.open();

    for (const close of [
      () => dialog.cancelButton.click(),
      () => dialog.closeButton.click(),
      () => dialog.pressEscape(),
      () => dialog.clickScrim(),
    ]) {
      await profile.editButton.click();
      await expect(dialog.name).toBeFocused();
      await dialog.name.fill('Someone Else');
      await close();

      await expect(dialog.dialog).toHaveCount(0);
      await expect(profile.heading).toHaveText('Grace Thompson');
      await expect(profile.editButton).toBeFocused();
    }
    // Opening again starts from the profile, not from what was typed and dropped.
    await profile.editButton.click();
    await expect(dialog.name).toHaveValue('Grace Thompson');
    expect(sent.bodies).toEqual([]);
  });

  test('a new profile’s Add a bio opens the same dialog', async ({ page, api }) => {
    answerProfile(api, NEW_PROFILE);
    const profile = new WebProfilePage(page);
    const dialog = new WebEditProfileDialog(page);

    await profile.open();
    await profile.addBioButton.click();

    await expect(dialog.byRole()).toBeVisible();
    expect(await dialog.values()).toEqual({
      name: 'Grace Thompson',
      homeChurch: '',
      city: '',
      showHomeChurch: false,
      bio: '',
      goals: '',
      interests: [],
    });
    await expect(dialog.fieldHint('About')).toHaveText('A sentence or two. 300 characters left.');
  });

  test('a member edits their profile with the keyboard alone', async ({ page, api }) => {
    answerProfile(api, FULL_PROFILE);
    const sent = answerSaves(api, { ...FULL_PROFILE, name: 'Grace Thompson-Lee' });
    const profile = new WebProfilePage(page);
    const dialog = new WebEditProfileDialog(page);

    await profile.open();
    await profile.editButton.focus();
    await page.keyboard.press('Enter');
    await expect(dialog.name).toBeFocused();
    await page.keyboard.press('End');
    await page.keyboard.type('-Lee');
    // Enter in a field submits the form.
    const answered = page.waitForResponse((response) => response.url().endsWith(SAVE_PATH));
    await page.keyboard.press('Enter');
    await answered;

    await expect(dialog.dialog).toHaveCount(0);
    await expect(profile.heading).toHaveText('Grace Thompson-Lee');
    expect(sent.bodies).toHaveLength(1);
  });

  test('names and bios are shown in the dialog as text, never as markup', async ({ page, api }) => {
    const markup = '<img src=x onerror="document.title=1">';
    answerProfile(api, { ...FULL_PROFILE, name: `Grace ${markup}`, bio: `Bio ${markup}` });
    const profile = new WebProfilePage(page);
    const dialog = new WebEditProfileDialog(page);

    await profile.open();
    await profile.editButton.click();

    await expect(dialog.name).toHaveValue(`Grace ${markup}`);
    await expect(dialog.bio).toHaveValue(`Bio ${markup}`);
    await expect(profile.images('x')).toHaveCount(0);
  });
});
