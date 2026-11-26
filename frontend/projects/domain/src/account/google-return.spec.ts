import { googleReturnOf } from './google-return';

// L2-049 AC5 (ADR 0099): only the two markers the API's callback writes mean anything; a cancel at
// Google comes back with none, and a crafted value is nothing to do. One row per case.
describe('googleReturnOf', () => {
  it.each<{ why: string; value: unknown; expected: string | null }>([
    { why: 'Google answered, finish it', value: 'returned', expected: 'returned' },
    { why: "it didn't finish", value: 'failed', expected: 'failed' },
    { why: 'a cancel at Google, or a plain visit', value: null, expected: null },
    { why: 'an empty marker', value: '', expected: null },
    { why: 'another word', value: 'finish', expected: null },
    { why: 'another case', value: 'Returned', expected: null },
    { why: 'with spaces', value: ' returned', expected: null },
  ])('$why: $value reads as $expected', ({ value, expected }) => {
    expect(googleReturnOf(value)).toBe(expected);
  });
});
