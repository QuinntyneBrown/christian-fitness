import type { SeriesSessionDto } from '@cf/api';
import { seriesSessionRowOf, seriesSessionsViewOf } from './series-sessions-view';

const at = (date: string): string => `${date}T22:30:00Z`;
const session = (over: Partial<SeriesSessionDto>): SeriesSessionDto => ({
  id: 's3',
  number: 3,
  startsAt: at('2026-04-21'),
  endsAt: null,
  topic: 'Same intervals, six times through',
  state: 'upcoming',
  held: false,
  ...over,
});

// L2-051 AC2 to AC5 (ADR 0096): what a row says for each state, one case per row.
describe('seriesSessionRowOf', () => {
  it.each([
    {
      why: 'a past date the member held no place at reads Done',
      state: 'done',
      held: false,
      row: 'past',
      end: { kind: 'status', text: 'Done' },
    },
    {
      why: 'a past date the member held a place at reads Not recorded, never Missed',
      state: 'done',
      held: true,
      row: 'past',
      end: { kind: 'status', text: 'Not recorded' },
    },
    {
      why: 'the next date is Next up with Details',
      state: 'live',
      held: false,
      row: 'next',
      end: { kind: 'details', href: '/events/s3', number: 3 },
    },
    {
      why: 'a later date has Details',
      state: 'upcoming',
      held: true,
      row: 'upcoming',
      end: { kind: 'details', href: '/events/s3', number: 3 },
    },
    {
      why: 'a cancelled date reads Cancelled, held or not',
      state: 'cancelled',
      held: true,
      row: 'cancelled',
      end: { kind: 'status', text: 'Cancelled' },
    },
  ] as const)('$why', ({ state, held, row, end }) => {
    const view = seriesSessionRowOf(session({ state, held }));

    expect(view.state).toBe(row);
    expect(view.end).toEqual(end);
  });

  it('words the date in Toronto: the tile, "Session <n> · <weekday>" and the hidden date', () => {
    const view = seriesSessionRowOf(session({ startsAt: at('2026-04-07'), number: 1 }));

    expect([view.month, view.day, view.meta, view.date]).toEqual([
      'Apr',
      '07',
      'Session 1 · Tue',
      ', Apr 07',
    ]);
  });

  it('a date with no topic reads none', () => {
    expect(seriesSessionRowOf(session({ topic: null })).topic).toBe('');
  });
});

// L2-051 AC1, AC2, AC4 (ADR 0080): cancelled dates count in the total but in neither done nor to go.
describe('seriesSessionsViewOf', () => {
  it.each([
    {
      why: 'the mock',
      states: ['done', 'done', 'live', 'upcoming', 'upcoming', 'cancelled', 'upcoming', 'upcoming'],
      count: '8 sessions',
      note: '2 done · 5 to go',
    },
    {
      why: 'all to come',
      states: ['live', 'upcoming'],
      count: '2 sessions',
      note: '0 done · 2 to go',
    },
    {
      why: 'finished',
      states: ['done', 'cancelled', 'done'],
      count: '3 sessions',
      note: '2 done · 0 to go',
    },
    { why: 'one date', states: ['live'], count: '1 session', note: '0 done · 1 to go' },
  ] as const)('$why', ({ states, count, note }) => {
    const view = seriesSessionsViewOf(
      states.map((state, n) => session({ id: `s${n}`, number: n + 1, state })),
    );

    expect([view.count, view.note]).toEqual([count, note]);
    expect(view.rows).toHaveLength(states.length);
  });
});
