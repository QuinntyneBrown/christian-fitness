import type { EventCategory, EventSummaryDto } from '@cf/api';
import { seriesCadenceText } from './series-cadence';
import { EVENT_TIME_ZONE } from './event-when';

/** What an event card shows of an event, worded for the member (ADR 0027; mock `events/default`). */
export interface EventCardView {
  id: string;
  href: string;
  imageSrc: string;
  /** "Apr". */
  month: string;
  /** "18", with a leading zero under 10. */
  day: string;
  /** "Apr 18", for assistive technology. */
  date: string;
  /** "Run". */
  type: string;
  /** "Sat 6:45 AM". */
  time: string;
  heading: string;
  place: string;
  going: number;
  /** "Free" or "$10". */
  price: string;
  /** Spots left, only when few remain (10 or fewer). */
  spotsLeft?: number;
  /** "Part of Couch to 5K Run Club · Session 3 of 8 · Every Tuesday", only for a session. */
  series?: string;
}

/** Spots left at or under this many are said in words on the card. */
export const FEW_SPOTS_LEFT = 10;

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  run: 'Run',
  workout: 'Workout',
  basketball: 'Basketball',
  mobility: 'Mobility',
  workshop: 'Workshop',
  retreat: 'Retreat',
};

/** The bundled photo of an event with none of its own (ADR 0027). */
const FALLBACK_IMAGES: Record<EventCategory, string> = {
  run: 'run',
  workout: 'bootcamp',
  basketball: 'hoops',
  mobility: 'stretch',
  workshop: 'bootcamp',
  retreat: 'run',
};

// Made once on first use, not at import: the formatter is costly to create.
let parts: Intl.DateTimeFormat | undefined;

/** Where an event's picture loads from: its own, or its category's bundled photo. */
export function eventImageSrc(event: Pick<EventSummaryDto, 'category' | 'imageKey'>): string {
  return event.imageKey
    ? `/api/events/images/${encodeURIComponent(event.imageKey)}`
    : `/images/events/${FALLBACK_IMAGES[event.category]}.jpg`;
}

/** The event as its card shows it, in Toronto time whatever the browser's zone. */
export function eventCardViewOf(event: EventSummaryDto): EventCardView {
  parts ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
  const at = Object.fromEntries(
    parts.formatToParts(new Date(event.startsAt)).map((part) => [part.type, part.value]),
  );
  const left = event.capacity - event.going;
  return {
    id: event.id,
    href: `/events/${encodeURIComponent(event.id)}`,
    imageSrc: eventImageSrc(event),
    month: at['month'] ?? '',
    day: at['day'] ?? '',
    date: `${at['month']} ${Number(at['day'])}`,
    type: CATEGORY_LABELS[event.category],
    time: `${at['weekday']} ${at['hour']}:${at['minute']} ${at['dayPeriod']}`,
    heading: event.title,
    place: event.place,
    going: event.going,
    price: priceOf(event.priceCents),
    ...(left <= FEW_SPOTS_LEFT ? { spotsLeft: Math.max(left, 0) } : {}),
    ...(event.series ? { series: eventSeriesLine(event.series) } : {}),
  };
}

/** A session's series line (L2-009 AC1; ADR 0080, ADR 0093). */
export function eventSeriesLine(series: NonNullable<EventSummaryDto['series']>): string {
  return `Part of ${series.title} · Session ${series.number} of ${series.total} · ${seriesCadenceText(series.cadence)}`;
}

export function priceOf(cents: number): string {
  if (cents <= 0) return 'Free';
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}
