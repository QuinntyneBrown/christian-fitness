import {
  eventCategoryChips,
  eventListHref,
  eventListQueryOf,
  eventSearchOf,
} from './event-list-query';

/** A query-parameter reader over a plain object, as the router's `ParamMap` reads. */
const params = (values: Record<string, string>) => ({
  get: (name: string): string | null => values[name] ?? null,
});

// L2-075 AC2, AC3 (ADR 0081): the same rows as EventSearchTests.cs. The app sends the trimmed
// text and leaves blank text out; the API compares it in lower case.
describe('eventSearchOf', () => {
  it.each([
    { why: 'no parameter', raw: null, expected: '' },
    { why: 'empty', raw: '', expected: '' },
    { why: 'spaces', raw: '   ', expected: '' },
    { why: 'tab and newline', raw: '\t \n', expected: '' },
    { why: 'a word', raw: 'yoga', expected: 'yoga' },
    { why: 'padded, mixed case', raw: '  Sunrise 5K ', expected: 'Sunrise 5K' },
    { why: 'an ampersand', raw: 'HOOPS & Devotion', expected: 'HOOPS & Devotion' },
    { why: 'a percent sign', raw: '100%', expected: '100%' },
  ])('$why -> "$expected"', ({ raw, expected }) => {
    expect(eventSearchOf(raw)).toBe(expected);
  });
});

describe('eventListQueryOf', () => {
  it('reads the category and the trimmed search from the address', () => {
    expect(eventListQueryOf(params({ category: 'run', q: ' sunrise ' }))).toEqual({
      category: 'run',
      q: 'sunrise',
    });
  });

  it('reads nothing as All with no search, and an unknown category as All', () => {
    expect(eventListQueryOf(params({}))).toEqual({ category: null, q: '' });
    expect(eventListQueryOf(params({ category: 'yoga', q: '  ' }))).toEqual({
      category: null,
      q: '',
    });
  });
});

describe('eventListHref', () => {
  it.each([
    { why: 'nothing chosen', query: { category: null, q: '' }, expected: '/events' },
    {
      why: 'a category',
      query: { category: 'run', q: '' },
      expected: '/events?category=run',
    },
    { why: 'a search', query: { category: null, q: 'sunrise' }, expected: '/events?q=sunrise' },
    {
      why: 'both, the search encoded',
      query: { category: 'basketball', q: 'Hoops & Devotion' },
      expected: '/events?category=basketball&q=Hoops%20%26%20Devotion',
    },
  ] as const)('$why -> $expected', ({ query, expected }) => {
    expect(eventListHref(query)).toBe(expected);
  });
});

describe('eventCategoryChips', () => {
  it('lists All and the six categories with their addresses, marking All current when none is selected', () => {
    expect(eventCategoryChips({ category: null, q: '' })).toEqual([
      { label: 'All', href: '/events', current: true },
      { label: 'Run', href: '/events?category=run', current: false },
      { label: 'Workout', href: '/events?category=workout', current: false },
      { label: 'Basketball', href: '/events?category=basketball', current: false },
      { label: 'Mobility', href: '/events?category=mobility', current: false },
      { label: 'Workshop', href: '/events?category=workshop', current: false },
      { label: 'Retreat', href: '/events?category=retreat', current: false },
    ]);
  });

  it('marks only the chosen category current', () => {
    expect(
      eventCategoryChips({ category: 'workshop', q: '' })
        .filter((chip) => chip.current)
        .map((chip) => chip.label),
    ).toEqual(['Workshop']);
  });

  it('keeps the search in every address (ADR 0081)', () => {
    expect(eventCategoryChips({ category: 'run', q: 'sunrise' }).map((chip) => chip.href)).toEqual([
      '/events?q=sunrise',
      '/events?category=run&q=sunrise',
      '/events?category=workout&q=sunrise',
      '/events?category=basketball&q=sunrise',
      '/events?category=mobility&q=sunrise',
      '/events?category=workshop&q=sunrise',
      '/events?category=retreat&q=sunrise',
    ]);
  });
});
