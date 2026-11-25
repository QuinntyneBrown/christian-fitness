import type { SeriesDetailDto } from '@cf/api';
import { priceOf } from './event-card-view';

/** One way to come, as the plan option shows it: "Every session (5 left)", its note and price. */
export interface SeriesPlanView {
  title: string;
  note: string;
  price: string;
}

/**
 * The read-only sign-up panel (L2-051 AC1; ADR 0096) until journey 12 adds joining: whether the
 * member joined, "<left> of <capacity> spots left" (or "Series full", "No sessions left"), the
 * ways to come and the chat note.
 */
export interface SeriesPanelView {
  joined: boolean;
  spots: string;
  plans: SeriesPlanView[];
  note: string;
}

/** The panel's words for a series (ADR 0080, ADR 0096). */
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
): SeriesPanelView {
  const note = 'One group chat for the whole series.';
  if (series.spotsLeft === null) {
    return { joined: series.joined, spots: 'No sessions left', plans: [], note };
  }
  const held = series.sessions.filter((session) => session.state !== 'cancelled').length;
  const price = priceOf(series.priceCents);
  const full = series.spotsLeft === 0;
  const plans: SeriesPlanView[] = [
    {
      title: `Every session (${series.sessionsLeft} left)`,
      note: full
        ? 'Every place in the series is taken'
        : series.cadence.weekday === null
          ? 'Your spot is held at every date'
          : 'Your spot is held each week',
      price: series.priceCents > 0 ? `${price} for all ${held}` : price,
    },
  ];
  if (series.dropInPriceCents !== null) {
    const dropIn = priceOf(series.dropInPriceCents);
    plans.push({
      title: 'Pick dates to drop in',
      note: 'Come when you can',
      price: series.dropInPriceCents > 0 ? `${dropIn} each` : dropIn,
    });
  }
  return {
    joined: series.joined,
    spots: full ? 'Series full' : `${series.spotsLeft} of ${series.capacity} spots left`,
    plans,
    note,
  };
}
