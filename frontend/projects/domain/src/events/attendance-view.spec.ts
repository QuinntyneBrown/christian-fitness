import { attendanceNotStartedTextOf, attendanceStatusOf, eventTabsOf } from './attendance-view';

// L2-080 AC1 (ADR 0106): the event's two tabs, by its id.
describe('eventTabsOf', () => {
  it('links Registrations and Attendance of the event', () => {
    expect(eventTabsOf('e 1')).toEqual([
      { label: 'Registrations', href: '/events/e%201/registrations' },
      { label: 'Attendance', href: '/events/e%201/attendance' },
    ]);
  });
});

// L2-080 AC5 (mock admin-event-attendance/not-started): the start in Toronto and who is registered.
describe('attendanceNotStartedTextOf', () => {
  const start = 'Stretch & Pray starts Sat Apr 18 at 8:00 AM. Until then, ';
  it.each<{ registered: number; who: string }>([
    { registered: 17, who: '17 members are registered' },
    { registered: 1, who: '1 member is registered' },
    { registered: 0, who: 'nobody is registered' },
  ])('$registered registered', ({ registered, who }) => {
    expect(attendanceNotStartedTextOf('Stretch & Pray', '2026-04-18T12:00:00Z', registered)).toBe(
      `${start}${who}; see Registrations.`,
    );
  });

  it('reads the start in Toronto whatever the instant is written in', () => {
    expect(attendanceNotStartedTextOf('Late Run', '2026-04-19T01:30:00+00:00', 2)).toBe(
      'Late Run starts Sat Apr 18 at 9:30 PM. Until then, 2 members are registered; see Registrations.',
    );
  });
});

// L2-080 AC1, AC2 (mocks default, saving): the count, or who is being saved.
describe('attendanceStatusOf', () => {
  it.each<{ came: number; registered: number; saving: string | null; text: string }>([
    { came: 9, registered: 17, saving: null, text: 'Came: 9 of 17. Changes save as you tick.' },
    { came: 0, registered: 0, saving: null, text: 'Came: 0 of 0. Changes save as you tick.' },
    { came: 9, registered: 17, saving: 'Hannah Kim', text: 'Saving Hannah Kim…' },
  ])('$came of $registered, saving $saving', ({ came, registered, saving, text }) => {
    expect(attendanceStatusOf(came, registered, saving)).toBe(text);
  });
});
