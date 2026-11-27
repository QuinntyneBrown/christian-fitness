import {
  accountDeletingOf,
  deleteAccountRefusalOf,
  deleteConfirms,
  type DeleteAccountRefusal,
} from './account-deletion';

// L2-066 AC4 (ADR 0118): the word is "delete", in any case, with spaces around it trimmed, as the
// API reads it (backend AccountDeletionAttempt.Confirms).
describe('deleteConfirms', () => {
  const cases: [string, string, boolean][] = [
    ['the word', 'delete', true],
    ['in capitals', 'DELETE', true],
    ['capitalised', 'Delete', true],
    ['with spaces around it', '  delete ', true],
    ['short a letter', 'delet', false],
    ['with another word', 'delete it', false],
    ['empty', '', false],
    ['only spaces', '   ', false],
    ['another word', 'remove', false],
  ];
  for (const [name, word, confirms] of cases) {
    it(`${name} is ${confirms ? '' : 'not '}the word`, () =>
      expect(deleteConfirms(word)).toBe(confirms));
  }
});

// Mocks delete-account/invalid, failed and staff-account: the code decides the alert, never shown.
describe('deleteAccountRefusalOf', () => {
  const cases: [string, unknown, DeleteAccountRefusal][] = [
    ['the word refused', { status: 400, code: 'validation_failed' }, 'invalid'],
    ['a staff account', { status: 403, code: 'staff_account' }, 'staff'],
    ['too many attempts', { status: 429, code: 'too_many_attempts' }, 'failed'],
    ['a staff code on another status', { status: 400, code: 'staff_account' }, 'failed'],
    ['a server failure', { status: 500, code: 'error' }, 'failed'],
    ['no answer', { status: 0, code: 'network' }, 'failed'],
    ['not an object', 'boom', 'failed'],
    ['null', null, 'failed'],
  ];
  for (const [name, error, refusal] of cases) {
    it(`${name} is ${refusal}`, () => expect(deleteAccountRefusalOf(error)).toBe(refusal));
  }
});

// L2-066 AC6 (mock sign-in/deleting): a sign-in refused account_deleting names the account and
// the day, in Toronto, it is erased.
describe('accountDeletingOf', () => {
  const deleting = (erasesAt: unknown, account: unknown = 'grace.thompson@gmail.com') => ({
    status: 409,
    code: 'account_deleting',
    account,
    erasesAt,
  });
  const cases: [string, unknown, string | null][] = [
    [
      'midday UTC',
      deleting('2026-05-10T12:45:00Z'),
      'Your account is set to be deleted on May 10, 2026.',
    ],
    [
      'after midnight UTC, still the day before in Toronto',
      deleting('2026-05-11T03:30:00Z'),
      'Your account is set to be deleted on May 10, 2026.',
    ],
    [
      'the turn of the year',
      deleting('2027-01-01T05:00:00Z'),
      'Your account is set to be deleted on January 1, 2027.',
    ],
    ['no day', deleting(undefined), null],
    ['a day that is no date', deleting('soon'), null],
    ['no account', deleting('2026-05-10T12:45:00Z', null), null],
    [
      'another code',
      { status: 409, code: 'conflict', account: 'a@b.c', erasesAt: '2026-05-10T12:45:00Z' },
      null,
    ],
    ['another status', { ...deleting('2026-05-10T12:45:00Z'), status: 400 }, null],
    ['not an object', 'boom', null],
  ];
  for (const [name, error, heading] of cases) {
    it(name, () => {
      const notice = accountDeletingOf(error);
      expect(notice?.heading ?? null).toBe(heading);
      if (heading) expect(notice?.account).toBe('grace.thompson@gmail.com');
    });
  }
});
