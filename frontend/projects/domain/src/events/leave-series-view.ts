import type { SeriesDetailDto } from '@cf/api';
import { seriesDayOf } from './admin-series-view';
import { seriesCadenceText } from './series-cadence';

/** What the Leave the series dialog says (L2-052 AC9; ADR 0101). */
export interface LeaveSeriesWords {
  /** "Couch to 5K Run Club · every Tuesday to May 26", or "· 6 dates to Jun 25" without a weekly cadence. */
  subtitle: string;
  /** "Your place at the 5 sessions still to come goes back to other members, …". */
  text: string;
}

/**
 * The dialog's words for a joined series: the series with its cadence to its last date, and how
 * many places go back, counting the places the member holds at sessions still to come.
 */
export function leaveSeriesWordsOf(
  series: Pick<SeriesDetailDto, 'title' | 'cadence' | 'lastStartsAt' | 'sessions'>,
): LeaveSeriesWords {
  const last = seriesDayOf(series.lastStartsAt);
  const cadence =
    series.cadence.weekday === null
      ? `${series.cadence.dates} ${series.cadence.dates === 1 ? 'date' : 'dates'}`
      : seriesCadenceText(series.cadence).replace(/^Every/, 'every');
  const places = series.sessions.filter(
    (session) => session.held && (session.state === 'live' || session.state === 'upcoming'),
  ).length;
  return {
    subtitle: `${series.title} · ${cadence} to ${last}`,
    text: `Your place at the ${places} ${places === 1 ? 'session' : 'sessions'} still to come goes back to other members, and you leave the series' group chat. You can join again while places are left.`,
  };
}
