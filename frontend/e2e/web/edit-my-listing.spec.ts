import { expect, test } from '../fixtures/test';
import {
  answerListingProfile,
  answerOwnListingPhoto,
  answerOwnListingSave,
  EASTSIDE_OWNED,
  LAKESHORE,
} from '../fixtures/listing-profile';
import { OwnerListingEditorDialog } from '../page-objects/web/owner-listing-editor.dialog';
import { WebListingProfilePage } from '../page-objects/web/listing-profile.page';

// L2-079 (journey 20; ADR 0095): the member who owns a listing edits it from its profile
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

  test(
    'Saving the about, website, focus and contact reads Saving…, goes live at once on the page and says so in a toast',
    { tag: '@critical' },
    async ({ page, api }) => {
      answerListingProfile(api, [EASTSIDE_OWNED]);
      let answer!: () => void;
      const held = new Promise<void>((resolve) => (answer = resolve));
      const saved = {
        ...EASTSIDE_OWNED,
        description: 'Thirty women now, still coached by a CSEP trainer.',
        websiteUrl: 'https://eastsidestrength.ca',
        focus: ['Strength', 'Women', 'Prayer'],
        owner: { contactEmail: 'hello@eastside.example', pendingName: null, pendingKind: null },
      };
      const sent = answerOwnListingSave(api, () => ({ listing: saved, hold: held }));
      const profile = new WebListingProfilePage(page);
      const editor = new OwnerListingEditorDialog(page);
      await profile.open(EASTSIDE_OWNED.id);
      await profile.editListingButton.click();

      await editor.about.fill('Thirty women now, still coached by a CSEP trainer.');
      await editor.website.fill('eastsidestrength.ca');
      await editor.focus.fill('Strength,  Women, , Prayer ');
      await editor.contact.fill('hello@eastside.example');
      await editor.saveButton.click();

      await expect(editor.saveButton).toHaveText('Saving…');
      await expect(editor.saveButton).toHaveAttribute('aria-busy', 'true');
      await expect(editor.saveButton).toBeDisabled();
      await expect(editor.textInputs.first()).toHaveAttribute('readonly', '');
      answer();

      await expect(editor.dialog).toHaveCount(0);
      expect(sent).toEqual([
        {
          name: 'Eastside Ladies Who Lift',
          kind: 'organization',
          about: 'Thirty women now, still coached by a CSEP trainer.',
          website: 'eastsidestrength.ca',
          photoKey: null,
          focus: ['Strength', 'Women', 'Prayer'],
          contactEmail: 'hello@eastside.example',
        },
      ]);
      await expect(profile.aboutText).toHaveText(
        'Thirty women now, still coached by a CSEP trainer.',
      );
      await expect(profile.focusTags).toHaveText(['Strength', 'Women', 'Prayer']);
      await expect
        .poll(() => profile.successToastViews())
        .toEqual([['Your listing is updated', 'Your changes are live in the directory.']]);
      await expect(profile.editListingButton).toBeFocused();
    },
  );

  test('A website the server refuses is marked on its field with a focused summary, and what was typed stays', async ({
    page,
    api,
  }) => {
    answerListingProfile(api, [EASTSIDE_OWNED]);
    const sent = answerOwnListingSave(api, () => ({
      status: 400,
      code: 'validation_failed',
      fieldCodes: { website: 'website_invalid' },
    }));
    const profile = new WebListingProfilePage(page);
    const editor = new OwnerListingEditorDialog(page);
    await profile.open(EASTSIDE_OWNED.id);
    await profile.editListingButton.click();

    await editor.website.fill('eastsideladies');
    await editor.about.fill('Thirty women now.');
    await editor.saveButton.click();

    await expect(editor.alertTitle).toHaveText('1 thing to fix before saving');
    await expect(editor.alertLinks).toHaveText(['Enter a web address like eastsideladies.ca']);
    await expect(editor.alertLinks).toHaveAttribute('href', '#f-website');
    await expect(editor.alert).toBeFocused();
    await expect(editor.website).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.name).not.toHaveAttribute('aria-invalid', 'true');
    await expect(editor.dialog.locator('#f-website-error')).toHaveText(
      'Enter a web address like eastsideladies.ca',
    );
    await expect(editor.saveButton).toHaveText('Save changes');
    expect([await editor.website.inputValue(), await editor.about.inputValue()]).toEqual([
      'eastsideladies',
      'Thirty women now.',
    ]);
    expect(sent).toHaveLength(1);

    await editor.website.fill('eastsideladies.ca');
    await expect(editor.website).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('A chosen photo is uploaded at once and saved by its key; one that is not an image is refused on its field, and Remove clears it', async ({
    page,
    api,
  }) => {
    answerListingProfile(api, [EASTSIDE_OWNED]);
    const key = '0193a9c0000070008000000000ea5101.png';
    const uploads = answerOwnListingPhoto(api, (n) =>
      n === 0
        ? { status: 400, code: 'validation_failed', fieldCodes: { photo: 'photo_invalid' } }
        : { photoKey: key },
    );
    const sent = answerOwnListingSave(api, (_, body) => ({
      listing: { ...EASTSIDE_OWNED, photoKey: body.photoKey },
    }));
    const profile = new WebListingProfilePage(page);
    const editor = new OwnerListingEditorDialog(page);
    await profile.open(EASTSIDE_OWNED.id);
    await profile.editListingButton.click();

    await editor.choosePhoto('notes.png', Buffer.from('%PDF-1.7'));

    await expect(editor.photoError).toHaveText('Use a JPEG, PNG or WebP image up to 5 MB');
    await expect(editor.photoName).toHaveText('No photo yet');

    await editor.choosePhoto('team.png', Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    await expect(editor.photoName).toHaveText('team.png');
    await expect(editor.photoError).toHaveCount(0);
    expect(uploads.count).toBe(2);

    await editor.removePhotoButton.click();
    await expect(editor.photoName).toHaveText('No photo yet');
    await editor.choosePhoto('team.png', Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await expect(editor.photoName).toHaveText('team.png');
    await editor.saveButton.click();

    await expect(editor.dialog).toHaveCount(0);
    expect(sent.map((body) => body.photoKey)).toEqual([key]);
  });

  test('A new name waits for staff: the editor says so and stays open, closing it shows the toast, and the editor reopens on the waiting name', async ({
    page,
    api,
  }) => {
    answerListingProfile(api, [EASTSIDE_OWNED]);
    const waiting = {
      ...EASTSIDE_OWNED,
      owner: {
        ...EASTSIDE_OWNED.owner!,
        pendingName: 'Eastside Women’s Strength',
        pendingKind: 'organization',
      },
    };
    const sent = answerOwnListingSave(api, () => ({ listing: waiting, nameChangePending: true }));
    const profile = new WebListingProfilePage(page);
    const editor = new OwnerListingEditorDialog(page);
    await profile.open(EASTSIDE_OWNED.id);
    await profile.editListingButton.click();

    await editor.name.fill('Eastside Women’s Strength');
    await editor.saveButton.click();

    await expect(editor.alertTitle).toHaveText('Staff will check the new name');
    await expect(editor.alertText).toHaveText(
      'A new name or kind goes back to our team before it shows. Until then the directory keeps the old one; your other changes are live.',
    );
    await expect(editor.alert).toHaveAttribute('role', 'status');
    await expect(editor.alert).toBeFocused();
    await expect(editor.saveButton).toHaveText('Save changes');
    expect(sent.map((body) => body.name)).toEqual(['Eastside Women’s Strength']);
    await expect(profile.successToasts).toHaveCount(0);

    await page.keyboard.press('Escape');

    await expect(editor.dialog).toHaveCount(0);
    await expect(profile.name).toHaveText('Eastside Ladies Who Lift');
    await expect
      .poll(() => profile.successToastViews())
      .toEqual([['Your listing is updated', 'Your changes are live in the directory.']]);
    await expect(profile.editListingButton).toBeFocused();

    await profile.editListingButton.click();

    await expect(editor.name).toHaveValue('Eastside Women’s Strength');
  });

  for (const [why, reply] of [
    ['the connection drops', { status: 0, abort: true }],
    ['the listing is no longer theirs', { status: 403, code: 'not_listing_owner' }],
  ] as const) {
    test(`When ${why}, a message above the fields says so and everything typed is kept`, async ({
      page,
      api,
    }) => {
      answerListingProfile(api, [EASTSIDE_OWNED]);
      answerOwnListingSave(api, () => reply);
      const profile = new WebListingProfilePage(page);
      const editor = new OwnerListingEditorDialog(page);
      await profile.open(EASTSIDE_OWNED.id);
      await profile.editListingButton.click();

      await editor.about.fill('Thirty women now.');
      await editor.focus.fill('Strength, Prayer');
      await editor.saveButton.click();

      await expect(editor.alertTitle).toHaveText("We couldn't save your listing");
      await expect(editor.alertText).toHaveText(
        'Something went wrong on our side. Your changes are still here, so try again in a moment.',
      );
      await expect(editor.alert).toHaveAttribute('role', 'alert');
      await expect(editor.saveButton).toHaveText('Save changes');
      await expect(editor.saveButton).toBeEnabled();
      expect([await editor.about.inputValue(), await editor.focus.inputValue()]).toEqual([
        'Thirty women now.',
        'Strength, Prayer',
      ]);
      await expect(profile.successToasts).toHaveCount(0);
    });
  }
});
