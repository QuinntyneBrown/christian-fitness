import { expect, test } from '../fixtures/test';
import { answerListingProfile, EASTSIDE_OWNED, LAKESHORE } from '../fixtures/listing-profile';
import { OwnerListingEditorDialog } from '../page-objects/web/owner-listing-editor.dialog';
import { WebListingProfilePage } from '../page-objects/web/listing-profile.page';

// L2-079 (journey 20; ADR 0093): the member who owns a listing edits it from its profile
// (mocks `listing-profile/owner` and `owner-listing-editor/`).
test.describe('Member app, edit my listing', () => {
  test('The owner sees Edit listing in place of Follow and Message, and it opens the editor on the listing as it stands', async ({
    page,
    api,
  }) => {
    answerListingProfile(api, [EASTSIDE_OWNED]);
    const profile = new WebListingProfilePage(page);
    const editor = new OwnerListingEditorDialog(page);

    await profile.open(EASTSIDE_OWNED.id);

    await expect(profile.editListingButton).toBeVisible();
    await expect(profile.followButton).toHaveCount(0);
    await expect(profile.messageButton).toHaveCount(0);

    await profile.editListingButton.click();

    await expect(editor.dialog).toBeVisible();
    await expect(editor.title).toHaveText('Edit your listing');
    await expect(editor.subtitle).toHaveText('Eastside Ladies Who Lift · Changes go live at once');
    await expect(editor.labels).toHaveText([
      'Name',
      'About',
      'Website (optional)',
      'Photo (optional)',
      'Focus',
      'Contact email (optional)',
    ]);
    expect(await editor.values()).toEqual({
      name: 'Eastside Ladies Who Lift',
      about:
        'About 25 women, coached by a CSEP trainer. We pray before and after and are so welcoming to beginners.',
      website: 'https://eastsideladies.ca',
      photo: 'No photo yet',
      focus: 'Strength, Beginners, Women',
      contact: 'eastsideladies@example.org',
    });
    await expect(editor.nameHint).toHaveText(
      'Changing the name or the kind sends the listing back to staff to check',
    );
    await expect(editor.focusHint).toHaveText('Up to 6, separated by commas');
    await expect(editor.contactHint).toHaveText('Shown to members who message you');
    await expect(editor.name).toBeFocused();

    await editor.cancelButton.click();

    await expect(editor.dialog).toHaveCount(0);
    await expect(profile.editListingButton).toBeFocused();
  });

  test('A member who does not own the listing sees Follow and Message, never Edit listing', async ({
    page,
    api,
  }) => {
    answerListingProfile(api, [LAKESHORE]);
    const profile = new WebListingProfilePage(page);

    await profile.open(LAKESHORE.id);

    await expect(profile.messageButton).toBeVisible();
    await expect(profile.followButton).toBeVisible();
    await expect(profile.editListingButton).toHaveCount(0);
  });
});
