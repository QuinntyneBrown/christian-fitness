import { goingDateOf } from './going-date';

// L2-005 AC1: the day of an event the member is going to, as the profile's "Going to" shows it
// (mock "Sat, Apr 18"), read in Toronto time (ADR 0014).
describe('goingDateOf', () => {
  it.each([
    {
      why: 'a morning in daylight time',
      startsAt: '2026-04-18T10:45:00Z',
      expected: 'Sat, Apr 18',
    },
    {
      why: 'an evening in daylight time',
      startsAt: '2026-04-30T23:00:00Z',
      expected: 'Thu, Apr 30',
    },
    // 9:00 PM on Friday, December 4 in Toronto is Saturday in UTC.
    {
      why: 'an evening already tomorrow in UTC',
      startsAt: '2026-12-05T02:00:00Z',
      expected: 'Fri, Dec 4',
    },
    {
      why: 'an instant with an offset',
      startsAt: '2026-04-18T06:45:00-04:00',
      expected: 'Sat, Apr 18',
    },
  ])('$why: "$expected"', ({ startsAt, expected }) => {
    expect(goingDateOf(startsAt)).toBe(expected);
  });
});
