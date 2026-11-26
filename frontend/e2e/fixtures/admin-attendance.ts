/**
 * The Attendance tab's answers (mocks `docs/mocks/pages/admin-event-attendance/`; L2-080; ADR
 * 0106): Stretch & Pray: Mobility Morning, which started at 8:00 AM on Saturday, April 18, with
 * six members registered (in name order, as the API sends them) and three ticked as came.
 */
export const ATTENDANCE_EVENT_ID = '0190c0de-0000-7000-8000-00000000a116';

export const ATTENDANCE_PATH = `/api/admin/events/${ATTENDANCE_EVENT_ID}/attendance`;

export interface AttendanceRow {
  memberId: string;
  name: string;
  came: boolean;
}

const member = (n: number): string =>
  `0190c0de-0000-7000-8000-0000000a16${String(n).padStart(2, '0')}`;

export const ATTENDANCE_ROWS: readonly AttendanceRow[] = [
  { memberId: member(1), name: '<b>Priya</b> Nair', came: true },
  { memberId: member(2), name: 'Daniel Okafor', came: false },
  { memberId: member(3), name: 'Grace Thompson', came: true },
  { memberId: member(4), name: 'Hannah Kim', came: false },
  { memberId: member(5), name: 'Marcus Bell', came: true },
  { memberId: member(6), name: 'Naomi Wright', came: false },
];

/** The attendance of the started event, with `rows` (by default the six above). */
export function attendance(rows: readonly AttendanceRow[] = ATTENDANCE_ROWS): object {
  return {
    eventId: ATTENDANCE_EVENT_ID,
    title: 'Stretch & Pray: Mobility Morning',
    startsAt: '2026-04-18T12:00:00+00:00',
    started: true,
    registered: rows.length,
    came: rows.filter((row) => row.came).length,
    items: rows,
  };
}

/** The same event before its start: 17 registered, nobody listed (mock `not-started`). */
export function attendanceNotStarted(): object {
  return { ...attendance([]), started: false, registered: 17, came: 0 };
}
