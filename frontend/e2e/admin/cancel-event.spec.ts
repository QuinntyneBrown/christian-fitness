import { BOOTCAMP_DETAIL, eventList, PUBLISHED_EVENTS, problem } from '../fixtures/admin-events';
import { expect, test, XSRF_TOKEN, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { CancelEventDialog } from '../page-objects/admin/cancel-event.dialog';
import { EventEditorDialog } from '../page-objects/admin/event-editor.dialog';
import { AdminEventsPage } from '../page-objects/admin/events.page';

const BOOTCAMP = PUBLISHED_EVENTS[1];
const BOOTCAMP_PATH = `/api/admin/events/${BOOTCAMP.id}`;
const CANCELLED_BOOTCAMP = { ...BOOTCAMP, status: 'cancelled' };

interface Calls {
  cancels: { token: string | undefined }[];
}

/** Lists the cast, opens the bootcamp for editing and answers a cancel with `cancel`. */
function answerCancel(api: ApiHandlers, cancel?: () => ApiReply | Promise<ApiReply>): Calls {
  const calls: Calls = { cancels: [] };
  let cancelled = false;
  api.on('GET', '/api/admin/events', () =>
    eventList(
      PUBLISHED_EVENTS.map((e) =>
        cancelled && e === BOOTCAMP ? { ...e, status: 'cancelled' } : e,
      ),
    ),
  );
  api.on('GET', BOOTCAMP_PATH, () => ({ json: BOOTCAMP_DETAIL }));
  api.on('POST', `${BOOTCAMP_PATH}/cancel`, async (request) => {
    calls.cancels.push({ token: request.headers()['x-xsrf-token'] });
    const answer = cancel ? await cancel() : { json: CANCELLED_BOOTCAMP };
    if (!answer.status || answer.status === 200) cancelled = true;
    return answer;
  });
  return calls;
}

// L2-023 AC2 (ADR 0035): a published event is cancelled from its editor, after a confirmation.
test.describe('Admin app, cancelling an event', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Mock event-editor/edit-published.
  test('a published event offers Cancel event beside Save changes', async ({ page, api }) => {
    answerCancel(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    await events.open();

    await events.editEvent(BOOTCAMP.title);

    await expect(editor.footButtons).toHaveText([
      'View registrations',
      'Cancel event',
      'Save changes',
    ]);
  });

  // Mock cancel-event/default.
  test('Cancel event asks first, naming the event, and sends nothing yet', async ({
    page,
    api,
  }) => {
    const calls = answerCancel(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    const confirm = new CancelEventDialog(page);
    await events.open();
    await events.editEvent(BOOTCAMP.title);

    await editor.cancelEvent();

    await expect(confirm.dialog).toBeVisible();
    await expect(confirm.subtitle).toHaveText('Saturday Park Bootcamp · Sat, Apr 25');
    await expect(confirm.text).toHaveText(
      "It leaves the Events list for members. The 38 members registered see it as cancelled on their Profile. This can't be undone.",
    );
    await expect(confirm.keepButton).toBeFocused();
    expect(calls.cancels).toEqual([]);
  });

  test('Keep event, Close and Escape leave the event published and the editor open', async ({
    page,
    api,
  }) => {
    const calls = answerCancel(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    const confirm = new CancelEventDialog(page);
    await events.open();
    await events.editEvent(BOOTCAMP.title);

    await editor.cancelEvent();
    await confirm.keepButton.click();
    await expect(confirm.dialog).toHaveCount(0);
    await editor.cancelEvent();
    await confirm.closeButton.click();
    await expect(confirm.dialog).toHaveCount(0);
    await editor.cancelEvent();
    await expect(confirm.dialog).toBeVisible();
    await confirm.pressEscape();

    await expect(confirm.dialog).toHaveCount(0);
    await expect(editor.dialog).toBeVisible();
    expect(calls.cancels).toEqual([]);
  });

  test(
    'confirming cancels the event, closes both dialogs, says so and lists it as Cancelled',
    { tag: '@critical' },
    async ({ page, api }) => {
      const calls = answerCancel(api);
      const events = new AdminEventsPage(page);
      const editor = new EventEditorDialog(page, 'Edit event');
      const confirm = new CancelEventDialog(page);
      await events.open();
      await events.editEvent(BOOTCAMP.title);
      await editor.cancelEvent();

      await confirm.cancelButton.click();

      await expect(confirm.dialog).toHaveCount(0);
      await expect(editor.dialog).toHaveCount(0);
      expect(calls.cancels).toEqual([{ token: XSRF_TOKEN }]);
      await expect(events.toastTitle).toHaveText('Saturday Park Bootcamp is cancelled');
      await expect(events.toastText).toHaveText(
        'Registered members see it as cancelled on their Profile.',
      );
      expect((await events.rowTexts())[1]).toEqual([
        'Saturday Park Bootcamp',
        'Trillium Park, Ontario Place',
        'Apr 25 · 8:00 AM',
        '38 / 50',
        'Cancelled',
      ]);
    },
  );

  // Mock cancel-event/busy.
  test('while cancelling, the button says "Cancelling…", is busy, and everything else holds still', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    answerCancel(api, async () => {
      await gate;
      return { json: CANCELLED_BOOTCAMP };
    });
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    const confirm = new CancelEventDialog(page);
    await events.open();
    await events.editEvent(BOOTCAMP.title);
    await editor.cancelEvent();

    await confirm.cancelButton.click();

    await expect(confirm.cancelButton).toHaveText('Cancelling…');
    await expect(confirm.cancelButton).toHaveAttribute('aria-busy', 'true');
    await expect(confirm.cancelButton).toBeDisabled();
    await expect(confirm.keepButton).toBeDisabled();
    release();
    await expect(confirm.dialog).toHaveCount(0);
  });

  // Mock cancel-event/failed.
  test('a cancel that fails keeps the dialog with "Couldn\'t cancel the event" and Cancel event tries again', async ({
    page,
    api,
  }) => {
    const answers: ApiReply[] = [problem(500, 'error')];
    const calls = answerCancel(api, () => answers.shift() ?? { json: CANCELLED_BOOTCAMP });
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    const confirm = new CancelEventDialog(page);
    await events.open();
    await events.editEvent(BOOTCAMP.title);
    await editor.cancelEvent();

    await confirm.cancelButton.click();

    await expect(confirm.alert).toContainText("Couldn't cancel the event");
    await expect(confirm.alert).toContainText('It is still published. Try again in a moment.');
    await expect(confirm.cancelButton).toBeEnabled();
    await confirm.cancelButton.click();
    await expect(confirm.dialog).toHaveCount(0);
    expect(calls.cancels).toHaveLength(2);
    await expect(events.toastTitle).toHaveText('Saturday Park Bootcamp is cancelled');
  });

  test('an event that is no longer published refuses the cancel with the same generic message', async ({
    page,
    api,
  }) => {
    answerCancel(api, () => problem(409, 'event_not_published'));
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    const confirm = new CancelEventDialog(page);
    await events.open();
    await events.editEvent(BOOTCAMP.title);
    await editor.cancelEvent();

    await confirm.cancelButton.click();

    await expect(confirm.alert).toContainText("Couldn't cancel the event");
    await expect(confirm.alert).not.toContainText('event_not_published');
  });
});
