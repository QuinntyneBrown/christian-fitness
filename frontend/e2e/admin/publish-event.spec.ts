import {
  eventList,
  PUBLISHED_EVENTS,
  problem,
  RETREAT_DETAIL,
  RETREAT_DRAFT,
  type AdminEventFixture,
} from '../fixtures/admin-events';
import { expect, test, XSRF_TOKEN, type ApiHandlers, type ApiReply } from '../fixtures/test';
import {
  EventEditorDialog,
  type EventEditorValues,
} from '../page-objects/admin/event-editor.dialog';
import { AdminEventsPage } from '../page-objects/admin/events.page';

const RETREAT: EventEditorValues = {
  title: 'Whole Life Retreat',
  category: 'Retreat',
  date: '2026-05-22',
  startTime: '16:00',
  place: 'Muskoka Woods, Rosseau',
  area: 'Muskoka Lakes',
  price: '$340',
  capacity: '60',
  summary: RETREAT_DETAIL.summary,
};

const PUBLISHED_RETREAT: AdminEventFixture = { ...RETREAT_DRAFT, status: 'published' };
const DRAFT_PATH = `/api/admin/events/${RETREAT_DRAFT.id}`;

interface Calls {
  creates: number;
  updates: number;
  publishes: { token: string | undefined }[];
}

/**
 * Lists the events, answers a create with the draft, an update with the draft and a publish with
 * `publish` (the published event unless given); the list shows the event published once it is.
 */
function answerPublish(
  api: ApiHandlers,
  options: { publish?: () => ApiReply | Promise<ApiReply>; withDraft?: boolean } = {},
): Calls {
  const calls: Calls = { creates: 0, updates: 0, publishes: [] };
  let published = false;
  let exists = options.withDraft ?? false;
  api.on('GET', '/api/admin/events', () =>
    eventList([
      ...PUBLISHED_EVENTS,
      ...(exists ? [published ? PUBLISHED_RETREAT : RETREAT_DRAFT] : []),
    ]),
  );
  api.on('GET', DRAFT_PATH, () => ({ json: RETREAT_DETAIL }));
  api.on('POST', '/api/admin/events', () => {
    calls.creates++;
    exists = true;
    return { status: 201, json: RETREAT_DRAFT };
  });
  api.on('PUT', DRAFT_PATH, () => {
    calls.updates++;
    return { json: RETREAT_DRAFT };
  });
  api.on('POST', `${DRAFT_PATH}/publish`, async (request) => {
    calls.publishes.push({ token: request.headers()['x-xsrf-token'] });
    const answer = options.publish ? await options.publish() : { json: PUBLISHED_RETREAT };
    if (!answer.status || answer.status === 200) published = true;
    return answer;
  });
  return calls;
}

// L2-023 AC3 to AC5 (ADR 0026): Publish saves the fields, publishes the event, closes the editor,
// says it is live in a toast and lists the event as Published.
test.describe('Admin app, publishing an event', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Mock event-editor/default: Save draft beside Publish.
  test('a new event offers Save draft and Publish', async ({ page, api }) => {
    answerPublish(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();

    await events.openNewEvent();

    await expect(editor.footButtons).toHaveText(['Save draft', 'Publish']);
  });

  test('Publish saves the new event, publishes it, closes the drawer and says it is live', async ({
    page,
    api,
  }) => {
    const calls = answerPublish(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();
    await events.openNewEvent();
    await editor.fill(RETREAT);

    await editor.publish();

    await expect(editor.dialog).toHaveCount(0);
    expect(calls).toMatchObject({ creates: 1, updates: 0 });
    expect(calls.publishes).toEqual([{ token: XSRF_TOKEN }]);
    await expect(events.toastTitle).toHaveText('Whole Life Retreat is live');
    await expect(events.toastText).toHaveText(
      'Members can register now. A group chat opens with the first registration.',
    );
    expect((await events.rowTexts())[4]).toEqual([
      'Whole Life Retreat',
      'Muskoka Woods, Rosseau',
      'May 22 · 4:00 PM',
      '0 / 60',
      'Published',
    ]);
  });

  // Mock event-editor/busy.
  test('while publishing, Publish says "Publishing…", is busy, Save draft is disabled and the fields are read-only', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    answerPublish(api, {
      publish: async () => {
        await gate;
        return { json: PUBLISHED_RETREAT };
      },
    });
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();
    await events.openNewEvent();
    await editor.fill(RETREAT);

    await editor.publish();

    await expect(editor.publishButton).toHaveText('Publishing…');
    await expect(editor.publishButton).toHaveAttribute('aria-busy', 'true');
    await expect(editor.publishButton).toBeDisabled();
    await expect(editor.dialog.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    for (const input of await editor.textInputs.all()) {
      await expect(input).toHaveAttribute('readonly', '');
    }
    release();
    await expect(editor.dialog).toHaveCount(0);
  });

  // Mock event-editor/edit-draft.
  test('a draft opened for editing offers Save changes and Publish; Publish updates it then publishes it', async ({
    page,
    api,
  }) => {
    const calls = answerPublish(api, { withDraft: true });
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    await events.open();
    await events.editEvent('Whole Life Retreat');
    await expect(editor.footButtons).toHaveText(['Save changes', 'Publish']);
    await editor.place.fill('Camp Muskoka');

    await editor.publish();

    await expect(editor.dialog).toHaveCount(0);
    expect(calls).toMatchObject({ creates: 0, updates: 1 });
    expect(calls.publishes).toHaveLength(1);
    await expect(events.toastTitle).toHaveText('Whole Life Retreat is live');
  });

  test('a draft edited with Save changes stays a draft: no publish is sent', async ({
    page,
    api,
  }) => {
    const calls = answerPublish(api, { withDraft: true });
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    await events.open();
    await events.editEvent('Whole Life Retreat');

    await editor.saveChanges();

    await expect(editor.dialog).toHaveCount(0);
    expect(calls.publishes).toEqual([]);
    await expect(events.toastTitle).toHaveText('Changes saved');
  });

  // Mock event-editor/publish-failed (ADR 0026): the save worked, the publish did not.
  test('a publish that fails after the save keeps the drawer, says so, and Publish tries again without a second event', async ({
    page,
    api,
  }) => {
    const answers: ApiReply[] = [problem(500, 'error')];
    const calls = answerPublish(api, {
      publish: () => answers.shift() ?? { json: PUBLISHED_RETREAT },
    });
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();
    await events.openNewEvent();
    await editor.fill(RETREAT);

    await editor.publish();

    await expect(editor.alert).toContainText("Couldn't publish the event");
    await expect(editor.alert).toContainText('Your changes are saved as a draft. Try again.');
    await expect(editor.title).toHaveValue('Whole Life Retreat');
    await expect(editor.publishButton).toHaveText('Publish');
    await expect(editor.publishButton).toBeEnabled();
    await editor.publish();
    await expect(editor.dialog).toHaveCount(0);
    expect(calls).toMatchObject({ creates: 1, updates: 1 });
    expect(calls.publishes).toHaveLength(2);
    await expect(events.toastTitle).toHaveText('Whole Life Retreat is live');
  });

  test('closing after a failed publish keeps the saved draft: it is listed and "Draft saved" says so', async ({
    page,
    api,
  }) => {
    answerPublish(api, { publish: () => problem(500, 'error') });
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();
    await events.openNewEvent();
    await editor.fill(RETREAT);
    await editor.publish();
    await expect(editor.alert).toContainText("Couldn't publish the event");

    await editor.pressEscape();

    await expect(editor.dialog).toHaveCount(0);
    await expect(events.toastTitle).toHaveText('Draft saved');
    expect((await events.rowTexts())[4][4]).toBe('Draft');
  });

  test('a draft whose start has passed names the date, and the event stays a draft', async ({
    page,
    api,
  }) => {
    answerPublish(api, {
      publish: () => problem(400, 'validation_failed', { fieldCodes: { date: 'start_in_past' } }),
    });
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();
    await events.openNewEvent();
    await editor.fill(RETREAT);

    await editor.publish();

    await expect(editor.alert).toContainText('1 thing to fix before saving');
    await expect(editor.fieldError('f-date')).toHaveText('Pick a start after now');
    await expect(editor.date).toHaveAttribute('aria-invalid', 'true');
    await expect(events.toast).toHaveCount(0);
  });

  test('a save that is refused stops before any publish is sent', async ({ page, api }) => {
    const calls = answerPublish(api);
    api.on('POST', '/api/admin/events', () =>
      problem(400, 'validation_failed', { fieldCodes: { title: 'title_required' } }),
    );
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();
    await events.openNewEvent();
    await editor.fill({ ...RETREAT, title: '' });

    await editor.publish();

    await expect(editor.fieldError('f-title')).toHaveText('Give the event a title');
    expect(calls.publishes).toEqual([]);
    await expect(editor.dialog).toBeVisible();
  });

  test('a published event offers Cancel event and Save changes, not Publish', async ({
    page,
    api,
  }) => {
    answerPublish(api);
    api.on('GET', `/api/admin/events/${PUBLISHED_EVENTS[1].id}`, () => ({
      json: { ...RETREAT_DETAIL, id: PUBLISHED_EVENTS[1].id, status: 'published' },
    }));
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    await events.open();

    await events.editEvent(PUBLISHED_EVENTS[1].title);

    await expect(editor.footButtons).toHaveText(['Cancel event', 'Save changes']);
  });
});
