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
  full: false,
  attended: null,
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
      why: 'a past date staff recorded the member came to reads You came',
      state: 'done',
      held: true,
      attended: true,
      row: 'past',
      end: { kind: 'came' },
    },
    {
      why: 'a past date staff recorded the member missed reads Missed',
      state: 'done',
      held: true,
      attended: false,
      row: 'past',
      end: { kind: 'status', text: 'Missed' },
    },
    {
      why: 'a past date the member held no place at reads Done, whatever is recorded',
      state: 'done',
      held: false,
      attended: true,
      row: 'past',
      end: { kind: 'status', text: 'Done' },
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
  ] as const)('$why', ({ state, held, row, end, ...recorded }) => {
    const attended = 'attended' in recorded ? recorded.attended : null;
    const view = seriesSessionRowOf(session({ state, held, attended }));

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

// L2-053 AC1, AC6 and AC7 (ADR 0102): while dates are picked, what each row ends with, one case per row.
describe('seriesSessionRowOf while picking dates', () => {
  const box = (checked: boolean) => ({
    kind: 'pick',
    label: 'Drop in',
    hidden: ' on Tue, Apr 21',
    value: 's3',
    checked,
  });
  it.each([
    { why: 'the next date gets a tick box', state: 'live', picked: false, end: box(false) },
    { why: 'a later date ticked', state: 'upcoming', picked: true, end: box(true) },
    {
      why: 'a full date the member does not hold reads Full, with no tick box',
      state: 'upcoming',
      full: true,
      end: { kind: 'status', text: 'Full' },
    },
    {
      why: 'a full date the member holds keeps its tick box, to untick it',
      state: 'upcoming',
      full: true,
      held: true,
      picked: true,
      end: box(true),
    },
    {
      why: 'a past date still reads Done',
      state: 'done',
      end: { kind: 'status', text: 'Done' },
    },
    {
      why: 'a cancelled date still reads Cancelled',
      state: 'cancelled',
      end: { kind: 'status', text: 'Cancelled' },
    },
  ] as const)('$why', (row) => {
    const picked = new Set('picked' in row && row.picked ? ['s3'] : []);
    const view = seriesSessionRowOf(
      session({
        state: row.state,
        full: 'full' in row && row.full,
        held: 'held' in row && row.held,
      }),
      { picked },
    );

    expect(view.end).toEqual(row.end);
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

// L2-053 AC4 (ADR 0102): once a joined member holds fewer than every date to come, each date to come
// reads "Registered" or "Not going" after its weekday, and one not going has no Details.
describe('seriesSessionsViewOf for a joined member', () => {
  const STATES = ['done', 'live', 'upcoming', 'cancelled', 'upcoming'] as const;
  const sessionsHolding = (...numbers: number[]): SeriesSessionDto[] =>
    STATES.map((state, n) =>
      session({ id: `s${n + 1}`, number: n + 1, state, held: numbers.includes(n + 1) }),
    );
  it.each([
    {
      why: 'a date to come given up: Registered and Not going, Not going with no Details',
      sessions: sessionsHolding(1, 2, 5),
      joined: true,
      marks: ['', ' · Registered', ' · Not going', '', ' · Registered'],
      ends: ['status', 'details', null, 'status', 'details'],
    },
    {
      why: 'every date to come held: no marks',
      sessions: sessionsHolding(2, 3, 5),
      joined: true,
      marks: ['', '', '', '', ''],
      ends: ['status', 'details', 'details', 'status', 'details'],
    },
    {
      why: 'not joined, with dates dropped in on: no marks',
      sessions: sessionsHolding(2),
      joined: false,
      marks: ['', '', '', '', ''],
      ends: ['status', 'details', 'details', 'status', 'details'],
    },
  ])('$why', ({ sessions, joined, marks, ends }) => {
    const view = seriesSessionsViewOf(sessions, null, joined);

    expect(view.rows.map((row) => row.mark)).toEqual(marks);
    expect(view.rows.map((row) => row.end?.kind ?? null)).toEqual(ends);
  });

  it('changing dates shows the tick boxes and no marks', () => {
    const view = seriesSessionsViewOf(
      sessionsHolding(2, 5),
      { picked: new Set(['s2', 's5']) },
      true,
    );

    expect(view.rows.map((row) => row.mark)).toEqual(['', '', '', '', '']);
    expect(view.rows.map((row) => row.end?.kind ?? null)).toEqual([
      'status',
      'pick',
      'pick',
      'status',
      'pick',
    ]);
  });
});
