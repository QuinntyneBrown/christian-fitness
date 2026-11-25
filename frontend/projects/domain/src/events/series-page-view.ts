import type { SeriesDetailDto } from '@cf/api';
import { type HostCardView, hostCardViewOf } from '../directory/host-card-view';
import { seriesTimeOf } from './admin-series-view';
import { CATEGORY_LABELS, eventImageSrc } from './event-card-view';
import { seriesCadenceText } from './series-cadence';
import { seriesRangeOf } from './series-row-view';
import { type SeriesSessionsView, seriesSessionsViewOf } from './series-sessions-view';

/** A series' page head as the mock `event-series/default` draws it (L2-051 AC1; ADR 0096). */
export interface SeriesPageView {
  imageSrc: string;
  /** "Run series · 8 sessions", every date counted (cancelled ones included). */
  eyebrow: string;
  title: string;
  /** "Every Tuesday, 6:30 PM": the cadence and the next (else last) held session's time. */
  when: string;
  /** "Apr 7 – May 26", or months for a cadence that is not weekly ("Jan – Jun"). */
  range: string;
  place: string;
  area: string;
  summary: string;
  /** The "Hosted by" card, with no kind on a series page. */
  host: HostCardView;
  sessions: SeriesSessionsView;
}

/** The series' head, in Toronto time whatever the browser's zone. */
export function seriesPageViewOf(series: SeriesDetailDto): SeriesPageView {
  const sessions = seriesSessionsViewOf(series.sessions);
  return {
    imageSrc: eventImageSrc(series),
    eyebrow: `${CATEGORY_LABELS[series.category]} series · ${sessions.count}`,
    title: series.title,
    when: `${seriesCadenceText(series.cadence)}, ${seriesTimeOf(series.startsAt)}`,
    range: seriesRangeOf(series),
    place: series.place,
    area: series.area,
    summary: series.summary,
    host: hostCardViewOf(series.host),
    sessions,
  };
}
