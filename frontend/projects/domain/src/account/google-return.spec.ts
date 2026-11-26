import { googleReturnOf } from './google-return';

// L2-049 AC5, L2-003 AC8 (ADR 0099): only the API callback's two markers and Sign in's `finish` mean anything; a cancel at
// Google comes back with none, and a crafted value is nothing to do. One row per case.
describe('googleReturnOf', () => {
  it.each<{ why: string; value: unknown; expected: string | null }>([
    { why: 'Google answered, finish it', value: 'returned', expected: 'returned' },
    { why: "it didn't finish", value: 'failed', expected: 'failed' },
    { why: 'a cancel at Google, or a plain visit', value: null, expected: null },
    { why: 'an empty marker', value: '', expected: null },
    {
      why: 'Sign in\'s "Create my profile": finish the profile',
      value: 'finish',
      expected: 'finish',
    },
    { why: 'another word', value: 'finished', expected: null },
    { why: 'another case', value: 'Returned', expected: null },
    { why: 'with spaces', value: ' returned', expected: null },
  ])('$why: $value reads as $expected', ({ value, expected }) => {
    expect(googleReturnOf(value)).toBe(expected);
  });
});
