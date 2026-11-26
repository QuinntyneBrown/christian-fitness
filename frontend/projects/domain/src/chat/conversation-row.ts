import type { LastMessageDto } from '@cf/api';
import { EVENT_TIME_ZONE } from '../events/event-when';
import { chatTime } from './chat-window';

const DAY = 24 * 60 * 60 * 1000;

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: EVENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const weekday = new Intl.DateTimeFormat('en-US', { timeZone: EVENT_TIME_ZONE, weekday: 'short' });
const monthDay = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TIME_ZONE,
  month: 'short',
  day: 'numeric',
});
const monthDayYear = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TIME_ZONE,
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
 * When a conversation last had a message, as its row shows it, in Toronto (L2-015 AC1): the time
 * today ("8:42 AM"), "Yesterday", the weekday within the past five days ("Mon"), else the date
 * ("Apr 9", with the year when it is not this one). Empty for an instant that cannot be read.
 */
export function conversationTime(sentAt: string, now: Date): string {
  const instant = new Date(sentAt);
  if (Number.isNaN(instant.getTime())) return '';
  const ago = dayNumber(now) - dayNumber(instant);
  if (ago <= 0) return chatTime(sentAt);
  if (ago === 1) return 'Yesterday';
  if (ago <= 5) return weekday.format(instant);
  const sameYear = dayFormat.format(instant).slice(0, 4) === dayFormat.format(now).slice(0, 4);
  return (sameYear ? monthDay : monthDayYear).format(instant);
}

/** The row's last line: "Michael: ..." in full, or nothing before anything has been said. */
export function conversationPreview(last: LastMessageDto | null): string {
  return last === null ? '' : `${last.author}: ${last.text}`;
}

/** An event group's member count as its row says it: "18 members", "1 member"; nothing for a direct conversation. */
export function groupMemberCount(count: number | null): string {
  if (count === null) return '';
  return count === 1 ? '1 member' : `${count} members`;
}

/**
 * Where a row goes: an event group opens that event's chat (ADR 0039), a series' one chat opens on
 * the series (ADR 0101), and a direct conversation opens with the other member (ADR 0043).
 */
export function conversationHref(kind: 'group' | 'series' | 'direct', id: string): string {
  if (kind === 'group') return `/events/${id}/chat`;
  return kind === 'series' ? `/events/series/${id}/chat` : `/messages/${id}`;
}
