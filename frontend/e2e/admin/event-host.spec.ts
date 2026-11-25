import {
  answerHostSearch,
  BOOTCAMP_DETAIL,
  DANIELLE_HOST,
  LAKESHORE_HOST,
  eventList,
  PUBLISHED_EVENTS,
  RETREAT_DRAFT,
  TEAM_HOST,
} from '../fixtures/admin-events';
import { expect, test, type ApiHandlers } from '../fixtures/test';
import { EventEditorDialog } from '../page-objects/admin/event-editor.dialog';
import { AdminEventsPage } from '../page-objects/admin/events.page';

const BOOTCAMP = PUBLISHED_EVENTS[1];
const DETAIL_PATH = `/api/admin/events/${BOOTCAMP.id}`;

/** Whole Life Retreat as the event editor mock fills it. */
const RETREAT = {
  title: 'Whole Life Retreat',
  category: 'Retreat',
  date: '2026-05-22',
  startTime: '16:00',
  place: 'Muskoka Woods, Rosseau',
  area: 'Muskoka Lakes',
  price: '$340',
  capacity: '60',
  summary: 'Three days of trail runs, strength sessions, worship by the lake and real rest.',
};

/** Records the bodies the editor saves with: creates and the Bootcamp's edits. */
function answerSaves(api: ApiHandlers): { created: unknown[]; edited: unknown[] } {
  const sent = { created: [] as unknown[], edited: [] as unknown[] };
  api.on('GET', '/api/admin/events', () => eventList(PUBLISHED_EVENTS));
  api.on('POST', '/api/admin/events', (request) => {
    sent.created.push(request.postDataJSON());
    return { status: 201, json: RETREAT_DRAFT };
  });
  api.on('GET', DETAIL_PATH, () => ({ json: BOOTCAMP_DETAIL }));
  api.on('PUT', DETAIL_PATH, (request) => {
    sent.edited.push(request.postDataJSON());
    return { json: BOOTCAMP };
  });
  return sent;
}

// L2-022 AC1, AC11 (ADR 0067, ADR 0088): the editor's required Host starts as the Listed team
// listing for a new event and as the saved host for an edit, and the save sends it.
test.describe('Admin app, an event host', () => {
  test('New event starts with the Christian Fitness team listing as its host and saves it', async ({
    page,
    api,
  }) => {
    const sent = answerSaves(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();
    await events.openNewEvent();

    await expect(editor.host).toHaveValue('Christian Fitness');
    await expect(editor.hostHint).toHaveText('Choose a Listed directory listing.');
    await expect(editor.host).toHaveAttribute('aria-describedby', 'f-host-hint');
    await expect(editor.labels).toHaveText([
      'Title',
      'Category',
      'Host (required)',
      'Date',
      'Start time',
      'Place',
      'Area',
      'Price',
      'Capacity',
      'Summary',
      'Image (optional)',
    ]);
    await editor.fill(RETREAT);
    await editor.saveDraft();

    await expect(editor.dialog).toHaveCount(0);
    expect(sent.created).toEqual([expect.objectContaining({ hostListingId: TEAM_HOST.id })]);
  });

  test('Edit event shows the saved host and Save changes keeps it', async ({ page, api }) => {
    const sent = answerSaves(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    await events.open();
    await events.editEvent(BOOTCAMP.title);

    await expect(editor.host).toHaveValue('Danielle Okafor');
    await editor.saveChanges();

    await expect(editor.dialog).toHaveCount(0);
    expect(sent.edited).toEqual([expect.objectContaining({ hostListingId: DANIELLE_HOST.id })]);
  });

  // L2-022 AC11 (ADR 0088): the Admin searches Listed listings and chooses one; none says so.
  test('searching offers the matching Listed hosts, and choosing one makes it the host', async ({
    page,
    api,
  }) => {
    const sent = answerSaves(api);
    const asked = answerHostSearch(api, [LAKESHORE_HOST, DANIELLE_HOST, TEAM_HOST]);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();
    await events.openNewEvent();
    await expect(editor.host).toHaveValue('Christian Fitness');
    await editor.fill(RETREAT);

    await editor.searchHost('Lake');

    await expect(editor.hostChoices).toHaveCount(1);
    await expect(editor.hostChoices.locator('.pick-card__title')).toHaveText([
      'Lakeshore Runners Fellowship',
    ]);
    await expect(editor.hostChoices.locator('.pick-card__meta')).toHaveText([
      'Organization · Listed',
    ]);
    expect(asked).toEqual(['Lake']);
    await editor.chooseHost('Lakeshore Runners Fellowship');

    await expect(editor.host).toHaveValue('Lakeshore Runners Fellowship');
    await expect(editor.hostChoices).toHaveCount(0);
    await expect.poll(() => editor.hostIsFocused()).toBe(true);
    await editor.saveDraft();
    await expect(editor.dialog).toHaveCount(0);
    expect(sent.created).toEqual([expect.objectContaining({ hostListingId: LAKESHORE_HOST.id })]);
  });

  test('a search with no Listed match says so', async ({ page, api }) => {
    answerSaves(api);
    answerHostSearch(api, [LAKESHORE_HOST]);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();
    await events.openNewEvent();
    await expect(editor.host).toHaveValue('Christian Fitness');

    await editor.searchHost('Northside');

    await expect(editor.hostStatus).toHaveText(
      'No Listed hosts match “Northside”. Try another search.',
    );
    await expect(editor.hostStatus).toHaveAttribute('role', 'status');
    await expect(editor.hostChoices).toHaveCount(0);
  });

  test('a search that gets no answer says so, and the next search works', async ({ page, api }) => {
    answerSaves(api);
    answerHostSearch(api, [LAKESHORE_HOST], (n) => n === 0);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();
    await events.openNewEvent();
    await expect(editor.host).toHaveValue('Christian Fitness');

    await editor.searchHost('Lake');
    await expect(editor.hostStatus).toHaveText(
      "Couldn't search hosts. Check your connection and type again.",
    );
    await editor.searchHost('Lakes');

    await expect(editor.hostStatus).toHaveText('');
    await expect(editor.hostChoices).toHaveCount(1);
  });
});
