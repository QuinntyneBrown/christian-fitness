import { hostChoiceViewOf, hostNoMatchesText, hostSearchTermOf } from './event-host-picker';

// ADR 0089: what the Host field's text searches for, with the API's limits (2 to 100 characters).
describe('hostSearchTermOf', () => {
  it.each([
    { why: 'blank asks nothing', text: '', expected: null },
    { why: 'one character asks nothing', text: 'L', expected: null },
    { why: 'one character in spaces asks nothing', text: '  L  ', expected: null },
    { why: 'one emoji is one character', text: '🏃', expected: null },
    { why: 'two characters ask', text: 'La', expected: 'La' },
    { why: 'spaces are trimmed', text: '  Lake ', expected: 'Lake' },
    { why: '100 characters ask', text: 'a'.repeat(100), expected: 'a'.repeat(100) },
    { why: '101 characters ask nothing', text: 'a'.repeat(101), expected: null },
  ])('$why', ({ text, expected }) => {
    expect(hostSearchTermOf(text)).toBe(expected);
  });
});

describe('hostChoiceViewOf', () => {
  it.each([
    { kind: 'organization' as const, meta: 'Organization · Listed' },
    { kind: 'instructor' as const, meta: 'Instructor · Listed' },
    { kind: 'church-ministry' as const, meta: 'Church Ministry · Listed' },
  ])('a $kind reads "$meta"', ({ kind, meta }) => {
    expect(hostChoiceViewOf({ id: 'h1', kind, name: 'Lakeshore Runners Fellowship' })).toEqual({
      id: 'h1',
      title: 'Lakeshore Runners Fellowship',
      meta,
    });
  });
});

describe('hostNoMatchesText', () => {
  it('names the search in quotes', () => {
    expect(hostNoMatchesText('Northside')).toBe(
      'No Listed hosts match “Northside”. Try another search.',
    );
  });
});
