import type { AdminSeriesDto, AdminSeriesRowDto, SeriesCadenceDto } from '@cf/api';
import { adminSeriesViewOf, seriesCadenceText, seriesPickCardOf } from './admin-series-view';

// ADR 0091: a cadence is numbers; the admin app words it, one row per case.
describe('seriesCadenceText', () => {
  it.each<{ cadence: SeriesCadenceDto; text: string }>([
    { cadence: { weekday: 2, dates: 7 }, text: 'Every Tuesday' },
    { cadence: { weekday: 0, dates: 2 }, text: 'Every Sunday' },
    { cadence: { weekday: 6, dates: 8 }, text: 'Every Saturday' },
    { cadence: { weekday: null, dates: 6 }, text: '6 dates' },
    { cadence: { weekday: null, dates: 1 }, text: '1 date' },
    { cadence: { weekday: null, dates: 0 }, text: 'No dates yet' },
    { cadence: { weekday: 9, dates: 3 }, text: '3 dates' },
  ])('$cadence reads "$text"', ({ cadence, text }) => {
    expect(seriesCadenceText(cadence)).toBe(text);
  });
});

const COUCH_ROW: AdminSeriesRowDto = {
  id: 'c5',
  title: 'Couch to 5K Run Club',
  cadence: { weekday: 2, dates: 7 },
  // Tuesday, April 21, 2026, 6:30 PM in Toronto.
  startsAt: '2026-04-21T22:30:00Z',
  joined: 31,
  capacity: 40,
};

// L2-071 AC1: a pick card's title, cadence and time, and joined of capacity.
describe('seriesPickCardOf', () => {
  it.each<{ why: string; row: AdminSeriesRowDto; meta: string; count: string }>([
    { why: 'weekly', row: COUCH_ROW, meta: 'Every Tuesday · 6:30 PM', count: '31 / 40 joined' },
    {
      why: 'a count of dates, at 7:00 PM in standard time',
      row: { ...COUCH_ROW, cadence: { weekday: null, dates: 6 }, startsAt: '2026-01-29T00:00:00Z' },
      meta: '6 dates · 7:00 PM',
      count: '31 / 40 joined',
    },
    {
      why: 'no dates: no time',
      row: { ...COUCH_ROW, cadence: { weekday: null, dates: 0 }, startsAt: null, joined: 0 },
      meta: 'No dates yet',
      count: '0 / 40 joined',
    },
  ])('$why', ({ row, meta, count }) => {
    expect(seriesPickCardOf(row)).toEqual({
      id: 'c5',
      title: 'Couch to 5K Run Club',
      meta,
      count,
      href: '/series?id=c5',
    });
  });

  it('puts the id in the link as a query value', () => {
    expect(seriesPickCardOf({ ...COUCH_ROW, id: 'a&b' }).href).toBe('/series?id=a%26b');
  });
});

const COUCH: AdminSeriesDto = {
  ...COUCH_ROW,
  category: 'run',
  summary: 'Eight weeks from walking to running a full 5K, together.',
  imageKey: null,
  host: { id: 'h', kind: 'organization', name: 'Lakeshore Runners Fellowship' },
  firstStartsAt: '2026-04-07T22:30:00Z',
  lastStartsAt: '2026-05-26T22:30:00Z',
  place: 'Humber Bay Park East',
  area: 'Etobicoke, Toronto',
  priceCents: 0,
  dropInPriceCents: 0,
  sessionsLeft: 5,
  sessionsHeld: 7,
  sessions: [
    {
      id: 's1',
      number: 1,
      startsAt: '2026-04-07T22:30:00Z',
      endsAt: '2026-04-07T23:30:00Z',
      topic: 'Walk, run 60 seconds, repeat',
      state: 'done',
    },
    {
      id: 's6',
      number: 6,
      startsAt: '2026-05-12T22:30:00Z',
      endsAt: null,
      topic: null,
      state: 'cancelled',
    },
  ],
};

// L2-071 AC2, AC3 (mocks admin-series/default, selected, series-created).
describe('adminSeriesViewOf', () => {
  it('words Couch to 5K as the default mock draws it', () => {
    expect(adminSeriesViewOf(COUCH)).toEqual({
      id: 'c5',
      title: 'Couch to 5K Run Club',
      imageSrc: '/images/events/run.jpg',
      host: 'Hosted by Lakeshore Runners Fellowship',
      when: 'Every Tuesday, 6:30 PM · Apr 7 – May 26',
      place: 'Humber Bay Park East',
      joined: '31 of 40',
      full: '78% full',
      capacity: 40,
      joinedCount: 31,
      price: 'Free',
      dropIn: 'Drop-in Free',
      left: '5 of 7',
      sessions: [
        {
          id: 's1',
          number: '1',
          date: 'Tue Apr 07',
          topic: 'Walk, run 60 seconds, repeat',
          state: 'done',
        },
        { id: 's6', number: '6', date: 'Tue May 12', topic: '', state: 'cancelled' },
      ],
    });
  });

  it.each<{ why: string; change: Partial<AdminSeriesDto>; expected: Record<string, unknown> }>([
    {
      why: 'a paid series names its price for all held dates, and its drop-in',
      change: { priceCents: 6400, dropInPriceCents: 1000, sessionsHeld: 8 },
      expected: { price: '$64 for all 8', dropIn: 'Drop-in $10' },
    },
    {
      why: 'with no drop-in, no drop-in line',
      change: { priceCents: 6400, dropInPriceCents: null },
      expected: { price: '$64 for all 7', dropIn: null },
    },
    {
      why: 'a paid series with no held dates names the price alone',
      change: { priceCents: 4550, dropInPriceCents: null, sessionsHeld: 0 },
      expected: { price: '$45.50', dropIn: null },
    },
    {
      why: 'no dates: no when line, nothing left of nothing',
      change: {
        cadence: { weekday: null, dates: 0 },
        startsAt: null,
        firstStartsAt: null,
        lastStartsAt: null,
        sessionsLeft: 0,
        sessionsHeld: 0,
        joined: 0,
      },
      expected: { when: null, left: '0 of 0', joined: '0 of 40', full: '0% full' },
    },
    {
      why: 'one date: the range is that date',
      change: {
        cadence: { weekday: null, dates: 1 },
        firstStartsAt: '2026-04-21T22:30:00Z',
        lastStartsAt: '2026-04-21T22:30:00Z',
      },
      expected: { when: '1 date, 6:30 PM · Apr 21' },
    },
    {
      why: 'its own image, by its key',
      change: { imageKey: 'k/1.jpg' },
      expected: { imageSrc: '/api/events/images/k%2F1.jpg' },
    },
  ])('$why', ({ change, expected }) => {
    expect(adminSeriesViewOf({ ...COUCH, ...change })).toEqual(expect.objectContaining(expected));
  });
});
