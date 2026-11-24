import { applicationSent } from './application-sent';

// L2-025 AC1: each pending application shows when it was sent, as the mock's "2 days ago".
describe('applicationSent', () => {
  const now = new Date('2026-04-15T12:45:00Z');

  it.each([
    { why: 'a moment ago', at: '2026-04-15T12:44:30Z', expected: 'Just now' },
    { why: 'ahead of now', at: '2026-04-15T12:50:00Z', expected: 'Just now' },
    { why: 'one minute', at: '2026-04-15T12:44:00Z', expected: '1 minute ago' },
    { why: 'fifty-nine minutes', at: '2026-04-15T11:46:00Z', expected: '59 minutes ago' },
    { why: 'one hour', at: '2026-04-15T11:45:00Z', expected: '1 hour ago' },
    { why: 'twenty-three hours', at: '2026-04-14T13:45:00Z', expected: '23 hours ago' },
    { why: 'one day', at: '2026-04-14T12:45:00Z', expected: '1 day ago' },
    { why: 'two days', at: '2026-04-13T12:45:00Z', expected: '2 days ago' },
    { why: 'twenty-nine days', at: '2026-03-17T12:45:00Z', expected: '29 days ago' },
    {
      why: 'thirty days, by date in Toronto',
      at: '2026-03-16T12:45:00Z',
      expected: 'Mar 16, 2026',
    },
    {
      why: 'late evening in Toronto, next day in UTC',
      at: '2026-01-03T03:30:00Z',
      expected: 'Jan 2, 2026',
    },
    { why: 'a value that is not a date', at: 'soon', expected: '' },
  ])('$why reads "$expected"', ({ at, expected }) => {
    expect(applicationSent(at, now)).toBe(expected);
  });
});
