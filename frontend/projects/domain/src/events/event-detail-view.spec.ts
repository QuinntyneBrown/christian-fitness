import type { EventDetailDto } from '@cf/api';
import { eventDetailViewOf } from './event-detail-view';

const BOOTCAMP: EventDetailDto = {
  id: 'abc',
  title: 'Saturday Park Bootcamp',
  category: 'workout',
  // 8:00 AM on Saturday, April 25 in Toronto.
  startsAt: '2026-04-25T12:00:00Z',
  place: 'Trillium Park, Ontario Place',
  area: 'Waterfront',
  priceCents: 1000,
  capacity: 50,
  going: 38,
  summary: 'Circuits for every level.',
  imageKey: null,
  registration: null,
};

// ADR 0031: what the detail screen says of an event, read in Toronto whatever the browser's zone.
describe('eventDetailViewOf', () => {
  it('words the event for the screen', () => {
    expect(eventDetailViewOf(BOOTCAMP)).toEqual({
      imageSrc: '/images/events/bootcamp.jpg',
      type: 'Workout',
      heading: 'Saturday Park Bootcamp',
      day: 'Sat, Apr 25',
      time: '8:00 AM',
      place: 'Trillium Park, Ontario Place',
      area: 'Waterfront',
      summary: 'Circuits for every level.',
      price: '$10',
      spots: '12 of 50 spots left',
      going: '38 going',
      full: false,
      registered: false,
      payNote: null,
    });
  });

  it.each([
    { startsAt: '2026-04-30T23:00:00Z', day: 'Thu, Apr 30', time: '7:00 PM' },
    // 11:30 PM in Toronto on the 14th is already the 15th in UTC.
    { startsAt: '2026-01-15T04:30:00Z', day: 'Wed, Jan 14', time: '11:30 PM' },
    { startsAt: '2026-04-18T16:00:00Z', day: 'Sat, Apr 18', time: '12:00 PM' },
  ])('reads $startsAt as $day, $time', ({ startsAt, day, time }) => {
    expect(eventDetailViewOf({ ...BOOTCAMP, startsAt })).toMatchObject({ day, time });
  });

  it.each([
    { capacity: 50, going: 50, spots: '0 of 50 spots left' },
    { capacity: 50, going: 49, spots: '1 of 50 spots left' },
    // More going than capacity (a capacity edited below it is refused, but never show a negative).
    { capacity: 50, going: 52, spots: '0 of 50 spots left' },
    { capacity: 200, going: 0, spots: '200 of 200 spots left' },
  ])('says $spots for $going of $capacity', ({ capacity, going, spots }) => {
    expect(eventDetailViewOf({ ...BOOTCAMP, capacity, going }).spots).toBe(spots);
  });

  it('shows its own picture when it has one', () => {
    expect(eventDetailViewOf({ ...BOOTCAMP, imageKey: 'k1.jpg' }).imageSrc).toBe(
      '/api/events/images/k1.jpg',
    );
  });

  // ADR 0032: a registration is "going"; a reserved one, for a paid event, says how to pay.
  it.each([
    { registration: null, registered: false, payNote: null },
    { registration: 'confirmed' as const, registered: true, payNote: null },
    {
      registration: 'reserved' as const,
      registered: true,
      payNote:
        'Your spot is reserved. Pay the Christian Fitness team at the event; online payment is not available yet.',
    },
  ])('reads registration $registration', ({ registration, registered, payNote }) => {
    expect(eventDetailViewOf({ ...BOOTCAMP, registration })).toMatchObject({ registered, payNote });
  });
});

// ADR 0033: a place is left until going reaches capacity; a member who holds one is going, not turned away.
describe('eventDetailViewOf full', () => {
  it.each([
    { going: 49, registration: null, full: false },
    { going: 50, registration: null, full: true },
    { going: 51, registration: null, full: true },
    { going: 50, registration: 'confirmed' as const, full: false },
    { going: 50, registration: 'reserved' as const, full: false },
  ])('reads $going going and registration $registration as full $full', (row) => {
    const { full, ...event } = row;
    expect(eventDetailViewOf({ ...BOOTCAMP, ...event }).full).toBe(full);
  });
});
