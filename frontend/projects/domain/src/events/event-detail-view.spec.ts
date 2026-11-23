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
});
