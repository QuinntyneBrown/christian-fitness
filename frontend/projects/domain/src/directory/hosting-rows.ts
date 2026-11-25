import type { HostedEventDto, HostedSeriesDto } from '@cf/api';
import { CATEGORY_LABELS, eventImageSrc } from '../events/event-card-view';
import { EVENT_TIME_ZONE } from '../events/event-when';
import { seriesCadenceText } from '../events/series-cadence';

/** What one `hosting-row` shows (L2-055 AC2): the screen passes these to the component as they are. */
export interface HostingRowView {
  id: string;
  href: string;
  imageSrc: string;
  /** "Run · Sat Apr 18". */
  meta: string;
  title: string;
  /** "6:45 AM · Martin Goodman Trail, Marilyn Bell Park". */
  sub: string;
  /** A series row, which shows the repeat icon. */
  series?: boolean;
}

// Made once on first use, not at import: the formatter is costly to create.
let parts: Intl.DateTimeFormat | undefined;

/** A one-off event the listing hosts, worded in Toronto whatever the browser's zone. */
export function hostingRowViewOf(event: HostedEventDto): HostingRowView {
  parts ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const at = Object.fromEntries(
    parts.formatToParts(new Date(event.startsAt)).map((part) => [part.type, part.value]),
  );
  return {
    id: event.id,
    href: `/events/${encodeURIComponent(event.id)}`,
    imageSrc: eventImageSrc(event),
    meta: `${CATEGORY_LABELS[event.category]} · ${at['weekday']} ${at['month']} ${at['day']}`,
    title: event.title,
    sub: `${at['hour']}:${at['minute']} ${at['dayPeriod']} · ${event.place}`,
  };
}

/**
 * A series the listing hosts (ADR 0096): "Series · Every Tuesday", its title and "Next: Tue Apr 21,
 * 6:30 PM · 5 sessions left", in Toronto, leading to the series page.
 */
export function hostingSeriesRowViewOf(series: HostedSeriesDto): HostingRowView {
  parts ??= new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const at = Object.fromEntries(
    parts.formatToParts(new Date(series.startsAt)).map((part) => [part.type, part.value]),
  );
  const left =
    series.sessionsLeft === 1 ? '1 session left' : `${series.sessionsLeft} sessions left`;
  return {
    id: series.id,
    href: `/events/series/${encodeURIComponent(series.id)}`,
    imageSrc: eventImageSrc(series),
    meta: `Series · ${seriesCadenceText(series.cadence)}`,
    title: series.title,
    sub: `Next: ${at['weekday']} ${at['month']} ${at['day']}, ${at['hour']}:${at['minute']} ${at['dayPeriod']} · ${left}`,
    series: true,
  };
}

/** What Hosting says when the listing hosts nothing still to come (L2-055 AC3). */
export function hostingEmptyText(name: string): string {
  return `${name} isn't hosting anything right now. Follow to hear when they post a date.`;
}
