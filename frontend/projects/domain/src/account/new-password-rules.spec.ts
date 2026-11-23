import {
  newPasswordErrorsOf,
  newPasswordSummaryOf,
  resetTokenOf,
  type NewPasswordErrors,
} from './new-password-rules';

const SHORT = 'Use at least 8 characters';
const MISMATCH = 'Type the same password in both fields';

// L2-045 AC5: the new password's rule. The password rows match the API's
// CompletePasswordResetValidatorTests row for row (ADR 0008); the confirm rows are the screen's own.
describe('newPasswordErrorsOf', () => {
  it.each<{ why: string; password: string; confirm: string; expected: NewPasswordErrors }>([
    { why: 'eight characters', password: '12345678', confirm: '12345678', expected: {} },
    {
      why: 'seven characters',
      password: '1234567',
      confirm: '1234567',
      expected: { password: SHORT },
    },
    { why: 'blank', password: '', confirm: '', expected: { password: SHORT } },
    {
      why: 'eight spaces, counted as typed',
      password: '        ',
      confirm: '        ',
      expected: {},
    },
    {
      why: 'a long passphrase',
      password: 'grace and grit and a long run on sunday',
      confirm: 'grace and grit and a long run on sunday',
      expected: {},
    },
    {
      why: 'different in one letter',
      password: 'graceandgrit',
      confirm: 'graceandgrt',
      expected: { confirm: MISMATCH },
    },
    {
      why: 'different in case',
      password: 'graceandgrit',
      confirm: 'GraceAndGrit',
      expected: { confirm: MISMATCH },
    },
    {
      why: 'confirm left blank',
      password: 'graceandgrit',
      confirm: '',
      expected: { confirm: MISMATCH },
    },
    {
      why: 'short and different',
      password: 'grace',
      confirm: 'grac',
      expected: { password: SHORT, confirm: MISMATCH },
    },
  ])('$why', ({ password, confirm, expected }) => {
    expect(newPasswordErrorsOf(password, confirm)).toEqual(expected);
  });
});

describe('newPasswordSummaryOf', () => {
  it('names the mismatch when it is the only error', () => {
    expect(newPasswordSummaryOf({ confirm: MISMATCH })).toEqual({
      heading: "Your passwords don't match",
      items: [{ text: MISMATCH, target: 'f-confirm' }],
    });
  });

  it('asks to check the password otherwise, listing the fields in order', () => {
    expect(newPasswordSummaryOf({ confirm: MISMATCH, password: SHORT })).toEqual({
      heading: 'Check your new password',
      items: [
        { text: SHORT, target: 'f-password' },
        { text: MISMATCH, target: 'f-confirm' },
      ],
    });
  });

  it('is empty with no errors', () => {
    expect(newPasswordSummaryOf({})).toEqual({ heading: '', items: [] });
  });
});

// L2-045 AC1 and AC4: the token comes from the link's fragment only (`#token=…`); anything else
// is no token.
describe('resetTokenOf', () => {
  it.each<{ why: string; fragment: string | null; expected: string | null }>([
    {
      why: 'the emailed fragment',
      fragment: 'token=k3Jx9QwP2mV8sT4yLb7NcR1dF6hZ0aE5gU-iO_pWq2X',
      expected: 'k3Jx9QwP2mV8sT4yLb7NcR1dF6hZ0aE5gU-iO_pWq2X',
    },
    { why: 'no fragment', fragment: null, expected: null },
    { why: 'an empty fragment', fragment: '', expected: null },
    { why: 'an empty token', fragment: 'token=', expected: null },
    { why: 'another key', fragment: 'code=abc', expected: null },
    { why: 'with another key beside it', fragment: 'x=1&token=abc', expected: 'abc' },
  ])('$why', ({ fragment, expected }) => {
    expect(resetTokenOf(fragment)).toBe(expected);
  });
});
