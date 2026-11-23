import type { EventSummaryDto } from '@cf/api';
import { appendPage, EMPTY_FEED, EVENT_FEED_LIMIT, hasMore } from './event-feed';

function event(n: number): EventSummaryDto {
  return {
    id: `e${n}`,
    title: `Event ${n}`,
    category: 'run',
    startsAt: '2026-05-01T12:00:00Z',
    place: 'Park',
    area: 'Waterfront',
    priceCents: 0,
    capacity: 10,
    going: 0,
    imageKey: null,
  };
}
const events = (from: number, count: number): EventSummaryDto[] =>
  Array.from({ length: count }, (_, i) => event(from + i));

// ADR 0027: the feed appends pages, shows each event once, and stops at 200.
describe('appendPage', () => {
  it('keeps the events in order and the cursor of the next page', () => {
    const feed = appendPage(EMPTY_FEED, { events: events(1, 20), nextCursor: 'c1' });

    expect(feed.events.map((e) => e.id)).toEqual(events(1, 20).map((e) => e.id));
    expect([feed.nextCursor, feed.capped, hasMore(feed)]).toEqual(['c1', false, true]);
  });

  it('has no more after the last page', () => {
    const feed = appendPage(EMPTY_FEED, { events: events(1, 5), nextCursor: null });

    expect([hasMore(feed), feed.capped]).toEqual([false, false]);
  });

  it('drops an event it already has, wherever the page repeats it', () => {
    const first = appendPage(EMPTY_FEED, { events: events(1, 3), nextCursor: 'c' });

    const second = appendPage(first, { events: [event(3), event(4)], nextCursor: null });

    expect(second.events.map((e) => e.id)).toEqual(['e1', 'e2', 'e3', 'e4']);
  });

  it.each([
    { loaded: 180, page: 20, more: 'c', capped: true, count: 200 },
    { loaded: 180, page: 20, more: null, capped: false, count: 200 },
    { loaded: 180, page: 19, more: 'c', capped: false, count: 199 },
    { loaded: 190, page: 20, more: 'c', capped: true, count: 200 },
  ])(
    'with $loaded loaded and a page of $page and next $more: capped $capped, $count kept',
    ({ loaded, page, more, capped, count }) => {
      const before = appendPage(EMPTY_FEED, { events: events(1, loaded), nextCursor: 'x' });

      const feed = appendPage(before, { events: events(loaded + 1, page), nextCursor: more });

      expect([feed.capped, feed.events.length, hasMore(feed)]).toEqual([
        capped,
        count,
        !capped && more !== null,
      ]);
      expect(feed.events.length).toBeLessThanOrEqual(EVENT_FEED_LIMIT);
    },
  );
});
