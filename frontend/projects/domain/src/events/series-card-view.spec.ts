import type { EventSeriesCardDto } from '@cf/api';
import { seriesCardViewOf } from './series-card-view';

/** Couch to 5K's third date as the mock `event-detail/session` draws its card. */
const COUCH: EventSeriesCardDto = {
  id: 'couch 5k',
  title: 'Couch to 5K Run Club',
  number: 3,
  total: 8,
  cadence: { weekday: 2, dates: 7 },
  joined: false,
  next: [
    { id: 'a', startsAt: '2026-04-28T22:30:00Z', topic: 'First 5-minute run', cancelled: false },
    { id: 'b', startsAt: '2026-05-05T22:30:00Z', topic: 'Two 8-minute runs', cancelled: false },
    { id: 'c', startsAt: '2026-05-12T22:30:00Z', topic: 'No class', cancelled: true },
  ],
};

// L2-010 AC5 (ADR 0080, ADR 0096): a session's series card, one case per row.
describe('seriesCardViewOf', () => {
  it('words the mock: its number and cadence, the dates in Toronto and Join the series', () => {
    expect(seriesCardViewOf(COUCH)).toEqual({
      meta: 'Session 3 of 8 · Every Tuesday',
      title: 'Couch to 5K Run Club',
      href: '/events/series/couch%205k',
      action: 'Join the series',
      dates: [
        { id: 'a', when: 'Tue Apr 28', topic: 'First 5-minute run', cancelled: false },
        { id: 'b', when: 'Tue May 05', topic: 'Two 8-minute runs', cancelled: false },
        { id: 'c', when: 'Tue May 12 · Cancelled', topic: 'No class', cancelled: true },
      ],
    });
  });

  it.each([
    { why: 'joined: View series', over: { joined: true }, action: 'View series', count: 3 },
    {
      why: 'the last date: no dates follow',
      over: { number: 8, next: [] },
      action: 'Join the series',
      count: 0,
    },
  ])('$why', ({ over, action, count }) => {
    const view = seriesCardViewOf({ ...COUCH, ...over });

    expect(view.action).toBe(action);
    expect(view.dates).toHaveLength(count);
  });

  it('a date late in the evening in Toronto keeps its Toronto day', () => {
    const view = seriesCardViewOf({
      ...COUCH,
      next: [{ id: 'a', startsAt: '2026-04-29T03:30:00Z', topic: null, cancelled: false }],
    });

    expect(view.dates[0]).toEqual({ id: 'a', when: 'Tue Apr 28', topic: '', cancelled: false });
  });

  it('dates not on one weekday read "<n> dates"', () => {
    expect(seriesCardViewOf({ ...COUCH, cadence: { weekday: null, dates: 6 } }).meta).toBe(
      'Session 3 of 8 · 6 dates',
    );
  });
});
