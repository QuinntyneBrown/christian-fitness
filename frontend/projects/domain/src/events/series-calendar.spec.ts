import type { SeriesDetailDto } from '@cf/api';
import { seriesCalendarNameOf, seriesCalendarOf } from './series-calendar';

type Session = SeriesDetailDto['sessions'][number];

const session = (over: Partial<Session>): Session => ({
  id: 's1',
  number: 1,
  startsAt: '2026-04-21T22:30:00Z',
  endsAt: '2026-04-21T23:30:00Z',
  topic: null,
  state: 'upcoming',
  held: true,
  ...over,
});

const STAMP = new Date('2026-04-15T12:45:00Z');

const calendar = (sessions: Session[]) =>
  seriesCalendarOf(
    {
      title: 'Couch to 5K Run Club',
      place: 'Humber Bay Park East',
      area: 'Etobicoke, Toronto',
      sessions,
    },
    STAMP,
  );

// L2-052 AC3 (ADR 0101): "All dates" writes one iCalendar file (RFC 5545).
describe('seriesCalendarOf', () => {
  it('writes one event a session still to come, in UTC, with CRLF line ends', () => {
    expect(
      calendar([session({ id: 's3', number: 3, topic: 'Same intervals, six times through' })]),
    ).toBe(
      [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Christian Fitness//Event series//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        'UID:s3@christian-fitness',
        'DTSTAMP:20260415T124500Z',
        'DTSTART:20260421T223000Z',
        'DTEND:20260421T233000Z',
        'SUMMARY:Couch to 5K Run Club · Session 3',
        'DESCRIPTION:Same intervals\\, six times through',
        'LOCATION:Humber Bay Park East\\, Etobicoke\\, Toronto',
        'END:VEVENT',
        'END:VCALENDAR',
        '',
      ].join('\r\n'),
    );
  });

  it.each([
    { state: 'live', written: true },
    { state: 'upcoming', written: true },
    { state: 'done', written: false },
    { state: 'cancelled', written: false },
  ] as const)('a session that is $state is written: $written', ({ state, written }) => {
    expect(calendar([session({ state })]).includes('BEGIN:VEVENT')).toBe(written);
  });

  it('leaves the end out when a session has none', () => {
    expect(calendar([session({ endsAt: null })])).not.toContain('DTEND');
  });

  it.each([
    { why: 'a semicolon', text: 'Run; walk', line: 'DESCRIPTION:Run\\; walk' },
    { why: 'a backslash', text: 'Run \\ walk', line: 'DESCRIPTION:Run \\\\ walk' },
    { why: 'a line break', text: 'Run\nwalk', line: 'DESCRIPTION:Run\\nwalk' },
  ])('escapes $why', ({ text, line }) => {
    expect(calendar([session({ topic: text })]).split('\r\n')).toContain(line);
  });

  it('folds a long line at 75 octets, never inside a character, each continuation after a space', () => {
    const topic = 'é'.repeat(60);
    const lines = calendar([session({ topic })]).split('\r\n');
    const start = lines.findIndex((line) => line.startsWith('DESCRIPTION:'));
    const rest = lines.slice(start + 1);
    const continued = rest.slice(
      0,
      rest.findIndex((line) => !line.startsWith(' ')),
    );
    const folded = [lines[start]!, ...continued];

    expect(folded.length).toBeGreaterThan(1);
    for (const line of folded) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(folded.map((line, n) => (n === 0 ? line : line.slice(1))).join('')).toBe(
      `DESCRIPTION:${topic}`,
    );
  });
});

describe('seriesCalendarNameOf', () => {
  it.each([
    { title: 'Couch to 5K Run Club', name: 'couch-to-5k-run-club.ics' },
    { title: 'Women’s Hoops & Devotion', name: 'women-s-hoops-devotion.ics' },
    { title: 'Café Étude', name: 'cafe-etude.ics' },
    { title: '***', name: 'series.ics' },
  ])('$title', ({ title, name }) => {
    expect(seriesCalendarNameOf(title)).toBe(name);
  });
});
