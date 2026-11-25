import type { EventSeriesCardDto } from '@cf/api';
import { EVENT_TIME_ZONE } from './event-when';
import { seriesCadenceText } from './series-cadence';

/** One date on the card: "Tue Apr 28" ("Tue May 12 · Cancelled") and its topic. */
export interface SeriesCardDateView {
  id: string;
  when: string;
  topic: string;
  cancelled: boolean;
}

/**
 * A session's series card (L2-010 AC5; ADR 0096): "Session 3 of 8 · Every Tuesday", the title, the
 * next dates and one link to the series, "View series" when the member joined it and "Join the
 * series" when not.
 */
export interface SeriesCardView {
  meta: string;
  title: string;
  href: string;
  action: string;
  dates: SeriesCardDateView[];
}

// Made once on first use, not at import: the formatter is costly to create.
let parts: Intl.DateTimeFormat | undefined;

/** The card's words for a session's series, its dates in Toronto time. */
export function seriesCardViewOf(series: EventSeriesCardDto): SeriesCardView {
  parts ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: '2-digit',
  });
  const format = parts;
  return {
    meta: `Session ${series.number} of ${series.total} · ${seriesCadenceText(series.cadence)}`,
    title: series.title,
    href: `/events/series/${encodeURIComponent(series.id)}`,
    action: series.joined ? 'View series' : 'Join the series',
    dates: series.next.map((date) => {
      const at = Object.fromEntries(
        format.formatToParts(new Date(date.startsAt)).map((part) => [part.type, part.value]),
      );
      const day = `${at['weekday']} ${at['month']} ${at['day']}`;
      return {
        id: date.id,
        when: date.cancelled ? `${day} · Cancelled` : day,
        topic: date.topic ?? '',
        cancelled: date.cancelled,
      };
    }),
  };
}
