import type { SeriesSessionDto } from '@cf/api';
import { EVENT_TIME_ZONE } from './event-when';

/** A row's state: past, the next one, still to come, or cancelled (`session-row` modifiers). */
export type SeriesSessionState = 'past' | 'next' | 'upcoming' | 'cancelled';

/** What a row ends with: Details (a link to the session's event page), words, or nothing. */
export type SeriesSessionEnd =
  { kind: 'details'; href: string; number: number } | { kind: 'status'; text: string } | null;

/** One date as the `session-list` row shows it (L2-051 AC2 to AC5; ADR 0096). */
export interface SeriesSessionRow {
  id: string;
  /** "Apr" and "07" for the date tile. */
  month: string;
  day: string;
  /** "Session 3 · Tue". */
  meta: string;
  /** ", Apr 21", read only by assistive technology. */
  date: string;
  state: SeriesSessionState;
  topic: string;
  end: SeriesSessionEnd;
}

/** The sessions block: the rows, "8 sessions" for the eyebrow and "2 done · 5 to go". */
export interface SeriesSessionsView {
  rows: SeriesSessionRow[];
  count: string;
  note: string;
}

// Made once on first use, not at import: the formatter is costly to create.
let parts: Intl.DateTimeFormat | undefined;

/**
 * One date's row, in Toronto time (ADR 0096): `done` is past, reading "Not recorded" where the
 * member held a place (attendance comes with journey 16) and "Done" where not; `live` is "Next
 * up"; every date still to come has Details; a cancelled one reads "Cancelled".
 */
export function seriesSessionRowOf(session: SeriesSessionDto): SeriesSessionRow {
  parts ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: '2-digit',
  });
  const at = Object.fromEntries(
    parts.formatToParts(new Date(session.startsAt)).map((part) => [part.type, part.value]),
  );
  const details: SeriesSessionEnd = {
    kind: 'details',
    href: `/events/${encodeURIComponent(session.id)}`,
    number: session.number,
  };
  const [state, end]: [SeriesSessionState, SeriesSessionEnd] =
    session.state === 'done'
      ? ['past', { kind: 'status', text: session.held ? 'Not recorded' : 'Done' }]
      : session.state === 'cancelled'
        ? ['cancelled', { kind: 'status', text: 'Cancelled' }]
        : session.state === 'live'
          ? ['next', details]
          : ['upcoming', details];
  return {
    id: session.id,
    month: at['month'] ?? '',
    day: at['day'] ?? '',
    meta: `Session ${session.number} · ${at['weekday']}`,
    date: `, ${at['month']} ${at['day']}`,
    state,
    topic: session.topic ?? '',
    end,
  };
}

/** The rows, the count of every date (cancelled ones included) and "<done> done · <to go> to go". */
export function seriesSessionsViewOf(sessions: readonly SeriesSessionDto[]): SeriesSessionsView {
  const done = sessions.filter((s) => s.state === 'done').length;
  const toGo = sessions.filter((s) => s.state === 'live' || s.state === 'upcoming').length;
  return {
    rows: sessions.map(seriesSessionRowOf),
    count: sessions.length === 1 ? '1 session' : `${sessions.length} sessions`,
    note: `${done} done · ${toGo} to go`,
  };
}
