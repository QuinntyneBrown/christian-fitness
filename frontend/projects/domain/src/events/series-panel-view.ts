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

/**
 * The sign-up panel (L2-051 AC1, L2-052 AC1, AC2, AC4, AC5; ADR 0096, ADR 0099): whether the
 * member joined, with how to pay a paid series; else "<left> of <capacity> spots left" (or
 * "Series full", "No sessions left"), the ways to come in one radio group, the button and the
 * chat note.
 */
export interface SeriesPanelView {
  joined: boolean;
  /** "Pay the host at your first session, …" once a paid series is joined; else none. */
  payNote: string | null;
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
 * journey 13 adds the tick boxes; a full series with no drop-in has no button. While a join waits both options are disabled and the button
 * reads "Joining…".
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
    spots: full ? 'Series full' : `${series.spotsLeft} of ${series.capacity} spots left`,
    plans,
    action,
    note,
  };
}
