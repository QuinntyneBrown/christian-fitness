import { referenceOf, returnPathOf, serverErrorText } from './server-error';

// L2-043 AC4: only a well-formed reference is shown. One case per row.
describe('referenceOf', () => {
  it.each([
    { value: 'CF-4BF92F35', expected: 'CF-4BF92F35', why: 'CF- and eight upper-case hex digits' },
    { value: 'CF-00000000', expected: 'CF-00000000', why: 'all zeros is still well formed' },
    { value: 'cf-4bf92f35', expected: null, why: 'lower case is not what the API sends' },
    { value: 'CF-4BF92F3', expected: null, why: 'seven digits' },
    { value: 'CF-4BF92F350', expected: null, why: 'nine digits' },
    { value: 'CF-4BF92G35', expected: null, why: 'G is not a hex digit' },
    { value: ' CF-4BF92F35', expected: null, why: 'leading space' },
    { value: '<b>CF-1</b> call 555-0100', expected: null, why: 'markup and other words' },
    { value: '', expected: null, why: 'empty' },
    { value: undefined, expected: null, why: 'absent' },
    { value: null, expected: null, why: 'null' },
    { value: 42, expected: null, why: 'not a string' },
  ])('$value gives $expected ($why)', ({ value, expected }) => {
    expect(referenceOf(value)).toBe(expected);
  });
});

// L2-043 AC6: "Try again" returns only to a path inside the app. One case per row.
describe('returnPathOf', () => {
  it.each([
    { value: '/events/42', expected: '/events/42', why: 'a path in the app' },
    {
      value: '/events/42?when=week#top',
      expected: '/events/42?when=week#top',
      why: 'query and fragment kept',
    },
    { value: '/', expected: '/', why: 'home' },
    {
      value: '//elsewhere.example/phish',
      expected: '/',
      why: 'protocol-relative URL to another site',
    },
    { value: '/\\elsewhere.example', expected: '/', why: 'a backslash browsers read as a slash' },
    { value: '/\t/elsewhere.example', expected: '/', why: 'a tab browsers strip, leaving //' },
    { value: 'https://elsewhere.example/', expected: '/', why: 'an absolute URL' },
    { value: 'javascript:alert(1)', expected: '/', why: 'a script URL' },
    { value: 'events/42', expected: '/', why: 'a relative path' },
    { value: '/server-error?from=/', expected: '/', why: 'the error screen itself would loop' },
    { value: '/offline?from=/', expected: '/', why: 'the offline screen itself would loop' },
    { value: '', expected: '/', why: 'empty' },
    { value: undefined, expected: '/', why: 'absent' },
    { value: 42, expected: '/', why: 'not a string' },
  ])('$value gives $expected ($why)', ({ value, expected }) => {
    expect(returnPathOf(value)).toBe(expected);
  });
});

// L2-043 AC4: the reference sentence appears only with a well-formed reference. One case per row.
describe('serverErrorText', () => {
  const owned = "That's on us, not you, and we've been notified. Try again in a moment.";

  it.each([
    {
      reference: 'CF-4BF92F35',
      expected: `${owned} If it keeps happening, quote reference CF-4BF92F35.`,
      why: 'a well-formed reference',
    },
    { reference: 'not-a-reference', expected: owned, why: 'a malformed reference' },
    { reference: undefined, expected: owned, why: 'no reference' },
  ])('$reference gives the text for $why', ({ reference, expected }) => {
    expect(serverErrorText(reference)).toBe(expected);
  });
});
