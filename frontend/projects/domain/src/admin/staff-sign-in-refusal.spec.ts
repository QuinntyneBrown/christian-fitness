import { staffSignInRefusalOf, type StaffSignInRefusal } from './staff-sign-in-refusal';

// L2-018 AC3, AC4, AC8, AC10, L2-049 AC5, AC7, AC11 and the mock's `wrong-domain`, `no-access`,
// `error`, `not-configured`, `limited` and `suspended` states (ADR 0062, ADR 0100). One row each.
describe('staffSignInRefusalOf', () => {
  it.each<{ error: unknown; expected: StaffSignInRefusal }>([
    {
      error: { status: 403, code: 'wrong_domain', account: 'dana.reyes@gmail.com' },
      expected: { kind: 'wrong-domain', account: 'dana.reyes@gmail.com' },
    },
    {
      error: { status: 403, code: 'not_staff', account: 'events@christian.fitness' },
      expected: { kind: 'not-staff', account: 'events@christian.fitness' },
    },
    // A notice names an account; without one there is nothing to name.
    { error: { status: 403, code: 'wrong_domain' }, expected: { kind: 'failed' } },
    { error: { status: 403, code: 'not_staff', account: '' }, expected: { kind: 'failed' } },
    { error: { status: 403, code: 'not_staff', account: 7 }, expected: { kind: 'failed' } },
    { error: { status: 401, code: 'not_staff', account: 'a@b.c' }, expected: { kind: 'failed' } },
    { error: { status: 403, code: 'account_suspended' }, expected: { kind: 'suspended' } },
    { error: { status: 401, code: 'account_suspended' }, expected: { kind: 'failed' } },
    { error: { status: 503, code: 'google_unavailable' }, expected: { kind: 'not-configured' } },
    { error: { status: 500, code: 'google_unavailable' }, expected: { kind: 'failed' } },
    { error: { status: 429, code: 'too_many_attempts' }, expected: { kind: 'too-many-attempts' } },
    { error: { status: 401, code: 'too_many_attempts' }, expected: { kind: 'failed' } },
    { error: { status: 401, code: 'google_email_unverified' }, expected: { kind: 'failed' } },
    { error: { status: 403, code: 'forbidden' }, expected: { kind: 'failed' } },
    { error: { status: 400, code: 'antiforgery_failed' }, expected: { kind: 'failed' } },
    { error: { status: 500, code: 'server_error' }, expected: { kind: 'failed' } },
    { error: { status: 0, code: 'network' }, expected: { kind: 'failed' } },
    { error: null, expected: { kind: 'failed' } },
    { error: new Error('boom'), expected: { kind: 'failed' } },
    { error: 'not_staff', expected: { kind: 'failed' } },
  ])('$error is $expected.kind', ({ error, expected }) => {
    expect(staffSignInRefusalOf(error)).toEqual(expected);
  });
});
