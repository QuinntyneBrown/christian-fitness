import {
  BOOTCAMP_DETAIL,
  eventList,
  PUBLISHED_EVENTS,
  problem,
  type AdminEventFixture,
} from '../fixtures/admin-events';
import { expect, test, XSRF_TOKEN, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { EventEditorDialog } from '../page-objects/admin/event-editor.dialog';
import { AdminEventsPage } from '../page-objects/admin/events.page';

const BOOTCAMP = PUBLISHED_EVENTS[1];
const DETAIL_PATH = `/api/admin/events/${BOOTCAMP.id}`;
const KEPT_KEY = BOOTCAMP_DETAIL.imageKey;
const NEW_KEY = 'fedcba9876543210fedcba9876543210.png';

/** What the editor sends for the Bootcamp, unchanged. */
const SAVED_REQUEST = {
  title: 'Saturday Park Bootcamp',
  category: 'workout',
  date: '2026-04-25',
  startTime: '08:00',
  place: 'Trillium Park, Ontario Place',
  area: 'Waterfront, Toronto',
  priceCents: 1000,
  capacity: 50,
  summary: BOOTCAMP_DETAIL.summary,
  imageKey: KEPT_KEY,
};

interface Sent {
  body: unknown;
  token: string | undefined;
}

interface Edits {
  puts: Sent[];
  gets: number;
  lists: number;
  uploads: number;
}

/**
 * Lists the events (the Bootcamp renamed once an edit is saved), opens the Bootcamp by id and
 * answers each save with `reply` (the updated event unless given); records what was sent.
 */
function answerEdit(
  api: ApiHandlers,
  options: { reply?: () => ApiReply | Promise<ApiReply>; detail?: () => ApiReply } = {},
): Edits {
  const state: Edits = { puts: [], gets: 0, lists: 0, uploads: 0 };
  let saved: AdminEventFixture | null = null;
  api.on('GET', '/api/admin/events', () => {
    state.lists++;
    return eventList(PUBLISHED_EVENTS.map((e) => (saved && e.id === saved.id ? saved : e)));
  });
  api.on('GET', DETAIL_PATH, () => {
    state.gets++;
    return options.detail ? options.detail() : { json: BOOTCAMP_DETAIL };
  });
  api.on('PUT', DETAIL_PATH, async (request) => {
    const body = request.postDataJSON() as { title: string; capacity: number };
    state.puts.push({ body, token: request.headers()['x-xsrf-token'] });
    const answer = options.reply
      ? await options.reply()
      : { json: { ...BOOTCAMP, title: body.title, capacity: body.capacity } };
    if (!answer.status || answer.status === 200) {
      saved = answer.json as AdminEventFixture;
    }
    return answer;
  });
  return state;
}

/** The Edit action of the Bootcamp's row, opened and settled. */
async function openBootcamp(events: AdminEventsPage, editor: EventEditorDialog): Promise<void> {
  await events.open();
  await events.editEvent(BOOTCAMP.title);
  await expect(editor.dialog).toBeVisible();
}

// L2-022 AC7 to AC9 (ADR 0025): the table's Edit action opens the editor with the saved fields;
// Save changes saves them, closes the drawer, says so in a toast and shows the change.
test.describe('Admin app, editing an event', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Mock event-editor/edit.
  test('Edit opens "Edit event" with every saved field and the image, focus on Title', async ({
    page,
    api,
  }) => {
    const state = answerEdit(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');

    await openBootcamp(events, editor);

    expect(state.gets).toBe(1);
    await expect(editor.heading).toHaveText('Edit event');
    await expect(editor.title).toHaveValue('Saturday Park Bootcamp');
    await expect(editor.category).toHaveValue('workout');
    await expect(editor.date).toHaveValue('2026-04-25');
    await expect(editor.startTime).toHaveValue('08:00');
    await expect(editor.place).toHaveValue('Trillium Park, Ontario Place');
    await expect(editor.area).toHaveValue('Waterfront, Toronto');
    await expect(editor.price).toHaveValue('$10');
    await expect(editor.capacity).toHaveValue('50');
    await expect(editor.summary).toHaveValue(BOOTCAMP_DETAIL.summary);
    await expect(editor.imageName).toHaveText('Current image');
    await expect(editor.removeImageButton).toBeVisible();
    await expect(editor.footButtons).toHaveText(['Save changes']);
    await expect.poll(() => editor.titleIsFocused()).toBe(true);
  });

  test('Save changes sends every field, closes the drawer, says "Changes saved" and lists the change', async ({
    page,
    api,
  }) => {
    const state = answerEdit(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    await openBootcamp(events, editor);
    await editor.title.fill('Saturday Park Bootcamp, Spring');
    await editor.capacity.fill('55');

    await editor.saveChanges();

    await expect(editor.dialog).toHaveCount(0);
    expect(state.puts).toEqual([
      {
        body: { ...SAVED_REQUEST, title: 'Saturday Park Bootcamp, Spring', capacity: 55 },
        token: XSRF_TOKEN,
      },
    ]);
    await expect(events.toastTitle).toHaveText('Changes saved');
    await expect(events.toastText).toHaveText('Saturday Park Bootcamp, Spring is updated.');
    expect((await events.rowTexts())[1][0]).toBe('Saturday Park Bootcamp, Spring');
    expect(state.lists).toBe(2);
    await expect.poll(() => events.isFocused(events.editButton(BOOTCAMP.title))).toBe(true);
  });

  // Mock event-editor/edit-saving.
  test('while saving, Save changes says "Saving…", is busy and every field is read-only', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    answerEdit(api, {
      reply: async () => {
        await gate;
        return { json: BOOTCAMP };
      },
    });
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    await openBootcamp(events, editor);

    await editor.saveChanges();

    await expect(editor.saveButton).toHaveText('Saving…');
    await expect(editor.saveButton).toHaveAttribute('aria-busy', 'true');
    await expect(editor.saveButton).toBeDisabled();
    for (const input of await editor.textInputs.all()) {
      await expect(input).toHaveAttribute('readonly', '');
    }
    await expect(editor.chooseImageButton).toBeDisabled();
    await expect(editor.removeImageButton).toBeDisabled();
    release();
    await expect(editor.dialog).toHaveCount(0);
  });

  // Mock event-editor/edit-invalid (AC8): each refused field shows its own message.
  test('a refused save marks each named field, shows an error summary that takes focus and keeps what was typed', async ({
    page,
    api,
  }) => {
    answerEdit(api, {
      reply: () =>
        problem(400, 'validation_failed', {
          errors: { title: ['A sentence from the server the screen never shows'] },
          fieldCodes: { title: 'title_required', startTime: 'start_time_required' },
        }),
    });
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    await openBootcamp(events, editor);
    await editor.title.fill('');
    await editor.summary.fill('Typed and kept');

    await editor.saveChanges();

    await expect(editor.alert).toContainText('2 things to fix before saving');
    await expect(editor.alertLinks).toHaveText(['Give the event a title', 'Pick a start time']);
    await expect.poll(() => events.isFocused(editor.alert)).toBe(true);
    await expect(editor.fieldError('f-title')).toHaveText('Give the event a title');
    await expect(editor.title).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.title).toHaveAttribute('aria-describedby', 'f-title-error');
    await expect(editor.fieldError('f-time')).toHaveText('Pick a start time');
    await expect(editor.startTime).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.place).not.toHaveAttribute('aria-invalid');
    await expect(editor.dialog).not.toContainText('A sentence from the server');
    await expect(editor.summary).toHaveValue('Typed and kept');
    await expect(editor.saveButton).toHaveText('Save changes');
    await editor.alertLinks.first().click();
    await expect.poll(() => editor.titleIsFocused()).toBe(true);
  });

  // L2-022 AC3: the capacity is the field that is wrong, and the message names the number going.
  test('a capacity below the members going is refused on Capacity with the number going', async ({
    page,
    api,
  }) => {
    answerEdit(api, { reply: () => problem(409, 'capacity_below_going') });
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    await openBootcamp(events, editor);
    await editor.capacity.fill('30');

    await editor.saveChanges();

    await expect(editor.alert).toContainText('1 thing to fix before saving');
    await expect(editor.alertLinks).toHaveText([
      '38 members are going. Set a capacity of at least 38',
    ]);
    await expect(editor.fieldError('f-capacity')).toHaveText(
      '38 members are going. Set a capacity of at least 38',
    );
    await expect(editor.capacity).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.capacity).toHaveValue('30');
  });

  // Mock event-editor/edit-failed.
  test('a save that gets no answer or a server error shows "Couldn\'t save the changes" and keeps the fields', async ({
    page,
    api,
  }) => {
    let answers: ApiReply[] = [{ abort: true }, problem(500, 'error'), { json: BOOTCAMP }];
    answerEdit(api, { reply: () => answers.shift() ?? { json: BOOTCAMP } });
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    await openBootcamp(events, editor);
    await editor.title.fill('Typed and kept');

    await editor.saveChanges();
    await expect(editor.alert).toContainText("Couldn't save the changes");
    await expect(editor.alert).toContainText(
      "The server didn't respond. Your changes are still here; try again.",
    );
    await expect(editor.title).toHaveValue('Typed and kept');
    await expect(editor.saveButton).toHaveText('Save changes');
    await expect(editor.saveButton).toBeEnabled();
    await editor.saveChanges();
    await expect(editor.alert).toContainText("Couldn't save the changes");

    answers = [];
    await editor.saveChanges();
    await expect(editor.dialog).toHaveCount(0);
  });

  // Mock admin-toast/load-failed.
  test('an event that does not open says so in a toast and no editor opens', async ({
    page,
    api,
  }) => {
    answerEdit(api, { detail: () => ({ abort: true }) });
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    await events.open();

    await events.editEvent(BOOTCAMP.title);

    await expect(events.toastTitle).toHaveText("Couldn't open the event");
    await expect(events.toastText).toHaveText(
      "We couldn't reach the server. Try Edit again in a moment.",
    );
    await expect(editor.dialog).toHaveCount(0);
  });

  test('Escape closes the editor without saving and focus goes back to Edit', async ({
    page,
    api,
  }) => {
    const state = answerEdit(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    await openBootcamp(events, editor);
    await editor.title.fill('Not saved');

    await editor.pressEscape();

    await expect(editor.dialog).toHaveCount(0);
    expect(state.puts).toEqual([]);
    await expect.poll(() => events.isFocused(events.editButton(BOOTCAMP.title))).toBe(true);
  });
});

// L2-022 AC9 (ADR 0025): an image chosen in the editor is uploaded at once; saving keeps it.
test.describe('Admin app, the event image', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const PNG = { name: 'park-new.png', mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50]) };

  function answerUpload(api: ApiHandlers, reply?: () => ApiReply, state?: Edits): void {
    api.on('POST', '/api/admin/events/images', () => {
      if (state) state.uploads++;
      return reply ? reply() : { status: 201, json: { imageKey: NEW_KEY } };
    });
  }

  test('a chosen image is uploaded, shown by name with Remove, and saving keeps its key', async ({
    page,
    api,
  }) => {
    const state = answerEdit(api);
    answerUpload(api, undefined, state);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    await openBootcamp(events, editor);

    await editor.chooseImage(PNG);

    await expect(editor.imageName).toHaveText('park-new.png');
    await expect(editor.removeImageButton).toBeVisible();
    expect(state.uploads).toBe(1);
    await editor.saveChanges();
    await expect(editor.dialog).toHaveCount(0);
    expect(state.puts.map((s) => (s.body as { imageKey: unknown }).imageKey)).toEqual([NEW_KEY]);
  });

  // Mock event-editor/image-invalid.
  test('an image the server refuses shows its message under the field and keeps the old image', async ({
    page,
    api,
  }) => {
    const state = answerEdit(api);
    answerUpload(
      api,
      () => problem(400, 'validation_failed', { fieldCodes: { image: 'image_invalid' } }),
      state,
    );
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    await openBootcamp(events, editor);

    await editor.chooseImage({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('x'),
    });

    await expect(editor.fieldError('f-image')).toHaveText(
      'Use a JPEG, PNG or WebP image up to 5 MB',
    );
    await expect(editor.imageName).toHaveText('Current image');
    await editor.saveChanges();
    await expect(editor.dialog).toHaveCount(0);
    expect(state.puts.map((s) => (s.body as { imageKey: unknown }).imageKey)).toEqual([KEPT_KEY]);
  });

  test('Remove clears the image: the field says none is chosen and saving sends no key', async ({
    page,
    api,
  }) => {
    const state = answerEdit(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    await openBootcamp(events, editor);

    await editor.removeImageButton.click();

    await expect(editor.imageName).toHaveText('No image chosen');
    await expect(editor.removeImageButton).toHaveCount(0);
    await editor.saveChanges();
    await expect(editor.dialog).toHaveCount(0);
    expect(state.puts.map((s) => (s.body as { imageKey: unknown }).imageKey)).toEqual([null]);
  });

  test('a new event takes an image too, and sends its key with Save draft', async ({
    page,
    api,
  }) => {
    answerUpload(api);
    const sent: unknown[] = [];
    api.on('GET', '/api/admin/events', () => eventList(PUBLISHED_EVENTS));
    api.on('POST', '/api/admin/events', (request) => {
      sent.push(request.postDataJSON());
      return { status: 201, json: { ...BOOTCAMP, id: 'new', status: 'draft' } };
    });
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();
    await events.openNewEvent();
    await expect(editor.imageName).toHaveText('No image chosen');
    await editor.fill({
      title: 'Whole Life Retreat',
      category: 'Retreat',
      date: '2026-05-22',
      startTime: '16:00',
      place: 'Muskoka Woods, Rosseau',
      area: 'Muskoka Lakes',
      price: '$340',
      capacity: '60',
      summary: 'Meals and cabins included.',
    });

    await editor.chooseImage(PNG);
    await editor.saveDraft();

    await expect(editor.dialog).toHaveCount(0);
    expect(sent.map((body) => (body as { imageKey: unknown }).imageKey)).toEqual([NEW_KEY]);
  });
});
