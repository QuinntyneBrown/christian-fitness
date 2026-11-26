import type { SeriesDetailDto } from '@cf/api';
import { priceOf } from './event-card-view';

/** A way to come: the whole series, or dates picked to drop in (ADR 0099). */
export type SeriesPlan = 'all' | 'drop';

/**
 * One way to come, as the plan option shows it: "Every session (5 left)", its note and price,
 * whether it is the one chosen and whether it can be chosen.
 */
export interface SeriesPlanView {
  value: SeriesPlan;
  title: string;
  note: string;
  price: string;
  checked: boolean;
  disabled: boolean;
}

/** The panel's one button: "Join the series", "Joining…" or "Pick a date first". */
export interface SeriesPanelAction {
  label: string;
  disabled: boolean;
  busy: boolean;
}

/** One bar of the session meter: a session done, the next one, one still to come, or cancelled. */
export type SeriesMeterBar = 'done' | 'next' | 'upcoming' | 'cancelled';

/**
 * "Your progress" once joined (L2-052 AC3; ADR 0099): "Attendance not recorded yet" until
 * journey 16 records attendance, and the decorative session meter with the next date highlighted
 * and cancelled ones faded, whose hidden label names the next session.
 */
export interface SeriesProgressView {
  count: string;
  bars: SeriesMeterBar[];
  label: string;
}

/**
 * The sign-up panel (L2-051 AC1, L2-052 AC1 to AC5; ADR 0096, ADR 0099): whether the
 * member joined, with how to pay a paid series and their progress; else "<left> of <capacity> spots left" (or
 * "Series full", "No sessions left"), the ways to come in one radio group, the button and the
 * chat note.
 */
export interface SeriesPanelView {
  joined: boolean;
  /** "Pay the host at your first session, …" once a paid series is joined; else none. */
  payNote: string | null;
  /** Once joined; else none. */
  progress: SeriesProgressView | null;
  spots: string;
  plans: SeriesPlanView[];
  /** None when no way to come can be chosen. */
  action: SeriesPanelAction | null;
  note: string;
}

/** What the member has done on the panel: the way they chose, if any, and whether a join waits. */
export interface SeriesPanelChoice {
  plan: SeriesPlan | null;
  joining: boolean;
}

const NO_CHOICE: SeriesPanelChoice = { plan: null, joining: false };

/** The words AC4 gives a paid series once joined; online payment is out of scope (as L2-011 AC5). */
export const SERIES_PAY_NOTE =
  "Pay the host at your first session, by cash or e-transfer. You won't be charged online.";

/**
 * The panel's words for a series and what the member chose (ADR 0080, ADR 0096, ADR 0099). Every
 * session is chosen by default; a full series chooses drop-in instead and every session cannot be
 * chosen. Drop-in chosen reads "Tick dates in the list" and waits on "Pick a date first" until
 * journey 13 adds the tick boxes; a full series with no drop-in has no button. While a join
 * waits both options are disabled and the button reads "Joining…".
 */
export function seriesPanelViewOf(
  series: Pick<
    SeriesDetailDto,
    | 'cadence'
    | 'priceCents'
    | 'dropInPriceCents'
    | 'capacity'
    | 'spotsLeft'
    | 'sessionsLeft'
    | 'joined'
    | 'sessions'
  >,
  choice: SeriesPanelChoice = NO_CHOICE,
): SeriesPanelView {
  const note = 'One group chat for the whole series.';
  const payNote = series.joined && series.priceCents > 0 ? SERIES_PAY_NOTE : null;
  if (series.joined || series.spotsLeft === null) {
    return {
      joined: series.joined,
      payNote,
      progress: series.joined ? progressOf(series.sessions) : null,
      spots: series.joined ? '' : 'No sessions left',
      plans: [],
      action: null,
      note,
    };
  }
  const held = series.sessions.filter((session) => session.state !== 'cancelled').length;
  const price = priceOf(series.priceCents);
  const full = series.spotsLeft === 0;
  const dropIn = series.dropInPriceCents !== null;
  const plan: SeriesPlan | null = full
    ? dropIn
      ? 'drop'
      : null
    : choice.plan === 'drop' && dropIn
      ? 'drop'
      : 'all';
  const plans: SeriesPlanView[] = [
    {
      value: 'all',
      title: `Every session (${series.sessionsLeft} left)`,
      note: full
        ? 'Every place in the series is taken'
        : series.cadence.weekday === null
          ? 'Your spot is held at every date'
          : 'Your spot is held each week',
      price: series.priceCents > 0 ? `${price} for all ${held}` : price,
      checked: plan === 'all',
      disabled: full || choice.joining,
    },
  ];
  if (series.dropInPriceCents !== null) {
    const each = priceOf(series.dropInPriceCents);
    plans.push({
      value: 'drop',
      title: 'Pick dates to drop in',
      note: plan === 'drop' ? 'Tick dates in the list' : 'Come when you can',
      price: series.dropInPriceCents > 0 ? `${each} each` : each,
      checked: plan === 'drop',
      disabled: choice.joining,
    });
  }
  const action: SeriesPanelAction | null =
    plan === null
      ? null
      : plan === 'all'
        ? {
            label: choice.joining ? 'Joining…' : 'Join the series',
            disabled: choice.joining,
            busy: choice.joining,
          }
        : { label: 'Pick a date first', disabled: true, busy: false };
  return {
    joined: false,
    payNote: null,
    progress: null,
    spots: full ? 'Series full' : `${series.spotsLeft} of ${series.capacity} spots left`,
    plans,
    action,
    note,
  };
}

/**
 * What a refused join means for the panel (L2-052 AC5 to AC8; ADR 0099): `full` for the
 * {@link ApiError} `series_full`, so the page shows the series as full without asking again;
 * `failed` for anything else (`account_suspended`, a 5xx, no answer), shown as the generic message.
 */
export function seriesJoinRefusalOf(error: unknown): 'full' | 'failed' {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'status' in error &&
    error.code === 'series_full'
    ? 'full'
    : 'failed';
}

/** The progress of a joined member: no attendance is recorded until journey 16. */
function progressOf(sessions: SeriesDetailDto['sessions']): SeriesProgressView {
  const next = sessions.find((session) => session.state === 'live');
  return {
    count: 'Attendance not recorded yet',
    bars: sessions.map((session) =>
      session.state === 'cancelled' ? 'cancelled' : session.state === 'live' ? 'next' : 'upcoming',
    ),
    label: next
      ? `Session ${next.number} of ${sessions.length} is next`
      : 'No sessions left to come',
  };
}

/**
 * The join confirmation for a member who had already dropped in on dates to come of a paid series
 * (L2-052 AC4, L2-053 AC5; ADR 0099), worked out from the series before and after the join: "You'd
 * already booked session 4, so it stays at the drop-in price ($10). Your other dates are at the
 * series price." None when the series is free, the member had joined already, or held no date to
 * come.
 */
export function seriesKeptNoteOf(
  before: Pick<SeriesDetailDto, 'joined' | 'priceCents' | 'dropInPriceCents' | 'sessions'>,
  after: Pick<SeriesDetailDto, 'joined'>,
): string | null {
  if (before.joined || !after.joined || before.priceCents <= 0) return null;
  const kept = before.sessions
    .filter((session) => session.held && (session.state === 'live' || session.state === 'upcoming'))
    .map((session) => session.number);
  if (kept.length === 0) return null;
  const one = kept.length === 1;
  const numbers = one
    ? `${kept[0]}`
    : `${kept.slice(0, -1).join(', ')} and ${kept[kept.length - 1]}`;
  const dropIn = before.dropInPriceCents ?? 0;
  const price =
    dropIn > 0
      ? `${one ? 'it stays' : 'they stay'} at the drop-in price (${priceOf(dropIn)}${one ? '' : ' each'})`
      : `${one ? 'it stays' : 'they stay'} free`;
  return `You'd already booked ${one ? 'session' : 'sessions'} ${numbers}, so ${price}. Your other dates are at the series price.`;
}
