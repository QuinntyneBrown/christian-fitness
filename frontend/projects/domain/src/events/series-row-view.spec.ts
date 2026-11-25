import type { SeriesRowDto } from '@cf/api';
import { seriesMeterOf, seriesRangeOf, seriesRowViewOf } from './series-row-view';

/** Couch to 5K as the mock `events/series` draws it: eight Tuesdays, May 12 cancelled, joined. */
const COUCH: SeriesRowDto = {
  id: '0190c0de-0000-7000-8000-0000000005e1',
  title: 'Couch to 5K Run Club',
  category: 'run',
  imageKey: null,
  host: { id: 'h1', kind: 'organization', name: 'Lakeshore Runners Fellowship' },
  area: 'Etobicoke',
  cadence: { weekday: 2, dates: 7 },
  startsAt: '2026-04-21T22:30:00Z',
  firstStartsAt: '2026-04-07T22:30:00Z',
  lastStartsAt: '2026-05-26T22:30:00Z',
  sessions: ['done', 'done', 'live', 'upcoming', 'upcoming', 'cancelled', 'upcoming', 'upcoming'],
  priceCents: 0,
  joined: true,
};

// L2-050 AC1 (ADR 0080, ADR 0093): cancelled dates are left out of both numbers.
describe('seriesMeterOf', () => {
  it.each([
    { why: 'none held yet', sessions: [], bars: [], done: '0 of 0 sessions done' },
    {
      why: 'the mock: one cancelled',
      sessions: COUCH.sessions,
      bars: ['done', 'done', 'next', 'upcoming', 'upcoming', 'cancelled', 'upcoming', 'upcoming'],
      done: '2 of 7 sessions done',
    },
    {
      why: 'nothing done',
      sessions: ['live', 'upcoming'] as const,
      bars: ['next', 'upcoming'],
      done: '0 of 2 sessions done',
    },
    {
      why: 'all but the last done',
      sessions: ['done', 'done', 'cancelled', 'live'] as const,
      bars: ['done', 'done', 'cancelled', 'next'],
      done: '2 of 3 sessions done',
    },
  ])('$why -> $done', ({ sessions, bars, done }) => {
    expect(seriesMeterOf([...sessions])).toEqual({ bars, done });
  });
});

// ADR 0093: days for a weekly cadence, months otherwise, in Toronto.
describe('seriesRangeOf', () => {
  it.each([
    {
      why: 'weekly',
      weekday: 2,
      first: COUCH.firstStartsAt,
      last: COUCH.lastStartsAt,
      expected: 'Apr 7 – May 26',
    },
    {
      why: 'dates, a January evening already February in UTC',
      weekday: null,
      first: '2026-01-30T00:00:00Z',
      last: '2026-06-25T23:00:00Z',
      expected: 'Jan – Jun',
    },
    {
      why: 'dates in one month',
      weekday: null,
      first: '2026-06-04T23:00:00Z',
      last: '2026-06-25T23:00:00Z',
      expected: 'Jun',
    },
    {
      why: 'one weekly date',
      weekday: 2,
      first: COUCH.startsAt,
      last: COUCH.startsAt,
      expected: 'Apr 21',
    },
  ])('$why -> $expected', ({ weekday, first, last, expected }) => {
    expect(
      seriesRangeOf({ cadence: { weekday, dates: 2 }, firstStartsAt: first, lastStartsAt: last }),
    ).toBe(expected);
  });
});

describe('seriesRowViewOf', () => {
  it('words the row as the mock draws it', () => {
    expect(seriesRowViewOf(COUCH)).toEqual({
      id: COUCH.id,
      href: '/events/series/0190c0de-0000-7000-8000-0000000005e1',
      imageSrc: '/images/events/run.jpg',
      meta: 'Every Tuesday · 6:30 PM',
      title: 'Couch to 5K Run Club',
      sub: 'Lakeshore Runners Fellowship · Etobicoke · Apr 7 – May 26',
      bars: ['done', 'done', 'next', 'upcoming', 'upcoming', 'cancelled', 'upcoming', 'upcoming'],
      done: '2 of 7 sessions done',
      joined: true,
      price: 'Free',
      next: 'Next Apr 21',
    });
  });

  it.each([
    { priceCents: 0, sessions: COUCH.sessions, expected: 'Free' },
    { priceCents: 6400, sessions: COUCH.sessions, expected: '$64 for all 7' },
    { priceCents: 6450, sessions: ['live'] as const, expected: '$64.50 for all 1' },
  ])('prices $priceCents cents as "$expected"', ({ priceCents, sessions, expected }) => {
    expect(seriesRowViewOf({ ...COUCH, priceCents, sessions: [...sessions] }).price).toBe(expected);
  });

  it('uses its own picture when it has one', () => {
    expect(seriesRowViewOf({ ...COUCH, imageKey: 'abc' }).imageSrc).toBe('/api/events/images/abc');
  });
});
