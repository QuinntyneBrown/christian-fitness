import type { AdminSessionState, SeriesRowDto } from '@cf/api';
import { seriesDayOf, seriesTimeOf } from './admin-series-view';
import { seriesCadenceText } from './series-cadence';
import { eventImageSrc, priceOf } from './event-card-view';
import { EVENT_TIME_ZONE } from './event-when';

/** One bar of the session meter (`session-meter__bar` and its modifier). */
export type SessionBar = 'done' | 'next' | 'upcoming' | 'cancelled';

/** A series as its row shows it on the Series view (L2-050 AC1; mock `events/series`; ADR 0093). */
export interface SeriesRowView {
  id: string;
  /** "/events/series/<id>", the series page (L2-051). */
  href: string;
  imageSrc: string;
  /** "Every Tuesday · 6:30 PM". */
  meta: string;
  title: string;
  /** "Lakeshore Runners Fellowship · Etobicoke, Toronto · Apr 7 – May 26". */
  sub: string;
  bars: SessionBar[];
  /** "2 of 7 sessions done", for assistive technology. */
  done: string;
  joined: boolean;
  /** "Free" or "$64 for all 8"; shown where the member has not joined. */
  price: string;
  /** "Next Apr 21". */
  next: string;
}

// Made once on first use, not at import: the formatter is costly to create.
let monthFormat: Intl.DateTimeFormat | undefined;

/** "Jan" in Toronto. */
function monthOf(instant: string): string {
  monthFormat ??= new Intl.DateTimeFormat('en-US', { timeZone: EVENT_TIME_ZONE, month: 'short' });
  return monthFormat.format(new Date(instant));
}

/**
 * The date range (ADR 0093): days for a weekly cadence ("Apr 7 – May 26"), months otherwise
 * ("Jan – Jun"); one day or one month alone when the ends are the same.
 */
export function seriesRangeOf(
  row: Pick<SeriesRowDto, 'cadence' | 'firstStartsAt' | 'lastStartsAt'>,
): string {
  const of = row.cadence.weekday === null ? monthOf : seriesDayOf;
  const first = of(row.firstStartsAt);
  const last = of(row.lastStartsAt);
  return first === last ? first : `${first} – ${last}`;
}

/**
 * The meter (ADR 0080, ADR 0091, ADR 0093): a bar a session, the live one drawn as next, and
 * "<done> of <total> sessions done" counting held sessions only.
 */
export function seriesMeterOf(sessions: readonly AdminSessionState[]): {
  bars: SessionBar[];
  done: string;
} {
  const bars = sessions.map((state): SessionBar => (state === 'live' ? 'next' : state));
  const held = sessions.filter((state) => state !== 'cancelled').length;
  const done = sessions.filter((state) => state === 'done').length;
  return { bars, done: `${done} of ${held} sessions done` };
}

/** The series as its row shows it, in Toronto time whatever the browser's zone. */
export function seriesRowViewOf(row: SeriesRowDto): SeriesRowView {
  const meter = seriesMeterOf(row.sessions);
  const held = row.sessions.filter((state) => state !== 'cancelled').length;
  const price = priceOf(row.priceCents);
  return {
    id: row.id,
    href: `/events/series/${encodeURIComponent(row.id)}`,
    imageSrc: eventImageSrc(row),
    meta: `${seriesCadenceText(row.cadence)} · ${seriesTimeOf(row.startsAt)}`,
    title: row.title,
    sub: `${row.host.name} · ${row.area} · ${seriesRangeOf(row)}`,
    bars: meter.bars,
    done: meter.done,
    joined: row.joined,
    price: row.priceCents > 0 ? `${price} for all ${held}` : price,
    next: `Next ${seriesDayOf(row.startsAt)}`,
  };
}
