import type { EventDetailDto } from '@cf/api';
import { CATEGORY_LABELS, eventImageSrc, priceOf } from './event-card-view';
import { EVENT_TIME_ZONE } from './event-when';

/** What the event detail screen shows of an event, worded for the member (ADR 0031). */
export interface EventDetailView {
  imageSrc: string;
  /** "Workout". */
  type: string;
  heading: string;
  /** "Sat, Apr 25". */
  day: string;
  /** "8:00 AM". */
  time: string;
  place: string;
  area: string;
  summary: string;
  /** "Free" or "$10". */
  price: string;
  /** "12 of 50 spots left", never below 0. */
  spots: string;
  /** "38 going". */
  going: string;
  /** No place is left and the member holds none: the page says "This event is full" (ADR 0033). */
  full: boolean;
  /** The member holds a place (ADR 0032). */
  registered: boolean;
  /** How to pay, for a reserved place of a paid event; otherwise none. */
  payNote: string | null;
}

const PAY_NOTE =
  'Your spot is reserved. Pay the Christian Fitness team at the event; online payment is not available yet.';

// Made once on first use, not at import: the formatter is costly to create.
let parts: Intl.DateTimeFormat | undefined;

/** The event as its detail screen shows it, in Toronto time whatever the browser's zone. */
export function eventDetailViewOf(event: EventDetailDto): EventDetailView {
  parts ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const at = Object.fromEntries(
    parts.formatToParts(new Date(event.startsAt)).map((part) => [part.type, part.value]),
  );
  const left = Math.max(event.capacity - event.going, 0);
  return {
    imageSrc: eventImageSrc(event),
    type: CATEGORY_LABELS[event.category],
    heading: event.title,
    day: `${at['weekday']}, ${at['month']} ${at['day']}`,
    time: `${at['hour']}:${at['minute']} ${at['dayPeriod']}`,
    place: event.place,
    area: event.area,
    summary: event.summary,
    price: priceOf(event.priceCents),
    spots: `${left} of ${event.capacity} spots left`,
    going: `${event.going} going`,
    full: event.registration === null && left === 0,
    registered: event.registration !== null,
    payNote: event.registration === 'reserved' ? PAY_NOTE : null,
  };
}
