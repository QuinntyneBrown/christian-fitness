import type { HostedEventDto } from '@cf/api';
import { hostingEmptyText, hostingRowViewOf } from './hosting-rows';

const event = (over: Partial<HostedEventDto> = {}): HostedEventDto => ({
  id: 'e-1',
  title: 'Easter Sunrise 5K',
  category: 'run',
  startsAt: '2026-04-18T10:45:00Z',
  place: 'Martin Goodman Trail, Marilyn Bell Park',
  imageKey: null,
  ...over,
});

// L2-055 AC2 (mock `listing-profile/one-off`): a one-off event reads "<category> · <date>", its
// title and "<time> · <place>" in Toronto, whatever the browser's zone, and leads to the event.
describe('hostingRowViewOf', () => {
  it('words a one-off event in Toronto time', () => {
    expect(hostingRowViewOf(event())).toEqual({
      id: 'e-1',
      href: '/events/e-1',
      imageSrc: '/images/events/run.jpg',
      meta: 'Run · Sat Apr 18',
      title: 'Easter Sunrise 5K',
      sub: '6:45 AM · Martin Goodman Trail, Marilyn Bell Park',
    });
  });

  it.each([
    // 00:30 UTC on 3 November is 7:30 PM on 2 November in Toronto (EST).
    { startsAt: '2026-11-03T00:30:00Z', meta: 'Workshop · Mon Nov 2', time: '7:30 PM' },
    // Noon in Toronto in summer (EDT).
    { startsAt: '2026-07-01T16:00:00Z', meta: 'Workshop · Wed Jul 1', time: '12:00 PM' },
    // Midnight in Toronto.
    { startsAt: '2026-01-10T05:00:00Z', meta: 'Workshop · Sat Jan 10', time: '12:00 AM' },
  ])('$startsAt reads "$meta" at $time', ({ startsAt, meta, time }) => {
    const view = hostingRowViewOf(event({ startsAt, category: 'workshop' }));
    expect(view.meta).toBe(meta);
    expect(view.sub).toBe(`${time} · Martin Goodman Trail, Marilyn Bell Park`);
  });

  it('shows the event’s own picture when it has one', () => {
    expect(hostingRowViewOf(event({ imageKey: 'a1b2.jpg' })).imageSrc).toBe(
      '/api/events/images/a1b2.jpg',
    );
  });
});

// L2-055 AC3: with nothing to come Hosting reads one sentence naming the listing.
describe('hostingEmptyText', () => {
  it('names the listing', () => {
    expect(hostingEmptyText('Northline Athletic')).toBe(
      "Northline Athletic isn't hosting anything right now. Follow to hear when they post a date.",
    );
  });
});
