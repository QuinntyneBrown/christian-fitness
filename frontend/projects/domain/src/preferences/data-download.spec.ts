import { downloadOutcomeOf, downloadReadyText } from './data-download';

// L2-066 AC2 (ADR 0117): a link the API does not answer for has expired; anything else failed.
describe('downloadOutcomeOf', () => {
  const cases: [string, unknown, 'expired' | 'failed'][] = [
    ['not_found', { status: 404, code: 'not_found' }, 'expired'],
    ['another code', { status: 409, code: 'conflict' }, 'failed'],
    ['no answer', { status: 0, code: 'network' }, 'failed'],
    ['no code', { status: 500 }, 'failed'],
    ['not an object', 'boom', 'failed'],
    ['null', null, 'failed'],
  ];
  for (const [name, error, outcome] of cases) {
    it(`${name} is ${outcome}`, () => expect(downloadOutcomeOf(error)).toBe(outcome));
  }
});

// Mock download/default: the link's last day, in Toronto.
describe('downloadReadyText', () => {
  const cases: [string, string, string][] = [
    ['midday UTC', '2026-04-22T12:45:00Z', 'April 22, 2026'],
    [
      'after midnight UTC, still the day before in Toronto',
      '2026-04-23T03:30:00Z',
      'April 22, 2026',
    ],
    ['the turn of the year', '2027-01-01T05:00:00Z', 'January 1, 2027'],
  ];
  for (const [name, expiresAt, day] of cases) {
    it(name, () =>
      expect(downloadReadyText(expiresAt)).toBe(
        `Your data is on its way to your device. If it doesn't start, download it again. The link works for 7 days, until ${day}, and only while you're signed in.`,
      ),
    );
  }
});
