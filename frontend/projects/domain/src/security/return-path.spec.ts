import { signInReturnPathOf } from './return-path';

// L2-004 AC6 (ADR 0010): only a path inside the app is followed after sign-in; anything else opens
// Home, so a crafted link cannot send a member to another site. One row per case.
describe('signInReturnPathOf', () => {
  it.each<{ why: string; value: string | null; expected: string }>([
    { why: 'a member route', value: '/home', expected: '/home' },
    { why: 'a route with a query', value: '/home?welcome=back', expected: '/home?welcome=back' },
    { why: 'a route with a fragment', value: '/events/e-1#map', expected: '/events/e-1#map' },
    { why: 'no return address', value: null, expected: '/home' },
    { why: 'an empty one', value: '', expected: '/home' },
    { why: 'another site', value: 'https://evil.example/home', expected: '/home' },
    { why: 'a protocol-relative address', value: '//evil.example/home', expected: '/home' },
    { why: 'a backslash read as a slash', value: '/\\evil.example/home', expected: '/home' },
    { why: 'a space inside', value: '/home /evil', expected: '/home' },
    { why: 'a script', value: 'javascript:alert(1)', expected: '/home' },
    { why: 'a relative path', value: 'home', expected: '/home' },
    { why: 'a space first', value: ' /home', expected: '/home' },
    { why: 'a tab inside', value: '/\t/evil.example', expected: '/home' },
    { why: 'a line break inside', value: '/home\n', expected: '/home' },
    { why: 'a delete character', value: '/home\u007f', expected: '/home' },
    { why: 'the sign-in screen', value: '/sign-in', expected: '/home' },
    {
      why: 'the sign-in screen with a query',
      value: '/sign-in?returnUrl=%2Fhome',
      expected: '/home',
    },
    { why: 'a path that only starts like it', value: '/sign-in-help', expected: '/sign-in-help' },
  ])('$why: $value is followed to $expected', ({ value, expected }) => {
    expect(signInReturnPathOf(value)).toBe(expected);
  });
});
