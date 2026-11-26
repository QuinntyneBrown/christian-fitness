import type { SeriesSessionDto } from '@cf/api';
import { EVENT_TIME_ZONE } from './event-when';

/** A row's state: past, the next one, still to come, or cancelled (`session-row` modifiers). */
export type SeriesSessionState = 'past' | 'next' | 'upcoming' | 'cancelled';

/**
 * What a row ends with: Details (a link to the session's event page), words, a "Drop in" tick box
 * while dates are picked (`hidden` completes its name: " on Sat, Apr 25"; ADR 0102), or nothing.
 */
export type SeriesSessionEnd =
  | { kind: 'details'; href: string; number: number }
  | { kind: 'status'; text: string }
  | { kind: 'pick'; label: string; hidden: string; value: string; checked: boolean }
  | null;

/** The dates ticked while the member picks dates to drop in or changes them (ADR 0102). */
export interface SeriesSessionPick {
  picked: ReadonlySet<string>;
}

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
 * up"; every date still to come has Details; a cancelled one reads "Cancelled". While dates are
 * picked (`pick`; L2-053 AC1, AC7; ADR 0102) a date still to come has a "Drop in" tick box instead,
 * unless it is full and not held, when it reads "Full".
 */
export function seriesSessionRowOf(
  session: SeriesSessionDto,
  pick: SeriesSessionPick | null = null,
): SeriesSessionRow {
  parts ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: '2-digit',
  });
  const at = Object.fromEntries(
    parts.formatToParts(new Date(session.startsAt)).map((part) => [part.type, part.value]),
  );
  const toCome: SeriesSessionEnd =
    pick === null
      ? {
          kind: 'details',
          href: `/events/${encodeURIComponent(session.id)}`,
          number: session.number,
        }
      : session.full && !session.held
        ? { kind: 'status', text: 'Full' }
        : {
            kind: 'pick',
            label: 'Drop in',
            hidden: ` on ${at['weekday']}, ${at['month']} ${at['day']}`,
            value: session.id,
            checked: pick.picked.has(session.id),
          };
  const [state, end]: [SeriesSessionState, SeriesSessionEnd] =
    session.state === 'done'
      ? ['past', { kind: 'status', text: session.held ? 'Not recorded' : 'Done' }]
      : session.state === 'cancelled'
        ? ['cancelled', { kind: 'status', text: 'Cancelled' }]
        : session.state === 'live'
          ? ['next', toCome]
          : ['upcoming', toCome];
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
export function seriesSessionsViewOf(
  sessions: readonly SeriesSessionDto[],
  pick: SeriesSessionPick | null = null,
): SeriesSessionsView {
  const done = sessions.filter((s) => s.state === 'done').length;
  const toGo = sessions.filter((s) => s.state === 'live' || s.state === 'upcoming').length;
  return {
    rows: sessions.map((session) => seriesSessionRowOf(session, pick)),
    count: sessions.length === 1 ? '1 session' : `${sessions.length} sessions`,
    note: `${done} done · ${toGo} to go`,
  };
}
