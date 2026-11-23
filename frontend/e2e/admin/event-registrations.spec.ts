import { BOOTCAMP_DETAIL, eventList, PUBLISHED_EVENTS } from '../fixtures/admin-events';
import { expect, test, type ApiHandlers } from '../fixtures/test';
import { EventEditorDialog } from '../page-objects/admin/event-editor.dialog';
import { EventRegistrationsPage } from '../page-objects/admin/event-registrations.page';
import { AdminEventsPage } from '../page-objects/admin/events.page';

const BOOTCAMP = PUBLISHED_EVENTS[1];
const PATH = `/api/admin/events/${BOOTCAMP.id}`;

/** Three members registered for the bootcamp, which holds 50 (the list says 38 are going). */
const REGISTRATIONS = {
  eventId: BOOTCAMP.id,
  title: BOOTCAMP.title,
  capacity: 50,
  going: 3,
  registrations: [
    { name: 'Grace Thompson', registeredAt: '2026-04-14T13:05:00+00:00' },
    { name: 'Marcus Bell', registeredAt: '2026-04-14T22:30:00+00:00' },
    { name: '<b>Priya</b> Nair', registeredAt: '2026-04-15T12:40:00+00:00' },
  ],
};

function answer(api: ApiHandlers): void {
  api.on('GET', '/api/admin/events', () => eventList(PUBLISHED_EVENTS));
  api.on('GET', PATH, () => ({ json: BOOTCAMP_DETAIL }));
  api.on('GET', `${PATH}/registrations`, () => ({ json: REGISTRATIONS }));
}

// L2-024 AC1 (ADR 0036): staff see who registered and how much capacity is used.
test.describe('Admin app, event registrations', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Mock event-editor/edit-published, then admin-event-registrations/default.
  test('View registrations in the editor opens the names, dates and capacity used', async ({
    page,
    api,
  }) => {
    answer(api);
    const events = new AdminEventsPage(page);
    const editor = new EventEditorDialog(page, 'Edit event');
    const registrations = new EventRegistrationsPage(page);
    await events.open();
    await events.editEvent(BOOTCAMP.title);
    await expect(editor.viewRegistrationsButton).toBeVisible();

    await editor.viewRegistrations();

    await expect(registrations.heading).toHaveText('Registrations');
    await expect(registrations.subtitle).toHaveText('Saturday Park Bootcamp');
    expect(registrations.location()).toBe(`/events/${BOOTCAMP.id}/registrations`);
    expect(await registrations.title()).toBe('Registrations · Christian Fitness Admin');
    await expect(registrations.capacityLabel).toHaveText('Capacity used: 3 of 50 going');
    await expect(registrations.capacity).toHaveAttribute('aria-valuenow', '6');
    expect(await registrations.rowTexts()).toEqual([
      ['Grace Thompson', 'Apr 14 · 9:05 AM'],
      ['Marcus Bell', 'Apr 14 · 6:30 PM'],
      ['<b>Priya</b> Nair', 'Apr 15 · 8:40 AM'],
    ]);
  });

  // Mock admin-event-registrations/empty.
  test('an event nobody registered for says so', async ({ page, api }) => {
    answer(api);
    api.on('GET', `${PATH}/registrations`, () => ({
      json: { ...REGISTRATIONS, going: 0, registrations: [] },
    }));
    const registrations = new EventRegistrationsPage(page);

    await registrations.open(BOOTCAMP.id);

    await expect(registrations.emptyTitle).toHaveText('No registrations yet');
    await expect(registrations.capacityLabel).toHaveText('Capacity used: 0 of 50 going');
    await expect(registrations.table).toHaveCount(0);
  });

  // Mock admin-event-registrations/error.
  test('a registrations list that does not load offers Try again', async ({ page, api }) => {
    answer(api);
    let calls = 0;
    api.on('GET', `${PATH}/registrations`, () => {
      calls += 1;
      return calls === 1 ? { abort: true } : { json: REGISTRATIONS };
    });
    const registrations = new EventRegistrationsPage(page);
    await registrations.open(BOOTCAMP.id);
    await expect(registrations.errorTitle).toHaveText("Registrations didn't load");

    await registrations.tryAgainButton.click();

    await expect(registrations.rows).toHaveCount(3);
    await expect(registrations.error).toHaveCount(0);
  });
});
