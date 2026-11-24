import { EVENT_TIME_ZONE } from '../events/event-when';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const plural = (n: number, unit: string): string => `${n} ${unit}${n === 1 ? '' : 's'} ago`;

/**
 * When an application was sent, as the queue's card shows it (mock `admin-services/default`;
 * L2-025 AC1): "Just now" under a minute, then whole minutes, hours and days ago ("2 days ago")
 * up to 30 days, after that the date in Toronto ("Mar 3, 2026"). An instant that cannot be read
 * is empty; one ahead of `now` reads "Just now".
 */
export function applicationSent(submittedAt: string, now: Date): string {
  const instant = new Date(submittedAt);
  if (Number.isNaN(instant.getTime())) return '';
  const ago = now.getTime() - instant.getTime();
  if (ago < MINUTE) return 'Just now';
  if (ago < HOUR) return plural(Math.floor(ago / MINUTE), 'minute');
  if (ago < DAY) return plural(Math.floor(ago / HOUR), 'hour');
  if (ago < 30 * DAY) return plural(Math.floor(ago / DAY), 'day');
  return new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(instant);
}
