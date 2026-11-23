import type { EventSummaryDto } from '@cf/api';
import { homeRowViewOf, nextEventViewOf, startsInOf } from './home-events';

const EVENT: EventSummaryDto = {
  id: 'e1',
  title: 'Easter Sunrise 5K',
  category: 'run',
  startsAt: '2026-04-18T10:45:00Z',
  place: 'Martin Goodman Trail, Marilyn Bell Park',
  area: 'Waterfront',
  priceCents: 0,
  capacity: 200,
  going: 142,
  imageKey: null,
};

// L2-007 AC1: how soon the next event starts, by Toronto calendar day (ADR 0044).
describe('startsInOf', () => {
  it.each([
    { why: 'later the same day', now: '2026-04-18T08:00:00Z', expected: 'today' },
    { why: 'it began earlier today', now: '2026-04-18T14:00:00Z', expected: 'today' },
    // 11:30 PM on Friday in Toronto is already Saturday in UTC.
    { why: 'the evening before, in Toronto', now: '2026-04-18T03:30:00Z', expected: 'tomorrow' },
    { why: 'three days earlier', now: '2026-04-15T12:45:00Z', expected: 'in 3 days' },
    { why: 'a month earlier', now: '2026-03-19T12:45:00Z', expected: 'in 30 days' },
  ])('says "$expected" when $why', ({ now, expected }) => {
    expect(startsInOf(EVENT.startsAt, new Date(now))).toBe(expected);
  });
});

describe('nextEventViewOf', () => {
  it('words the card in Toronto time and links to the event and its chat', () => {
    expect(nextEventViewOf(EVENT, new Date('2026-04-15T12:45:00Z'))).toEqual({
      href: '/events/e1',
      chatHref: '/events/e1/chat',
      imageSrc: '/images/events/run.jpg',
      pill: "You're going · in 3 days",
      when: 'Sat, Apr 18 · 6:45 AM',
      heading: 'Easter Sunrise 5K',
      place: 'Martin Goodman Trail, Marilyn Bell Park',
    });
  });
});

describe('homeRowViewOf', () => {
  it('words the row with the time, the area and the price', () => {
    expect(homeRowViewOf({ ...EVENT, priceCents: 1000 })).toEqual({
      id: 'e1',
      href: '/events/e1',
      month: 'Apr',
      day: '18',
      heading: 'Easter Sunrise 5K',
      meta: 'Sat 6:45 AM · Waterfront',
      price: '$10',
    });
  });
});
