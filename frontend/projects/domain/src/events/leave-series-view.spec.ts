import type { SeriesDetailDto } from '@cf/api';
import { leaveSeriesWordsOf } from './leave-series-view';

type Session = SeriesDetailDto['sessions'][number];

const states = ['done', 'done', 'live', 'upcoming', 'cancelled', 'upcoming'] as const;

const sessions = (heldAt: number[]): Session[] =>
  states.map((state, n) => ({
    id: `s${n}`,
    number: n + 1,
    startsAt: '2026-04-21T22:30:00Z',
    endsAt: null,
    topic: null,
    state,
    held: heldAt.includes(n + 1),
  }));

const COUCH = {
  title: 'Couch to 5K Run Club',
  cadence: { weekday: 2, dates: 7 },
  lastStartsAt: '2026-05-26T22:30:00Z',
};

// L2-052 AC9 (ADR 0101): the dialog names the series and how many places go back, one case per row.
describe('leaveSeriesWordsOf', () => {
  it.each([
    {
      why: 'weekly, three places to come (a done and a cancelled one held are not counted)',
      series: { ...COUCH, sessions: sessions([1, 3, 4, 5, 6]) },
      subtitle: 'Couch to 5K Run Club · every Tuesday to May 26',
      places: '3 sessions',
    },
    {
      why: 'one place to come',
      series: { ...COUCH, sessions: sessions([4]) },
      subtitle: 'Couch to 5K Run Club · every Tuesday to May 26',
      places: '1 session',
    },
    {
      why: 'no weekly cadence',
      series: {
        ...COUCH,
        title: 'Women’s Hoops & Devotion',
        cadence: { weekday: null, dates: 6 },
        lastStartsAt: '2026-06-25T23:00:00Z',
        sessions: sessions([3, 4]),
      },
      subtitle: 'Women’s Hoops & Devotion · 6 dates to Jun 25',
      places: '2 sessions',
    },
  ])('$why', ({ series, subtitle, places }) => {
    const words = leaveSeriesWordsOf(series);

    expect(words.subtitle).toBe(subtitle);
    expect(words.text).toBe(
      `Your place at the ${places} still to come goes back to other members, and you leave the series' group chat. You can join again while places are left.`,
    );
  });
});
