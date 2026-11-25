import { problem } from '../fixtures/admin-events';
import { BOOTCAMP_SERIES, COUCH_TO_5K, seriesList } from '../fixtures/admin-series';
import { XSRF_TOKEN } from '../fixtures/api-handlers';
import { expect, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { SeriesEditorDialog } from '../page-objects/admin/series-editor.dialog';
import { AdminSeriesPage } from '../page-objects/admin/series.page';

const COUCH_PATH = `/api/admin/series/${COUCH_TO_5K.id}`;

/** What Save changes sends for Couch to 5K as it opens (mock `series-editor/edit`). */
const COUCH_REQUEST = {
  title: 'Couch to 5K Run Club',
  category: 'run',
  summary: COUCH_TO_5K.summary,
  imageKey: null,
  hostListingId: COUCH_TO_5K.host.id,
  priceCents: 0,
  dropInPriceCents: 0,
  capacity: 40,
  place: 'Humber Bay Park East',
  area: 'Etobicoke, Toronto',
};

interface SaveState {
  sent: { body: unknown; token: string | null }[];
  gets: number;
}

/**
 * Answers the list, Couch to 5K (as saved, once it is) and Bootcamp, and Save changes on Couch to
 * 5K with `reply` (200 and the series with the sent title unless given).
 */
function answerSave(api: ApiHandlers, reply?: () => ApiReply | Promise<ApiReply>): SaveState {
  const state: SaveState = { sent: [], gets: 0 };
  const saved = (): typeof COUCH_TO_5K => {
    const last = state.sent.at(-1)?.body as { title: string } | undefined;
    return last ? { ...COUCH_TO_5K, title: last.title } : COUCH_TO_5K;
  };
  api.on('GET', '/api/admin/series', () => seriesList());
  api.on('GET', COUCH_PATH, () => {
    state.gets += 1;
    return { json: saved() };
  });
  api.on('GET', `/api/admin/series/${BOOTCAMP_SERIES.id}`, () => ({ json: BOOTCAMP_SERIES }));
  api.on('PUT', COUCH_PATH, (request) => {
    state.sent.push({
      body: request.postDataJSON(),
      token: request.headers()['x-xsrf-token'] ?? null,
    });
    return reply ? reply() : { json: saved() };
  });
  return state;
}

// L2-071 AC13 (ADR 0091): Edit details opens the series editor with the series' values; Save
// changes updates it and says so; a capacity below the members who joined is refused.
test.describe('Admin app, Edit details on a series', () => {
  test('opens the editor the edit mock draws, with the series as saved and focus on Title', async ({
    page,
    api,
  }) => {
    answerSave(api);
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page, 'Edit series details');
    await series.open();
    await expect(series.summaryTitle).toHaveText('Couch to 5K Run Club');

    await series.editDetailsButton.click();

    await expect(editor.dialog).toBeVisible();
    await expect(editor.subtitle).toHaveText(
      'Couch to 5K Run Club · changes show to members at once',
    );
    await expect.poll(() => editor.isFocused(editor.titleField)).toBe(true);
    await expect(editor.titleField).toHaveValue('Couch to 5K Run Club');
    await expect(editor.category).toHaveValue('run');
    await expect(editor.host).toHaveValue('Lakeshore Runners Fellowship');
    await expect(editor.description).toHaveValue(COUCH_TO_5K.summary);
    await expect(editor.seriesPrice).toHaveValue('Free');
    await expect(editor.dropInPrice).toHaveValue('Free');
    await expect(editor.capacity).toHaveValue('40');
    await expect(editor.location).toHaveValue('Humber Bay Park East');
    await expect(editor.area).toHaveValue('Etobicoke, Toronto');
    await expect(editor.saveButton).toHaveText('Save changes');
  });

  test('a paid series opens with its prices, and no drop-in reads blank', async ({ page, api }) => {
    answerSave(api);
    api.on('GET', COUCH_PATH, () => ({
      json: { ...COUCH_TO_5K, priceCents: 6400, dropInPriceCents: null },
    }));
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page, 'Edit series details');
    await series.open();

    await series.editDetailsButton.click();

    await expect(editor.seriesPrice).toHaveValue('$64');
    await expect(editor.dropInPrice).toHaveValue('');
  });

  test('Save changes sends the fields, closes, says it was updated and shows the series again', async ({
    page,
    api,
  }) => {
    const state = answerSave(api);
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page, 'Edit series details');
    await series.open();
    await series.editDetailsButton.click();
    await editor.titleField.fill('Couch to 5K Run Club, Spring');

    await editor.save();

    await expect(editor.dialog).toHaveCount(0);
    expect(state.sent).toEqual([
      { body: { ...COUCH_REQUEST, title: 'Couch to 5K Run Club, Spring' }, token: XSRF_TOKEN },
    ]);
    await expect(series.toastTitle).toHaveText('Couch to 5K Run Club, Spring updated');
    await expect(series.toastText).toHaveText('Members see the changes now.');
    await expect(series.summaryTitle).toHaveText('Couch to 5K Run Club, Spring');
    expect(series.pathAndQuery()).toBe('/series');
    await expect.poll(() => editor.isFocused(series.editDetailsButton)).toBe(true);
  });

  // Mock series-editor/edit-invalid: 31 members joined Couch to 5K.
  test('a capacity below the members who joined is named before anything is sent', async ({
    page,
    api,
  }) => {
    const state = answerSave(api);
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page, 'Edit series details');
    await series.open();
    await series.editDetailsButton.click();
    await editor.capacity.fill('20');

    await editor.save();

    await expect(editor.alertTitle).toHaveText('1 thing to fix before saving');
    await expect(editor.alertLinks).toHaveText([
      '31 members have joined. Set a capacity of at least 31',
    ]);
    await expect(editor.alertLinks).toHaveAttribute('href', '#f-capacity');
    await expect(editor.capacity).toHaveAttribute('aria-invalid', 'true');
    await expect.poll(() => editor.isFocused(editor.alert)).toBe(true);
    expect(state.sent).toEqual([]);
  });

  // L2-071 AC13: more joined meanwhile; the API's refusal is named with the number the editor knows.
  test('a capacity the server refuses as below the joined is named on Capacity', async ({
    page,
    api,
  }) => {
    answerSave(api, () => problem(409, 'capacity_below_joined'));
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page, 'Edit series details');
    await series.open();
    await series.editDetailsButton.click();
    await editor.capacity.fill('31');

    await editor.save();

    await expect(editor.alertLinks).toHaveText([
      '31 members have joined. Set a capacity of at least 31',
    ]);
    await expect(editor.dialog).not.toContainText('A sentence from the server');
    await expect(editor.capacity).toHaveValue('31');
  });

  // Mock series-editor/edit-busy: a gate holds the answer.
  test('while saving, the button reads "Saving…", Cancel is disabled and the fields are read-only', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    answerSave(api, async () => {
      await gate;
      return { json: COUCH_TO_5K };
    });
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page, 'Edit series details');
    await series.open();
    await series.editDetailsButton.click();

    await editor.save();

    await expect(editor.saveButton).toHaveText('Saving…');
    await expect(editor.saveButton).toHaveAttribute('aria-busy', 'true');
    await expect(editor.cancelButton).toBeDisabled();
    for (const input of await editor.textInputs.all()) {
      await expect(input).toHaveAttribute('readonly', '');
    }
    release();
    await expect(editor.dialog).toHaveCount(0);
  });

  // Mock series-editor/edit-failed.
  test('a save the server failed says so in the dialog and keeps what was typed', async ({
    page,
    api,
  }) => {
    answerSave(api, () => ({ status: 500, json: { code: 'internal_error' } }));
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page, 'Edit series details');
    await series.open();
    await series.editDetailsButton.click();
    await editor.titleField.fill('Couch to 5K, renamed');

    await editor.save();

    await expect(editor.alertTitle).toHaveText("Couldn't save the changes");
    await expect(editor.alert).toContainText(
      "The server didn't respond. Nothing was changed and what you typed is still here; try again.",
    );
    await expect(editor.saveButton).toHaveText('Save changes');
    await expect(editor.titleField).toHaveValue('Couch to 5K, renamed');
  });
});
