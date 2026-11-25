import { LAKESHORE_HOST, problem } from '../fixtures/admin-events';
import {
  COUCH_TO_5K,
  rowOf,
  SERIES_ROWS,
  seriesList,
  TEAM_HOST,
  type AdminSeriesFixture,
  type AdminSeriesRowFixture,
} from '../fixtures/admin-series';
import { XSRF_TOKEN } from '../fixtures/api-handlers';
import {
  expect,
  MODERATOR_SIGNED_IN,
  test,
  type ApiHandlers,
  type ApiReply,
} from '../fixtures/test';
import {
  SeriesEditorDialog,
  type SeriesEditorValues,
} from '../page-objects/admin/series-editor.dialog';
import { AdminSeriesPage } from '../page-objects/admin/series.page';

/** Sunday Stretch & Prayer as the series editor mock fills it. */
const STRETCH: SeriesEditorValues = {
  title: 'Sunday Stretch & Prayer',
  category: 'mobility',
  description:
    'Forty minutes of gentle stretching and mobility, then a short time of prayer. All levels, no equipment.',
  seriesPrice: 'Free',
  dropInPrice: '',
  capacity: '25',
  location: 'St. Lawrence Community Rec Centre',
  area: 'Downtown, Toronto',
};

/** What Create series sends for {@link STRETCH} with the team listing as host. */
const STRETCH_REQUEST = {
  title: 'Sunday Stretch & Prayer',
  category: 'mobility',
  summary: STRETCH.description,
  imageKey: null,
  hostListingId: TEAM_HOST.id,
  priceCents: 0,
  dropInPriceCents: null,
  capacity: 25,
  place: 'St. Lawrence Community Rec Centre',
  area: 'Downtown, Toronto',
};

/** The series the API answers once it is created: no dates yet (mock `admin-series/series-created`). */
const STRETCH_CREATED: AdminSeriesFixture = {
  id: '0190c0de-0000-7000-8000-00000000c505',
  title: 'Sunday Stretch & Prayer',
  category: 'mobility',
  summary: STRETCH.description,
  imageKey: null,
  host: TEAM_HOST,
  cadence: { weekday: null, dates: 0 },
  startsAt: null,
  firstStartsAt: null,
  lastStartsAt: null,
  place: 'St. Lawrence Community Rec Centre',
  area: 'Downtown, Toronto',
  priceCents: 0,
  dropInPriceCents: null,
  capacity: 25,
  joined: 0,
  sessionsLeft: 0,
  sessionsHeld: 0,
  sessions: [],
};

interface CreateState {
  sent: { body: unknown; token: string | null }[];
  lists: number;
}

/**
 * Answers the list (with the created series once it is made), Couch to 5K and the created series,
 * the default host, and Create series with `reply` (201 and the created series unless given).
 */
function answerCreate(
  api: ApiHandlers,
  reply: () => ApiReply | Promise<ApiReply> = () => ({
    status: 201,
    json: STRETCH_CREATED,
  }),
  rows: AdminSeriesRowFixture[] = SERIES_ROWS,
): CreateState {
  const state: CreateState = { sent: [], lists: 0 };
  api.on('GET', '/api/admin/series', () => {
    state.lists += 1;
    return seriesList(state.sent.length > 0 ? [...rows, rowOf(STRETCH_CREATED)] : rows);
  });
  api.on('GET', `/api/admin/series/${COUCH_TO_5K.id}`, () => ({ json: COUCH_TO_5K }));
  api.on('GET', `/api/admin/series/${STRETCH_CREATED.id}`, () => ({ json: STRETCH_CREATED }));
  api.on('GET', '/api/admin/series/hosts/default', () => ({ json: TEAM_HOST }));
  api.on('POST', '/api/admin/series', (request) => {
    state.sent.push({
      body: request.postDataJSON(),
      token: request.headers()['x-xsrf-token'] ?? null,
    });
    return reply();
  });
  return state;
}

/** Answers the series' Host search over `hosts`; records each search. */
function answerSeriesHostSearch(api: ApiHandlers, hosts = [LAKESHORE_HOST, TEAM_HOST]): string[] {
  const asked: string[] = [];
  api.on('GET', '/api/admin/series/hosts', (request) => {
    const q = new URL(request.url()).searchParams.get('q') ?? '';
    asked.push(q);
    const term = q.trim().toLowerCase();
    return { json: { hosts: hosts.filter((h) => h.name.toLowerCase().includes(term)) } };
  });
  return asked;
}

// L2-071 AC10, AC12 (ADR 0089, ADR 0091): New series opens the series editor, its host the team
// listing; Create series makes the series with no dates, chooses it and says so in a toast.
test.describe('Admin app, New series', () => {
  test('opens the editor the default mock draws, focus on Title and the team listing as host', async ({
    page,
    api,
  }) => {
    answerCreate(api);
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page);
    await series.open();

    await series.newSeriesButton.click();

    await expect(editor.dialog).toBeVisible();
    await expect(editor.title).toHaveText('New series');
    await expect(editor.subtitle).toHaveText(
      'Dates are added from the series itself, once it exists.',
    );
    await expect(editor.labels).toHaveText([
      'Title',
      'Category',
      'Host',
      'Description',
      'Image (optional)',
      'Series price',
      'Drop-in price',
      'Capacity',
      'Location',
      'Suggestion area',
    ]);
    await expect.poll(() => editor.isFocused(editor.titleField)).toBe(true);
    await expect(editor.host).toHaveValue('Christian Fitness');
    await expect(editor.category).toHaveValue('run');
    await expect(editor.cancelButton).toHaveText('Cancel');
    await expect(editor.createButton).toHaveText('Create series');
  });

  test('Create series sends the fields, closes, chooses the new series and says it was created', async ({
    page,
    api,
  }) => {
    const state = answerCreate(api);
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page);
    await series.open();
    await series.newSeriesButton.click();
    await expect(editor.host).toHaveValue('Christian Fitness');
    await editor.fill(STRETCH);

    await editor.create();

    await expect(editor.dialog).toHaveCount(0);
    expect(state.sent).toEqual([{ body: STRETCH_REQUEST, token: XSRF_TOKEN }]);
    await expect(series.toastTitle).toHaveText('Sunday Stretch & Prayer created');
    await expect(series.toastText).toHaveText('Add its first date so members can join.');
    await expect(series.currentCard.locator('.pick-card__title')).toHaveText(
      'Sunday Stretch & Prayer',
    );
    expect(series.pathAndQuery()).toBe(`/series?id=${STRETCH_CREATED.id}`);
    await expect(series.summaryTitle).toHaveText('Sunday Stretch & Prayer');
    await expect(series.noDates).toContainText('No dates yet');
    expect(state.lists).toBe(2);
  });

  test('a series priced "$64" with a "$10" drop-in sends them in cents', async ({ page, api }) => {
    const state = answerCreate(api);
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page);
    await series.open();
    await series.newSeriesButton.click();
    await expect(editor.host).toHaveValue('Christian Fitness');
    await editor.fill({ ...STRETCH, seriesPrice: '$64', dropInPrice: '$10' });

    await editor.create();

    await expect(editor.dialog).toHaveCount(0);
    expect(state.sent.map(({ body }) => body)).toEqual([
      { ...STRETCH_REQUEST, priceCents: 6400, dropInPriceCents: 1000 },
    ]);
  });

  test('the empty state offers New series, which opens the editor', async ({ page, api }) => {
    answerCreate(api, undefined, []);
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page);
    await series.open();

    await series.emptyNewSeriesButton.click();

    await expect(editor.dialog).toBeVisible();
    await expect.poll(() => editor.isFocused(editor.titleField)).toBe(true);
  });

  test('Cancel and Escape close the editor without creating, focus back on New series', async ({
    page,
    api,
  }) => {
    const state = answerCreate(api);
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page);
    await series.open();

    await series.newSeriesButton.click();
    await editor.cancelButton.click();
    await expect(editor.dialog).toHaveCount(0);
    await expect.poll(() => editor.isFocused(series.newSeriesButton)).toBe(true);
    await series.newSeriesButton.click();
    await expect(editor.dialog).toBeVisible();
    await editor.pressEscape();

    await expect(editor.dialog).toHaveCount(0);
    expect(state.sent).toEqual([]);
  });

  // L2-071 AC10 (ADR 0089): the Host picker searches Listed listings by the series' own route.
  test('searching the host offers the Listed matches; choosing one makes it the host', async ({
    page,
    api,
  }) => {
    const state = answerCreate(api);
    const asked = answerSeriesHostSearch(api);
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page);
    await series.open();
    await series.newSeriesButton.click();
    await editor.fill(STRETCH);

    await editor.searchHost('Lakeshore');
    await expect(editor.hostChoices).toHaveText([
      'Lakeshore Runners FellowshipOrganization · Listed',
    ]);
    await editor.chooseHost('Lakeshore Runners Fellowship');
    await expect(editor.host).toHaveValue('Lakeshore Runners Fellowship');
    await expect(editor.hostChoices).toHaveCount(0);
    await editor.create();

    await expect(editor.dialog).toHaveCount(0);
    expect(asked).toEqual(['Lakeshore']);
    expect(state.sent.map(({ body }) => body)).toEqual([
      { ...STRETCH_REQUEST, hostListingId: LAKESHORE_HOST.id },
    ]);
  });

  test('a host search with no Listed match says so', async ({ page, api }) => {
    answerCreate(api);
    answerSeriesHostSearch(api);
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page);
    await series.open();
    await series.newSeriesButton.click();

    await editor.searchHost('Northside');

    await expect(editor.hostStatus).toHaveText(
      'No Listed hosts match “Northside”. Try another search.',
    );
    await expect(editor.hostChoices).toHaveCount(0);
  });

  // L2-071 AC15 (mock series-editor/invalid): what is missing is named before anything is sent.
  test('a blank title, no host and a capacity of 0 are named in a summary that takes focus', async ({
    page,
    api,
  }) => {
    const state = answerCreate(api);
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page);
    await series.open();
    await series.newSeriesButton.click();
    await expect(editor.host).toHaveValue('Christian Fitness');
    await editor.fill({ ...STRETCH, title: '', capacity: '0' });
    await editor.searchHost('');

    await editor.create();

    await expect(editor.alertTitle).toHaveText('3 things to fix before saving');
    await expect(editor.alertLinks).toHaveText([
      'Give the series a title members will recognize',
      'Choose a Listed host',
      'Set a capacity of at least 1',
    ]);
    await expect.poll(() => editor.isFocused(editor.alert)).toBe(true);
    await expect(editor.titleField).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.host).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.capacity).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.description).toHaveValue(STRETCH.description);
    expect(state.sent).toEqual([]);
  });

  // L2-071 AC11 (ADR 0089): a host the server finds no longer Listed is named on the field.
  test('a host the server refuses shows the Host error in the field and the summary, the fields kept', async ({
    page,
    api,
  }) => {
    answerCreate(api, () =>
      problem(400, 'validation_failed', { fieldCodes: { hostListingId: 'host_not_listed' } }),
    );
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page);
    await series.open();
    await series.newSeriesButton.click();
    await expect(editor.host).toHaveValue('Christian Fitness');
    await editor.fill(STRETCH);

    await editor.create();

    await expect(editor.alertTitle).toHaveText('1 thing to fix before saving');
    await expect(editor.alertLinks).toHaveText(['Choose a Listed host']);
    await expect(editor.alertLinks).toHaveAttribute('href', '#f-host');
    await expect(editor.host).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.dialog).not.toContainText('A sentence from the server');
    await expect(editor.titleField).toHaveValue(STRETCH.title);
    await expect(editor.location).toHaveValue(STRETCH.location);
  });

  // Mock series-editor/busy: a gate holds the answer, so no clock is needed.
  test('while creating, the button reads "Creating…", Cancel is disabled and the fields are read-only', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    answerCreate(api, async () => {
      await gate;
      return { status: 201, json: STRETCH_CREATED };
    });
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page);
    await series.open();
    await series.newSeriesButton.click();
    await expect(editor.host).toHaveValue('Christian Fitness');
    await editor.fill(STRETCH);

    await editor.create();

    await expect(editor.createButton).toHaveText('Creating…');
    await expect(editor.createButton).toHaveAttribute('aria-busy', 'true');
    await expect(editor.createButton).toBeDisabled();
    await expect(editor.cancelButton).toBeDisabled();
    for (const input of await editor.textInputs.all()) {
      await expect(input).toHaveAttribute('readonly', '');
    }
    await expect(editor.category).toBeDisabled();
    await editor.pressEscape();
    await expect(editor.dialog).toBeVisible();
    release();
    await expect(editor.dialog).toHaveCount(0);
  });

  // Mock series-editor/failed.
  test('a create the server failed says so in the dialog and keeps what was typed', async ({
    page,
    api,
  }) => {
    answerCreate(api, () => ({ status: 500, json: { code: 'internal_error' } }));
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page);
    await series.open();
    await series.newSeriesButton.click();
    await expect(editor.host).toHaveValue('Christian Fitness');
    await editor.fill(STRETCH);

    await editor.create();

    await expect(editor.alertTitle).toHaveText("Couldn't create the series");
    await expect(editor.alert).toContainText(
      "The server didn't respond. Nothing was changed and what you typed is still here; try again.",
    );
    await expect(editor.createButton).toHaveText('Create series');
    await expect(editor.createButton).toBeEnabled();
    await expect(editor.titleField).toHaveValue(STRETCH.title);
    await expect(editor.capacity).toHaveValue(STRETCH.capacity);
  });

  // L2-071 AC8, AC16 (ADR 0064): a Moderator creates a series as an Admin does.
  test('a Moderator creates a series as an Admin does', async ({ page, api }) => {
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    const state = answerCreate(api);
    const series = new AdminSeriesPage(page);
    const editor = new SeriesEditorDialog(page);
    await series.open();
    await series.newSeriesButton.click();
    await expect(editor.host).toHaveValue('Christian Fitness');
    await editor.fill(STRETCH);

    await editor.create();

    await expect(series.toastTitle).toHaveText('Sunday Stretch & Prayer created');
    expect(state.sent).toHaveLength(1);
  });
});
