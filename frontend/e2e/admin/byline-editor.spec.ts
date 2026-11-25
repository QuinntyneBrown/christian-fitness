import {
  BYLINES,
  bylineList,
  bylineRefusal,
  type BylineFixture,
  MARCUS_BELL,
} from '../fixtures/admin-bylines';
import { expect, test, type ApiHandlers } from '../fixtures/test';
import { BylineEditorDialog } from '../page-objects/admin/byline-editor.dialog';
import { AdminBylinesPage } from '../page-objects/admin/bylines.page';

const BASE = '/api/admin/stories/bylines';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

const ESTHER: BylineFixture = {
  id: '0193a9c0-0000-7000-8000-0000000b7009',
  name: 'Esther Mwangi',
  bio: 'Runs with the Scarborough group and writes about it.',
  photoKey: null,
  stories: 0,
};

/** Answers the list with `bylines` and counts how often it was asked for. */
function answerBylines(api: ApiHandlers, bylines: BylineFixture[] = BYLINES): { asked: number } {
  const seen = { asked: 0 };
  api.on('GET', BASE, () => {
    seen.asked += 1;
    return bylineList(bylines);
  });
  return seen;
}

/** Opens Bylines and Add byline. */
async function openAdd(page: AdminBylinesPage): Promise<void> {
  await page.open();
  await expect(page.rows).toHaveCount(BYLINES.length);
  await page.addButton.click();
}

// L2-077 AC3, AC4, AC5 (ADR 0094): Add byline and Edit open the byline editor; a save shows the
// byline in the list at once with a toast, and a refusal names the field.
test.describe('Admin app, the byline editor', () => {
  test(
    'Add byline saves a name and a short bio, and the list shows it in name order with a toast',
    { tag: '@critical' },
    async ({ page, api }) => {
      answerBylines(api);
      const sent: unknown[] = [];
      api.on('POST', BASE, (request) => {
        sent.push(request.postDataJSON());
        return { status: 201, json: ESTHER };
      });
      const bylines = new AdminBylinesPage(page);
      const editor = new BylineEditorDialog(page);

      await openAdd(bylines);

      await expect(editor.title).toHaveText('Add a byline');
      await expect(editor.name).toBeFocused();
      await expect(editor.nameHint).toHaveText('As readers see it under a story.');
      await expect(editor.bioHint).toHaveText('One or two sentences. 200 characters left.');
      await expect(editor.photoHint).toHaveText(
        'JPEG, PNG or WebP, at most 5 MB. Initials show without one.',
      );
      await expect(editor.saveButton).toHaveText('Add byline');
      await editor.name.fill(ESTHER.name);
      await editor.bio.fill(ESTHER.bio);
      await expect(editor.bioHint).toHaveText('One or two sentences. 148 characters left.');
      await editor.saveButton.click();

      await expect(editor.dialog).toHaveCount(0);
      expect(sent).toEqual([{ name: ESTHER.name, bio: ESTHER.bio, photoKey: null }]);
      expect((await bylines.rowTexts()).map(([name]) => name)).toEqual([
        'CF Team',
        'Esther Mwangi',
        'Marcus Bell',
        'Naomi Clarke',
        'Pastor Ruth Adeyemi',
        'Priya Raman',
      ]);
      await expect(bylines.toastTitle).toHaveText('Byline saved');
      await expect(bylines.toastText).toHaveText(
        'Admins can choose Esther Mwangi in the story editor.',
      );
      await expect(bylines.addButton).toBeFocused();
    },
  );

  test('a chosen photo is uploaded at once and saved with the byline by its key', async ({
    page,
    api,
  }) => {
    answerBylines(api);
    const uploads: string[] = [];
    api.on('POST', `${BASE}/photos`, (request) => {
      uploads.push(request.headers()['content-type']?.split(';')[0] ?? '');
      return { status: 201, json: { photoKey: '0123456789abcdef0123456789abcdef.png' } };
    });
    const sent: unknown[] = [];
    api.on('POST', BASE, (request) => {
      sent.push(request.postDataJSON());
      return { status: 201, json: { ...ESTHER, photoKey: '0123456789abcdef0123456789abcdef.png' } };
    });
    const bylines = new AdminBylinesPage(page);
    const editor = new BylineEditorDialog(page);
    await openAdd(bylines);

    await editor.name.fill(ESTHER.name);
    await editor.bio.fill(ESTHER.bio);
    await editor.choosePhoto('esther.png', PNG);
    await expect(editor.photoName).toHaveText('esther.png');
    await editor.saveButton.click();

    await expect(editor.dialog).toHaveCount(0);
    expect(uploads).toEqual(['multipart/form-data']);
    expect(sent).toEqual([
      { name: ESTHER.name, bio: ESTHER.bio, photoKey: '0123456789abcdef0123456789abcdef.png' },
    ]);
  });

  test('a photo the API refuses is named on the photo field', async ({ page, api }) => {
    answerBylines(api);
    api.on('POST', `${BASE}/photos`, () =>
      bylineRefusal(400, 'validation_failed', { photo: 'photo_invalid' }),
    );
    const bylines = new AdminBylinesPage(page);
    const editor = new BylineEditorDialog(page);
    await openAdd(bylines);

    await editor.choosePhoto('notes.png', PNG);

    await expect(editor.photoError).toHaveText('Use a JPEG, PNG or WebP image up to 5 MB');
  });

  test('saving with no name or bio names both in a summary that takes focus, and sends nothing', async ({
    page,
    api,
  }) => {
    answerBylines(api);
    let posted = 0;
    api.on('POST', BASE, () => {
      posted += 1;
      return { status: 201, json: ESTHER };
    });
    const bylines = new AdminBylinesPage(page);
    const editor = new BylineEditorDialog(page);
    await openAdd(bylines);

    await editor.saveButton.click();

    await expect(editor.alertTitle).toHaveText('2 things to fix');
    await expect(editor.alertLinks).toHaveText(['Add a name', 'Add a short bio']);
    await expect(editor.alert).toBeFocused();
    await expect(editor.nameError).toHaveText('Add a name');
    await expect(editor.bioError).toHaveText('Add a short bio');
    await expect(editor.name).toHaveAttribute('aria-invalid', 'true');
    expect(posted).toBe(0);
    await editor.name.fill('Esther');
    await expect(editor.nameError).toHaveCount(0);
  });

  test('a name another byline has is refused on the name field and what was typed stays', async ({
    page,
    api,
  }) => {
    answerBylines(api);
    api.on('POST', BASE, () => bylineRefusal(409, 'byline_name_taken'));
    const bylines = new AdminBylinesPage(page);
    const editor = new BylineEditorDialog(page);
    await openAdd(bylines);

    await editor.name.fill('Priya Raman');
    await editor.bio.fill('Nutrition writer.');
    await editor.saveButton.click();

    await expect(editor.nameError).toHaveText('A byline called Priya Raman already exists');
    await expect(editor.bioHint).toHaveText('One or two sentences. 183 characters left.');
    await expect(editor.alert).toHaveCount(0);
    await expect(editor.name).toHaveValue('Priya Raman');
    await expect(editor.saveButton).toHaveText('Add byline');
  });

  test('Edit opens on the byline, and Save byline shows the change in its row with a toast', async ({
    page,
    api,
  }) => {
    answerBylines(api);
    const sent: { path: string; body: unknown }[] = [];
    api.on('PUT', `${BASE}/${MARCUS_BELL.id}`, (request) => {
      sent.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() });
      return { json: { ...MARCUS_BELL, bio: 'Personal trainer and coach.' } };
    });
    const bylines = new AdminBylinesPage(page);
    const editor = new BylineEditorDialog(page);
    await bylines.open();

    await bylines.editButton('Marcus Bell').click();

    await expect(editor.title).toHaveText('Edit byline');
    await expect(editor.name).toHaveValue('Marcus Bell');
    await expect(editor.bio).toHaveValue(MARCUS_BELL.bio);
    await expect(editor.bioHint).toHaveText('One or two sentences. 122 characters left.');
    await expect(editor.saveButton).toHaveText('Save byline');
    await editor.bio.fill('Personal trainer and coach.');
    await editor.saveButton.click();

    await expect(editor.dialog).toHaveCount(0);
    expect(sent).toEqual([
      {
        path: `${BASE}/${MARCUS_BELL.id}`,
        body: { name: 'Marcus Bell', bio: 'Personal trainer and coach.', photoKey: null },
      },
    ]);
    expect((await bylines.rowTexts())[1]).toEqual([
      'Marcus Bell',
      'Personal trainer and coach.',
      '2 stories',
    ]);
    await expect(bylines.toastText).toHaveText(
      'Admins can choose Marcus Bell in the story editor.',
    );
    await expect(bylines.editButton('Marcus Bell')).toBeFocused();
  });

  test('while a save is on its way the button reads Saving… and the fields hold still', async ({
    page,
    api,
  }) => {
    answerBylines(api);
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    api.on('PUT', `${BASE}/${MARCUS_BELL.id}`, async () => {
      await held;
      return { json: MARCUS_BELL };
    });
    const bylines = new AdminBylinesPage(page);
    const editor = new BylineEditorDialog(page);
    await bylines.open();
    await bylines.editButton('Marcus Bell').click();

    await editor.saveButton.click();

    await expect(editor.saveButton).toHaveText('Saving…');
    await expect(editor.saveButton).toBeDisabled();
    await expect(editor.cancelButton).toBeDisabled();
    await expect(editor.photoButton).toBeDisabled();
    for (const input of await editor.textInputs.all()) {
      await expect(input).toHaveAttribute('readonly', '');
    }
    await page.keyboard.press('Escape');
    await expect(editor.dialog).toBeVisible();
    release();
    await expect(editor.dialog).toHaveCount(0);
  });

  test('a save with no answer shows one alert and keeps what was typed', async ({ page, api }) => {
    answerBylines(api);
    api.on('PUT', `${BASE}/${MARCUS_BELL.id}`, () => ({ abort: true }));
    const bylines = new AdminBylinesPage(page);
    const editor = new BylineEditorDialog(page);
    await bylines.open();
    await bylines.editButton('Marcus Bell').click();

    await editor.bio.fill('Changed.');
    await editor.saveButton.click();

    await expect(editor.alertTitle).toHaveText("Couldn't save the byline");
    await expect(editor.alert).toContainText(
      "The server didn't respond. Nothing was lost; try again.",
    );
    await expect(editor.bio).toHaveValue('Changed.');
    await expect(editor.saveButton).toHaveText('Save byline');
    await expect(editor.saveButton).toBeEnabled();
  });

  test('a byline found gone closes the editor and reads the list again', async ({ page, api }) => {
    const seen = answerBylines(api);
    api.on('PUT', `${BASE}/${MARCUS_BELL.id}`, () => bylineRefusal(404, 'not_found'));
    const bylines = new AdminBylinesPage(page);
    const editor = new BylineEditorDialog(page);
    await bylines.open();
    await bylines.editButton('Marcus Bell').click();

    await editor.saveButton.click();

    await expect(editor.dialog).toHaveCount(0);
    await expect.poll(() => seen.asked).toBe(2);
  });

  test('Cancel closes the editor with nothing sent and focus back on Add byline', async ({
    page,
    api,
  }) => {
    answerBylines(api);
    const bylines = new AdminBylinesPage(page);
    const editor = new BylineEditorDialog(page);
    await openAdd(bylines);

    await editor.name.fill('Not kept');
    await editor.cancelButton.click();

    await expect(editor.dialog).toHaveCount(0);
    await expect(bylines.addButton).toBeFocused();
    await expect(bylines.rows).toHaveCount(BYLINES.length);
  });

  test('with no bylines, the empty state’s Add byline opens the editor', async ({ page, api }) => {
    answerBylines(api, []);
    const bylines = new AdminBylinesPage(page);
    const editor = new BylineEditorDialog(page);
    await bylines.open();

    await bylines.emptyAddButton.click();

    await expect(editor.title).toHaveText('Add a byline');
  });
});
