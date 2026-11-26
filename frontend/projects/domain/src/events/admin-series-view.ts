import type { AdminSeriesDto, AdminSeriesRowDto, AdminSessionState } from '@cf/api';
import { capacityUsed } from './capacity-used';
import { seriesCadenceText } from './series-cadence';
import { eventImageSrc, priceOf } from './event-card-view';
import { EVENT_TIME_ZONE } from './event-when';
import { adminSessionActionOf, type AdminSessionAction } from './session-change';

/** A series as its pick card shows it (mock `admin-series`, `pick-card`). */
export interface SeriesPickCardView {
  id: string;
  title: string;
  /** "Every Tuesday · 6:30 PM", "6 dates · 7:00 PM" or "No dates yet". */
  meta: string;
  /** "31 / 40 joined". */
  count: string;
  /** "/series?id=…": the link that chooses it (L2-071 AC1). */
  href: string;
}

/** One session row (mock `admin-series`, `admin-session`). */
export interface AdminSessionView {
  id: string;
  number: string;
  /** "Tue Apr 21". */
  date: string;
  /** The topic, or empty. */
  topic: string;
  state: AdminSessionState;
  /** What the row offers: Cancel date, Restore or nothing (ADR 0103). */
  action: AdminSessionAction;
  /** "session 5, Tue May 05": what its action names, for assistive technology. */
  name: string;
}

/** A series as its summary card and sessions show it (L2-071 AC2, AC3). */
export interface AdminSeriesView {
  id: string;
  title: string;
  imageSrc: string;
  /** "Hosted by Lakeshore Runners Fellowship". */
  host: string;
  /** "Every Tuesday, 6:30 PM · Apr 7 – May 26", or none with no dates. */
  when: string | null;
  place: string;
  /** "31 of 40". */
  joined: string;
  /** "78% full", the meter's text. */
  full: string;
  capacity: number;
  joinedCount: number;
  /** "Free", or "$64 for all 8". */
  price: string;
  /** "Drop-in $10", or none when members cannot drop in. */
  dropIn: string | null;
  /** "5 of 7": sessions left of those held. */
  left: string;
  sessions: AdminSessionView[];
}

// Made once on first use, not at import: formatters are costly to create.
let timeFormat: Intl.DateTimeFormat | undefined;
let rangeFormat: Intl.DateTimeFormat | undefined;
let sessionFormat: Intl.DateTimeFormat | undefined;

/** "6:30 PM" in Toronto; ICU's narrow no-break space before AM and PM becomes a plain space. */
export function seriesTimeOf(instant: string): string {
  timeFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  return timeFormat.format(new Date(instant)).replace(/\s/g, ' ');
}

/** "Apr 7" in Toronto. */
export function seriesDayOf(instant: string): string {
  rangeFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  });
  return rangeFormat.format(new Date(instant));
}

/** "Tue Apr 07" in Toronto, as the session rows read. */
function sessionDateOf(instant: string): string {
  sessionFormat ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    sessionFormat.formatToParts(new Date(instant)).map((part) => [part.type, part.value]),
  );
  return `${parts['weekday']} ${parts['month']} ${parts['day']}`;
}

/** The series as its pick card shows it (L2-071 AC1). */
export function seriesPickCardOf(row: AdminSeriesRowDto): SeriesPickCardView {
  const cadence = seriesCadenceText(row.cadence);
  return {
    id: row.id,
    title: row.title,
    meta: row.startsAt ? `${cadence} · ${seriesTimeOf(row.startsAt)}` : cadence,
    count: `${row.joined} / ${row.capacity} joined`,
    href: `/series?id=${encodeURIComponent(row.id)}`,
  };
}

/** A saved series as its list row, so the list shows a change without asking for it again (L2-071 AC13). */
export function seriesRowOf(series: AdminSeriesDto): AdminSeriesRowDto {
  const { id, title, cadence, startsAt, joined, capacity } = series;
  return { id, title, cadence, startsAt, joined, capacity };
}

/** The series as its summary card and session list show it (L2-071 AC2, AC3). */
export function adminSeriesViewOf(series: AdminSeriesDto): AdminSeriesView {
  const { startsAt, firstStartsAt, lastStartsAt } = series;
  let when: string | null = null;
  if (startsAt && firstStartsAt && lastStartsAt) {
    const first = seriesDayOf(firstStartsAt);
    const last = seriesDayOf(lastStartsAt);
    const range = first === last ? first : `${first} – ${last}`;
    when = `${seriesCadenceText(series.cadence)}, ${seriesTimeOf(startsAt)} · ${range}`;
  }
  const price = priceOf(series.priceCents);
  return {
    id: series.id,
    title: series.title,
    imageSrc: eventImageSrc(series),
    host: `Hosted by ${series.host.name}`,
    when,
    place: series.place,
    joined: `${series.joined} of ${series.capacity}`,
    full: `${capacityUsed(series.joined, series.capacity).percent}% full`,
    capacity: series.capacity,
    joinedCount: series.joined,
    price:
      series.priceCents > 0 && series.sessionsHeld > 0
        ? `${price} for all ${series.sessionsHeld}`
        : price,
    dropIn: series.dropInPriceCents === null ? null : `Drop-in ${priceOf(series.dropInPriceCents)}`,
    left: `${series.sessionsLeft} of ${series.sessionsHeld}`,
    sessions: series.sessions.map((session) => {
      const date = sessionDateOf(session.startsAt);
      return {
        id: session.id,
        number: String(session.number),
        date,
        topic: session.topic ?? '',
        state: session.state,
        action: adminSessionActionOf(session),
        name: `session ${session.number}, ${date}`,
      };
    }),
  };
}
