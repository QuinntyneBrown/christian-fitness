import type { SeriesDetailDto } from '@cf/api';

type CalendarSeries = Pick<SeriesDetailDto, 'title' | 'place' | 'area' | 'sessions'>;

const MAX_OCTETS = 75;
const encoder = new TextEncoder();

/**
 * One iCalendar file (RFC 5545) with a `VEVENT` for every session of `series` still to come, the
 * next one included and cancelled or done ones left out (L2-052 AC3; ADR 0099): its start and,
 * where known, its end in UTC, the series' title and session number, the topic and the place.
 * Text is escaped, lines end in CRLF and are folded at 75 octets. `stamp` is when it was written.
 */
export function seriesCalendarOf(series: CalendarSeries, stamp: Date): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Christian Fitness//Event series//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  const location = escapeText(`${series.place}, ${series.area}`);
  for (const session of series.sessions) {
    if (session.state !== 'live' && session.state !== 'upcoming') continue;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${session.id}@christian-fitness`,
      `DTSTAMP:${utcOf(stamp)}`,
      `DTSTART:${utcOf(new Date(session.startsAt))}`,
      ...(session.endsAt ? [`DTEND:${utcOf(new Date(session.endsAt))}`] : []),
      `SUMMARY:${escapeText(`${series.title} · Session ${session.number}`)}`,
      ...(session.topic ? [`DESCRIPTION:${escapeText(session.topic)}`] : []),
      `LOCATION:${location}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** The file name "All dates" saves: the series' title in lower case, words joined by hyphens. */
export function seriesCalendarNameOf(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'series'}.ics`;
}

/** An instant as an RFC 5545 UTC date-time: `20260421T223000Z`. */
function utcOf(instant: Date): string {
  return instant
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** RFC 5545 TEXT: backslash, semicolon and comma escaped, line breaks as `\n`. */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Folds a content line at 75 octets, never inside a character; each continuation starts with a space. */
function fold(line: string): string {
  if (encoder.encode(line).length <= MAX_OCTETS) return line;
  const parts: string[] = [];
  let part = '';
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;
    if (octets + size > limit) {
      parts.push(part);
      part = '';
      octets = 0;
    }
    part += char;
    octets += size;
  }
  parts.push(part);
  return parts.join('\r\n ');
}
