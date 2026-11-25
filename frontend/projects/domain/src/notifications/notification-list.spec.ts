import type { NotificationDto } from '@cf/api';
import {
  allRead,
  NOTIFICATION_LIMIT,
  notificationIcon,
  notificationTime,
  withArrived,
} from './notification-list';

const note = (id: string, read = false): NotificationDto => ({
  id,
  kind: 'event-reminder',
  title: `Title ${id}`,
  text: 'Text',
  href: '/events',
  createdAt: '2026-04-24T10:45:00Z',
  read,
});

// ADR 0083: an arrival goes first, a repeat is ignored and the client keeps the latest 50.
describe('withArrived', () => {
  it('puts a new notification first', () => {
    const { list, added } = withArrived([note('a'), note('b')], note('c'));

    expect(list.map((n) => n.id)).toEqual(['c', 'a', 'b']);
    expect(added).toBe(true);
  });

  it('leaves the list as it was when the notification is already held', () => {
    const held = [note('a'), note('b')];

    const { list, added } = withArrived(held, note('b'));

    expect(list).toBe(held);
    expect(added).toBe(false);
  });

  it('drops the oldest beyond the latest 50', () => {
    expect(NOTIFICATION_LIMIT).toBe(50);
    const full = Array.from({ length: 50 }, (_, i) => note(`n${i}`));

    const { list } = withArrived(full, note('new'));

    expect(list.length).toBe(50);
    expect(list[0].id).toBe('new');
    expect(list[49].id).toBe('n48');
  });
});

describe('allRead', () => {
  it('marks every notification read', () => {
    expect(allRead([note('a'), note('b', true)]).map((n) => n.read)).toEqual([true, true]);
  });

  it('keeps the same list when all are read already', () => {
    const list = [note('a', true)];

    expect(allRead(list)).toBe(list);
  });
});

describe('notificationIcon', () => {
  it.each([
    ['event-reminder', 'clock'],
    ['event-cancelled', 'calendar-x'],
    ['series-date-cancelled', 'calendar-x'],
    ['followed-host-dates', 'calendar-plus'],
  ] as const)('a %s shows %s', (kind, icon) => {
    expect(notificationIcon(kind)).toBe(icon);
  });
});

// The row's time, in Toronto. Now is Friday, April 24, 2026, 8:45 AM in Toronto (12:45 UTC).
describe('notificationTime', () => {
  const now = new Date('2026-04-24T12:45:00Z');

  it.each([
    ['ten seconds ago', '2026-04-24T12:44:50Z', 'Just now'],
    ['ahead of the clock', '2026-04-24T12:46:00Z', 'Just now'],
    ['a minute ago', '2026-04-24T12:44:00Z', '1 min ago'],
    ['59 minutes ago', '2026-04-24T11:46:00Z', '59 min ago'],
    ['an hour ago', '2026-04-24T11:45:00Z', '1 hour ago'],
    ['two hours ago', '2026-04-24T10:45:00Z', '2 hours ago'],
    ['just after midnight in Toronto', '2026-04-24T04:01:00Z', '8 hours ago'],
    ['just before midnight in Toronto', '2026-04-24T03:59:00Z', 'Yesterday'],
    ['yesterday morning', '2026-04-23T14:00:00Z', 'Yesterday'],
    ['two days ago', '2026-04-22T14:00:00Z', 'Apr 22'],
    ['April 12', '2026-04-12T15:00:00Z', 'Apr 12'],
    ['last year', '2025-12-30T15:00:00Z', 'Dec 30, 2025'],
    ['an unreadable instant', 'not a date', ''],
  ])('%s reads "%s"', (_why, createdAt, expected) => {
    expect(notificationTime(createdAt, now)).toBe(expected);
  });
});
