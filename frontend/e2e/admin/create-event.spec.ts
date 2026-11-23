import { eventList, problem, PUBLISHED_EVENTS, RETREAT_DRAFT } from '../fixtures/admin-events';
import { expect, test, XSRF_TOKEN, type ApiHandlers, type ApiReply } from '../fixtures/test';
import {
  EventEditorDialog,
  type EventEditorValues,
} from '../page-objects/admin/event-editor.dialog';
import { AdminEventsPage } from '../page-objects/admin/events.page';

/** Whole Life Retreat as the event editor mock fills it. */
const RETREAT: EventEditorValues = {
  title: 'Whole Life Retreat',
  category: 'Retreat',
  date: '2026-05-22',
  startTime: '16:00',
  place: 'Muskoka Woods, Rosseau',
  area: 'Muskoka Lakes',
  price: '$340',
  capacity: '60',
  summary:
    'Three days of trail runs, strength sessions, worship by the lake and real rest. Meals and cabins included.',
};

/** What the editor sends for {@link RETREAT}. */
const RETREAT_REQUEST = {
  title: 'Whole Life Retreat',
  category: 'retreat',
  date: '2026-05-22',
  startTime: '16:00',
  place: 'Muskoka Woods, Rosseau',
  area: 'Muskoka Lakes',
  priceCents: 34000,
  capacity: 60,
  summary: RETREAT.summary,
};

interface Sent {
  body: unknown;
  token: string | undefined;
}

/**
 * Lists the published events until a draft is created, then the draft too, as the server would;
 * answers each create with `reply` (the created draft unless given) and records what was sent.
 */
function answerCreate(
  api: ApiHandlers,
  reply?: () => ApiReply | Promise<ApiReply>,
): { sent: Sent[]; lists: number } {
  const state = { sent: [] as Sent[], lists: 0 };
  let created = false;
  api.on('GET', '/api/admin/events', () => {
    state.lists++;
    return eventList(created ? [...PUBLISHED_EVENTS, RETREAT_DRAFT] : PUBLISHED_EVENTS);
  });
  api.on('POST', '/api/admin/events', async (request) => {
    state.sent.push({ body: request.postDataJSON(), token: request.headers()['x-xsrf-token'] });
    const answer = reply ? await reply() : { status: 201, json: RETREAT_DRAFT };
    if (answer.status === 201) created = true;
    return answer;
  });
  return state;
}

// L2-022 AC1 (ADR 0017): New event opens the event editor drawer; Save draft saves the event as a
// draft, closes the drawer, says so in a toast and shows the draft in the list.
test.describe('Admin app, creating a draft event', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('New event opens the drawer the default mock draws, focus on Title', async ({
    page,
    api,
  }) => {
    answerCreate(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();

    await events.openNewEvent();

    await expect(editor.dialog).toBeVisible();
    await expect(editor.dialog).toHaveAttribute('aria-modal', 'true');
    await expect(editor.heading).toHaveText('New event');
    await expect(editor.labels).toHaveText([
      'Title',
      'Category',
      'Date',
      'Start time',
      'Place',
      'Area',
      'Price',
      'Capacity',
      'Summary',
    ]);
    await expect(editor.category.locator('option')).toHaveText([
      'Run',
      'Workout',
      'Basketball',
      'Mobility',
      'Workshop',
      'Retreat',
    ]);
    await expect(editor.date).toHaveAttribute('type', 'date');
    await expect(editor.startTime).toHaveAttribute('type', 'time');
    await expect(editor.capacity).toHaveAttribute('type', 'number');
    await expect(editor.capacity).toHaveAttribute('min', '1');
    await expect(editor.priceHint).toHaveText('Leave blank for free');
    await expect(editor.price).toHaveAttribute('aria-describedby', 'f-price-hint');
    await expect(editor.footButtons).toHaveText(['Save draft']);
    await expect(editor.scrim).toBeVisible();
    await expect.poll(() => editor.titleIsFocused()).toBe(true);
    // The drawer slides in over 260 ms: its box settles at the right edge.
    await expect.poll(() => editor.drawerBox()).toEqual({ x: 1440 - 512, width: 512, height: 900 });
  });

  test('Save draft sends the fields, closes the drawer, shows "Draft saved" and lists the draft', async ({
    page,
    api,
  }) => {
    const state = answerCreate(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();
    await expect(events.tabLinks).toHaveText(['All 4', 'Published 4', 'Draft 0']);
    await events.openNewEvent();
    await editor.fill(RETREAT);

    await editor.saveDraft();

    await expect(editor.dialog).toHaveCount(0);
    expect(state.sent).toEqual([{ body: RETREAT_REQUEST, token: XSRF_TOKEN }]);
    await expect(events.toastTitle).toHaveText('Draft saved');
    await expect(events.toastText).toHaveText("Whole Life Retreat isn't visible to members yet.");
    await expect(events.tabLinks).toHaveText(['All 5', 'Published 4', 'Draft 1']);
    await expect(events.rows).toHaveCount(5);
    expect((await events.rowTexts())[4]).toEqual([
      'Whole Life Retreat',
      'Muskoka Woods, Rosseau',
      'May 22 · 4:00 PM',
      '0 / 60',
      'Draft',
    ]);
    expect(state.lists).toBe(2);
    await expect.poll(() => events.isFocused(events.newEventButton)).toBe(true);
  });

  // Mock event-editor/saving: a gate holds the answer, so no clock is needed.
  test('while saving, Save draft says "Saving…", is busy, every field is read-only and the drawer stays', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    answerCreate(api, async () => {
      await gate;
      return { status: 201, json: RETREAT_DRAFT };
    });
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();
    await events.openNewEvent();
    await editor.fill(RETREAT);

    await editor.saveDraft();

    await expect(editor.saveDraftButton).toHaveText('Saving…');
    await expect(editor.saveDraftButton).toHaveAttribute('aria-busy', 'true');
    await expect(editor.saveDraftButton).toBeDisabled();
    for (const input of await editor.textInputs.all()) {
      await expect(input).toHaveAttribute('readonly', '');
    }
    await expect(editor.category).toBeDisabled();
    await expect(editor.title).toHaveValue('Whole Life Retreat');
    // Escape and the scrim wait for the answer, so the save is never lost.
    await editor.pressEscape();
    await editor.clickScrim();
    await expect(editor.dialog).toBeVisible();
    release();
    await expect(editor.dialog).toHaveCount(0);
  });

  test('a blank price is free and a typed amount is read in cents', async ({ page, api }) => {
    const state = answerCreate(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();
    await events.openNewEvent();
    await editor.fill({ ...RETREAT, price: '' });
    await editor.saveDraft();
    await expect(editor.dialog).toHaveCount(0);
    await events.openNewEvent();
    await editor.fill({ ...RETREAT, price: '$1,234.50' });

    await editor.saveDraft();

    await expect(editor.dialog).toHaveCount(0);
    expect(state.sent.map((s) => (s.body as { priceCents: unknown }).priceCents)).toEqual([
      0, 123450,
    ]);
  });

  test('Escape, Close and the scrim each close the drawer without saving, focus back on New event', async ({
    page,
    api,
  }) => {
    const state = answerCreate(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();

    for (const dismiss of [
      () => editor.pressEscape(),
      () => editor.closeButton.click(),
      () => editor.clickScrim(),
    ]) {
      await events.openNewEvent();
      await editor.title.fill('Not saved');
      await dismiss();
      await expect(editor.dialog).toHaveCount(0);
      await expect.poll(() => events.isFocused(events.newEventButton)).toBe(true);
    }
    expect(state.sent).toEqual([]);
    await expect(events.toast).toHaveCount(0);
  });

  test('a refused save keeps the drawer open with a generic message and the fields editable', async ({
    page,
    api,
  }) => {
    const state = answerCreate(api, () =>
      problem(400, 'validation_failed', {
        errors: { title: ['A sentence from the server the screen never shows'] },
        fieldCodes: { title: 'title_required' },
      }),
    );
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();
    await events.openNewEvent();
    await editor.fill(RETREAT);

    await editor.saveDraft();

    await expect(editor.alert).toContainText("Couldn't save the draft");
    await expect(editor.alert).toContainText(
      'Check every field and try again. Your changes are still here.',
    );
    await expect(editor.dialog).not.toContainText('A sentence from the server');
    await expect(editor.saveDraftButton).toHaveText('Save draft');
    await expect(editor.saveDraftButton).toBeEnabled();
    await expect(editor.title).not.toHaveAttribute('readonly');
    await expect(editor.title).toHaveValue('Whole Life Retreat');
    expect(state.sent).toHaveLength(1);
    await expect(events.toast).toHaveCount(0);
  });

  test('the toast leaves after about 6 seconds, and Dismiss removes it at once', async ({
    page,
    api,
  }) => {
    answerCreate(api);
    await page.clock.install();
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();
    await events.openNewEvent();
    await editor.fill(RETREAT);
    await editor.saveDraft();
    await expect(events.toastTitle).toHaveText('Draft saved');

    await page.clock.fastForward(5_000);
    await expect(events.toast).toHaveCount(1);
    await page.clock.fastForward(1_500);
    await expect(events.toast).toHaveCount(0);

    await events.openNewEvent();
    await editor.fill(RETREAT);
    await editor.saveDraft();
    await expect(events.toastTitle).toHaveText('Draft saved');
    await events.toastDismiss.click();
    await expect(events.toast).toHaveCount(0);
  });
});

// L2-039 (ADR 0017): on a phone the drawer fills the width.
test.describe('Admin app, the event editor on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the drawer is full width and the Save draft button at least 44 px tall', async ({
    page,
    api,
  }) => {
    answerCreate(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page);
    await events.open();

    await events.openNewEvent();

    await expect.poll(() => editor.drawerBox()).toEqual({ x: 0, width: 375, height: 812 });
    expect((await editor.saveDraftButton.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
