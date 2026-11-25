import type { NotificationDto, NotificationKind } from '@cf/api';

/** The most notifications the client keeps (ADR 0068): the latest 50. */
export const NOTIFICATION_LIMIT = 50;

/**
 * The list with a notification that has just arrived (ADR 0083): put first, the oldest beyond
 * {@link NOTIFICATION_LIMIT} dropped. One already held (the same id) leaves the list as it was, and
 * `added` says whether it was new, so a count is raised only once.
 */
export function withArrived(
  list: readonly NotificationDto[],
  arrived: NotificationDto,
): { list: readonly NotificationDto[]; added: boolean } {
  if (list.some((held) => held.id === arrived.id)) return { list, added: false };
  return { list: [arrived, ...list].slice(0, NOTIFICATION_LIMIT), added: true };
}

/** The list with every notification read. */
export function allRead(list: readonly NotificationDto[]): readonly NotificationDto[] {
  return list.some((n) => !n.read) ? list.map((n) => (n.read ? n : { ...n, read: true })) : list;
}

/** The design system's icon for a kind (`notification-row`): a clock, a crossed or a plus calendar. */
export function notificationIcon(kind: NotificationKind): 'clock' | 'calendar-x' | 'calendar-plus' {
  switch (kind) {
    case 'event-reminder':
      return 'clock';
    case 'followed-host-dates':
      return 'calendar-plus';
    default:
      return 'calendar-x';
  }
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const TORONTO = 'America/Toronto';
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TORONTO });
const monthDay = new Intl.DateTimeFormat('en-US', {
  timeZone: TORONTO,
  month: 'short',
  day: 'numeric',
});
const monthDayYear = new Intl.DateTimeFormat('en-US', {
  timeZone: TORONTO,
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** The Toronto calendar day of an instant, as the number of days since 1970. */
function dayNumber(instant: Date): number {
  const [year, month, day] = dayFormat.format(instant).split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY;
}

/**
 * When a notification came, as its row says it (`notification-row` content rules), in Toronto:
 * "Just now" within a minute, "5 min ago" within the hour, "2 hours ago" later the same day,
 * "Yesterday" for the calendar day before, else the date ("Apr 12", with the year when it is not this
 * one). A time ahead of `now` (a clock a little behind the server's) is "Just now". Empty for an
 * instant that cannot be read.
 */
export function notificationTime(createdAt: string, now: Date): string {
  const instant = new Date(createdAt);
  if (Number.isNaN(instant.getTime())) return '';
  const ago = now.getTime() - instant.getTime();
  if (ago < MINUTE) return 'Just now';
  if (ago < HOUR) return `${Math.floor(ago / MINUTE)} min ago`;
  const days = dayNumber(now) - dayNumber(instant);
  if (days <= 0) {
    const hours = Math.floor(ago / HOUR);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  if (days === 1) return 'Yesterday';
  const sameYear = dayFormat.format(instant).slice(0, 4) === dayFormat.format(now).slice(0, 4);
  return (sameYear ? monthDay : monthDayYear).format(instant);
}
