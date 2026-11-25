import type { SeriesDetailDto } from '@cf/api';
import { seriesPanelViewOf } from './series-panel-view';

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
    topic: null,
    state: i < cancelled ? 'cancelled' : 'upcoming',
    held: false,
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
        ['Pick dates to drop in', 'Come when you can', '$10 each'],
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

  it('a member who joined is told so', () => {
    expect(seriesPanelViewOf({ ...BOOTCAMP, joined: true }).joined).toBe(true);
  });
});
