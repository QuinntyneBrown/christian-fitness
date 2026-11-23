import { eventWhen } from './event-when';

// ADR 0017: the staff list shows each event's start in Toronto, as the mock draws it
// ("May 06 · 9:30 AM"), wherever the browser is. The API's EventScheduleTests
// (backend/tests/ChristianFitness.Application.Tests/Events) compute the same instants.
describe('eventWhen', () => {
  it.each([
    {
      why: 'standard time, UTC-5',
      startsAt: '2026-01-09T12:30:00+00:00',
      expected: 'Jan 09 · 7:30 AM',
    },
    {
      why: 'daylight time, UTC-4',
      startsAt: '2026-05-22T20:00:00+00:00',
      expected: 'May 22 · 4:00 PM',
    },
    {
      why: 'a one-digit day keeps its zero',
      startsAt: '2026-05-06T13:30:00+00:00',
      expected: 'May 06 · 9:30 AM',
    },
    {
      why: 'evening in Toronto, the next day in UTC',
      startsAt: '2026-04-30T23:00:00+00:00',
      expected: 'Apr 30 · 7:00 PM',
    },
    { why: 'after spring forward', startsAt: '2026-03-08T07:00:00Z', expected: 'Mar 08 · 3:00 AM' },
    {
      why: 'the fall-back hour, read on standard time',
      startsAt: '2026-11-01T06:30:00Z',
      expected: 'Nov 01 · 1:30 AM',
    },
    {
      why: "midnight on New Year's Day",
      startsAt: '2027-01-01T05:00:00Z',
      expected: 'Jan 01 · 12:00 AM',
    },
    { why: 'noon', startsAt: '2026-06-01T16:00:00Z', expected: 'Jun 01 · 12:00 PM' },
  ])('$why ($startsAt) is "$expected"', ({ startsAt, expected }) => {
    expect(eventWhen(startsAt)).toBe(expected);
  });

  it('is empty for a value that is not an instant, rather than "Invalid Date"', () => {
    expect(eventWhen('not a date')).toBe('');
  });
});
