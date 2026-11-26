import type { SeriesDetailDto } from '@cf/api';
import { seriesJoinRefusalOf, seriesKeptNoteOf, seriesPanelViewOf } from './series-panel-view';

type Panel = Pick<
  SeriesDetailDto,
  | 'cadence'
  | 'priceCents'
  | 'dropInPriceCents'
  | 'capacity'
  | 'spotsLeft'
  | 'sessionsLeft'
  | 'joined'
  | 'sessions'
>;

const held = (n: number, cancelled = 0): SeriesDetailDto['sessions'] =>
  Array.from({ length: n + cancelled }, (_, i) => ({
    id: `s${i}`,
    number: i + 1,
    startsAt: '2026-04-25T12:00:00Z',
    endsAt: null,
    topic: null,
    state: i < cancelled ? 'cancelled' : 'upcoming',
    held: false,
    full: false,
  }));

/** Saturday Park Bootcamp as the mock `event-series/not-joined` draws it. */
const BOOTCAMP: Panel = {
  cadence: { weekday: 6, dates: 8 },
  priceCents: 6400,
  dropInPriceCents: 1000,
  capacity: 50,
  spotsLeft: 12,
  sessionsLeft: 5,
  joined: false,
  sessions: held(8),
};

// L2-051 AC1 (ADR 0080, ADR 0096): the read-only sign-up panel until journey 12, one case per row.
describe('seriesPanelViewOf', () => {
  it.each([
    {
      why: 'the mock: spots left, both ways with their prices',
      panel: BOOTCAMP,
      spots: '12 of 50 spots left',
      plans: [
        ['Every session (5 left)', 'Your spot is held each week', '$64 for all 8'],
        ['Pick dates to drop in', 'Come when you can', '$10 each'],
      ],
    },
    {
      why: 'free, with a free drop-in, not weekly, a cancelled date left out of "all"',
      panel: {
        ...BOOTCAMP,
        cadence: { weekday: null, dates: 6 },
        priceCents: 0,
        dropInPriceCents: 0,
        sessions: held(6, 1),
      },
      spots: '12 of 50 spots left',
      plans: [
        ['Every session (5 left)', 'Your spot is held at every date', 'Free'],
        ['Pick dates to drop in', 'Come when you can', 'Free'],
      ],
    },
    {
      why: 'no drop-in price: only every session',
      panel: { ...BOOTCAMP, dropInPriceCents: null },
      spots: '12 of 50 spots left',
      plans: [['Every session (5 left)', 'Your spot is held each week', '$64 for all 8']],
    },
    {
      why: 'full: Series full, and why every session cannot be had',
      panel: { ...BOOTCAMP, spotsLeft: 0 },
      spots: 'Series full',
      plans: [
        ['Every session (5 left)', 'Every place in the series is taken', '$64 for all 8'],
        ['Pick dates to drop in', 'Tick dates in the list', '$10 each'],
      ],
    },
    {
      why: 'one session left',
      panel: { ...BOOTCAMP, spotsLeft: 1, sessionsLeft: 1, dropInPriceCents: null },
      spots: '1 of 50 spots left',
      plans: [['Every session (1 left)', 'Your spot is held each week', '$64 for all 8']],
    },
    {
      why: 'nothing to come: no sessions left and no way to come',
      panel: { ...BOOTCAMP, spotsLeft: null, sessionsLeft: 0 },
      spots: 'No sessions left',
      plans: [],
    },
  ] as const)('$why', ({ panel, spots, plans }) => {
    const view = seriesPanelViewOf(panel as Panel);

    expect(view.joined).toBe(false);
    expect(view.spots).toBe(spots);
    expect(view.plans.map((plan) => [plan.title, plan.note, plan.price])).toEqual(plans);
    expect(view.note).toBe('One group chat for the whole series.');
  });

  it('a member who joined is told so, with how to pay a paid series', () => {
    const view = seriesPanelViewOf({ ...BOOTCAMP, joined: true });

    expect(view.joined).toBe(true);
    expect(view.payNote).toBe(
      "Pay the host at your first session, by cash or e-transfer. You won't be charged online.",
    );
    expect(view.plans).toEqual([]);
    expect(view.action).toBeNull();
  });

  it('a member who joined a free series has nothing to pay', () => {
    expect(seriesPanelViewOf({ ...BOOTCAMP, priceCents: 0, joined: true }).payNote).toBeNull();
  });
});

// L2-053 AC4 (ADR 0102): a joined member's confirmation counts the dates to come they hold, and
// while they change their dates the button is Save dates; one case per row.
describe('seriesPanelViewOf, a joined member changing dates', () => {
  const holding = (k: number): SeriesDetailDto['sessions'] =>
    held(8).map((session, i) => ({ ...session, held: i < k }));
  it.each([
    {
      why: 'every date to come held',
      sessions: holding(8),
      choice: { plan: null, joining: false },
      confirmed: "You're in for every session",
      action: null,
    },
    {
      why: 'one date to come given up',
      sessions: holding(7),
      choice: { plan: null, joining: false },
      confirmed: "You're in for 7 of 8 sessions to come",
      action: null,
    },
    {
      why: 'changing, the ticks as they were',
      sessions: holding(8),
      choice: { plan: null, joining: false, picked: 8, changing: true, changed: false },
      confirmed: "You're in for every session",
      action: ['Save dates', true, false],
    },
    {
      why: 'changing, a date unticked',
      sessions: holding(8),
      choice: { plan: null, joining: false, picked: 7, changing: true, changed: true },
      confirmed: "You're in for every session",
      action: ['Save dates', false, false],
    },
    {
      why: 'saving',
      sessions: holding(8),
      choice: {
        plan: null,
        joining: false,
        picked: 7,
        changing: true,
        changed: true,
        registering: true,
      },
      confirmed: "You're in for every session",
      action: ['Saving…', true, true],
    },
  ] as const)('$why', ({ sessions, choice, confirmed, action }) => {
    const view = seriesPanelViewOf({ ...BOOTCAMP, joined: true, sessions }, choice);

    expect(view.confirmed).toBe(confirmed);
    expect(view.action && [view.action.label, view.action.disabled, view.action.busy]).toEqual(
      action,
    );
    expect(view.plans).toEqual([]);
  });
});

// L2-052 AC1, AC2 and AC5 (ADR 0101): which way is chosen, what can be chosen and the button, one
// case per row: [checked, disabled] for each option, then the button's label, disabled and busy.
describe('seriesPanelViewOf, the choice and the button', () => {
  it.each([
    {
      why: 'nothing chosen yet: every session, and Join the series',
      panel: BOOTCAMP,
      choice: { plan: null, joining: false },
      plans: [
        [true, false],
        [false, false],
      ],
      action: ['Join the series', false, false],
    },
    {
      why: 'drop-in chosen: tick dates, and the button waits for one',
      panel: BOOTCAMP,
      choice: { plan: 'drop', joining: false },
      plans: [
        [false, false],
        [true, false],
      ],
      action: ['Pick a date first', true, false],
    },
    {
      why: 'every session chosen again',
      panel: BOOTCAMP,
      choice: { plan: 'all', joining: false },
      plans: [
        [true, false],
        [false, false],
      ],
      action: ['Join the series', false, false],
    },
    {
      why: 'registering ticked dates: both options disabled, Registering… busy',
      panel: BOOTCAMP,
      choice: { plan: 'drop', joining: false, picked: 2, registering: true },
      plans: [
        [false, true],
        [true, true],
      ],
      action: ['Registering…', true, true],
    },
    {
      why: 'changing dates held, the ticks as they were: Save dates waits for a change',
      panel: BOOTCAMP,
      choice: { plan: 'drop', joining: false, picked: 2, changing: true, changed: false },
      plans: [
        [false, false],
        [true, false],
      ],
      action: ['Save dates', true, false],
    },
    {
      why: 'changing dates held, every one unticked: Save dates can be pressed',
      panel: BOOTCAMP,
      choice: { plan: 'drop', joining: false, picked: 0, changing: true, changed: true },
      plans: [
        [false, false],
        [true, false],
      ],
      action: ['Save dates', false, false],
    },
    {
      why: 'joining: both options disabled, the chosen one kept, Joining… busy',
      panel: BOOTCAMP,
      choice: { plan: 'all', joining: true },
      plans: [
        [true, true],
        [false, true],
      ],
      action: ['Joining…', true, true],
    },
    {
      why: 'full: drop-in chosen whatever was chosen, every session cannot be',
      panel: { ...BOOTCAMP, spotsLeft: 0 },
      choice: { plan: 'all', joining: false },
      plans: [
        [false, true],
        [true, false],
      ],
      action: ['Pick a date first', true, false],
    },
    {
      why: 'no drop-in: drop-in asked for still chooses every session',
      panel: { ...BOOTCAMP, dropInPriceCents: null },
      choice: { plan: 'drop', joining: false },
      plans: [[true, false]],
      action: ['Join the series', false, false],
    },
    {
      why: 'full with no drop-in: nothing can be chosen and nothing pressed',
      panel: { ...BOOTCAMP, spotsLeft: 0, dropInPriceCents: null },
      choice: { plan: null, joining: false },
      plans: [[false, true]],
      action: null,
    },
  ] as const)('$why', ({ panel, choice, plans, action }) => {
    const view = seriesPanelViewOf(panel as Panel, choice);

    expect(view.plans.map((plan) => [plan.checked, plan.disabled])).toEqual(plans);
    expect(view.plans.map((plan) => plan.value)).toEqual(['all', 'drop'].slice(0, plans.length));
    expect(view.action && [view.action.label, view.action.disabled, view.action.busy]).toEqual(
      action,
    );
    expect(view.payNote).toBeNull();
  });

  it('nothing to come: no way to come and no button', () => {
    expect(seriesPanelViewOf({ ...BOOTCAMP, spotsLeft: null, sessionsLeft: 0 }).action).toBeNull();
  });
});

// L2-052 AC5 to AC8 (ADR 0101): what a refused join shows, one case per row.
describe('seriesJoinRefusalOf', () => {
  it.each([
    { why: 'series_full', error: { status: 409, code: 'series_full' }, shows: 'full' },
    {
      why: 'account_suspended',
      error: { status: 403, code: 'account_suspended' },
      shows: 'failed',
    },
    { why: 'series_not_found', error: { status: 404, code: 'series_not_found' }, shows: 'failed' },
    { why: 'no answer', error: { status: 0, code: 'network' }, shows: 'failed' },
    { why: 'a server error', error: { status: 500, code: 'error' }, shows: 'failed' },
    { why: 'not an API error', error: new Error('series_full'), shows: 'failed' },
    { why: 'nothing', error: null, shows: 'failed' },
  ])('$why', ({ error, shows }) => {
    expect(seriesJoinRefusalOf(error)).toBe(shows);
  });
});

// L2-052 AC3 (ADR 0101): a joined member's progress, before attendance is recorded (journey 16).
describe('seriesPanelViewOf, progress', () => {
  it('reads "Attendance not recorded yet" with the next date highlighted and cancelled ones faded', () => {
    const sessions = (['done', 'done', 'live', 'upcoming', 'cancelled'] as const).map(
      (state, n) => ({
        ...held(1)[0]!,
        id: `s${n}`,
        number: n + 1,
        state,
      }),
    );
    const view = seriesPanelViewOf({ ...BOOTCAMP, joined: true, sessions });

    expect(view.progress).toEqual({
      count: 'Attendance not recorded yet',
      bars: ['upcoming', 'upcoming', 'next', 'upcoming', 'cancelled'],
      label: 'Session 3 of 5 is next',
    });
  });

  it('has no progress before joining', () => {
    expect(seriesPanelViewOf(BOOTCAMP).progress).toBeNull();
  });
});

// L2-052 AC4, L2-053 AC5 (ADR 0101): the join confirmation for dates already dropped in on, one
// case per row: which sessions were held before the join, and the note.
describe('seriesKeptNoteOf', () => {
  const states = ['done', 'done', 'done', 'live', 'upcoming', 'upcoming', 'cancelled'] as const;
  const before = (heldAt: number[], over: Partial<Panel> = {}) => ({
    ...BOOTCAMP,
    ...over,
    sessions: states.map((state, n) => ({
      ...held(1)[0]!,
      id: `s${n}`,
      number: n + 1,
      state,
      held: heldAt.includes(n + 1),
    })),
  });
  const joined = { joined: true };

  it.each([
    {
      why: 'one date to come',
      series: before([4]),
      note: "You'd already booked session 4, so it stays at the drop-in price ($10). Your other dates are at the series price.",
    },
    {
      why: 'two dates to come',
      series: before([4, 5]),
      note: "You'd already booked sessions 4 and 5, so they stay at the drop-in price ($10 each). Your other dates are at the series price.",
    },
    {
      why: 'three dates to come',
      series: before([4, 5, 6]),
      note: "You'd already booked sessions 4, 5 and 6, so they stay at the drop-in price ($10 each). Your other dates are at the series price.",
    },
    {
      why: 'a free drop-in',
      series: before([5], { dropInPriceCents: 0 }),
      note: "You'd already booked session 5, so it stays free. Your other dates are at the series price.",
    },
    { why: 'only a past date held', series: before([2]), note: null },
    { why: 'only a cancelled date held', series: before([7]), note: null },
    { why: 'nothing held', series: before([]), note: null },
    { why: 'a free series', series: before([4], { priceCents: 0 }), note: null },
    { why: 'joined already', series: before([4], { joined: true }), note: null },
  ])('$why', ({ series, note }) => {
    expect(seriesKeptNoteOf(series, joined)).toBe(note);
  });

  it('says nothing when the join did not happen', () => {
    expect(seriesKeptNoteOf(before([4]), { joined: false })).toBeNull();
  });
});
