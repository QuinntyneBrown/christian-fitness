import type { SeriesDetailDto } from '@cf/api';
import { priceOf } from './event-card-view';
import { EVENT_TIME_ZONE } from './event-when';

/** Where the member is with picking dates: how many are ticked, and whether a change or a save waits. */
export interface DropInPickState {
  /** How many dates are ticked. */
  picked: number;
  /** Changing dates already held ("Change dates"), not registering new ones. */
  changing?: boolean;
  /** While changing: the ticks differ from the dates held. */
  changed?: boolean;
  /** The registration or the change waits on the API. */
  busy?: boolean;
}

/** The drop-in option's note and the panel's button. */
export interface DropInPickView {
  note: string;
  button: { label: string; disabled: boolean; busy: boolean };
}

/**
 * The drop-in option's note and the panel's button (L2-053 AC1, AC3, AC4; ADR 0102): "Tick dates in
 * the list" or "<n> picked below"; "Pick a date first", disabled until a date is ticked, then
 * "Register for 1 date" or "Register for <n> dates" ("Registering…" while it waits). While changing
 * dates the button reads "Save dates", disabled until the ticks differ from what is held, so every
 * date can be unticked and saved ("Saving…" while it waits).
 */
export function dropInPickOf(state: DropInPickState): DropInPickView {
  const { picked, changing = false, changed = false, busy = false } = state;
  const note = picked === 0 ? 'Tick dates in the list' : `${picked} picked below`;
  if (changing) {
    return {
      note,
      button: { label: busy ? 'Saving…' : 'Save dates', disabled: busy || !changed, busy },
    };
  }
  if (busy) return { note, button: { label: 'Registering…', disabled: true, busy: true } };
  return {
    note,
    button:
      picked === 0
        ? { label: 'Pick a date first', disabled: true, busy: false }
        : {
            label: `Register for ${picked} ${picked === 1 ? 'date' : 'dates'}`,
            disabled: false,
            busy: false,
          },
  };
}

/** The panel once a member who has not joined holds dates to come: "Registered for 2 dates" and the note. */
export interface DropInBookedView {
  confirmed: string;
  note: string;
}

/** The dates to come the member holds: neither started nor cancelled. */
export function heldToCome(sessions: SeriesDetailDto['sessions']): SeriesDetailDto['sessions'] {
  return sessions.filter(
    (session) => session.held && (session.state === 'live' || session.state === 'upcoming'),
  );
}

/**
 * The booked panel (L2-053 AC3; ADR 0102): "Registered for <n> date(s)", then "Sessions 4, 6. You
 * can add more dates any time." ("Session 4." for one) and, for a priced drop-in, "Pay $10 to the
 * host at each session; online payment is not available yet." None when the member joined the
 * series or holds no date to come.
 */
export function dropInBookedOf(
  series: Pick<SeriesDetailDto, 'joined' | 'dropInPriceCents' | 'sessions'>,
): DropInBookedView | null {
  if (series.joined) return null;
  const numbers = heldToCome(series.sessions).map((session) => session.number);
  if (numbers.length === 0) return null;
  const one = numbers.length === 1;
  const price = series.dropInPriceCents ?? 0;
  const pay =
    price > 0
      ? ` Pay ${priceOf(price)} to the host at each session; online payment is not available yet.`
      : '';
  return {
    confirmed: `Registered for ${numbers.length} ${one ? 'date' : 'dates'}`,
    note: `${one ? 'Session' : 'Sessions'} ${numbers.join(', ')}. You can add more dates any time.${pay}`,
  };
}

/**
 * What a refused change of dates means for the panel (L2-053 AC2; ADR 0102): `full` with the
 * session numbers of an `event_full` refusal, so the page names those dates; `failed` for anything
 * else, shown as the generic message.
 */
export function dropInRefusalOf(
  error: unknown,
): { kind: 'full'; sessions: number[] } | { kind: 'failed' } {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'event_full' &&
    'sessions' in error &&
    Array.isArray(error.sessions) &&
    error.sessions.length > 0 &&
    error.sessions.every((n) => typeof n === 'number')
  ) {
    return { kind: 'full', sessions: error.sessions as number[] };
  }
  return { kind: 'failed' };
}

// Made once on first use, not at import: the formatter is costly to create.
let dayOf: Intl.DateTimeFormat | undefined;

/**
 * The dates of the sessions numbered `numbers`, in date order and in Toronto (ADR 0102): "Sat May
 * 9", "Sat May 2 and Sat May 16", or "Sat Apr 25, Sat May 2 and Sat May 23" for three.
 */
export function dropInDatesOf(
  sessions: SeriesDetailDto['sessions'],
  numbers: readonly number[],
): { text: string; count: number } {
  dayOf ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const format = dayOf;
  const dates = sessions
    .filter((session) => numbers.includes(session.number))
    .map((session) => format.format(new Date(session.startsAt)).replace(',', ''));
  const text =
    dates.length === 1
      ? (dates[0] ?? '')
      : `${dates.slice(0, -1).join(', ')} and ${dates[dates.length - 1]}`;
  return { text, count: dates.length };
}

/**
 * The refusal's words for the dates that filled (ADR 0102), by their dates in Toronto: "Sat May 9
 * is full. Untick it and try again." or "Sat May 2 and Sat May 16 are full. Untick them and try
 * again." ("Sat May 2, Sat May 9 and Sat May 16" for three).
 */
export function dropInFullTextOf(
  sessions: SeriesDetailDto['sessions'],
  numbers: readonly number[],
): string {
  const { text, count } = dropInDatesOf(sessions, numbers);
  const one = count === 1;
  return `${text} ${one ? 'is' : 'are'} full. Untick ${one ? 'it' : 'them'} and try again.`;
}

/**
 * The Stop going to dates dialog's title and subtitle (L2-053 AC4; ADR 0102): "Stop going to 2
 * dates?" and "Saturday Park Bootcamp · Sat Apr 25 and Sat May 9", for the held dates unticked.
 */
export function stopDatesWordsOf(
  series: Pick<SeriesDetailDto, 'title' | 'sessions'>,
  numbers: readonly number[],
): { heading: string; subtitle: string } {
  const { text, count } = dropInDatesOf(series.sessions, numbers);
  return {
    heading: `Stop going to ${count} ${count === 1 ? 'date' : 'dates'}?`,
    subtitle: `${series.title} · ${text}`,
  };
}
