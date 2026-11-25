import type { EventSummaryDto } from '@cf/api';
import { eventCardViewOf } from './event-card-view';

const SUNRISE: EventSummaryDto = {
  id: 'abc',
  title: 'Easter Sunrise 5K',
  category: 'run',
  // 6:45 AM on Saturday, April 18 in Toronto.
  startsAt: '2026-04-18T10:45:00Z',
  place: 'Marilyn Bell Park',
  area: 'Waterfront',
  priceCents: 0,
  capacity: 200,
  going: 142,
  imageKey: null,
};

// ADR 0027: what a card says of an event, read in Toronto whatever the browser's zone.
describe('eventCardViewOf', () => {
  it('words the date and time in Toronto', () => {
    expect(eventCardViewOf(SUNRISE)).toMatchObject({
      href: '/events/abc',
      month: 'Apr',
      day: '18',
      date: 'Apr 18',
      type: 'Run',
      time: 'Sat 6:45 AM',
      heading: 'Easter Sunrise 5K',
      place: 'Marilyn Bell Park',
      going: 142,
    });
  });

  it.each([
    { startsAt: '2026-05-06T13:30:00Z', day: '06', date: 'May 6', time: 'Wed 9:30 AM' },
    { startsAt: '2026-04-30T23:00:00Z', day: '30', date: 'Apr 30', time: 'Thu 7:00 PM' },
    // 11:30 PM in Toronto on the 14th is already the 15th in UTC.
    { startsAt: '2026-01-15T04:30:00Z', day: '14', date: 'Jan 14', time: 'Wed 11:30 PM' },
    { startsAt: '2026-04-18T16:00:00Z', day: '18', date: 'Apr 18', time: 'Sat 12:00 PM' },
  ])('reads $startsAt as $date, $time', ({ startsAt, day, date, time }) => {
    expect(eventCardViewOf({ ...SUNRISE, startsAt })).toMatchObject({ day, date, time });
  });

  it.each([
    { priceCents: 0, price: 'Free' },
    { priceCents: 1000, price: '$10' },
    { priceCents: 1250, price: '$12.50' },
    { priceCents: 5, price: '$0.05' },
  ])('says $priceCents cents as $price', ({ priceCents, price }) => {
    expect(eventCardViewOf({ ...SUNRISE, priceCents }).price).toBe(price);
  });

  it.each([
    { capacity: 50, going: 38, spotsLeft: undefined },
    { capacity: 30, going: 20, spotsLeft: 10 },
    { capacity: 30, going: 24, spotsLeft: 6 },
    { capacity: 30, going: 30, spotsLeft: 0 },
    { capacity: 30, going: 31, spotsLeft: 0 },
  ])(
    'with $going of $capacity going, spots left is $spotsLeft',
    ({ capacity, going, spotsLeft }) => {
      expect(eventCardViewOf({ ...SUNRISE, capacity, going }).spotsLeft).toBe(spotsLeft);
    },
  );

  it.each([
    { category: 'run' as const, image: '/images/events/run.jpg' },
    { category: 'workout' as const, image: '/images/events/bootcamp.jpg' },
    { category: 'basketball' as const, image: '/images/events/hoops.jpg' },
    { category: 'mobility' as const, image: '/images/events/stretch.jpg' },
    { category: 'workshop' as const, image: '/images/events/bootcamp.jpg' },
    { category: 'retreat' as const, image: '/images/events/run.jpg' },
  ])('shows the $category photo when the event has none', ({ category, image }) => {
    expect(eventCardViewOf({ ...SUNRISE, category }).imageSrc).toBe(image);
  });

  it('shows the photo from the API when the event has one', () => {
    expect(eventCardViewOf({ ...SUNRISE, imageKey: 'a1b2.jpg' }).imageSrc).toBe(
      '/api/events/images/a1b2.jpg',
    );
  });
});

// L2-009 AC1 (ADR 0080, ADR 0093): a session's card adds its series line; a standalone event none.
describe('eventCardViewOf, a session', () => {
  it.each([
    {
      cadence: { weekday: 2, dates: 7 },
      number: 3,
      total: 8,
      expected: 'Part of Couch to 5K Run Club · Session 3 of 8 · Every Tuesday',
    },
    {
      cadence: { weekday: null, dates: 6 },
      number: 4,
      total: 6,
      expected: 'Part of Couch to 5K Run Club · Session 4 of 6 · 6 dates',
    },
  ])('reads "$expected"', ({ cadence, number, total, expected }) => {
    const series = { id: 's1', title: 'Couch to 5K Run Club', number, total, cadence };
    expect(eventCardViewOf({ ...SUNRISE, series }).series).toBe(expected);
  });

  it.each([{ series: null }, {}])('has no series line for a standalone event (%o)', (extra) => {
    expect(eventCardViewOf({ ...SUNRISE, ...extra })).not.toHaveProperty('series');
  });
});
