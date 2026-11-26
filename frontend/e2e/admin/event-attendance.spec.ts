import {
  ATTENDANCE_EVENT_ID,
  ATTENDANCE_PATH,
  ATTENDANCE_ROWS,
  attendance,
  attendanceNotStarted,
} from '../fixtures/admin-attendance';
import { expect, MODERATOR_SIGNED_IN, test, type ApiHandlers } from '../fixtures/test';
import { EventAttendancePage } from '../page-objects/admin/event-attendance.page';
import { EventRegistrationsPage } from '../page-objects/admin/event-registrations.page';

/** The six registered members, in the API's name order, and whether each is ticked. */
const ROWS: [string, boolean][] = [
  ['<b>Priya</b> Nair', true],
  ['Daniel Okafor', false],
  ['Grace Thompson', true],
  ['Hannah Kim', false],
  ['Marcus Bell', true],
  ['Naomi Wright', false],
];

function answer(api: ApiHandlers): void {
  api.on('GET', ATTENDANCE_PATH, () => ({ json: attendance() }));
  api.on('GET', `/api/admin/events/${ATTENDANCE_EVENT_ID}/registrations`, () => ({
    json: {
      eventId: ATTENDANCE_EVENT_ID,
      title: 'Stretch & Pray: Mobility Morning',
      capacity: 30,
      going: 0,
      registrations: [],
    },
  }));
}

// L2-080 (ADR 0106): staff open an event's Attendance tab and see who is registered and who came.
test.describe('Admin app, event attendance', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Mock admin-event-registrations/default, then admin-event-attendance/default (AC1, AC11).
  test('the Attendance tab lists everyone registered by name with a Came box and the count', async ({
    page,
    api,
  }) => {
    answer(api);
    const registrations = new EventRegistrationsPage(page);
    const attendancePage = new EventAttendancePage(page);
    await registrations.open(ATTENDANCE_EVENT_ID);
    await expect(attendancePage.currentTab).toHaveText('Registrations');

    await attendancePage.attendanceTab.click();

    await expect(attendancePage.heading).toHaveText('Attendance');
    await expect(attendancePage.subtitle).toHaveText('Stretch & Pray: Mobility Morning');
    expect(attendancePage.location()).toBe(`/events/${ATTENDANCE_EVENT_ID}/attendance`);
    expect(await attendancePage.title()).toBe('Event attendance · Christian Fitness Admin');
    await expect(attendancePage.currentTab).toHaveText('Attendance');
    await expect(attendancePage.status).toHaveText('Came: 3 of 6. Changes save as you tick.');
    await expect(attendancePage.status).toHaveAttribute('aria-live', 'polite');
    expect(await attendancePage.rowStates()).toEqual(ROWS);
    await expect(attendancePage.box('<b>Priya</b> Nair')).toBeChecked();
    await expect(attendancePage.main.locator('td b')).toHaveCount(0);
  });

  // L2-019 AC1 as amended: a Moderator opens the tab by its address.
  test('a Moderator opens the Attendance tab by its address', async ({ page, api }) => {
    answer(api);
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    const attendancePage = new EventAttendancePage(page);

    await attendancePage.open(ATTENDANCE_EVENT_ID);

    await expect(attendancePage.boxes).toHaveCount(6);
    await expect(attendancePage.status).toHaveText('Came: 3 of 6. Changes save as you tick.');
  });

  // Mock admin-event-attendance/not-started (AC5).
  test('before the event starts, it says when attendance opens and shows no boxes', async ({
    page,
    api,
  }) => {
    answer(api);
    api.on('GET', ATTENDANCE_PATH, () => ({ json: attendanceNotStarted() }));
    const attendancePage = new EventAttendancePage(page);

    await attendancePage.open(ATTENDANCE_EVENT_ID);

    await expect(attendancePage.emptyTitle).toHaveText('Attendance opens when the event starts');
    await expect(attendancePage.emptyText).toHaveText(
      'Stretch & Pray: Mobility Morning starts Sat Apr 18 at 8:00 AM. Until then, 17 members are registered; see Registrations.',
    );
    await expect(attendancePage.registrationsTab).toHaveAttribute(
      'href',
      `/events/${ATTENDANCE_EVENT_ID}/registrations`,
    );
    await expect(attendancePage.boxes).toHaveCount(0);
    await expect(attendancePage.status).toHaveCount(0);
  });

  // Mock admin-event-attendance/empty (AC6).
  test('a started event nobody registered for says there is no one to mark', async ({
    page,
    api,
  }) => {
    answer(api);
    api.on('GET', ATTENDANCE_PATH, () => ({ json: attendance([]) }));
    const attendancePage = new EventAttendancePage(page);

    await attendancePage.open(ATTENDANCE_EVENT_ID);

    await expect(attendancePage.emptyTitle).toHaveText('No one to mark yet');
    await expect(attendancePage.emptyText).toHaveText(
      'Members who register for this event appear here once the event has started, each with a Came box.',
    );
    await expect(attendancePage.table).toHaveCount(0);
  });

  // Mock admin-event-attendance/loading (AC6): a gate holds the answer, so no clock is needed.
  test('while attendance loads, skeleton rows are busy', async ({ page, api }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    answer(api);
    api.on('GET', ATTENDANCE_PATH, async () => {
      await gate;
      return { json: attendance() };
    });
    const attendancePage = new EventAttendancePage(page);

    await attendancePage.open(ATTENDANCE_EVENT_ID);

    await expect(attendancePage.loading).toBeVisible();
    await expect(attendancePage.loadingLabel).toHaveText('Loading attendance');
    await expect(attendancePage.boxes).toHaveCount(0);
    release();
    await expect(attendancePage.boxes).toHaveCount(6);
    await expect(attendancePage.loading).toHaveCount(0);
  });

  // Mock admin-event-attendance/error (AC6).
  test('attendance that does not load offers Try again', async ({ page, api }) => {
    answer(api);
    let calls = 0;
    api.on('GET', ATTENDANCE_PATH, () => {
      calls += 1;
      return calls === 1 ? { abort: true } : { json: attendance() };
    });
    const attendancePage = new EventAttendancePage(page);
    await attendancePage.open(ATTENDANCE_EVENT_ID);
    await expect(attendancePage.errorTitle).toHaveText("Attendance didn't load");

    await attendancePage.tryAgainButton.click();

    await expect(attendancePage.boxes).toHaveCount(6);
    await expect(attendancePage.error).toHaveCount(0);
  });
});

/** The PUT of one member's Came box. */
const markPath = (name: string): string =>
  `${ATTENDANCE_PATH}/${ATTENDANCE_ROWS.find((row) => row.name === name)?.memberId ?? ''}`;

/** Holds each answer to a Came box until the test releases it, recording what was sent. */
function holdMarks(api: ApiHandlers, name: string, status = 204) {
  const sent: unknown[] = [];
  let release = (): void => undefined;
  const gate = new Promise<void>((resolve) => (release = resolve));
  api.on('PUT', markPath(name), async (request) => {
    sent.push(request.postDataJSON());
    await gate;
    return { status };
  });
  return { sent, release: () => release() };
}

// L2-080 AC2, AC3 (ADR 0106): each tick saves at once; a failed one goes back with a toast.
test.describe('Admin app, recording attendance', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Mocks admin-event-attendance/saving, then default.
  test(
    'ticking a box saves it at once, busy while it saves, then the count updates',
    { tag: '@critical' },
    async ({ page, api }) => {
      answer(api);
      const marks = holdMarks(api, 'Hannah Kim');
      const attendancePage = new EventAttendancePage(page);
      await attendancePage.open(ATTENDANCE_EVENT_ID);
      await expect(attendancePage.status).toHaveText('Came: 3 of 6. Changes save as you tick.');

      await attendancePage.box('Hannah Kim').check();

      await expect(attendancePage.status).toHaveText('Saving Hannah Kim…');
      await expect(attendancePage.box('Hannah Kim')).toHaveAttribute('aria-busy', 'true');
      await expect(attendancePage.boxLabel('Hannah Kim')).toHaveText('Saving…');
      await expect(attendancePage.box('Naomi Wright')).toBeEnabled();
      await expect(attendancePage.main.getByRole('button', { name: /save/i })).toHaveCount(0);
      expect(marks.sent).toEqual([{ came: true }]);
      marks.release();
      await expect(attendancePage.status).toHaveText('Came: 4 of 6. Changes save as you tick.');
      await expect(attendancePage.box('Hannah Kim')).not.toHaveAttribute('aria-busy');
      await expect(attendancePage.boxLabel('Hannah Kim')).toHaveText('Came');
      expect(await attendancePage.rowStates()).toEqual(
        ROWS.map(([name, came]) => [name, name === 'Hannah Kim' ? true : came]),
      );
    },
  );

  // Mock admin-event-attendance/failed (AC3).
  test('a tick that fails goes back, with a toast, focus kept and other boxes untouched', async ({
    page,
    api,
  }) => {
    answer(api);
    const marks = holdMarks(api, 'Hannah Kim', 500);
    const attendancePage = new EventAttendancePage(page);
    await attendancePage.open(ATTENDANCE_EVENT_ID);

    await attendancePage.box('Hannah Kim').check();
    await expect(attendancePage.box('Hannah Kim')).toBeChecked();
    marks.release();

    await expect(attendancePage.toastTitle).toHaveText("We couldn't save Hannah Kim");
    await expect(attendancePage.toastText).toHaveText('Their box is back as it was. Try again.');
    await expect(attendancePage.toast).toHaveClass(/toast--danger/);
    await expect(attendancePage.box('Hannah Kim')).not.toBeChecked();
    await expect(attendancePage.box('Hannah Kim')).toBeFocused();
    await expect(attendancePage.status).toHaveText('Came: 3 of 6. Changes save as you tick.');
    expect(await attendancePage.rowStates()).toEqual(ROWS);
  });
});

// L2-080 AC10: below LG the list stays one column of rows at least 44 px, without page scroll sideways.
test.describe('Admin app, recording attendance on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('a box is cleared by keyboard, in rows at least 44 px tall', async ({ page, api }) => {
    answer(api);
    const marks = holdMarks(api, 'Grace Thompson');
    const attendancePage = new EventAttendancePage(page);
    await attendancePage.open(ATTENDANCE_EVENT_ID);
    await expect(attendancePage.boxes).toHaveCount(6);

    await attendancePage.box('Grace Thompson').focus();
    await page.keyboard.press('Space');
    marks.release();

    await expect(attendancePage.status).toHaveText('Came: 2 of 6. Changes save as you tick.');
    expect(marks.sent).toEqual([{ came: false }]);
    for (const height of await attendancePage.rowHeights())
      expect(height).toBeGreaterThanOrEqual(44);
    expect(await attendancePage.scrollsSideways()).toBe(false);
  });
});
