import type { EventSummaryDto } from '@cf/api';
import { eventCardViewOf, eventImageSrc } from './event-card-view';
import { EVENT_TIME_ZONE } from './event-when';

/** What Home's next-event card shows (mock `home/default`), worded for the member. */
export interface NextEventView {
  href: string;
  chatHref: string;
  imageSrc: string;
  /** "You're going · in 3 days". */
  pill: string;
  /** "Sat, Apr 18 · 6:45 AM". */
  when: string;
  heading: string;
  place: string;
}

/** What one of Home's suggested events shows as a row. */
export interface HomeRowView {
  id: string;
  href: string;
  month: string;
  day: string;
  heading: string;
  /** "Sat 8:00 AM · Waterfront". */
  meta: string;
  /** "Free" or "$10". */
  price: string;
}

// Made once on first use, not at import: the formatters are costly to create.
let dayFormat: Intl.DateTimeFormat | undefined;
let whenFormat: Intl.DateTimeFormat | undefined;

const DAY = 86_400_000;

/** The calendar day of an instant in Toronto, as a count of days, so two instants compare by date. */
function torontoDay(instant: Date): number {
  dayFormat ??= new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [year, month, day] = dayFormat.format(instant).split('-').map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) / DAY;
}

/**
 * How soon an event starts, by Toronto calendar day: "today", "tomorrow" or "in 3 days". An event
 * that began earlier today is still "today".
 */
export function startsInOf(startsAt: string, now: Date): string {
  const days = Math.max(torontoDay(new Date(startsAt)) - torontoDay(now), 0);
  if (days === 0) return 'today';
  return days === 1 ? 'tomorrow' : `in ${days} days`;
}

/** The next event as its card shows it, in Toronto time whatever the browser's zone. */
export function nextEventViewOf(event: EventSummaryDto, now: Date): NextEventView {
  whenFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const at = Object.fromEntries(
    whenFormat.formatToParts(new Date(event.startsAt)).map((part) => [part.type, part.value]),
  );
  const id = encodeURIComponent(event.id);
  return {
    href: `/events/${id}`,
    chatHref: `/events/${id}/chat`,
    imageSrc: eventImageSrc(event),
    pill: `You're going · ${startsInOf(event.startsAt, now)}`,
    when: `${at['weekday']}, ${at['month']} ${at['day']} · ${at['hour']}:${at['minute']} ${at['dayPeriod']}`,
    heading: event.title,
    place: event.place,
  };
}

/** A suggested event as its row shows it: date tile, title, "time · area" and the price. */
export function homeRowViewOf(event: EventSummaryDto): HomeRowView {
  const card = eventCardViewOf(event);
  return {
    id: card.id,
    href: card.href,
    month: card.month,
    day: card.day,
    heading: card.heading,
    meta: `${card.time} · ${event.area}`,
    price: card.price,
  };
}
